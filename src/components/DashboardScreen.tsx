import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, FileSpreadsheet, Percent, AlertCircle, ArrowUpRight, Ban, Zap } from 'lucide-react';
import { apiFetch } from '../lib/api';

const getTodayStr = () => {
  const d = new Date();
  // Altai is UTC+7
  const utcOffset = d.getTimezoneOffset() * 60000;
  const utcTime = d.getTime() + utcOffset;
  const altaiDate = new Date(utcTime + (7 * 3600000));
  const yyyy = altaiDate.getFullYear();
  const mm = String(altaiDate.getMonth() + 1).padStart(2, '0');
  const dd = String(altaiDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDatesForPeriod = (baseDateStr: string, periodType: 'day' | 'week' | 'month' | 'year' | 'custom') => {
  const baseStr = baseDateStr || getTodayStr();
  const parts = baseStr.split('-');
  const yyyy = Number(parts[0]);
  const mm = Number(parts[1]);
  const dd = Number(parts[2]);
  const base = new Date(yyyy, mm - 1, dd);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dStr}`;
  };

  switch (periodType) {
    case 'day': {
      const dayStr = formatDate(base);
      return { start: dayStr, end: dayStr };
    }
    case 'week': {
      const day = base.getDay();
      // Monday of the week
      const diff = base.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(base.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: formatDate(monday), end: formatDate(sunday) };
    }
    case 'month': {
      const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    }
    case 'year': {
      const firstDay = new Date(base.getFullYear(), 0, 1);
      const lastDay = new Date(base.getFullYear(), 11, 31);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    }
    default:
      return { start: formatDate(base), end: formatDate(base) };
  }
};

interface DashboardMetrics {
  hasData: boolean;
  activeDate?: string;
  todayMetrics?: {
    date: string;
    weekday: string;
    potentialRevenue: number;
    actualRevenue: number;
    lostRevenue: number;
    occupiedUnits: number;
    activeUnits: number;
    freeUnits: number;
    vacantValue: number;
  };
  overall?: {
    potential: number;
    actual: number;
    lost: number;
    occupancy: number;
    vacantValue: number;
    totalOccupiedUnits: number;
    totalActiveUnits: number;
    totalDays: number;
  };
  topLosses?: Array<{
    category: string;
    lost: number;
    actual: number;
    potential: number;
    occupancy: number;
  }>;
  lastImport?: {
    id: string;
    fileName: string;
    fileType: 'yearly_revenue_report' | 'price_list';
    uploadedAt: string;
    status: string;
    warnings: string[];
    errors: string[];
    rowsParsed: number;
  } | null;
}

interface DashboardScreenProps {
  data: DashboardMetrics;
  onNavigateToTab: (tab: string) => void;
  onLoadDemo: () => void;
  hasRevenue: boolean;
  hasPrices: boolean;
  unmappedCount: number;
}

export default function DashboardScreen({
  data,
  onNavigateToTab,
  onLoadDemo,
  hasRevenue,
  hasPrices,
  unmappedCount
}: DashboardScreenProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('day');
  const [start, setStart] = useState(() => {
    const base = data?.activeDate || getTodayStr();
    return getDatesForPeriod(base, 'day').start;
  });
  const [end, setEnd] = useState(() => {
    const base = data?.activeDate || getTodayStr();
    return getDatesForPeriod(base, 'day').end;
  });
  const [localData, setLocalData] = useState<DashboardMetrics>(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalData(data);
    if (data?.activeDate && period !== 'custom') {
      const dates = getDatesForPeriod(data.activeDate, period);
      setStart(dates.start);
      setEnd(dates.end);
    }
  }, [data]);

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month' | 'year' | 'custom') => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      return;
    }

    const base = data?.activeDate || getTodayStr();
    const { start: s, end: e } = getDatesForPeriod(base, newPeriod);

    setStart(s);
    setEnd(e);
    fetchFilteredData(s, e);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStart(value);
      fetchFilteredData(value, end);
    } else {
      setEnd(value);
      fetchFilteredData(start, value);
    }
  };

  const fetchFilteredData = (s: string, e: string) => {
    setLoading(true);
    apiFetch(`/api/dashboard?start=${s}&end=${e}`)
      .then(res => res.json())
      .then(resData => {
        setLocalData(resData);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  // 1. Check if both reports and price list are completely empty
  if (!localData?.hasData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center font-sans">
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-6">
          <Ban className="h-10 w-10 text-rose-500/80" />
          <div className="absolute inset-0 rounded-2xl bg-rose-500/5 blur-md"></div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          База данных пуста
        </h2>
        <p className="text-[#A1A1AA] max-w-lg mx-auto text-sm sm:text-base mb-8">
          Управление доходами рассчитывает упущенные финансовые средства в реальном времени. Для старта импортируйте годовой отчет Bnovo и прайс-лист курорта.
        </p>

        {/* Status Checkcards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left font-sans">
          <div className="p-4 rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-[#71717A]">ОТЧЕТ</span>
              <span className="text-rose-500 text-xs font-medium">Ожидание</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">Годовой отчет Bnovo (.xls)</h3>
            <p className="text-xs text-[#71717A] mt-1">Содержит ежедневную фактическую выручку по всем эко-объектам.</p>
          </div>

          <div className="p-4 rounded-xl border border-white/5 bg-black/40 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-[#71717A]">ТАРИФЫ</span>
              <span className="text-rose-500 text-xs font-medium">Ожидание</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">Прайслист Терра Алтая (.xlsx)</h3>
            <p className="text-xs text-[#71717A] mt-1">Определяет эталонную сезонную стоимость проживания.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => onNavigateToTab('import')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-all cursor-pointer"
          >
            Перейти к Импорту
          </button>
          <button
            onClick={onLoadDemo}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Загрузить демонстрационные данные</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Extract active day data
  const today = localData?.todayMetrics;
  const overall = localData?.overall || { potential: 0, actual: 0, lost: 0, occupancy: 0, vacantValue: 0, totalOccupiedUnits: 0, totalActiveUnits: 0, totalDays: 1 };

  // Compute what requires attention list
  const attentionItems: string[] = [];
  if (!hasRevenue) {
    attentionItems.push('Загрузите годовой отчет Bnovo: Невозможно рассчитать фактические доходы.');
  }
  if (!hasPrices) {
    attentionItems.push('Загрузите прайс-лист: Упущенная выручка рассчитывается только на основе эталонной базы цен.');
  }
  if (unmappedCount > 0) {
    attentionItems.push(`Обнаружено несоответствие категорий (${unmappedCount} шт.). Свяжите импортированные группы на вкладке "Соответствия" для точных расчетов.`);
  }

  // Add low occupancy alerts if data loaded
  if (localData?.topLosses) {
    localData?.topLosses.forEach(tl => {
      if (tl.occupancy < 42 && tl.potential > 0) {
        attentionItems.push(`Низкая загрузка в категории "${tl.category}" (${Math.round(tl.occupancy)}%). Теряется ${formatCurrency(tl.lost)} потенциального дохода.`);
      }
    });
  }

  return (
    <div className="space-y-6">
      
      {/* HUD HEADER: TITLE & FILE STATUS SETUP */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#7C5CFF] animate-pulse shadow-[0_0_10px_#7C5CFF]" />
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-[#A1A1AA] uppercase">Revenue Cockpit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase mt-1">
            Terra Altaya <span className="text-[#A1A1AA] font-light font-sans">Intelligence</span>
          </h1>
          <p className="text-[11px] text-[#A1A1AA] mt-1.5 font-normal font-sans">
            {period === 'day' && `Аудит за день: ${start.split('-').reverse().join('.')}`}
            {period === 'week' && `Интервал недели: с ${start.split('-').reverse().join('.')} по ${end.split('-').reverse().join('.')}`}
            {period === 'month' && `Интервал месяца: с ${start.split('-').reverse().join('.')} по ${end.split('-').reverse().join('.')}`}
            {period === 'year' && `Годовой интервал: с ${start.split('-').reverse().join('.')} по ${end.split('-').reverse().join('.')}`}
            {period === 'custom' && `Особый период: c ${start.split('-').reverse().join('.')} по ${end.split('-').reverse().join('.')}`}
          </p>
        </div>

        {/* File statuses */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-full px-3 py-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${hasRevenue ? 'bg-[#00E09D]' : 'bg-[#FF2D63]'}`} />
            <span className="text-[#A1A1AA] font-medium font-sans">Bnovo:</span>
            <span className={`${hasRevenue ? 'text-[#00E09D]' : 'text-[#FF2D63]'} font-bold font-sans`}>
              {hasRevenue ? 'Активен' : 'Отсутствует'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-full px-3 py-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${hasPrices ? 'bg-[#00E09D]' : 'bg-[#FF2D63]'}`} />
            <span className="text-[#A1A1AA] font-medium font-sans">Прайслист:</span>
            <span className={`${hasPrices ? 'text-[#00E09D]' : 'text-[#FF2D63]'} font-bold font-sans`}>
              {hasPrices ? 'Активен' : 'Отсутствует'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-full px-3 py-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${hasRevenue && hasPrices ? 'bg-[#00E09D]' : 'bg-[#FF2D63]'}`} />
            <span className="text-[#A1A1AA] font-medium font-sans">Бронирования:</span>
            <span className={`${hasRevenue && hasPrices ? 'text-[#00E09D]' : 'text-[#FF2D63]'} font-bold font-sans`}>
              {hasRevenue && hasPrices ? 'Активно' : 'Ожидание'}
            </span>
          </div>

          {localData?.lastImport && (
            <div className="text-[11px] text-[#A1A1AA] bg-white/5 px-3 py-1.5 rounded-full border border-white/10 font-mono">
              Импорт: <span className="text-[#F8FAFC]">{new Date(localData.lastImport.uploadedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>
      </div>

      {/* PERIOD & RANGE FILTERS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40 backdrop-blur-md">
        <span className="text-xs font-semibold text-[#A1A1AA] uppercase font-mono tracking-wider font-sans">Настройка горизонта</span>
        
        <div className="flex flex-wrap items-center gap-3 font-sans">
          {/* Period Selection Pill group */}
          <div className="inline-flex bg-white/5 rounded-lg p-1 border border-white/10 h-9 items-center font-sans font-medium">
            {(['day', 'week', 'month', 'year', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  period === p ? 'bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/10' : 'text-[#A1A1AA] hover:text-[#FFFFFF]'
                }`}
              >
                {p === 'day' && 'День'}
                {p === 'week' && 'Неделя'}
                {p === 'month' && 'Месяц'}
                {p === 'year' && 'Год'}
                {p === 'custom' && 'Период'}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-sans">
              <span>с</span>
              <input
                type="date"
                value={start}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFF] font-mono text-[11px] cursor-pointer"
              />
              <span>по</span>
              <input
                type="date"
                value={end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFF] font-mono text-[11px] cursor-pointer"
              />
            </div>
          )}

          {loading && (
            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-[#7C5CFF] border-white/20" />
          )}
        </div>
      </div>

      {/* COCKPIT CENTER: COMBINED PRIMARY & COMPACT SECONDARY KPI BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* HERO KPI DISPLAY: LOST REVENUE (LEFT 2/3) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Corner graphic reflection */}
          <div className="absolute -top-10 -right-10 h-32 w-32 bg-[#FF2D63]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 text-[#FF2D63] mb-3 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF2D63] shadow-[0_0_8px_#FF2D63]" />
              <span className="text-xs font-bold uppercase tracking-widest font-mono">Главный показатель эффективности</span>
            </div>
            
            <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans">
              Упущенная выручка за период
            </h2>
            
            <div className="mt-4">
              <span className="text-5xl sm:text-7xl font-sans font-black text-[#FF2D63] font-mono tracking-tight num-text-shadow leading-none block select-all">
                {formatCurrency(overall.lost)}
              </span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans font-normal">
            <p className="text-[#A1A1AA] text-xs max-w-lg leading-relaxed">
              Потери из-за пустого номерного фонда, вычисленные посуточно на базе сезонного тарифа. Каждая пропущенная бронь снижает маржинальность курорта.
            </p>
            <span className="text-[11px] font-mono text-[#71717A] shrink-0 bg-white/5 py-1 px-2.5 rounded border border-white/5 self-start">
              Ставка: 100% от ценности упущенного тарифа
            </span>
          </div>
        </div>

        {/* COMPACT HOVER STATS PANEL (RIGHT 1/3) */}
        <div className="grid grid-cols-1 gap-4 font-sans font-medium">
          
          {/* POTENTIAL */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between text-[#A1A1AA]">
              <span className="text-xs uppercase tracking-wider font-semibold">Потенциал (Ресурс)</span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-mono text-[#F8FAFC]">100%</span>
            </div>
            <div className="mt-2 text-2xl font-black text-[#F8FAFC] font-mono tracking-tight">
              {formatCurrency(overall.potential)}
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 font-normal">
              Максимально достижимый доход при 100% загрузке
            </div>
          </div>

          {/* ACTUAL */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between text-[#A1A1AA]">
              <span className="text-xs uppercase tracking-wider font-semibold font-sans">Фактически (Заработано)</span>
              <span className="text-[10px] bg-[#00E09D]/10 text-[#00E09D] px-2 py-0.5 rounded font-mono font-bold">
                {overall.potential > 0 ? Math.round((overall.actual / overall.potential) * 100) : 0}% ресурса
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-[#00E09D] font-mono tracking-tight">
              {formatCurrency(overall.actual)}
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 font-normal">
              Зафиксированные реальные продажи
            </div>
          </div>

          {/* OCCUPANCY & VACANCY SPLIT */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between text-[#A1A1AA] mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold font-sans">Загрузка и Остаток</span>
              <span className="text-xs text-[#00E09D] font-bold font-mono">{Math.round(overall.occupancy)}% занято</span>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-1.5 mb-2.5">
              <div 
                className="h-full bg-gradient-to-r from-[#00E09D] to-[#7C5CFF]" 
                style={{ width: `${overall.occupancy}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono pt-1 text-[#A1A1AA]">
              <div className="flex flex-col">
                <span className="text-[#71717A] text-[9px] uppercase font-bold">Занято номеро-дней</span>
                <span className="font-bold text-white">
                  {period === 'day' && today
                    ? `${today.occupiedUnits} / ${today.activeUnits}`
                    : `${Math.round(overall.totalOccupiedUnits / (overall.totalDays || 1))} / ${Math.round(overall.totalActiveUnits / (overall.totalDays || 1))} в ср.`}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[#71717A] text-[9px] uppercase font-bold">Свободно</span>
                <span className="font-bold text-[#FFB020]">
                  {period === 'day' && today
                    ? `${today.freeUnits} объектов`
                    : `${Math.round((overall.totalActiveUnits - overall.totalOccupiedUnits) / (overall.totalDays || 1))} в ср.`}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER BENTO GRID: VACANT INVENTORIES, TOP LOSSES AND ACTIONABLE INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BENTO BLOCK 1: СТОИМОСТЬ ПУСТУЮЩИХ ОБЪЕКТОВ */}
        {overall && (
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-white/15 transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                  Стоимость пустующих объектов
                </h3>
                <span className="text-[11px] bg-[#FFB020]/10 text-[#FFB020] px-2.5 py-0.5 rounded-full font-mono font-medium">
                  {period === 'day' && today ? `${today.freeUnits} свободны` : 'За период'}
                </span>
              </div>
              
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                  {formatCurrency(period === 'day' && today ? today.vacantValue : overall.vacantValue)}
                </span>
                <span className="text-[10px] text-[#A1A1AA] font-normal leading-normal mt-1 block font-sans">
                  потеря в ценности из-за нулевой занятости
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 font-sans font-normal">
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                {period === 'day' 
                  ? 'Суммарный потенциал недополученных денег, если данные свободные номера останутся незаселенными до конца дня. Рассчитано перемножением свободных юнитов на тариф.'
                  : 'Сотни тысяч рублей, потерянные кумулятивно за выбранный период из-за простоя номеров без активных заездов. Рассчитано строго по тарифам пустующих дней.'}
              </p>
            </div>
          </div>
        )}

        {/* BENTO BLOCK 2: ТОП ПОТЕРЬ ПО КАТЕГОРИЯМ */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-white/15 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Топ Потерь по категориям</h3>
                <p className="text-[10px] text-[#71717A] font-normal mt-0.5 font-sans">Ранжирование потерь дохода по группам размещения</p>
              </div>
              <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono text-[#A1A1AA]">
                Глобально
              </span>
            </div>

            {localData?.topLosses && localData.topLosses.length > 0 ? (
              <div className="space-y-3.5">
                {localData.topLosses.slice(0, 3).map((tl, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm font-sans font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#71717A] font-bold">0{idx + 1}</span>
                        <span className="font-semibold text-white truncate max-w-[130px]" title={tl.category}>
                          {tl.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-[#71717A]">Упущено:</span>
                        <span className="font-bold text-[#FF2D63]">{formatCurrency(tl.lost)}</span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-[#00E09D]" 
                        style={{ width: `${tl.potential > 0 ? (tl.actual / tl.potential) * 100 : 0}%` }}
                        title={`Заработано: ${formatCurrency(tl.actual)}`}
                      />
                      <div 
                        className="bg-[#FF2D63]" 
                        style={{ width: `${tl.potential > 0 ? (tl.lost / tl.potential) * 100 : 0}%` }}
                        title={`Упущено: ${formatCurrency(tl.lost)}`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#71717A] font-mono leading-none pt-0.5">
                      <span>Фактическая выручка: {formatCurrency(tl.actual)}</span>
                      <span>Доля потерь: {tl.potential > 0 ? Math.round((tl.lost / tl.potential) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-[#71717A] text-xs">Нет записей для формирования рейтинга</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-[#71717A] flex justify-between items-center font-sans font-normal">
            <span>Цветом помечен Факт и Потеря</span>
            <button 
              onClick={() => onNavigateToTab('mappings')}
              className="text-[#7C5CFF] hover:text-[#FFFFFF] cursor-pointer"
            >
              Связи категорий →
            </button>
          </div>
        </div>

        {/* BENTO BLOCK 3: ЧТО СДЕЛАТЬ СЕЙЧАС */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-white/15 transition-all duration-300">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-[#FFB020] shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                Что сделать сейчас
              </h3>
            </div>

            {attentionItems.length > 0 ? (
              <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                {attentionItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-[#FFB020]/20 flex gap-2 text-[11px] text-[#A1A1AA] leading-relaxed font-sans font-normal">
                    <span className="text-[#FFB020] font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[#00E09D] font-sans">
                <p className="text-xs font-semibold">✨ Противоречий и пропусков не найдено!</p>
                <p className="text-[10px] text-[#71717A] mt-1 font-normal">Отель функционирует по плану без конфликтов цен.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 font-sans">
            <button 
              onClick={() => onNavigateToTab('calendar')}
              className="w-full text-center py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#FFFFFF] transition-all"
            >
              Проинспектировать календарь потерь →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
