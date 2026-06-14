import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { ImportRun, CorrectionLog, RevenueData, PriceData, CategoryMapping } from './types';

// Safe wrapper for XLSX to handle both CommonJS and ES Module bundlers/runtimes
const xlsxInstance: any = typeof XLSX.readFile === 'function' ? XLSX : ((XLSX as any).default || XLSX);

const DB_PATH = path.join(process.cwd(), 'db.json');

// Interface of database on disk
export interface LocalDatabase {
  imports: ImportRun[];
  revenueData: RevenueData[];
  priceData: PriceData[];
  mappings: CategoryMapping[];
  correctionLog: CorrectionLog[];
  role: 'Admin' | 'Viewer';
  // Manual tariff overrides for calendar/tariffs screen
  tariffs: { [category: string]: { [date: string]: number } };
}

const DEFAULT_MAPPINGS: CategoryMapping[] = [
  { reportCategory: 'Ф-Frame', priceListCategory: 'А-Фрейм (без завтрака)' },
  { reportCategory: 'Сафаритент', priceListCategory: 'Сафари-Тент (без завтрака)' },
  { reportCategory: 'Мотель/студия на горе', priceListCategory: 'Студия на горе (без завтрака)' },
  { reportCategory: 'Студия', priceListCategory: 'Студия у реки' },
  { reportCategory: 'Полусфера Neodome', priceListCategory: 'Полусфера Neodome' },
  { reportCategory: 'Апартаменты', priceListCategory: 'Апартаменты' },
  { reportCategory: 'Эко-Студия', priceListCategory: 'Эко-Студия' },
  { reportCategory: 'Эко-Шале', priceListCategory: 'Эко-Шале' },
  { reportCategory: 'Купол', priceListCategory: 'Купол (без завтрака)' }
];

export function getInitialDatabase(): LocalDatabase {
  return {
    imports: [],
    revenueData: [],
    priceData: [],
    mappings: [...DEFAULT_MAPPINGS],
    correctionLog: [],
    role: 'Admin',
    tariffs: {}
  };
}

export function readDatabase(): LocalDatabase {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
  return getInitialDatabase();
}

export function writeDatabase(db: LocalDatabase) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
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
  let startYear = startMatch[3] ? parseInt(startMatch[3], 10) : endYear;
  if (startYear < 100) startYear += 2000;

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

