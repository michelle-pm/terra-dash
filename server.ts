import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  readDatabase,
  writeDatabase,
  parseBnovoReport,
  parsePriceList,
  calculateMetricsForDay,
  mergeRevenueData,
  mergePriceData,
  populateDemoData,
  getInitialDatabase,
  expandPeriodToDays,
  getAltaiTodayStr,
  parseBookingsReport
} from './src/serverDb';
import { CategoryMapping } from './src/types';

// Ensure uploads folder exists in /tmp which is the only writable directory on Cloud Run
const UPLOADS_DIR = path.join(os.tmpdir(), 'bnovo_uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up Multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xls' || ext === '.xlsx' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только файлы .xls, .xlsx и .csv'));
    }
  }
});

// Helper: Get list of dates in the database (strictly from Bnovo Room Report)
function getDbDateRange(db: any): string[] {
  const dates = new Set<string>();
  db.revenueData.forEach((r: any) => dates.add(r.date));
  return Array.from(dates).sort();
}

// Ensure database is initialized
const testDb = readDatabase();
if (testDb.imports.length === 0) {
  // Let's seed with demo, but provide an empty state option
  populateDemoData();
}

// API Routes
app.get('/api/db', (req, res) => {
  const db = readDatabase();
  const summary = {
    importsCount: db.imports.length,
    revenueRows: db.revenueData.length,
    priceRows: db.priceData.length,
    correctionsCount: db.correctionLog.length,
    role: db.role,
    hasRevenue: db.revenueData.length > 0,
    hasPrices: db.priceData.length > 0
  };
  res.json({ db, summary });
});

// Switch roles (Admin/Viewer)
app.post('/api/role/toggle', (req, res) => {
  const db = readDatabase();
  db.role = db.role === 'Admin' ? 'Viewer' : 'Admin';
  writeDatabase(db);
  res.json({ role: db.role });
});

// Reset database to completely empty state
app.post('/api/db/clear', (req, res) => {
  const db = getInitialDatabase();
  // Empty uploads directory too
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file));
    }
  } catch (err) {
    console.error('Error clearing uploads:', err);
  }
  writeDatabase(db);
  res.json({ status: 'ok', db });
});

// Load standard demo data
app.post('/api/db/demo', (req, res) => {
  const db = populateDemoData();
  res.json({ status: 'ok', db });
});

// Update standard categories mapping
app.post('/api/mapping/update', (req, res) => {
  const db = readDatabase();
  if (db.role !== 'Admin') {
    return res.status(403).json({ error: 'Недостаточно прав. Требуется роль Администратора.' });
  }
  const newMappings: CategoryMapping[] = req.body.mappings;
  if (Array.isArray(newMappings)) {
    db.mappings = newMappings;
    writeDatabase(db);
    res.json({ status: 'ok', mappings: db.mappings });
  } else {
    res.status(400).json({ error: 'Неверный формат данных' });
  }
});

// Middleware to catch multer errors consistently
const uploadMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
      }
      return res.status(500).json({ error: `Внутренняя ошибка при загрузке: ${err.message}` });
    }
    next();
  });
};

// File parser & transient preview route
app.post('/api/upload', uploadMiddleware, (req, res) => {
  const db = readDatabase();
  if (db.role !== 'Admin') {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(403).json({ error: 'Загрузка файлов доступна только Администраторам.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не прикреплен' });
  }

  const fileType = req.body.fileType; // 'yearly_revenue_report' | 'price_list'
  const uploadedBy = 'Администратор (pm.michelle)';

  try {
    if (fileType === 'yearly_revenue_report') {
      const { importRun, parsedRevenue, reconciliationCheck } = parseBnovoReport(
        req.file.path,
        req.file.originalname,
        uploadedBy
      );

      // Save a reference of file path in the runs
      (importRun as any).filePath = req.file.path;

      // Add to imports list as pending
      db.imports.push(importRun);
      writeDatabase(db);

      // Extract unique categories and units
      const detectedCategories = Array.from(new Set(parsedRevenue.map(p => p.sourceCategory)));
      const detectedUnits = Array.from(new Set(parsedRevenue.map(p => p.unitName)));

      res.json({
        importRun,
        preview: {
          periodStart: importRun.periodStart,
          periodEnd: importRun.periodEnd,
          detectedCategories,
          detectedUnits,
          reconciliationCheck,
          warnings: importRun.warnings
        }
      });
    } else if (fileType === 'price_list') {
      const { importRun, parsedPrices, categories } = parsePriceList(
        req.file.path,
        req.file.originalname,
        uploadedBy
      );

      (importRun as any).filePath = req.file.path;
      db.imports.push(importRun);
      writeDatabase(db);

      res.json({
        importRun,
        preview: {
          periodStart: importRun.periodStart,
          periodEnd: importRun.periodEnd,
          detectedCategories: categories,
          warnings: importRun.warnings
        }
      });
    } else {
      res.status(400).json({ error: 'Неизвестный тип отчета' });
    }
  } catch (err: any) {
    // delete file on failure
    try { fs.unlinkSync(req.file!.path); } catch {}
    res.status(500).json({ error: err.message || 'Ошибка во время парсинга файла. Пожалуйста, проверьте формат.' });
  }
});

