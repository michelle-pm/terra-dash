import * as XLSX from 'xlsx';
import { ImportRun, RevenueData, PriceData } from '../types';

export interface DatePeriod {
  original: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Robust helper functions for Excel date parsing
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

export function cleanNumberStr(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  
  const clean = val.toString()
    .replace(/[\s\xa0]/g, '') // remove spaces and non-breaking spaces
    .replace(/₽/g, '')        // remove Ruble icon
    .replace(/руб\.?/g, '')   // remove rub, руб
    .replace(',', '.')        // convert comma to dot
    .trim();
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = (val.getMonth() + 1).toString().padStart(2, '0');
    const d = val.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30. Use UTC values to prevent local offset shifts
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const d = date.getUTCDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
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

export function decodeCp1251(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else {
      if (c >= 192 && c <= 255) {
        out += String.fromCharCode(c + 848); // Cyrillic 'А'
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

// 1. Core Bnovo report parser (XLS, XLSX, CSV)
export async function parseBnovoReportFile(file: File, uploadedBy: string = "Администратор"): Promise<{
  importRun: ImportRun;
  parsedRevenue: RevenueData[];
  reconciliationCheck: { expectedTotal: number; calculatedTotal: number; matches: boolean };
  preview: {
    periodStart: string | null;
    periodEnd: string | null;
    detectedCategories: string[];
    detectedUnits: string[];
    reconciliationCheck: { expectedTotal: number; calculatedTotal: number; matches: boolean };
    warnings: string[];
  };
}> {
  let rawRows: any[][] = [];
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const buffer = await file.arrayBuffer();
    let isUtf8 = true;
    const utf8Decoder = new TextDecoder('utf-8');
    const decodedStr = utf8Decoder.decode(buffer);
    
    if (decodedStr.includes('\uFFFD')) {
      isUtf8 = false;
    }

    const content = isUtf8 ? decodedStr.replace(/^\uFEFF/, '') : decodeCp1251(buffer);
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
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = 'Доход';
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Лист '${sheetName}' не найден в файле годового отчета. Пожалуйста, убедитесь, что в файле есть лист '${sheetName}'.`);
    }

    rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rawRows.length < 3) {
    throw new Error('Файл отчета слишком короткий или поврежден. Требуется минимум 3 строки.');
  }

  const row1 = rawRows[0];
  const row2 = rawRows[1];
  const maxCols = Math.max(row1?.length || 0, row2?.length || 0);

  // Track categories in row 1
  let currentCategory = '';
  const colCategoryMap: { [colIndex: number]: string } = {};

  for (let c = 2; c < maxCols; c++) {
    const val = row1[c];
    if (val && val.toString().trim() !== '') {
      currentCategory = normalizeText(val.toString().trim());
    }
    colCategoryMap[c] = currentCategory;
  }

  // Find 'Всего за проживание' control column
  let controlColIndex = -1;
  const searchTerms = ['всего за проживание', 'всего по категории', 'всего за проживание (сумма)', 'всего'];
  
  for (let term of searchTerms) {
    for (let c = 2; c < maxCols; c++) {
      const r1Val = row1[c] ? normalizeText(row1[c].toString()).toLowerCase().trim() : '';
      const r2Val = row2[c] ? normalizeText(row2[c].toString()).toLowerCase().trim() : '';
      if (r1Val === term || r2Val === term) {
        controlColIndex = c;
        break;
      }
    }
    if (controlColIndex !== -1) break;
  }

  if (controlColIndex === -1) {
    for (let term of searchTerms) {
      for (let c = 2; c < maxCols; c++) {
        const r1Val = row1[c] ? normalizeText(row1[c].toString()).toLowerCase().trim() : '';
        const r2Val = row2[c] ? normalizeText(row2[c].toString()).toLowerCase().trim() : '';
        if (r1Val.includes(term) || r2Val.includes(term)) {
          controlColIndex = c;
          break;
        }
      }
      if (controlColIndex !== -1) break;
    }
  }

  // Track unit names in row 2
  const colUnitMap: { [colIndex: number]: string } = {};
  for (let c = 2; c < maxCols; c++) {
    const val = row2[c];
    if (val === undefined || val === null) continue;
    const cleanVal = normalizeText(val.toString().trim());
    const valLower = cleanVal.toLowerCase();
    
    if (
      c === controlColIndex ||
      cleanVal === '0' ||
      cleanVal === 'Всего за проживание' ||
      valLower === '0' ||
      valLower === 'всего за проживание' ||
      valLower.includes('итого') ||
      valLower.includes('всего') ||
      valLower.includes('сумма') ||
      valLower.includes('среднее') ||
      valLower.includes('разниц') ||
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

  for (let r = 2; r < rawRows.length; r++) {
    const rData = rawRows[r];
    if (!rData || rData.length === 0) continue;

    const dateVal = rData[0];
    if (dateVal === undefined || dateVal === null || dateVal === '') continue;

    const labelStr = dateVal.toString().trim().toLowerCase();
    if (labelStr.includes('итого') || labelStr.includes('всего') || labelStr.includes('сумма') || labelStr.includes('среднее')) {
      const totalCell = rData[rData.length - 1];
      if (totalCell !== undefined && totalCell !== '') {
        expectedTotal = cleanNumberStr(totalCell);
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

    let rowCalculatedTotal = 0;
    const rowControlTotal = controlColIndex !== -1 ? cleanNumberStr(rData[controlColIndex]) : 0;

    for (let col = 2; col < maxCols; col++) {
      const uName = colUnitMap[col];
      const category = colCategoryMap[col];
      if (!uName) continue;

      const rawVal = rData[col];
      const isEmptyCell = rawVal === '' || rawVal === null || rawVal === undefined || 
        (typeof rawVal === 'string' && (rawVal.trim() === '' || rawVal.trim() === '-' || rawVal.trim() === '–'));

      const amount = cleanNumberStr(rawVal);

      parsedRevenue.push({
        date: isoDate,
        weekday: weekdayStr,
        sourceCategory: category,
        unitName: uName,
        actualRevenue: amount,
        importId: '',
        isEmpty: isEmptyCell
      });

      rowCalculatedTotal += amount;
      calculatedTotal += amount;
    }

    const rowDiff = Math.abs(rowCalculatedTotal - rowControlTotal);
    if (controlColIndex !== -1 && rowDiff > 1.1) {
      throw new Error(`Ошибка сверки на дату ${isoDate}: сумма дозагрузки по комнатам (${rowCalculatedTotal.toFixed(0)} руб) отличается от Всего за проживание (${rowControlTotal.toFixed(0)} руб) на ${rowDiff.toFixed(0)} руб (лимит 1.1 рубля).`);
    }
  }

  const uniqueDates = Array.from(new Set(parsedRevenue.map(p => p.date)));
  const uniqueUnits = Array.from(new Set(parsedRevenue.map(p => p.unitName)));
  const uniqueCategories = Array.from(new Set(parsedRevenue.map(p => p.sourceCategory)));

  if (uniqueDates.length > 100) {
    if (uniqueUnits.length !== 50) {
      throw new Error(`Сбой валидации структуры: отчет должен содержать ровно 50 уникальных номеров (найдено ${uniqueUnits.length}).`);
    }
    if (uniqueDates.length !== 365) {
      throw new Error(`Сбой валидации структуры: отчет должен содержать ровно 365 отчетных дат (найдено ${uniqueDates.length}).`);
    }
  }

  const importId = 'imp_' + Date.now();
  parsedRevenue.forEach(rev => rev.importId = importId);

  const importRun: ImportRun = {
    id: importId,
    fileName: file.name,
    fileType: 'yearly_revenue_report',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    rowsParsed: parsedRevenue.length,
    rowsInserted: parsedRevenue.length,
    rowsUpdated: 0,
    warnings,
    errors: [],
    status: 'pending_confirmation'
  };

  const reconciliationCheck = {
    expectedTotal,
    calculatedTotal,
    matches: Math.abs(expectedTotal - calculatedTotal) < 10.0
  };

  return {
    importRun,
    parsedRevenue,
    reconciliationCheck,
    preview: {
      periodStart,
      periodEnd,
      detectedCategories: uniqueCategories,
      detectedUnits: uniqueUnits,
      reconciliationCheck,
      warnings
    }
  };
}

// 2. Core Tariffs price list parser (XLSX, XLS, CSV)
export async function parsePriceListFile(file: File, uploadedBy: string = "Администратор"): Promise<{
  importRun: ImportRun;
  parsedPrices: PriceData[];
  categories: string[];
  preview: {
    periodStart: string | null;
    periodEnd: string | null;
    detectedCategories: string[];
    dailyTariffCount: number;
    warnings: string[];
    isPriceList: boolean;
    format: string;
    categoriesCount: number;
    periodColumnsCount: number;
  };
}> {
  let rawRows: any[][] = [];
  const fileNameLower = file.name.toLowerCase();
  let format = 'xlsx';

  if (fileNameLower.endsWith('.csv')) {
    format = 'csv';
    const buffer = await file.arrayBuffer();
    let isUtf8 = true;
    const utf8Decoder = new TextDecoder('utf-8');
    const decodedStr = utf8Decoder.decode(buffer);
    if (decodedStr.includes('\uFFFD')) {
      isUtf8 = false;
    }
    const content = isUtf8 ? decodedStr.replace(/^\uFEFF/, '') : decodeCp1251(buffer);
    const lines = content.split(/\r?\n/);
    
    // detect delimiter, prefer semicolon
    let separator = ';';
    if (lines.length > 0) {
      const firstLine = lines[0];
      const semiCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      if (commaCount > semiCount) {
        separator = ',';
      }
    }
    
    rawRows = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.split(separator).map(cell => {
        let val = cell.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).trim();
        }
        return val;
      }));
  } else {
    // XLSX or XLS
    format = fileNameLower.endsWith('.xls') ? 'xls' : 'xlsx';
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    let sheet = workbook.Sheets['Прайслист'];
    if (!sheet) {
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      if (firstSheet) {
        const firstSheetRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        if (firstSheetRows.length > 0) {
          const row0 = firstSheetRows[0].map(c => (c || '').toString().trim());
          const hasHeader = row0.includes('Наименование') && row0.includes('Количество');
          if (hasHeader) {
            sheet = firstSheet;
          }
        }
      }
    }
    if (!sheet) {
      throw new Error(`Лист 'Прайслист' не найден в файле прайслиста, и первый лист не содержит заголовков 'Наименование' и 'Количество'.`);
    }
    rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rawRows.length < 2) {
    throw new Error('Файл прайс-листа пуст или содержит недостаточно данных.');
  }

  // Parse headers & periods
  const headers = rawRows[0].map(c => (c || '').toString().trim());
  
  if (!headers.includes('Наименование') || !headers.includes('Количество')) {
    throw new Error(`Файл прайс-листа должен содержать заголовки 'Наименование' и 'Количество'.`);
  }

  const nameColIdx = headers.indexOf('Наименование');
  const qtyColIdx = headers.indexOf('Количество');

  const periods: { colIndex: number; period: DatePeriod }[] = [];
  const warnings: string[] = [];

  for (let c = 0; c < headers.length; c++) {
    if (c === nameColIdx || c === qtyColIdx) continue;
    const hVal = headers[c];
    if (hVal === '') continue; // blank trailing col

    const period = parsePeriodHeader(hVal);
    if (!period) {
      throw new Error(`Недопустимый заголовок периода: '${hVal}' в колонке ${c + 1}. Ожидаемый формат: ДД.ММ-ДД.ММ.ГГ`);
    }
    periods.push({ colIndex: c, period });
  }

  if (periods.length === 0) {
    throw new Error('Колонки периодов не найдены в файле прайс-листа или имеют некорректный формат.');
  }

  const ALLOWED_CATEGORIES = [
    "Сафари-Тент",
    "Купол",
    "Студия на горе",
    "А-Фрейм",
    "Студия у реки",
    "Эко-Студия",
    "Полусфера Neodome",
    "Апартаменты",
    "Эко-Шале"
  ];

  const parsedPrices: PriceData[] = [];
  const categories: string[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  const importId = 'imp_' + Date.now();
  
  const parsedCategoriesSet = new Set<string>();

  const isSkipRow = (val: string): boolean => {
    const v = val.toLowerCase();
    return (
      v.includes('завтрак') ||
      v.includes('breakfast') ||
      v.includes('итого') ||
      v.includes('всего') ||
      v.includes('total') ||
      v.includes('среднее') ||
      v.includes('наименование') ||
      v.includes('количество') ||
      v.includes('мониторинг') ||
      v.includes('конкурент') ||
      v.includes('bnovo')
    );
  };

  const parsePriceValue = (val: any, categoryName: string, periodHeader: string): number | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
      if (isNaN(val)) return null;
      return val;
    }
    const str = val.toString().trim();
    if (str === '' || str === '-' || str === '–') return null;

    let clean = str.replace(/[\s\xa0]/g, '').replace(/₽/g, '').replace(/руб\.?/g, '').trim();
    if (clean === '' || clean === '-' || clean === '–') return null;

    if (clean.includes(',')) {
      if (/^\d+,\d{3}$/.test(clean)) {
        clean = clean.replace(',', '');
      } else {
        clean = clean.replace(',', '.');
      }
    }

    const parsed = parseFloat(clean);
    if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
      throw new Error(`Недопустимый формат цены: '${val}' для категории '${categoryName}' в периоде '${periodHeader}'`);
    }
    return parsed;
  };

  const isEmptyCell = (val: any): boolean => {
    if (val === undefined || val === null || val === '') return true;
    const str = val.toString().trim();
    return str === '' || str === '-' || str === '–';
  };

  // Skip the first row (header)
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const firstCellVal = row[nameColIdx] ? row[nameColIdx].toString().trim() : '';
    if (firstCellVal === '') continue; // skip blank / merged rows
    if (isSkipRow(firstCellVal)) continue; // skip competitor tables, breakfast lists, totals

    const canonicalName = firstCellVal.replace(/\s+/g, ' ').trim();
    if (!ALLOWED_CATEGORIES.includes(canonicalName)) {
      throw new Error(`Обнаружена неизвестная категория в прайс-листе: '${firstCellVal}'. Допустимые категории: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    if (parsedCategoriesSet.has(canonicalName)) {
      throw new Error(`Обнаружен дубликат категории '${canonicalName}' в прайс-листе. Каждая категория должна присутствовать в списке только один раз.`);
    }
    parsedCategoriesSet.add(canonicalName);
    categories.push(canonicalName);

    for (const { colIndex, period } of periods) {
      if (!periodStart || period.startDate < periodStart) periodStart = period.startDate;
      if (!periodEnd || period.endDate > periodEnd) periodEnd = period.endDate;

      const rawVal = row[colIndex];
      if (isEmptyCell(rawVal)) {
        continue; // skip empty tariff for this category and period
      }

      const amount = parsePriceValue(rawVal, canonicalName, period.original);
      if (amount === null) {
        continue;
      }

      const days = expandPeriodToDays(period.startDate, period.endDate);
      for (const day of days) {
        parsedPrices.push({
          category: canonicalName,
          originalCategory: firstCellVal,
          date: day,
          price: amount,
          importId
        });
      }
    }
  }

  if (categories.length === 0) {
    throw new Error('В прайс-листе не найдено ни одной строки с допустимыми категориями номеров Терра Алтай.');
  }

  if (parsedPrices.length === 0) {
    throw new Error('В прайс-листе не распознано ни одной цены за тарифные периоды.');
  }

  const importRun: ImportRun = {
    id: importId,
    fileName: file.name,
    fileType: 'price_list',
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    rowsParsed: parsedPrices.length,
    rowsInserted: parsedPrices.length,
    rowsUpdated: 0,
    warnings,
    errors: [],
    status: 'pending_confirmation'
  };

  return {
    importRun,
    parsedPrices,
    categories,
    preview: {
      periodStart,
      periodEnd,
      detectedCategories: categories,
      dailyTariffCount: parsedPrices.length,
      warnings,
      isPriceList: true,
      format,
      categoriesCount: categories.length,
      periodColumnsCount: periods.length
    }
  };
}

// 3. Core Bookings listing parser (XLS, XLSX, CSV)
export async function parseBookingsFile(file: File, managerOverride?: string): Promise<any[]> {
  let rawRows: any[][] = [];
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const buffer = await file.arrayBuffer();
    let isUtf8 = true;
    const utf8Decoder = new TextDecoder('utf-8');
    const decodedStr = utf8Decoder.decode(buffer);
    if (decodedStr.includes('\uFFFD')) {
      isUtf8 = false;
    }
    const content = isUtf8 ? decodedStr.replace(/^\uFEFF/, '') : decodeCp1251(buffer);
    const lines = content.split(/\r?\n/);
    const separator = content.includes(';') ? ';' : ',';

    rawRows = lines
      .filter(line => line.trim().length > 0)
      .map(line => line.split(separator).map(cell => cell.trim()));
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0]; // first sheet
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Лист не найден в файле Excel.`);
    }
    rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  if (rawRows.length < 2) {
    return [];
  }

  // Find header row (search first 15 rows)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const row = rawRows[i].map(c => String(c || '').toLowerCase());
    if (row.some(c => c.includes('код') || c.includes('бронир') || c.includes('order') || c.includes('id') || c.includes('guest') || c.includes('гость'))) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
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
