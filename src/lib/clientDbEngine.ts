import { RevenueData, PriceData, CategoryMapping, ImportRun, Booking } from '../types';

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
  missingTariff: boolean;
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
  missingTariffCount?: number;
}

export interface UnitDetailRow {
  unitName: string;
  sourceCategory: string;
  mappedCategory: string;
  actualRevenue: number;
  dailyPrice: number;
  occupied: boolean;
  loss: number;
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

export function getDbDateRange(db: any): string[] {
  const dates = new Set<string>();
  if (db && Array.isArray(db.revenueData)) {
    db.revenueData.forEach((r: any) => {
      if (r && r.date) dates.add(r.date);
    });
  }
  return Array.from(dates).sort();
}

export function calculateMetricsForDay(
  date: string,
  revenueList: RevenueData[],
  priceList: PriceData[],
  mappings: CategoryMapping[],
  tariffs: { [category: string]: { [date: string]: number } } = {}
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
    categories: [],
    missingTariffCount: 0
  };

  const dayRevenuesRaw = (revenueList || []).filter(r => r.date === date);
  if (dayRevenuesRaw.length > 0) {
    metrics.weekday = dayRevenuesRaw[0].weekday;
  }

  const sourceCategories = Array.from(new Set(dayRevenuesRaw.map(r => r.sourceCategory)));

  const unitRevenues: { [unit: string]: RevenueData } = {};
  dayRevenuesRaw.forEach(r => {
    unitRevenues[r.unitName] = r;
  });

  const dayRevenues = Object.values(unitRevenues);

  const mapDict: { [reportCat: string]: string } = {};
  (mappings || []).forEach(m => {
    mapDict[m.reportCategory] = m.priceListCategory;
  });

  sourceCategories.forEach(sourceCat => {
    const unitsOfCat = dayRevenues.filter(r => r.sourceCategory === sourceCat);
    const mappedPriceCat = mapDict[sourceCat] || sourceCat;

    let dailyPrice = 0;
    let missingTariff = false;
    
    const catTariffs = tariffs || {};
    if (catTariffs[mappedPriceCat] && catTariffs[mappedPriceCat][date] !== undefined) {
      dailyPrice = catTariffs[mappedPriceCat][date];
    } else {
      const priceRecord = (priceList || []).find(p => p.category === mappedPriceCat && p.date === date);
      if (priceRecord) {
        dailyPrice = priceRecord.price;
      } else {
        dailyPrice = 0;
        missingTariff = true;
      }
    }

    const activeUnits = unitsOfCat.length;
    const occupiedUnits = unitsOfCat.filter(u => u.actualRevenue > 0 && !(u.isEmpty ?? false)).length;
    const freeUnits = Math.max(activeUnits - occupiedUnits, 0);

    const potentialRev = activeUnits * dailyPrice;
    const actualRevSum = unitsOfCat.reduce((sum, u) => sum + (u.actualRevenue || 0), 0);
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
      vacantValue,
      missingTariff
    });

    metrics.potentialRevenue += potentialRev;
    metrics.actualRevenue += actualRevSum;
    metrics.lostRevenue += lostRev;
    metrics.occupiedUnits += occupiedUnits;
    metrics.activeUnits += activeUnits;
    metrics.freeUnits += freeUnits;
    metrics.vacantValue += vacantValue;
    if (missingTariff) {
      metrics.missingTariffCount = (metrics.missingTariffCount || 0) + 1;
    }
  });

  return metrics;
}

export function compileDashboardState(db: any, start?: string, end?: string) {
  const dates = getDbDateRange(db);

  if (dates.length === 0) {
    return { hasData: false };
  }

  const todayStr = getAltaiTodayStr();
  const activeDate = dates.includes(todayStr) ? todayStr : dates[dates.length - 1];
  const todayMetrics = calculateMetricsForDay(
    activeDate,
    db.revenueData,
    db.priceData,
    db.mappings,
    db.tariffs
  );

  let filteredDates = [...dates];
  if (start) {
    filteredDates = filteredDates.filter(d => d >= start);
  }
  if (end) {
    filteredDates = filteredDates.filter(d => d <= end);
  }

  let totalPotential = 0;
  let totalActual = 0;
  let totalLost = 0;
  let totalActiveUnits = 0;
  let totalOccupiedUnits = 0;
  let totalVacantValue = 0;

  const dailyAggs = filteredDates.map(day => {
    const m = calculateMetricsForDay(
      day,
      db.revenueData,
      db.priceData,
      db.mappings,
      db.tariffs
    );

    totalPotential += m.potentialRevenue;
    totalActual += m.actualRevenue;
    totalLost += m.lostRevenue;
    totalVacantValue += m.vacantValue;

    return m;
  });

  filteredDates.forEach(day => {
    const m = dailyAggs.find(d => d.date === day);
    if (m) {
      totalActiveUnits += m.activeUnits;
      totalOccupiedUnits += m.occupiedUnits;
    }
  });

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

  const rawImports = db.imports || [];
  let importsList: ImportRun[] = [];
  if (Array.isArray(rawImports)) {
    importsList = rawImports;
  } else if (typeof rawImports === 'object') {
    importsList = Object.values(rawImports);
  }

  const lastImport = importsList.length > 0 ? importsList[importsList.length - 1] : null;

  return {
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
  };
}