// Confirms pending import and merges records idempotently
app.post('/api/confirm-import', (req, res) => {
  const db = readDatabase();
  if (db.role !== 'Admin') {
    return res.status(403).json({ error: 'Подтверждение доступно только Администраторам.' });
  }

  const { importId } = req.body;
  const runIndex = db.imports.findIndex(i => i.id === importId);
  if (runIndex === -1) {
    return res.status(404).json({ error: 'Импорт не найден' });
  }

  const run = db.imports[runIndex];
  const filePath = (run as any).filePath;

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'Файл отчета не найден на сервере. Пожалуйста, загрузите заново.' });
  }

  try {
    let stats = { inserted: 0, updated: 0 };
    if (run.fileType === 'yearly_revenue_report') {
      const { parsedRevenue } = parseBnovoReport(filePath, run.fileName, run.uploadedBy);
      stats = mergeRevenueData(db, parsedRevenue, run.fileName, run.uploadedBy);
    } else {
      const { parsedPrices } = parsePriceList(filePath, run.fileName, run.uploadedBy);
      stats = mergePriceData(db, parsedPrices, run.fileName, run.uploadedBy);
    }

    // Update status to confirmed and record counts
    run.status = 'confirmed';
    run.rowsInserted = stats.inserted;
    run.rowsUpdated = stats.updated;

    writeDatabase(db);
    res.json({ status: 'ok', run, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка слияния данных' });
  }
});

// GET custom bookings
app.get('/api/bookings', (req, res) => {
  const db = readDatabase() as any;
  res.json({ bookings: db.bookings || [] });
});

// Upload and parse bookings report (can be general or salesperson-specific)
app.post('/api/bookings/upload', uploadMiddleware, (req, res) => {
  const db = readDatabase() as any;
  if (db.role !== 'Admin') {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(403).json({ error: 'Загрузка бронирований доступна только Администраторам.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не прикреплен' });
  }

  const managerOverride = req.body.managerOverride && req.body.managerOverride !== 'auto' ? req.body.managerOverride : undefined;
  const clearExisting = req.body.clearExisting === 'true';

  try {
    const parsedBookings = parseBookingsReport(req.file.path, managerOverride);
    
    if (!db.bookings) {
      db.bookings = [];
    }

    if (clearExisting) {
      db.bookings = parsedBookings;
    } else {
      // Merge by code
      const currentBookings = [...db.bookings];
      parsedBookings.forEach((newB: any) => {
        const existingIdx = currentBookings.findIndex((b: any) => b.code === newB.code);
        if (existingIdx !== -1) {
          currentBookings[existingIdx] = { ...currentBookings[existingIdx], ...newB };
        } else {
          currentBookings.push(newB);
        }
      });
      db.bookings = currentBookings;
    }

    writeDatabase(db);
    
    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch {}

    res.json({ 
      status: 'ok', 
      count: parsedBookings.length, 
      totalModified: db.bookings.length, 
      bookings: db.bookings 
    });
  } catch (err: any) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message || 'Ошибка обработки файла бронирований' });
  }
});

// Clear custom bookings
app.post('/api/bookings/clear', (req, res) => {
  const db = readDatabase() as any;
  if (db.role !== 'Admin') {
    return res.status(403).json({ error: 'Очистка бронирований доступна только Администраторам.' });
  }
  db.bookings = [];
  writeDatabase(db);
  res.json({ status: 'ok', bookings: [] });
});

