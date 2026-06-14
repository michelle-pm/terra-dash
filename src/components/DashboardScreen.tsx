import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, FileSpreadsheet, Percent, AlertCircle, ArrowUpRight, Ban, Zap } from 'lucide-react';

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
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [start, setStart] = useState('2026-06-08');
  const [end, setEnd] = useState('2026-06-14');
  const [localData, setLocalData] = useState<DashboardMetrics>(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month' | 'custom') => {
    setPeriod(newPeriod);
    let s = start;
    let e = end;

    if (newPeriod === 'day') {
      s = '2026-06-14';
      e = '2026-06-14';
    } else if (newPeriod === 'week') {
      s = '2026-06-08';
      e = '2026-06-14';
    } else if (newPeriod === 'month') {
      s = '2026-06-01';
      e = '2026-06-30';
    }

    setStart(s);
    setEnd(e);

    if (newPeriod !== 'custom') {
      fetchFilteredData(s, e);
    }
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
    fetch(`/api/dashboard?start=${s}&end=${e}`)
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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-6">
          <Ban className="h-10 w-10 text-rose-500/80" />
          <div className="absolute inset-0 rounded-2xl bg-rose-500/5 blur-md"></div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          База данных пуста
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base mb-8">
          Управление доходами рассчитывает упущенные финансовые средства в реальном времени. Для старта импортируйте годовой отчет Bnovo и прайс-лист курорта.
        </p>

        {/* Status Checkcards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-zinc-500">ОТЧЕТ</span>
              <span className="text-rose-500 text-xs font-medium">Ожидание</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">Годовой отчет Bnovo (.xls)</h3>
            <p className="text-xs text-zinc-500 mt-1">Содержит ежедневную фактическую выручку по всем эко-объектам.</p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-zinc-500">ТАРИФЫ</span>
              <span className="text-rose-500 text-xs font-medium">Ожидание</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">Прайслист Терра Алтая (.xlsx)</h3>
            <p className="text-xs text-zinc-500 mt-1">Определяет эталонную сезонную стоимость проживания.</p>
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
  const overall = localData?.overall || { potential: 0, actual: 0, lost: 0, occupancy: 0, vacantValue: 0 };

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
    <div className="space-y-6 font-medium">
      
      {/* 0. PERIOD SELECTOR HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Сводные финансовые показатели
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 font-normal">
            {period === 'day' && 'За выбранный активный день: 14 июня 2026'}
            {period === 'week' && 'По умолчанию: текущая неделя (08.06.2026 — 14.06.2026)'}
            {period === 'month' && 'За текущий месяц: июнь 2026 (01.06.2026 — 30.06.2026)'}
            {period === 'custom' && `Пользовательский период: с ${start.split('-').reverse().join('.')} по ${end.split('-').reverse().join('.')}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period type buttons */}
          <div className="inline-flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 h-9 items-center">
            <button
              onClick={() => handlePeriodChange('day')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                period === 'day' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              День
            </button>
            <button
              onClick={() => handlePeriodChange('week')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                period === 'week' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                period === 'month' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => handlePeriodChange('custom')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                period === 'custom' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Свой период
            </button>
          </div>

          {/* Datepickers showing under Custom mode */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="text-zinc-500 font-mono text-[11px]">с</span>
              <input
                type="date"
                value={start}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-600 font-mono text-[11px] cursor-pointer"
              />
              <span className="text-zinc-500 font-mono text-[11px]">по</span>
              <input
                type="date"
                value={end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-600 font-mono text-[11px] cursor-pointer"
              />
            </div>
          )}

          {loading && (
            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-red-600 border-zinc-800 shrink-0" />
          )}
        </div>
      </div>
      
      {/* 1. HERO MAIN METRIC FOR TODAY / CHOSEN DAY */}
      {today && (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 h-40 w-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-1.5">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium uppercase tracking-wider">Основной индикатор потерь</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Упущено
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl sm:text-6xl font-extrabold tracking-tight text-rose-500 font-mono">
                  {formatCurrency(today.lostRevenue)}
                </span>
                <span className="text-xs sm:text-sm text-zinc-500 font-mono">заактивную дату {today.date}</span>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm mt-3 max-w-xl">
                Упущенная выручка — это недозаработанные средства из-за пустующих объектов или продажи ниже прайс-листа. Рассчитано строго по тарифу дня.
              </p>
            </div>

            {/* Quick Today's occupancy meter */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-xl border border-zinc-800 bg-zinc-900/55 p-4 sm:p-5 md:w-80">
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Загрузка сегодня:</span>
                  <span className="text-emerald-400 font-semibold">{today.activeUnits > 0 ? Math.round((today.occupiedUnits / today.activeUnits) * 100) : 0}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${today.activeUnits > 0 ? (today.occupiedUnits / today.activeUnits) * 100 : 0}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-zinc-800">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Занято</div>
                    <div className="text-sm font-semibold text-zinc-300 font-mono">{today.occupiedUnits} / {today.activeUnits}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Свободно</div>
                    <div className="text-sm font-semibold text-zinc-300 font-mono">{today.freeUnits}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CORE PERIOD METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Potential Revenue Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
          <div className="flex justify-between items-center text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Ресурс (Потенциал)</span>
            <ArrowUpRight className="h-4 w-4 text-zinc-400/50" />
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-white font-mono break-all">
            {formatCurrency(overall.potential)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-full truncate">Максимально доступный доход за период</p>
        </div>

        {/* Actual Revenue Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
          <div className="flex justify-between items-center text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Фактически</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-emerald-400 font-mono break-all">
            {formatCurrency(overall.actual)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-full truncate">Реально зафиксированные продажи</p>
        </div>

        {/* Lost Revenue Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
          <div className="flex justify-between items-center text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Кумулятивно упущено</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-rose-500 font-mono break-all">
            {formatCurrency(overall.lost)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-full truncate">Разница между эталонной ценой и продажами</p>
        </div>

        {/* Global Occupancy Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
          <div className="flex justify-between items-center text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Средняя загрузка</span>
            <Percent className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono">
            {Math.round(overall.occupancy)}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-full truncate">По физическим номерам проживания</p>
        </div>

      </div>

      {/* 3. BENTO GRID DETAIL BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column A: Top Losses & Vacant Inventory */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Losses Ranking */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Топ Потерь по категориям</h3>
                <p className="text-xs text-zinc-500">Ранжирование потерь дохода по группам размещения</p>
              </div>
              <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">Глобально</span>
            </div>

            {localData?.topLosses && localData.topLosses.length > 0 ? (
              <div className="space-y-4">
                {localData.topLosses.slice(0, 5).map((tl, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-600">0{idx + 1}</span>
                        <span className="font-semibold text-zinc-200">{tl.category}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-zinc-500 text-xs">Упущено:</span>
                        <span className="font-bold text-rose-500">{formatCurrency(tl.lost)}</span>
                      </div>
                    </div>
                    {/* Progress Bar indicating loss portion of potential */}
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500" 
                        style={{ width: `${tl.potential > 0 ? (tl.actual / tl.potential) * 100 : 0}%` }}
                        title={`Заработано: ${formatCurrency(tl.actual)}`}
                      />
                      <div 
                        className="bg-rose-500/85" 
                        style={{ width: `${tl.potential > 0 ? (tl.lost / tl.potential) * 100 : 0}%` }}
                        title={`Упущено: ${formatCurrency(tl.lost)}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Фактическая выручка: {formatCurrency(tl.actual)}</span>
                      <span>Доля потерь: {tl.potential > 0 ? Math.round((tl.lost / tl.potential) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs text-zinc-500">Нет данных для составления рейтинга.</div>
            )}
          </div>

          {/* Today vacant inventories cost */}
          {today && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-white">Стоимость пустующих объектов (сегодня)</h3>
                <span className="text-xs text-amber-500 font-mono">{today.freeUnits} свободных объектов</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-zinc-200 font-mono">
                  {formatCurrency(today.vacantValue)}
                </span>
                <span className="text-xs text-zinc-500">потеря в ценности из-за нулевой занятости</span>
              </div>
              <p className="text-xs text-zinc-500">
                Сумма потенциально неполученных денег, если данные свободные номера останутся незаселенными до конца дня. Рассчитано перемножением свободных юнитов на тариф для каждого типа размещения.
              </p>
            </div>
          )}

        </div>

        {/* Column B: System logs/reports & Attention lists */}
        <div className="space-y-6">
          
          {/* Action and Attention alert list */}
          <div className="rounded-xl border border-rose-950/45 bg-zinc-950 p-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>Что требует внимания</span>
            </h3>

            {attentionItems.length > 0 ? (
              <div className="space-y-3">
                {attentionItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 p-2.5 rounded-lg bg-zinc-900/65 border border-zinc-800 text-xs text-zinc-300">
                    <span className="font-bold text-amber-500">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-emerald-500 font-medium">✨ Все синхронизировано и скоординировано отлично!</p>
                <p className="text-[10px] text-zinc-500 mt-1">Ошибки согласования отсутствуют.</p>
              </div>
            )}
          </div>

          {/* Last import info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
              <span>Последний импорт</span>
            </h3>

            {data.lastImport ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Файл:</span>
                  <span className="text-zinc-300 font-medium truncate max-w-[150px]" title={data.lastImport.fileName}>
                    {data.lastImport.fileName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Тип:</span>
                  <span className="text-zinc-300 font-medium">
                    {data.lastImport.fileType === 'yearly_revenue_report' ? 'Отчет Bnovo' : 'Прайс-лист'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Загружен:</span>
                  <span className="text-zinc-300">
                    {new Date(data.lastImport.uploadedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Предупреждения:</span>
                  <span className={data.lastImport.warnings.length > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                    {data.lastImport.warnings.length}
                  </span>
                </div>
                <button
                  onClick={() => onNavigateToTab('import')}
                  className="w-full mt-2 text-center py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[11px] text-zinc-300 transition-all font-mono"
                >
                  Все импорты →
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 text-center py-4">Импортированные файлы запуска отсутствуют.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