// Core Excel parser triggered on upload
export function parseBnovoReport(filePath: string, fileName: string, uploadedBy: string): {
  importRun: ImportRun;
  parsedRevenue: RevenueData[];
  reconciliationCheck: { expectedTotal: number; calculatedTotal: number; matches: boolean };
} {
  const workbook = xlsxInstance.readFile(filePath);
  const sheetName = 'Доход';
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Лист '${sheetName}' не найден в файле годового отчета. Пожалуйста, загрузите верный файл XLS.`);
  }

  // Read raw entries as a 2D array
  const rawRows: any[][] = xlsxInstance.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rawRows.length < 3) {
    throw new Error('Файл отчета слишком короткий или поврежден. Требуется минимум 3 строки.');
  }

  const row1 = rawRows[0];
  const row2 = rawRows[1];

  // Track categories in row 1
  let currentCategory = '';
  const colCategoryMap: { [colIndex: number]: string } = {};
  for (let c = 2; c < 52; c++) {
    const val = row1[c];
    if (val && val.toString().trim() !== '') {
      currentCategory = val.toString().trim();
    }
    colCategoryMap[c] = currentCategory;
  }

  // Track unit names in row 2
  const colUnitMap: { [colIndex: number]: string } = {};
  for (let c = 2; c < 52; c++) {
    const val = row2[c];
    colUnitMap[c] = val ? val.toString().trim() : '';
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

    // Check if this is the reconciliation or totals row
    const labelStr = dateVal.toString().trim().toLowerCase();
    if (labelStr.includes('итого') || labelStr.includes('всего') || labelStr.includes('сумма')) {
      // Reconciliations: total lodging revenue is typically at column index 53 (Column 54)
      const totalCell = rData[53];
      if (totalCell !== undefined && totalCell !== '') {
        expectedTotal = parseFloat(totalCell) || 0;
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

    // Walk columns from index 2 to 51 (all 50 physical units)
    for (let col = 2; col < 52; col++) {
      const uName = colUnitMap[col];
      const category = colCategoryMap[col];
      if (!uName) continue;

      const rawVal = rData[col];
      const isEmptyCell = rawVal === '' || rawVal === null || rawVal === undefined || (typeof rawVal === 'string' && rawVal.trim() === '');
      const actualVal = rawVal !== '' ? parseFloat(rawVal) : 0;
      const amount = isNaN(actualVal) ? 0 : actualVal;

      parsedRevenue.push({
        date: isoDate,
        weekday: weekdayStr,
        sourceCategory: category,
        unitName: uName,
        actualRevenue: amount,
        importId: '', // to be filled
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
      matches: Math.abs(expectedTotal - calculatedTotal) < 1.0 // allow minor floating point differences
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

  // Parse headers for periods, starting at column C (index 2)
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

  // Rows 2 onwards are categories
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const catName = row[0] ? row[0].toString().trim() : '';
    if (!catName || catName.toLowerCase().includes('наименование')) continue;

    categories.push(catName);

    // Expand rates for each parsed period
    for (const { colIndex, period } of periods) {
      if (!periodStart || period.startDate < periodStart) periodStart = period.startDate;
      if (!periodEnd || period.endDate > periodEnd) periodEnd = period.endDate;

      const rawVal = row[colIndex];
      const price = rawVal !== '' ? parseFloat(rawVal) : 0;
      const amount = isNaN(price) ? 0 : price;

      const days = expandPeriodToDays(period.startDate, period.endDate);
      for (const day of days) {
        parsedPrices.push({
          category: catName,
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
  const dayRevenues = revenueList.filter(r => r.date === date);
  if (dayRevenues.length > 0) {
    metrics.weekday = dayRevenues[0].weekday;
  }

  // Get distinct source categories
  const sourceCategories = Array.from(new Set(dayRevenues.map(r => r.sourceCategory)));

  // Group revenues by unit-name to avoid duplicates or consolidate
  const unitRevenues: { [unit: string]: RevenueData } = {};
  dayRevenues.forEach(r => {
    unitRevenues[r.unitName] = r;
  });

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
    // Free units represent the number of empty/blank cells in the category
    const freeUnits = unitsOfCat.filter(u => u.isEmpty ?? (u.actualRevenue === 0)).length;
    const occupiedUnits = Math.max(activeUnits - freeUnits, 0);

    const actualRevSum = unitsOfCat.reduce((sum, u) => sum + u.actualRevenue, 0);
    // Lost revenue = empty cells count * price in this period
    const lostRev = freeUnits * dailyPrice;
    // Potential revenue is the sum of actual revenue and lost revenue
    const potentialRev = actualRevSum + lostRev;
    const vacantValue = lostRev;

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
    'А-Фрейм (без завтрака)': { spring: 10000, summer: 14000 },
    'Сафари-Тент (без завтрака)': { spring: 7000, summer: 10000 },
    'Студия на горе (без завтрака)': { spring: 9000, summer: 12000 },
    'Купол (без завтрака)': { spring: 11000, summer: 15000 },
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
        category: catName,
        date: dayStr,
        price,
        importId: priceImpId
      });
    });

    // Generate actual revenue and occupancies
    units.forEach(uGroup => {
      const mappedPriceCat = mapDict[uGroup.cat];
      const pRecord = priceList.find(p => p.category === mappedPriceCat && p.date === dayStr);
      const unitPrice = pRecord ? pRecord.price : 10000;

      // Occupancy depends on month and weekday
      let baseOcc = 0.5; // low occupancy spring weekdays
      if (isSummer) baseOcc += 0.25; // summer peak
      if (isWeekend) baseOcc += 0.2; // weekend boost

      uGroup.units.forEach(uName => {
        const isOccupied = Math.random() < baseOcc;
        let revAmount = 0;
        if (isOccupied) {
          // Actual price paid might match dailyPrice or be slightly discounted occasionally
          const rand = Math.random();
          if (rand < 0.1) revAmount = Math.round(unitPrice * 0.9); // 10% promo discount
          else revAmount = unitPrice;
        }

        revenueList.push({
          date: dayStr,
          weekday,
          sourceCategory: uGroup.cat,
          unitName: uName,
          actualRevenue: revAmount,
          importId: bnovoImpId
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
    const existingIdx = db.revenueData.findIndex(
      r => r.date === newItem.date && r.unitName === newItem.unitName
    );

    if (existingIdx !== -1) {
      const existingItem = db.revenueData[existingIdx];
      if (existingItem.actualRevenue !== newItem.actualRevenue) {
        db.correctionLog.push({
          id: 'corr_' + Math.random().toString(36).substr(2, 9),
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

        db.revenueData[existingIdx].actualRevenue = newItem.actualRevenue;
        db.revenueData[existingIdx].importId = newItem.importId;
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
    const existingIdx = db.priceData.findIndex(
      p => p.date === newItem.date && p.category === newItem.category
    );

    if (existingIdx !== -1) {
      const existingItem = db.priceData[existingIdx];
      if (existingItem.price !== newItem.price) {
        db.correctionLog.push({
          id: 'corr_' + Math.random().toString(36).substr(2, 9),
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

        db.priceData[existingIdx].price = newItem.price;
        db.priceData[existingIdx].importId = newItem.importId;
        updated++;
      }
    } else {
      db.priceData.push(newItem);
      inserted++;
    }
  });

  return { inserted, updated };
}

