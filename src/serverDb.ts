import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { ImportRun, CorrectionLog, RevenueData, PriceData, CategoryMapping } from './types';
import { serverRtdb } from './serverFirebase';
import { ref, get, set } from 'firebase/database';

// Safe wrapper for XLSX to handle both CommonJS and ES Module bundlers/runtimes
const xlsxInstance: any = typeof XLSX.readFile === 'function' ? XLSX : ((XLSX as any).default || XLSX);

const DB_PATH = path.join(process.cwd(), 'db.json');

export async function syncDatabaseAtBoot(): Promise<void> {
  const propertyId = 'terra_altaya';
  try {
    const snap = await get(ref(serverRtdb, `properties/${propertyId}`));
    if (snap.exists()) {
      const data = snap.val();
      if (!data.tariffs) data.tariffs = {};
      if (!data.correctionLog) data.correctionLog = [];
      if (!data.imports) data.imports = [];
      if (!data.revenueData) data.revenueData = [];
      if (!data.priceData) data.priceData = [];
      if (!data.mappings) data.mappings = [];
      
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Successfully synchronized database for ${propertyId} from cloud storage.`);
    } else {
      console.log(`No cloud database found for ${propertyId}, constructing fresh defaults.`);
      const initial = getInitialDatabase();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error("Critical Cloud Database synchronization failed at boot:", err);
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(getInitialDatabase(), null, 2), 'utf-8');
    }
  }
}

// Interface of database on disk
export interface LocalDatabase {
  imports: ImportRun[];
  revenueData: RevenueData[];
  priceData: PriceData[];
  mappings: CategoryMapping[];
  correctionLog: CorrectionLog[];
  // Manual tariff overrides for calendar/tariffs screen
  tariffs: { [category: string]: { [date: string]: number } };
}

export function normalizeText(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

export function normalizeUnitName(str: string): string {
  if (!str) return '';
  let cleaned = str.replace(/\s+/g, '').trim();
  const firstChar = cleaned.charAt(0);
  const remaining = cleaned.slice(1);
  
  if (/^[A-Za-zА-Яа-я]\d+$/.test(cleaned)) {
    let canonicalFirst = firstChar;
    const lower = firstChar.toLowerCase();
    if (lower === 'c' || lower === 'с') canonicalFirst = 'С';
    else if (lower === 'f' || lower === 'ф') canonicalFirst = 'F';
    else if (lower === 't' || lower === 'т') canonicalFirst = 'Т';
    else if (lower === 'm' || lower === 'м') canonicalFirst = 'М';
    else if (lower === 'a' || lower === 'а') canonicalFirst = 'А';
    else if (lower === 'k' || lower === 'к') canonicalFirst = 'К';
    else if (lower === 'p' || lower === 'п') canonicalFirst = 'П';
    
    return canonicalFirst + remaining;
  }
  return cleaned;
}

export function getAltaiTodayStr(): string {
  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000;
  const utcTime = now.getTime() + utcOffset;
  const altaiDate = new Date(utcTime + (7 * 3600000));
  const yyyy = altaiDate.getFullYear();
  const mm = String(altaiDate.getMonth() + 1).padStart(2, '0');
  const dd = String(altaiDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_MAPPINGS: CategoryMapping[] = [
  { reportCategory: 'Ф-Frame', priceListCategory: 'А-Фрейм' },
  { reportCategory: 'Сафаритент', priceListCategory: 'Сафари-Тент' },
  { reportCategory: 'Мотель/студия на горе', priceListCategory: 'Студия на горе' },
  { reportCategory: 'Студия', priceListCategory: 'Студия у реки' },
  { reportCategory: 'Полусфера Neodome', priceListCategory: 'Полусфера Neodome' },
  { reportCategory: 'Апартаменты', priceListCategory: 'Апартаменты' },
  { reportCategory: 'Эко-Студия', priceListCategory: 'Эко-Студия' },
  { reportCategory: 'Эко-Шале', priceListCategory: 'Эко-Шале' },
  { reportCategory: 'Купол', priceListCategory: 'Купол' }
];

export function getInitialDatabase(): LocalDatabase {
  return {
    imports: [],
    revenueData: [],
    priceData: [],
    mappings: [...DEFAULT_MAPPINGS],
    correctionLog: [],
    tariffs: {}
  };
}

export function readDatabase(): LocalDatabase {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(data) as LocalDatabase;
      
      let needsWrite = false;

      // Clean up mappings
      if (Array.isArray(db.mappings)) {
        db.mappings.forEach(m => {
          const normR = normalizeText(m.reportCategory);
          let normP = normalizeText(m.priceListCategory);
          // Remove suffix if found
          normP = normP.replace(' (без завтрака)', '');
          if (m.reportCategory !== normR || m.priceListCategory !== normP) {
            m.reportCategory = normR;
            m.priceListCategory = normP;
            needsWrite = true;
          }
        });
        
        // Ensure default mappings exist if completely clean/empty mappings
        if (db.mappings.length === 0) {
          db.mappings = [...DEFAULT_MAPPINGS];
          needsWrite = true;
        }
      }

      // Standardize and de-duplicate existing revenue entries
      if (Array.isArray(db.revenueData)) {
        db.revenueData.forEach(r => {
          const normUnit = normalizeText(r.unitName);
          const normCat = normalizeText(r.sourceCategory);
          if (r.unitName !== normUnit || r.sourceCategory !== normCat) {
            r.unitName = normUnit;
            r.sourceCategory = normCat;
            needsWrite = true;
          }
        });

        // De-duplicate
        const seen = new Set<string>();
        const uniqueRevenue: RevenueData[] = [];
        db.revenueData.forEach(r => {
          const key = `${r.date}_${r.unitName}`;
          if (seen.has(key)) {
            const existing = uniqueRevenue.find(x => x.date === r.date && x.unitName === r.unitName);
            if (existing) {
              existing.actualRevenue = Math.max(existing.actualRevenue, r.actualRevenue);
              existing.isEmpty = existing.isEmpty ? r.isEmpty : false;
            }
            needsWrite = true;
          } else {
            seen.add(key);
            uniqueRevenue.push(r);
          }
        });
        if (db.revenueData.length !== uniqueRevenue.length) {
          db.revenueData = uniqueRevenue;
          needsWrite = true;
        }
      }

      // Standardize and de-duplicate existing price entries
      if (Array.isArray(db.priceData)) {
        db.priceData.forEach(p => {
          const normCat = normalizeText(p.category);
          if (p.category !== normCat) {
            p.category = normCat;
            needsWrite = true;
          }
        });

        const seenPrices = new Set<string>();
        const uniquePrice: PriceData[] = [];
        db.priceData.forEach(p => {
          const key = `${p.date}_${p.category}`;
          if (seenPrices.has(key)) {
            const existing = uniquePrice.find(x => x.date === p.date && x.category === p.category);
            if (existing && existing.price === 0 && p.price > 0) {
              existing.price = p.price;
            }
            needsWrite = true;
          } else {
            seenPrices.add(key);
            uniquePrice.push(p);
          }
        });
        if (db.priceData.length !== uniquePrice.length) {
          db.priceData = uniquePrice;
          needsWrite = true;
        }
      }

      if (needsWrite) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      }

      return db;
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  return getInitialDatabase();
}

export function writeDatabase(db: LocalDatabase) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    // Asynchronous background sync to Firebase
    set(ref(serverRtdb, 'properties/terra_altaya'), db).catch(e => console.error("Firebase write error:", e));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Robust helper functions for Excel date parsing
export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30. If serial number, translate to Date
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = val.toString().trim();
  const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const y = year.toString();
    const m = month.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

// Parses Price List Period Header ("12.01-30.04.26")
export interface DatePeriod {
  original: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export function parsePeriodHeader(header: string, defaultYear = 2026): DatePeriod | null {
  if (!header) return null;
  const cleaned = header.trim().replace(/\s+/g, '');
  const parts = cleaned.split('-');
  if (parts.length !== 2) return null;

  let startStr = parts[0];
  let endStr = parts[1];

  // Try to match end date e.g. "30.04.26" or "30.04.2026"
  const endMatch = endStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!endMatch) return null;

  let endDay = parseInt(endMatch[1], 10);
  let endMonth = parseInt(endMatch[2], 10);
  let endYear = parseInt(endMatch[3], 10);
  if (endYear < 100) endYear += 2000;

  // Try to match start date e.g. "12.01" or "12.01.26"
  const startMatch = startStr.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
  if (!startMatch) return null;

  let startDay = parseInt(startMatch[1], 10);
  let startMonth = parseInt(startMatch[2], 10);
  let startYear = endYear;
  if (startMatch[3]) {
    startYear = parseInt(startMatch[3], 10);
    if (startYear < 100) startYear += 2000;
  } else {
    // If startMonth exceeds endMonth, it belongs to the previous year of endYear
    if (startMonth > endMonth) {
      startYear = endYear - 1;
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    original: header,
    startDate: `${startYear}-${pad(startMonth)}-${pad(startDay)}`,
    endDate: `${endYear}-${pad(endMonth)}-${pad(endDay)}`
  };
}

// Expands Period to Daily map of dates
export function expandPeriodToDays(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    const d = current.getDate().toString().padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function decodeCp1251(buf: Buffer): string {
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else {
      if (c >= 192 && c <= 255) {
        out += String.fromCharCode(c + 848); // 1040 is Cyrillic 'А'
      } else if (c === 168) {
        out += 'Ё';
      } else if (c === 184) {
        out += 'ё';
      } else if (c === 150) {
        out += '–';
      } else {
        out += '?';
      }
    }
  }
  return out;
}

// Core Excel & CSV parser triggered on upload
export function parseBnovoReport(filePath: string, fileName: string, uploadedBy: string): {
  importRun: ImportRun;
  parsedRevenue: RevenueData[];
  reconciliationCheck: { expectedTotal: number; calculatedTotal: number; matches: boolean };
} {
  let rawRows: any[][] = [];
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const buffer = fs.readFileSync(filePath);
    let isUtf8 = true;
    const utf8Str = buffer.toString('utf8');
    
    if (utf8Str.includes('\uFFFD')) {
      isUtf8 = false;
    } else {
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] >= 192 && (buffer[i+1] < 128 || buffer[i+1] > 191)) {
          isUtf8 = false;
          break;
        }
      }
    }

    const content = isUtf8 ? utf8Str.replace(/^\uFEFF/, '') : decodeCp1251(buffer);
    const lines = content.split(/\r?\n/);
    const separator = content.includes(';') ? ';' : ',';

    rawRows = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        return line.split(separator).map(cell => {
          let val = cell.trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).trim();
          }
          return val;
        });
      });
  } else {
    const workbook = xlsxInstance.readFile(filePath);
    const sheetName = 'Доход';
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Лист '${sheetName}' не найден в файле годового отчета. Пожалуйста, загрузите верный файл XLS.`);
    }

    rawRows = xlsxInstance.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rawRows.length < 3) {
    throw new Error('Файл отчета слишком короткий или поврежден. Требуется минимум 3 строки.');
  }

  const row1 = rawRows[0];
  const row2 = rawRows[1];

  // Track categories in row 1
  let currentCategory = '';
  const colCategoryMap: { [colIndex: number]: string } = {};
  const maxCols = row2.length;

  for (let c = 2; c < maxCols; c++) {
    const val = row1[c];
    if (val && val.toString().trim() !== '') {
      currentCategory = normalizeText(val.toString().trim());
    }
    colCategoryMap[c] = currentCategory;
  }

  // Track unit names in row 2
  const colUnitMap: { [colIndex: number]: string } = {};
  for (let c = 2; c < maxCols; c++) {
    const val = row2[c];
    const cleanVal = val ? normalizeText(val.toString().trim()) : '';
    const valLower = cleanVal.toLowerCase();
    if (
      valLower.includes('итого') ||
      valLower.includes('всего') ||
      valLower.includes('сумма') ||
      valLower.includes('среднее') ||
      valLower.includes('разниц') ||
      valLower.includes('всего за проживание') ||
      valLower.includes('всего по категории') ||
      cleanVal === ''
    ) {
      continue;
    }
    colUnitMap[c] = normalizeUnitName(cleanVal);
  }

  const parsedRevenue: RevenueData[] = [];
  const warnings: string[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  let expectedTotal = 0;
  let calculatedTotal = 0;

  // Process rows from index 2 represents data starting at row 3
  for (let r = 2; r < rawRows.length; r++) {
    const rData = rawRows[r];
    if (!rData || rData.length === 0) continue;

    const dateVal = rData[0];
    if (!dateVal) continue;

    const labelStr = dateVal.toString().trim().toLowerCase();
    if (labelStr.includes('итого') || labelStr.includes('всего') || labelStr.includes('сумма')) {
      const totalCell = rData[rData.length - 1];
      if (totalCell !== undefined && totalCell !== '') {
        const cleanVal = totalCell.toString().replace(/[\s\xa0]/g, '').replace(',', '.');
        expectedTotal = parseFloat(cleanVal) || 0;
      }
      continue;
    }

    const isoDate = parseExcelDate(dateVal);
    if (!isoDate) {
      if (r < rawRows.length - 2) {
        warnings.push(`Строка ${r + 1}: не удалось распознать дату '${dateVal}'`);
      }
      continue;
    }

    if (!periodStart || isoDate < periodStart) periodStart = isoDate;
    if (!periodEnd || isoDate > periodEnd) periodEnd = isoDate;

    const weekdayStr = rData[1] ? rData[1].toString().trim() : '';

    // Walk columns from index 2 to maxCols index (all physical units)
    for (let col = 2; col < maxCols; col++) {
      const uName = colUnitMap[col];
      const category = colCategoryMap[col];
      if (!uName) continue;

      const rawVal = rData[col];
      
      const isEmptyCell = rawVal === '' || rawVal === null || rawVal === undefined || 
        (typeof rawVal === 'string' && (rawVal.trim() === '' || rawVal.trim() === '-' || rawVal.trim() === '–'));

      let amount = 0;
      if (!isEmptyCell) {
        if (typeof rawVal === 'number') {
          amount = rawVal;
        } else {
          const cleanVal = rawVal.toString().replace(/[\s\xa0]/g, '').replace(',', '.');
          const parsed = parseFloat(cleanVal);
          amount = isNaN(parsed) ? 0 : parsed;
        }
      }

      parsedRevenue.push({
        date: isoDate,
        weekday: weekdayStr,
        sourceCategory: category,
        unitName: uName,
        actualRevenue: amount,
        importId: '',
        isEmpty: isEmptyCell
      });

      calculatedTotal += amount;
    }
  }

  const importId = 'imp_' + Date.now();
  parsedRevenue.forEach(rev => rev.importId = importId);

  const importRun: ImportRun = {
    id: importId,
    fileName,
    fileType: 'yearly_revenue_report',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    rowsParsed: parsedRevenue.length,
    rowsInserted: 0,
    rowsUpdated: 0,
    warnings,
    errors: [],
    status: 'pending_confirmation'
  };

  return {
    importRun,
    parsedRevenue,
    reconciliationCheck: {
      expectedTotal,
      calculatedTotal,
      matches: Math.abs(expectedTotal - calculatedTotal) < 10.0
    }
  };
}