// Cancels or Deletes an import run
app.post('/api/delete-import', (req, res) => {
  const db = readDatabase();
  if (db.role !== 'Admin') {
    return res.status(403).json({ error: 'Удаление доступно только Администраторам.' });
  }

  const { importId } = req.body;
  const runIndex = db.imports.findIndex(i => i.id === importId);
  if (runIndex === -1) {
    return res.status(404).json({ error: 'Импорт не найден' });
  }

  const run = db.imports[runIndex];
  const filePath = (run as any).filePath;

  // Delete temp file
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  // Remove rows associated with this import.
  // Note: if it was confirmed, we'll strip them out.
  if (run.status === 'confirmed') {
    if (run.fileType === 'yearly_revenue_report') {
      db.revenueData = db.revenueData.filter(r => r.importId !== importId);
    } else {
      db.priceData = db.priceData.filter(p => p.importId !== importId);
    }
  }

  db.imports.splice(runIndex, 1);
  writeDatabase(db);

  res.json({ status: 'ok', id: importId });
});

// Update manually assigned future prices (tariffs)
app.post('/api/tariff/update', (req, res) => {
  const db = readDatabase();
  if (db.role !== 'Admin') {
    return res.status(403).json({ error: 'Редактирование тарифов доступно только Администраторам.' });
  }

  const { category, startDate, endDate, weekdaysOnly, friSatOnly, action, value } = req.body;
  
  if (!category || !startDate || !endDate || !action || value === undefined) {
    return res.status(400).json({ error: 'Неполные параметры запроса' });
  }

  const parsedValue = parseFloat(value);
  if (isNaN(parsedValue)) {
    return res.status(400).json({ error: 'Значение тарифа должно быть числом' });
  }

  const todayStr = getAltaiTodayStr(); // Set current local time base matching Altai timezone

  const datesStr = expandPeriodToDays(startDate, endDate);
  let updatedCount = 0;

  if (!db.tariffs[category]) {
    db.tariffs[category] = {};
  }

  datesStr.forEach(day => {
    // CRITICAL: "Past dates are view-only. Today and future prices can be edited."
    if (day < todayStr) return;

    const dateObj = new Date(day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

    // Weekend (Fri-Sat) filter
    if (friSatOnly && dayOfWeek !== 5 && dayOfWeek !== 6) return;

    // Weekday only filter
    if (weekdaysOnly && (dayOfWeek === 5 || dayOfWeek === 6)) return;

    // Retrieve active price or standard price
    let currentPrice = 0;
    if (db.tariffs[category][day] !== undefined) {
      currentPrice = db.tariffs[category][day];
    } else {
      const standardPriceRecord = db.priceData.find(p => p.category === category && p.date === day);
      currentPrice = standardPriceRecord ? standardPriceRecord.price : 0;
    }

    let nextPrice = currentPrice;
    if (action === 'set') {
      nextPrice = parsedValue;
    } else if (action === 'increase') {
      nextPrice = currentPrice + parsedValue;
    } else if (action === 'decrease') {
      nextPrice = Math.max(0, currentPrice - parsedValue);
    }

    db.tariffs[category][day] = nextPrice;

    // Register into correction list
    db.correctionLog.push({
      id: 'corr_' + Math.random().toString(36).substr(2, 9),
      date: day,
      entityType: 'price',
      entityId: category,
      fieldName: 'price',
      oldValue: currentPrice,
      newValue: nextPrice,
      sourceFile: 'Ручная корректировка тарифа',
      user: 'Администратор (pm.michelle)',
      changedAt: new Date().toISOString()
    });

    updatedCount++;
  });

  writeDatabase(db);
  res.json({ status: 'ok', updatedCount, db });
});

// Server-side calculated calendar metrics
app.get('/api/calendar-metrics', (req, res) => {
  const db = readDatabase();
  const dates = getDbDateRange(db);

  const metricsList = dates.map(day => {
    const m = calculateMetricsForDay(day, db.revenueData, db.priceData, db.mappings, db.tariffs);
    return {
      date: m.date,
      weekday: m.weekday,
      actualRevenue: m.actualRevenue,
      lostRevenue: m.lostRevenue,
      potentialRevenue: m.potentialRevenue,
      occupancy: m.activeUnits > 0 ? (m.occupiedUnits / m.activeUnits) * 100 : 0
    };
  });

  res.json({ metrics: metricsList });
});

// Detailed metrics for a single date
app.get('/api/day-detail', (req, res) => {
  const db = readDatabase();
  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Укажите дату в формате YYYY-MM-DD' });
  }

  const metrics = calculateMetricsForDay(date, db.revenueData, db.priceData, db.mappings, db.tariffs);
  
  // Extract physical unit-level revenues
  const unitsDetails = db.revenueData.filter(r => r.date === date).map(rev => {
    // Find mapped category
    const mapping = db.mappings.find(m => m.reportCategory === rev.sourceCategory);
    const mappedCat = mapping ? mapping.priceListCategory : rev.sourceCategory;

    // Price
    let dailyPrice = 0;
    if (db.tariffs[mappedCat] && db.tariffs[mappedCat][date] !== undefined) {
      dailyPrice = db.tariffs[mappedCat][date];
    } else {
      const pRecord = db.priceData.find(p => p.category === mappedCat && p.date === date);
      dailyPrice = pRecord ? pRecord.price : 0;
    }

    const occupied = rev.actualRevenue > 0;
    const loss = occupied ? Math.max(dailyPrice - rev.actualRevenue, 0) : dailyPrice;

    return {
      unitName: rev.unitName,
      sourceCategory: rev.sourceCategory,
      mappedCategory: mappedCat,
      actualRevenue: rev.actualRevenue,
      dailyPrice,
      occupied,
      loss
    };
  });

  // Source files used
  const sourceBnovo = db.imports.find(imp => imp.fileType === 'yearly_revenue_report' && imp.status === 'confirmed');
  const sourcePrices = db.imports.find(imp => imp.fileType === 'price_list' && imp.status === 'confirmed');

  res.json({
    metrics,
    unitsDetails,
    sources: {
      bnovoFile: sourceBnovo ? sourceBnovo.fileName : null,
      priceListFile: sourcePrices ? sourcePrices.fileName : null
    }
  });
});