export function compileCalendarMetrics(db: any) {
  const dates = getDbDateRange(db);
  return dates.map(day => {
    const m = calculateMetricsForDay(
      day,
      db.revenueData,
      db.priceData,
      db.mappings,
      db.tariffs
    );
    return {
      date: m.date,
      weekday: m.weekday,
      actualRevenue: m.actualRevenue,
      lostRevenue: m.lostRevenue,
      potentialRevenue: m.potentialRevenue,
      occupancy: m.activeUnits > 0 ? (m.occupiedUnits / m.activeUnits) * 100 : 0
    };
  });
}

export function compileDayDetail(db: any, date: string) {
  const metrics = calculateMetricsForDay(
    date,
    db.revenueData,
    db.priceData,
    db.mappings,
    db.tariffs
  );

  const revenueList = db.revenueData || [];
  const unitsDetails = revenueList.filter((r: any) => r.date === date).map((rev: any) => {
    const mappings = db.mappings || [];
    const mapping = mappings.find((m: any) => m.reportCategory === rev.sourceCategory);
    const mappedCat = mapping ? mapping.priceListCategory : rev.sourceCategory;

    let dailyPrice = 0;
    const tariffs = db.tariffs || {};
    if (tariffs[mappedCat] && tariffs[mappedCat][date] !== undefined) {
      dailyPrice = tariffs[mappedCat][date];
    } else {
      const priceList = db.priceData || [];
      const pRecord = priceList.find((p: any) => p.category === mappedCat && p.date === date);
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

  const rawImports = db.imports || [];
  let importsList: ImportRun[] = [];
  if (Array.isArray(rawImports)) {
    importsList = rawImports;
  } else if (typeof rawImports === 'object') {
    importsList = Object.values(rawImports);
  }

  const sourceBnovo = importsList.find(imp => imp.fileType === 'yearly_revenue_report' && imp.status === 'confirmed');
  const sourcePrices = importsList.find(imp => imp.fileType === 'price_list' && imp.status === 'confirmed');

  return {
    metrics,
    unitsDetails,
    sources: {
      bnovoFile: sourceBnovo ? sourceBnovo.fileName : null,
      priceListFile: sourcePrices ? sourcePrices.fileName : null
    }
  };
}

export function compileAnalyticsMetrics(
  db: any,
  start?: string,
  end?: string,
  category?: string,
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
) {
  let dates = getDbDateRange(db);
  if (start) {
    dates = dates.filter(d => d >= start);
  }
  if (end) {
    dates = dates.filter(d => d <= end);
  }

  if (dates.length === 0) {
    return { timeline: [], categories: [] };
  }

  const dailyMetrics = dates.map(day => {
    return calculateMetricsForDay(
      day,
      db.revenueData,
      db.priceData,
      db.mappings,
      db.tariffs
    );
  });

  const catSummary: { [cat: string]: { potential: number; actual: number; lost: number; active: number; occupied: number } } = {};

  const groups: { [key: string]: typeof dailyMetrics } = {};
  
  dailyMetrics.forEach(m => {
    let key = m.date;
    const d = new Date(m.date);

    if (period === 'week') {
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

    m.categories.forEach(c => {
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

  const timeline = Object.keys(groups).sort().map(key => {
    const list = groups[key];
    let potential = 0;
    let actual = 0;
    let lost = 0;
    let active = 0;
    let occupied = 0;

    list.forEach(m => {
      m.categories.forEach(c => {
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

  return { timeline, categories };
}

export function compileForecastState(db: any, periodDays: number = 30) {
  const dates = getDbDateRange(db);
  const revenueData = db.revenueData || [];
  const activeReportCategories = Array.from(new Set(revenueData.map((r: any) => r.sourceCategory))) as string[];
  
  if (activeReportCategories.length === 0) {
    return { hasForecast: false };
  }

  const todayStr = getAltaiTodayStr();
  const startDate = new Date(todayStr);

  const forecastDates: string[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < periodDays; i++) {
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    const d = current.getDate().toString().padStart(2, '0');
    forecastDates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  let forecastedPotential = 0;
  let forecastedBooked = 0;
  let forecastedLost = 0;

  const unitCounts: { [cat: string]: number } = {};
  activeReportCategories.forEach(cat => {
    const matchingRevs = revenueData.filter((r: any) => r.sourceCategory === cat);
    if (matchingRevs.length > 0) {
      const uniqueUnits = Array.from(new Set(matchingRevs.map((r: any) => r.unitName)));
      unitCounts[cat] = uniqueUnits.length;
    } else {
      unitCounts[cat] = 2;
    }
  });

  const riskCategories: { [cat: string]: { lostPotential: number; occupancyAvg: number; riskRating: 'high' | 'medium' | 'low' } } = {};

  forecastDates.forEach(day => {
    activeReportCategories.forEach(cat => {
      const mappings = db.mappings || [];
      const mapping = mappings.find((m: any) => m.reportCategory === cat);
      const mappedCat = mapping ? mapping.priceListCategory : cat;

      let dailyPrice = 0;
      const tariffs = db.tariffs || {};
      if (tariffs[mappedCat] && tariffs[mappedCat][day] !== undefined) {
        dailyPrice = tariffs[mappedCat][day];
      } else {
        const priceData = db.priceData || [];
        const pRecord = priceData.find((p: any) => p.category === mappedCat && p.date === day);
        dailyPrice = pRecord ? pRecord.price : 0;
      }

      if (dailyPrice === 0) {
        const priceData = db.priceData || [];
        const historicalOfCat = priceData.filter((p: any) => p.category === mappedCat);
        if (historicalOfCat.length > 0) {
          dailyPrice = historicalOfCat[historicalOfCat.length - 1].price;
        } else {
          dailyPrice = 10000;
        }
      }

      const activeUnits = unitCounts[cat] || 2;
      const potential = activeUnits * dailyPrice;

      const dayOfWeek = new Date(day).getDay();
      const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const historicalDayMatches = revenueData.filter((r: any) => r.sourceCategory === cat && r.weekday === weekdays[dayOfWeek]);
      
      let occupancyRate = 0.6;
      if (historicalDayMatches.length > 0) {
        const occupied = historicalDayMatches.filter((u: any) => u.actualRevenue > 0).length;
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

  return {
    hasForecast: true,
    forecastedPotential,
    forecastedBooked,
    forecastedLost,
    riskCategories: catRisks,
    periodDays
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

function normalizeText(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
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

export function getInitialDatabase() {
  return {
    imports: [] as ImportRun[],
    revenueData: [] as RevenueData[],
    priceData: [] as PriceData[],
    mappings: [...DEFAULT_MAPPINGS],
    correctionLog: [] as any[],
    tariffs: {} as { [cat: string]: { [date: string]: number } },
    bookings: [] as Booking[]
  };
}

export function populateDemoData() {
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
    const isSummer = dateObj.getMonth() >= 5 && dateObj.getMonth() <= 7;
    const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6;
    const weekday = weekdays[dateObj.getDay()];

    Object.keys(basePrices).forEach(catName => {
      let price = isSummer ? basePrices[catName].summer : basePrices[catName].spring;
      if (isWeekend) price = Math.round(price * 1.2 / 500) * 500;

      priceList.push({
        category: normalizeText(catName),
        date: dayStr,
        price,
        importId: priceImpId
      });
    });

    units.forEach(uGroup => {
      const mappedPriceCat = normalizeText(mapDict[normalizeText(uGroup.cat)] || mapDict[uGroup.cat] || uGroup.cat);
      const pRecord = priceList.find(p => p.category === mappedPriceCat && p.date === dayStr);
      const unitPrice = pRecord ? pRecord.price : 10000;

      let baseOcc = 0.5;
      if (isSummer) baseOcc += 0.25;
      if (isWeekend) baseOcc += 0.2;

      uGroup.units.forEach(uName => {
        let isOccupied = false;
        let revAmount = 0;

        if (dayStr === '2026-06-15') {
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
            revAmount = unitPrice;
          }
        } else if (dayStr < '2026-06-15') {
          isOccupied = Math.random() < baseOcc;
          if (isOccupied) {
            revAmount = unitPrice;
          }
        } else {
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

  return db;
}