export function parsePriceList(filePath: string, fileName: string, uploadedBy: string): {
  importRun: ImportRun;
  parsedPrices: PriceData[];
  categories: string[];
} {
  const workbook = xlsxInstance.readFile(filePath);
  const sheetName = 'Прайслист';
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Лист '${sheetName}' не найден в файле прайслиста. Убедитесь, что лист переименован в 'Прайслист'.`);
  }

  const rawRows: any[][] = xlsxInstance.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('Файл прайс-листа пуст или содержит только одну строку.');
  }

  const headers = rawRows[0];
  const periods: { colIndex: number; period: DatePeriod }[] = [];
  const warnings: string[] = [];

  for (let c = 2; c < headers.length; c++) {
    const hVal = headers[c];
    if (hVal && hVal.toString().trim() !== '') {
      const period = parsePeriodHeader(hVal.toString());
      if (period) {
        periods.push({ colIndex: c, period });
      } else {
        warnings.push(`Колонка ${c + 1}: заголовок '${hVal}' не соответствует формату периода (ДД.ММ-ДД.ММ.ГГ)`);
      }
    }
  }

  const parsedPrices: PriceData[] = [];
  const categories: string[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  const importId = 'imp_' + Date.now();

  interface CategoryRow {
    rawRow: any[];
    originalName: string;
    canonicalName: string;
  }
  const groupedRows: { [canonicalName: string]: CategoryRow[] } = {};

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const originalName = row[0] ? row[0].toString().trim() : '';
    if (!originalName || originalName.toLowerCase().includes('наименование')) continue;

    const canonicalName = normalizeText(originalName)
      .replace(/\s*\(без завтрака\)\s*/gi, '')
      .replace(/\s*\(с завтраком\)\s*/gi, '')
      .trim();

    if (!groupedRows[canonicalName]) {
      groupedRows[canonicalName] = [];
    }
    groupedRows[canonicalName].push({
      rawRow: row,
      originalName,
      canonicalName
    });
  }

  for (const [canonicalName, rowList] of Object.entries(groupedRows)) {
    let selected = rowList[0];
    if (rowList.length > 1) {
      const withoutBreakfast = rowList.find(row => row.originalName.toLowerCase().includes('без завтрака'));
      if (withoutBreakfast) {
        selected = withoutBreakfast;
      }
    }

    categories.push(canonicalName);

    const row = selected.rawRow;

    for (const { colIndex, period } of periods) {
      if (!periodStart || period.startDate < periodStart) periodStart = period.startDate;
      if (!periodEnd || period.endDate > periodEnd) periodEnd = period.endDate;

      const rawVal = row[colIndex];
      
      const isEmpty = rawVal === '' || rawVal === null || rawVal === undefined || 
        (typeof rawVal === 'string' && (rawVal.trim() === '' || rawVal.trim() === '-' || rawVal.trim() === '–'));

      if (isEmpty) {
        continue;
      }

      let amount = 0;
      if (typeof rawVal === 'number') {
        amount = rawVal;
      } else {
        const cleanVal = rawVal.toString().replace(/[\s\xa0]/g, '').replace(',', '.');
        const parsed = parseFloat(cleanVal);
        amount = isNaN(parsed) ? 0 : parsed;
      }

      const days = expandPeriodToDays(period.startDate, period.endDate);
      for (const day of days) {
        parsedPrices.push({
          category: canonicalName,
          originalCategory: selected.originalName,
          date: day,
          price: amount,
          importId
        });
      }
    }
  }

  const importRun: ImportRun = {
    id: importId,
    fileName,
    fileType: 'price_list',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    rowsParsed: parsedPrices.length,
    rowsInserted: 0,
    rowsUpdated: 0,
    warnings,
    errors: [],
    status: 'pending_confirmation'
  };

  return {
    importRun,
    parsedPrices,
    categories
  };
}

// Function to calculate exact Revenue metrics for a day
export interface DayMetricsCategory {
  category: string;
  activeUnits: number;
  occupiedUnits: number;
  freeUnits: number;
  dailyPrice: number;
  potentialRevenue: number;
  actualRevenue: number;
  lostRevenue: number;
  vacantValue: number;
}

export interface DayMetrics {
  date: string;
  weekday: string;
  potentialRevenue: number;
  actualRevenue: number;
  lostRevenue: number;
  occupiedUnits: number;
  activeUnits: number;
  freeUnits: number;
  vacantValue: number;
  categories: DayMetricsCategory[];
}

export function calculateMetricsForDay(
  date: string,
  revenueList: RevenueData[],
  priceList: PriceData[],
  mappings: CategoryMapping[],
  tariffs: { [category: string]: { [date: string]: number } }
): DayMetrics {
  const metrics: DayMetrics = {
    date,
    weekday: '',
    potentialRevenue: 0,
    actualRevenue: 0,
    lostRevenue: 0,
    occupiedUnits: 0,
    activeUnits: 0,
    freeUnits: 0,
    vacantValue: 0,
    categories: []
  };

  // Filter revenue records for this date
  const dayRevenuesRaw = revenueList.filter(r => r.date === date);
  if (dayRevenuesRaw.length > 0) {
    metrics.weekday = dayRevenuesRaw[0].weekday;
  }

  // Get distinct source categories
  const sourceCategories = Array.from(new Set(dayRevenuesRaw.map(r => r.sourceCategory)));

  // Group revenues by unit-name to avoid duplicates from multiple imports
  const unitRevenues: { [unit: string]: RevenueData } = {};
  dayRevenuesRaw.forEach(r => {
    unitRevenues[r.unitName] = r;
  });

  const dayRevenues = Object.values(unitRevenues);

  // Create mappings dictionary
  const mapDict: { [reportCat: string]: string } = {};
  mappings.forEach(m => {
    mapDict[m.reportCategory] = m.priceListCategory;
  });

  // Let's analyze metric on category level
  sourceCategories.forEach(sourceCat => {
    const unitsOfCat = dayRevenues.filter(r => r.sourceCategory === sourceCat);
    const mappedPriceCat = mapDict[sourceCat] || sourceCat;

    // Get price for this day and mapped category
    // Manual tariffs override standard parsed prices
    let dailyPrice = 0;
    if (tariffs[mappedPriceCat] && tariffs[mappedPriceCat][date] !== undefined) {
      dailyPrice = tariffs[mappedPriceCat][date];
    } else {
      const priceRecord = priceList.find(p => p.category === mappedPriceCat && p.date === date);
      dailyPrice = priceRecord ? priceRecord.price : 0;
    }

    const activeUnits = unitsOfCat.length;
    // Occupied are those rooms with actualRevenue > 0 and which are not marked empty
    const occupiedUnits = unitsOfCat.filter(u => u.actualRevenue > 0 && !(u.isEmpty ?? false)).length;
    const freeUnits = Math.max(activeUnits - occupiedUnits, 0);

    const potentialRev = activeUnits * dailyPrice;
    const actualRevSum = unitsOfCat.reduce((sum, u) => sum + u.actualRevenue, 0);
    const lostRev = Math.max(potentialRev - actualRevSum, 0);
    const vacantValue = freeUnits * dailyPrice;

    metrics.categories.push({
      category: sourceCat,
      activeUnits,
      occupiedUnits,
      freeUnits,
      dailyPrice,
      potentialRevenue: potentialRev,
      actualRevenue: actualRevSum,
      lostRevenue: lostRev,
      vacantValue
    });

    metrics.potentialRevenue += potentialRev;
    metrics.actualRevenue += actualRevSum;
    metrics.lostRevenue += lostRev;
    metrics.occupiedUnits += occupiedUnits;
    metrics.activeUnits += activeUnits;
    metrics.freeUnits += freeUnits;
    metrics.vacantValue += vacantValue;
  });

  return metrics;
}

// Generates Demo Data for testing & evaluation when DB is empty
export function populateDemoData(): LocalDatabase {
  const db = getInitialDatabase();

  const startDateStr = '2026-05-01';
  const endDateStr = '2026-08-31';
  const dates = expandPeriodToDays(startDateStr, endDateStr);

  const units = [
    { cat: 'Эко-Шале', units: ['Эко-Шале 1', 'Эко-Шале 2'] },
    { cat: 'Полусфера Neodome', units: ['П01', 'П02', 'П03'] },
    { cat: 'Ф-Frame', units: ['F01', 'F02'] },
    { cat: 'Сафаритент', units: ['Т01', 'Т02', 'Т03', 'Т04'] },
    { cat: 'Купол', units: ['К01', 'К02', 'К03', 'К04'] },
    { cat: 'Мотель/студия на горе', units: ['M01', 'М02', 'М03', 'М04'] },
    { cat: 'Апартаменты', units: ['А01', 'А02', 'А03', 'А04', 'А05'] },
    { cat: 'Эко-Студия', units: ['Эко-Студия 1', 'Эко-Студия 2', 'Эко-Студия 3', 'Эко-Студия 4', 'Эко-Студия 5', 'Эко-Студия 6', 'Эко-Студия 7', 'Эко-Студия 8'] },
    { cat: 'Студия', units: Array.from({ length: 18 }, (_, idx) => `C${(idx + 1).toString().padStart(2, '0')}`) }
  ];

  const mapDict: { [reportCat: string]: string } = {};
  db.mappings.forEach(m => {
    mapDict[m.reportCategory] = m.priceListCategory;
  });

  // Base prices for price list categories on May, June, July, August 2026
  const basePrices: { [cat: string]: { spring: number; summer: number } } = {
    'А-Фрейм': { spring: 10000, summer: 14000 },
    'Сафари-Тент': { spring: 7000, summer: 10000 },
    'Студия на горе': { spring: 9000, summer: 12000 },
    'Купол': { spring: 11000, summer: 15000 },
    'Студия у реки': { spring: 8000, summer: 11000 },
    'Полусфера Neodome': { spring: 12000, summer: 16000 },
    'Апартаменты': { spring: 15000, summer: 20000 },
    'Эко-Студия': { spring: 9000, summer: 13000 },
    'Эко-Шале': { spring: 18000, summer: 24000 }
  };

  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const revenueList: RevenueData[] = [];
  const priceList: PriceData[] = [];

  const bnovoImpId = 'demo_imp_bnovo';
  const priceImpId = 'demo_imp_prices';

  dates.forEach(dayStr => {
    const dateObj = new Date(dayStr);
    const isSummer = dateObj.getMonth() >= 5 && dateObj.getMonth() <= 7; // June, July, August (5,6,7)
    const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6; // Fri, Sat
    const weekday = weekdays[dateObj.getDay()];

    // Generate price-list prices
    Object.keys(basePrices).forEach(catName => {
      let price = isSummer ? basePrices[catName].summer : basePrices[catName].spring;
      if (isWeekend) price = Math.round(price * 1.2 / 500) * 500; // 20% weekend markup rounded

      priceList.push({
        category: normalizeText(catName),
        date: dayStr,
        price,
        importId: priceImpId
      });
    });

    // Generate actual revenue and occupancies
    units.forEach(uGroup => {
      const mappedPriceCat = normalizeText(mapDict[normalizeText(uGroup.cat)] || mapDict[uGroup.cat] || uGroup.cat);
      const pRecord = priceList.find(p => p.category === mappedPriceCat && p.date === dayStr);
      const unitPrice = pRecord ? pRecord.price : 10000;

      // Occupancy depends on month and weekday
      let baseOcc = 0.5; // low occupancy spring weekdays
      if (isSummer) baseOcc += 0.25; // summer peak
      if (isWeekend) baseOcc += 0.2; // weekend boost

      uGroup.units.forEach(uName => {
        let isOccupied = false;
        let revAmount = 0;

        if (dayStr === '2026-06-15') {
          // Exactly 68500 total actual revenue split over 7 occupied rooms
          // 1. Студия 01 (C01) -> 8000
          // 2. Студия 02 (C02) -> 8000
          // 3. Студия 03 (C03) -> 11500
          // 4. Студия 04 (C04) -> 8000
          // 5. Эко-Студия 1 -> 13000
          // 6. Мотель/студия на горе 1 (M01) -> 10000
          // 7. Сафаритент 1 (Т01) -> 10000
          // Total: 8000 + 8000 + 11500 + 8000 + 13000 + 10000 + 10000 = 68500
          if (uGroup.cat === 'Студия' && uName === 'C01') {
            isOccupied = true;
            revAmount = 8000;
          } else if (uGroup.cat === 'Студия' && uName === 'C02') {
            isOccupied = true;
            revAmount = 8000;
          } else if (uGroup.cat === 'Студия' && uName === 'C03') {
            isOccupied = true;
            revAmount = 11500;
          } else if (uGroup.cat === 'Студия' && uName === 'C04') {
            isOccupied = true;
            revAmount = 8000;
          } else if (uGroup.cat === 'Эко-Студия' && uName === 'Эко-Студия 1') {
            isOccupied = true;
            revAmount = 13000;
          } else if (uGroup.cat === 'Мотель/студия на горе' && uName === 'M01') {
            isOccupied = true;
            revAmount = 10000;
          } else if (uGroup.cat === 'Сафаритент' && uName === 'Т01') {
            isOccupied = true;
            revAmount = 10000;
          }
        } else if (dayStr >= '2026-06-01' && dayStr <= '2026-06-14') {
          // Exactly 46% of the 700 rooms should be occupied (322/700)
          const allJune14 = dates.filter(d => d >= '2026-06-01' && d <= '2026-06-14');
          const dayIndex = allJune14.indexOf(dayStr);
          let flatUnitIndex = 0;
          for (let g = 0; g < units.length; g++) {
            if (units[g].cat === uGroup.cat) {
              const uIdx = units[g].units.indexOf(uName);
              flatUnitIndex += uIdx;
              break;
            } else {
              flatUnitIndex += units[g].units.length;
            }
          }
          const uniqueKeyIndex = dayIndex * 50 + flatUnitIndex;
          if ((uniqueKeyIndex * 322) % 700 < 322) {
            isOccupied = true;
          }
          if (isOccupied) {
            const rand = Math.random();
            if (rand < 0.1) revAmount = Math.round(unitPrice * 0.9);
            else revAmount = unitPrice;
          }
        } else if (dayStr < '2026-06-15') {
          isOccupied = Math.random() < baseOcc;
          if (isOccupied) {
            const rand = Math.random();
            if (rand < 0.1) revAmount = Math.round(unitPrice * 0.9);
            else revAmount = unitPrice;
          }
        } else {
          // Future dates should not have actual revenue in demo data 
          // because it confuses the user ("bookings happen in real time").
          isOccupied = false;
          revAmount = 0;
        }

        revenueList.push({
          date: dayStr,
          weekday,
          sourceCategory: normalizeText(uGroup.cat),
          unitName: normalizeText(uName),
          actualRevenue: revAmount,
          importId: bnovoImpId,
          isEmpty: !isOccupied
        });
      });
    });
  });

  db.imports = [
    {
      id: bnovoImpId,
      fileName: '14502_services_report_20260615004653_1.xls',
      fileType: 'yearly_revenue_report',
      uploadedBy: 'Администратор (Демо)',
      uploadedAt: new Date().toISOString(),
      periodStart: startDateStr,
      periodEnd: endDateStr,
      rowsParsed: revenueList.length,
      rowsInserted: revenueList.length,
      rowsUpdated: 0,
      warnings: [],
      errors: [],
      status: 'confirmed'
    },
    {
      id: priceImpId,
      fileName: 'Прайслист Размещение и мониторинг цен конкурентов от 05.06.26.xlsx',
      fileType: 'price_list',
      uploadedBy: 'Администратор (Демо)',
      uploadedAt: new Date().toISOString(),
      periodStart: startDateStr,
      periodEnd: endDateStr,
      rowsParsed: priceList.length,
      rowsInserted: priceList.length,
      rowsUpdated: 0,
      warnings: [],
      errors: [],
      status: 'confirmed'
    }
  ];

  db.revenueData = revenueList;
  db.priceData = priceList;

  writeDatabase(db);
  return db;
}

export function mergeRevenueData(
  db: LocalDatabase,
  newData: RevenueData[],
  sourceFile: string,
  user: string
): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;

  newData.forEach(newItem => {
    newItem.unitName = normalizeUnitName(newItem.unitName);
    newItem.sourceCategory = normalizeText(newItem.sourceCategory);

    const existingIdx = db.revenueData.findIndex(
      r => r.date === newItem.date && r.unitName === newItem.unitName
    );

    if (existingIdx !== -1) {
      const existingItem = db.revenueData[existingIdx];
      if (existingItem.actualRevenue !== newItem.actualRevenue || existingItem.isEmpty !== newItem.isEmpty) {
        db.correctionLog.push({
          id: 'corr_' + Math.random().toString(36).substring(2, 11),
          date: newItem.date,
          entityType: 'revenue',
          entityId: newItem.unitName,
          fieldName: 'actualRevenue',
          oldValue: existingItem.actualRevenue,
          newValue: newItem.actualRevenue,
          sourceFile,
          user,
          changedAt: new Date().toISOString()
        });
        
        db.revenueData[existingIdx] = {
          ...existingItem,
          actualRevenue: newItem.actualRevenue,
          sourceCategory: newItem.sourceCategory,
          isEmpty: newItem.isEmpty,
          importId: newItem.importId
        };
        updated++;
      }
    } else {
      db.revenueData.push(newItem);
      inserted++;
    }
  });

  return { inserted, updated };
}

export function mergePriceData(
  db: LocalDatabase,
  newData: PriceData[],
  sourceFile: string,
  user: string
): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;

  newData.forEach(newItem => {
    newItem.category = normalizeText(newItem.category);

    const existingIdx = db.priceData.findIndex(
      p => p.date === newItem.date && p.category === newItem.category
    );

    if (existingIdx !== -1) {
      const existingItem = db.priceData[existingIdx];
      if (existingItem.price !== newItem.price) {
        db.correctionLog.push({
          id: 'corr_' + Math.random().toString(36).substring(2, 11),
          date: newItem.date,
          entityType: 'price',
          entityId: newItem.category,
          fieldName: 'price',
          oldValue: existingItem.price,
          newValue: newItem.price,
          sourceFile,
          user,
          changedAt: new Date().toISOString()
        });
        
        db.priceData[existingIdx] = {
          ...existingItem,
          price: newItem.price,
          originalCategory: newItem.originalCategory || existingItem.originalCategory,
          importId: newItem.importId
        };
        updated++;
      }
    } else {
      db.priceData.push(newItem);
      inserted++;
    }
  });

  return { inserted, updated };
}

export function parseBookingsReport(filePath: string, managerOverride?: string): any[] {
  let rawRows: any[][] = [];
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const buffer = fs.readFileSync(filePath);
    let isUtf8 = true;
    const utf8Str = buffer.toString('utf8');
    if (utf8Str.includes('\uFFFD')) {
      isUtf8 = false;
    }
    const content = isUtf8 ? utf8Str.replace(/^\uFEFF/, '') : decodeCp1251(buffer);
    const lines = content.split(/\r?\n/);
    const separator = content.includes(';') ? ';' : ',';

    rawRows = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.split(separator).map(cell => cell.trim()));
  } else {
    const workbook = xlsxInstance.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // first sheet
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Лист не найден в файле Excel.`);
    }
    rawRows = xlsxInstance.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rawRows.length < 2) {
    return [];
  }

  // Find the header row (the first row containing keywords like "код" or "номер")
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const row = rawRows[i].map(c => String(c || '').toLowerCase());
    if (row.some(c => c.includes('код') || c.includes('бронир') || c.includes('order') || c.includes('id') || c.includes('guest') || c.includes('гость'))) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(h => String(h || '').toLowerCase().trim());

  // Finding column indices
  const findIndex = (keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxCode = findIndex(['код', 'бронир', 'order', 'id', 'code', 'номер брони']);
  const idxSource = findIndex(['источник', 'source', 'канал', 'channel']);
  const idxBookingDate = findIndex(['дата бр', 'создано', 'created', 'booking date', 'дата создания']);
  const idxCancelDate = findIndex(['отмен', 'cancel', 'дата отмены']);
  const idxCheckIn = findIndex(['заезд', 'checkin', 'check-in', 'прибытие', 'дата заезда']);
  const idxCheckOut = findIndex(['выезд', 'checkout', 'check-out', 'отъезд', 'дата выезда']);
  const idxCategory = findIndex(['категор', 'тип ном', 'category']);
  const idxRoomNum = findIndex(['номер ком', 'комната', 'номер', 'room', 'unit']);
  const idxGuest = findIndex(['гость', 'клиент', 'фио', 'guest', 'fio']);
  const idxAdults = findIndex(['взросл', 'adults']);
  const idxChildren = findIndex(['дети', 'children']);
  const idxBalance = findIndex(['баланс', 'оплачено', 'balance', 'paid']);
  const idxTotal = findIndex(['сумма', 'стоимость', 'total', 'price', 'revenue', 'итого', 'всего', 'к оплате', 'цена']);
  const idxManager = findIndex(['менеджер', 'продажник', 'создал', 'manager', 'creator', 'user']);

  const parsedBookings: any[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    // Skip empty lines
    if (!row || row.length === 0 || (idxCode !== -1 && !row[idxCode])) continue;

    const code = idxCode !== -1 ? String(row[idxCode]).trim() : '';
    if (!code) continue;

    const source = idxSource !== -1 ? String(row[idxSource]).trim() : 'Прямой';
    const bookingDate = idxBookingDate !== -1 ? (parseExcelDate(row[idxBookingDate]) || '') : '';
    const rawCancel = idxCancelDate !== -1 ? row[idxCancelDate] : '';
    const cancelDate = rawCancel && String(rawCancel).trim() !== '-' && String(rawCancel).trim() !== '' ? parseExcelDate(rawCancel) : null;
    const checkIn = idxCheckIn !== -1 ? (parseExcelDate(row[idxCheckIn]) || '') : '';
    const checkOut = idxCheckOut !== -1 ? (parseExcelDate(row[idxCheckOut]) || '') : '';
    const category = idxCategory !== -1 ? normalizeText(String(row[idxCategory])) : 'Студия';
    const roomNum = idxRoomNum !== -1 ? String(row[idxRoomNum]).trim() : '';
    const guest = idxGuest !== -1 ? String(row[idxGuest]).trim() : 'Гость';
    const adults = idxAdults !== -1 ? (parseInt(row[idxAdults]) || 1) : 2;
    const children = idxChildren !== -1 ? (parseInt(row[idxChildren]) || 0) : 0;
    
    let balanceVal = 0;
    if (idxBalance !== -1 && row[idxBalance] !== undefined && row[idxBalance] !== '') {
      const cleanVal = String(row[idxBalance]).replace(/[\s\xa0]/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
      balanceVal = parseFloat(cleanVal) || 0;
    }

    let totalVal = 0;
    if (idxTotal !== -1 && row[idxTotal] !== undefined && row[idxTotal] !== '') {
      const cleanVal = String(row[idxTotal]).replace(/[\s\xa0]/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
      totalVal = parseFloat(cleanVal) || 0;
    }

    let manager = '';
    if (managerOverride) {
      manager = managerOverride;
    } else if (idxManager !== -1 && row[idxManager] !== undefined) {
      manager = String(row[idxManager]).trim();
    }

    parsedBookings.push({
      code,
      source,
      bookingDate,
      cancelDate,
      checkIn,
      checkOut,
      category,
      roomNum,
      guest,
      adults,
      children,
      balance: balanceVal,
      total: totalVal,
      manager
    });
  }

  return parsedBookings;
}