// High-speed dashboard metrics compiler
app.get('/api/dashboard', (req, res) => {
  const db = readDatabase();
  const dates = getDbDateRange(db);

  if (dates.length === 0) {
    return res.json({ hasData: false });
  }

  // Dynamically get the system date strictly in Altai Time (UTC+7)
  const todayStr = getAltaiTodayStr();

  // Find metrics for today if available, or last available date
  const activeDate = dates.includes(todayStr) ? todayStr : dates[dates.length - 1];
  const todayMetrics = calculateMetricsForDay(activeDate, db.revenueData, db.priceData, db.mappings, db.tariffs);

  // Support start and end filters for overall dashboard aggregates.
  // By default, if no filters are specified, we filter for the active current week relative to activeDate
  const baseDateStr = activeDate || todayStr;
  const parts = baseDateStr.split('-');
  const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  // Monday of that week
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(baseDate.setDate(diff));
  const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  // Sunday of that week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  const startQuery = req.query.start;
  const endQuery = req.query.end;
  const defaultStart = (!startQuery && !endQuery) ? baseDateStr : undefined;
  const defaultEnd = (!startQuery && !endQuery) ? baseDateStr : undefined;

  const start = (startQuery && typeof startQuery === 'string') ? startQuery : defaultStart;
  const end = (endQuery && typeof endQuery === 'string') ? endQuery : defaultEnd;

  let filteredDates = [...dates];
  if (start) {
    filteredDates = filteredDates.filter(d => d >= start);
  }
  if (end) {
    filteredDates = filteredDates.filter(d => d <= end);
  }

  // Compute overall KPI aggregates (across filtered dates)
  let totalPotential = 0;
  let totalActual = 0;
  let totalLost = 0;
  let totalActiveUnits = 0;
  let totalOccupiedUnits = 0;
  let totalVacantValue = 0;

  // Let's summarize metrics day by day
  const dailyAggs = filteredDates.map(day => {
    const m = calculateMetricsForDay(day, db.revenueData, db.priceData, db.mappings, db.tariffs);

    totalPotential += m.potentialRevenue;
    totalActual += m.actualRevenue;
    totalLost += m.lostRevenue;
    totalVacantValue += m.vacantValue;

    return m;
  });

  // Calculate overall occupancy across the selected period consistently
  filteredDates.forEach(day => {
    const m = dailyAggs.find(d => d.date === day);
    if (m) {
      totalActiveUnits += m.activeUnits;
      totalOccupiedUnits += m.occupiedUnits;
    }
  });

  // Category levels of cumulative losses to show "Top Losses"
  const catLosses: { [cat: string]: { lost: number; actual: number; potential: number; count: number } } = {};
  dailyAggs.forEach(day => {
    day.categories.forEach(c => {
      if (!catLosses[c.category]) {
        catLosses[c.category] = { lost: 0, actual: 0, potential: 0, count: 0 };
      }
      catLosses[c.category].lost += c.lostRevenue;
      catLosses[c.category].actual += c.actualRevenue;
      catLosses[c.category].potential += c.potentialRevenue;
      catLosses[c.category].count++;
    });
  });

  const sortedCatLosses = Object.keys(catLosses).map(catName => ({
    category: catName,
    lost: catLosses[catName].lost,
    actual: catLosses[catName].actual,
    potential: catLosses[catName].potential,
    occupancy: catLosses[catName].potential > 0 ? (catLosses[catName].actual / catLosses[catName].potential) * 100 : 0
  })).sort((a, b) => b.lost - a.lost);

  // Last import run information
  const lastImport = db.imports.length > 0 ? db.imports[db.imports.length - 1] : null;

  res.json({
    hasData: true,
    activeDate,
    todayMetrics,
    overall: {
      potential: totalPotential,
      actual: totalActual,
      lost: totalLost,
      occupancy: totalActiveUnits > 0 ? (totalOccupiedUnits / totalActiveUnits) * 100 : 0,
      vacantValue: totalVacantValue,
      totalOccupiedUnits,
      totalActiveUnits,
      totalDays: filteredDates.length || 1
    },
    topLosses: sortedCatLosses,
    lastImport
  });
});

// Analytics compiler supporting flexible dates and category filters
app.get('/api/analytics-metrics', (req, res) => {
  const db = readDatabase();
  const { start, end, category, period } = req.query; // period: day, week, month, quarter, year

  let dates = getDbDateRange(db);
  if (start && typeof start === 'string') {
    dates = dates.filter(d => d >= start);
  }
  if (end && typeof end === 'string') {
    dates = dates.filter(d => d <= end);
  }

  if (dates.length === 0) {
    return res.json({ timeline: [], categories: [] });
  }

  // Calculate day-by-day metrics
  const dailyMetrics = dates.map(day => {
    return calculateMetricsForDay(day, db.revenueData, db.priceData, db.mappings, db.tariffs);
  });

  // Category breakdowns
  const catSummary: { [cat: string]: { potential: number; actual: number; lost: number; active: number; occupied: number } } = {};

  const todayStr = getAltaiTodayStr();

  // Build timeline aggregates
  const groups: { [key: string]: typeof dailyMetrics } = {};
  
  dailyMetrics.forEach(m => {
    let key = m.date; // default to day
    const d = new Date(m.date);

    if (period === 'week') {
      // Calculate start of week (Sunday or Monday)
      const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      key = `Неделя ${startOfWeek.toISOString().split('T')[0]}`;
    } else if (period === 'month') {
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      key = `${d.getFullYear()}-${mm}`;
    } else if (period === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      key = `${d.getFullYear()} Q${q}`;
    } else if (period === 'year') {
      key = `${d.getFullYear()}`;
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(m);

    // Sum up category details if category filter is active
    m.categories.forEach(c => {
      // If we filtered by category, check match
      if (category && category !== 'all' && c.category !== category) return;

      if (!catSummary[c.category]) {
        catSummary[c.category] = { potential: 0, actual: 0, lost: 0, active: 0, occupied: 0 };
      }
      catSummary[c.category].potential += c.potentialRevenue;
      catSummary[c.category].actual += c.actualRevenue;
      catSummary[c.category].lost += c.lostRevenue;
      catSummary[c.category].active += c.activeUnits;
      catSummary[c.category].occupied += c.occupiedUnits;
    });
  });

  // Format timelines
  const timeline = Object.keys(groups).sort().map(key => {
    const list = groups[key];
    let potential = 0;
    let actual = 0;
    let lost = 0;
    let active = 0;
    let occupied = 0;

    list.forEach(m => {
      m.categories.forEach(c => {
        // Apply category filter if active
        if (category && category !== 'all' && c.category !== category) return;
        potential += c.potentialRevenue;
        actual += c.actualRevenue;
        lost += c.lostRevenue;
        active += c.activeUnits;
        occupied += c.occupiedUnits;
      });
    });

    return {
      label: key,
      potential,
      actual,
      lost,
      occupancy: active > 0 ? (occupied / active) * 100 : 0
    };
  });

  const categories = Object.keys(catSummary).map(catName => ({
    category: catName,
    ...catSummary[catName],
    occupancy: catSummary[catName].active > 0 ? (catSummary[catName].occupied / catSummary[catName].active) * 100 : 0
  }));

  res.json({ timeline, categories });
});

// Forecast calculator for 30, 60, and 90 days ahead
app.get('/api/forecast', (req, res) => {
  const db = readDatabase();
  const { periodDays } = req.query; // 30, 60, 90
  const daysCount = parseInt(periodDays as string) || 30;

  const todayStr = getAltaiTodayStr(); // Baseline local clock matching Altay timezone
  const startDate = new Date(todayStr);

  const forecastDates: string[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < daysCount; i++) {
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    const d = current.getDate().toString().padStart(2, '0');
    forecastDates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  // Calculate potential, current bookings/actual (based on uploaded upcoming calendars or past average as baseline)
  let forecastedPotential = 0;
  let forecastedBooked = 0;
  let forecastedLost = 0;

  // Track standard available active units
  // Let's analyze categories from db mapping
  const activeReportCategories = Array.from(new Set(db.revenueData.map(r => r.sourceCategory)));
  if (activeReportCategories.length === 0) {
    return res.json({ hasForecast: false });
  }

  // Count standard active columns in last recorded dates
  const unitCounts: { [cat: string]: number } = {};
  activeReportCategories.forEach(cat => {
    const matchingRevs = db.revenueData.filter(r => r.sourceCategory === cat);
    if (matchingRevs.length > 0) {
      // unique units for this category
      const uniqueUnits = Array.from(new Set(matchingRevs.map(r => r.unitName)));
      unitCounts[cat] = uniqueUnits.length;
    } else {
      unitCounts[cat] = 2; // fallback default
    }
  });

  const riskCategories: { [cat: string]: { lostPotential: number; occupancyAvg: number; riskRating: 'high' | 'medium' | 'low' } } = {};

  forecastDates.forEach(day => {
    activeReportCategories.forEach(cat => {
      const mapping = db.mappings.find(m => m.reportCategory === cat);
      const mappedCat = mapping ? mapping.priceListCategory : cat;

      // Get price
      let dailyPrice = 0;
      if (db.tariffs[mappedCat] && db.tariffs[mappedCat][day] !== undefined) {
        dailyPrice = db.tariffs[mappedCat][day];
      } else {
        const pRecord = db.priceData.find(p => p.category === mappedCat && p.date === day);
        dailyPrice = pRecord ? pRecord.price : 0;
      }

      // If price list isn't fully loaded for future, fallback to summer/spring avg from existing prices
      if (dailyPrice === 0) {
        const historicalOfCat = db.priceData.filter(p => p.category === mappedCat);
        if (historicalOfCat.length > 0) {
          dailyPrice = historicalOfCat[historicalOfCat.length - 1].price;
        } else {
          dailyPrice = 10000; // global fallback
        }
      }

      const activeUnits = unitCounts[cat] || 2;
      const potential = activeUnits * dailyPrice;

      // Compute standard forecasted bookings or loss based on historical day-of-week occupancy for this category
      const dayOfWeek = new Date(day).getDay();
      const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const historicalDayMatches = db.revenueData.filter(r => r.sourceCategory === cat && r.weekday === weekdays[dayOfWeek]);
      
      let occupancyRate = 0.6; // default fallback
      if (historicalDayMatches.length > 0) {
        const occupied = historicalDayMatches.filter(u => u.actualRevenue > 0).length;
        occupancyRate = occupied / historicalDayMatches.length;
      }

      const bookedUnits = Math.round(activeUnits * occupancyRate);
      const bookedRev = bookedUnits * dailyPrice;
      const lostRev = Math.max(potential - bookedRev, 0);

      forecastedPotential += potential;
      forecastedBooked += bookedRev;
      forecastedLost += lostRev;

      if (!riskCategories[cat]) {
        riskCategories[cat] = { lostPotential: 0, occupancyAvg: 0, riskRating: 'low' };
      }
      riskCategories[cat].lostPotential += lostRev;
      riskCategories[cat].occupancyAvg += occupancyRate;
    });
  });

  const catRisks = Object.keys(riskCategories).map(catName => {
    const avgOcc = (riskCategories[catName].occupancyAvg / forecastDates.length) * 100;
    let rating: 'high' | 'medium' | 'low' = 'low';
    if (avgOcc < 40) rating = 'high';
    else if (avgOcc < 70) rating = 'medium';

    return {
      category: catName,
      lostPotential: riskCategories[catName].lostPotential,
      occupancyAvg: avgOcc,
      riskRating: rating
    };
  }).sort((a, b) => b.lostPotential - a.lostPotential);

  res.json({
    hasForecast: true,
    forecastedPotential,
    forecastedBooked,
    forecastedLost,
    riskCategories: catRisks,
    periodDays: daysCount
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Terra Altaya server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
