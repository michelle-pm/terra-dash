import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, HelpCircle, X, CheckCircle2, AlertTriangle, FileText, Info } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface CalendarDayMetric {
  date: string;
  weekday: string;
  actualRevenue: number;
  lostRevenue: number;
  potentialRevenue: number;
  occupancy: number;
}

interface CalendarScreenProps {
  metrics: CalendarDayMetric[];
  isAdmin: boolean;
  onNavigateToTab: (tab: string) => void;
}

interface CategoryDetail {
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

interface UnitDetailRow {
  unitName: string;
  sourceCategory: string;
  mappedCategory: string;
  actualRevenue: number;
  dailyPrice: number;
  occupied: boolean;
  loss: number;
}

interface DayDetailData {
  metrics: {
    date: string;
    weekday: string;
    potentialRevenue: number;
    actualRevenue: number;
    lostRevenue: number;
    occupiedUnits: number;
    activeUnits: number;
    freeUnits: number;
    vacantValue: number;
    categories: CategoryDetail[];
  };
  unitsDetails: UnitDetailRow[];
  sources: {
    bnovoFile: string | null;
    priceListFile: string | null;
  };
}

export default function CalendarScreen({ metrics, isAdmin, onNavigateToTab }: CalendarScreenProps) {
  // Available Months selector derived from populated dates
  const availableMonths = [
    { label: 'Май 2026', year: 2026, month: 4 }, // JS Months are 0-indexed: May=4
    { label: 'Июнь 2026', year: 2026, month: 5 },
    { label: 'Июль 2026', year: 2026, month: 6 },
    { label: 'Август 2026', year: 2026, month: 7 }
  ];

  const [activeMonthIdx, setActiveMonthIdx] = useState(1); // Default to June (idx 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const selectedMonth = availableMonths[activeMonthIdx];

  // Load day detail when selectedDate changes
  useEffect(() => {
    if (!selectedDate) {
      setDayDetail(null);
      return;
    }

    setIsLoadingDetail(true);
    setDetailError(null);
    apiFetch(`/api/day-detail?date=${selectedDate}`)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка связи с сервером');
        return res.json();
      })
      .then(data => {
        setDayDetail(data);
      })
      .catch(err => {
        setDetailError('Не удалось загрузить детальные данные дня.');
        console.error(err);
      })
      .finally(() => {
        setIsLoadingDetail(false);
      });
  }, [selectedDate]);

  // Construct standard calendar matrix for the chosen month
  const getDaysInMonthMatrix = (year: number, monthNum: number) => {
    const firstDayIndex = new Date(year, monthNum, 1).getDay(); // 0 is Sun, 1 is Mon...
    // Adjust to Monday start: 0->6, 1->0, 2->1 ... 6->5
    const mondayStartIdx = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonthCount = new Date(year, monthNum + 1, 0).getDate();
    const prevDaysInMonthCount = new Date(year, monthNum, 0).getDate();

    const daysMatrix: { dateStr: string | null; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Pads previous month days
    for (let i = mondayStartIdx - 1; i >= 0; i--) {
      daysMatrix.push({
        dateStr: null,
        dayNum: prevDaysInMonthCount - i,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonthCount; day++) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${year}-${pad(monthNum + 1)}-${pad(day)}`;
      daysMatrix.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true
      });
    }

    // Pad next month days to make clean grid of rows
    const totalSlots = Math.ceil(daysMatrix.length / 7) * 7;
    const nextMonthPadCount = totalSlots - daysMatrix.length;
    for (let day = 1; day <= nextMonthPadCount; day++) {
      daysMatrix.push({
        dateStr: null,
        dayNum: day,
        isCurrentMonth: false
      });
    }

    return daysMatrix;
  };

  const daysGrid = getDaysInMonthMatrix(selectedMonth.year, selectedMonth.month);

  const prevMonth = () => {
    if (activeMonthIdx > 0) setActiveMonthIdx(activeMonthIdx - 1);
  };

  const nextMonth = () => {
    if (activeMonthIdx < availableMonths.length - 1) setActiveMonthIdx(activeMonthIdx + 1);
  };

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  // Get color flag of day based on loss ratio of potential
  const getLossClass = (dayMetrics: CalendarDayMetric | undefined) => {
    if (!dayMetrics || dayMetrics.potentialRevenue === 0) return 'border-zinc-800 bg-zinc-900/10 text-zinc-600 hover:border-zinc-700';

    const ratio = dayMetrics.lostRevenue / dayMetrics.potentialRevenue;
    
    // Select styling
    if (ratio <= 0.05) {
      return 'border-emerald-900/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/30';
    } else if (ratio < 0.28) {
      return 'border-amber-900/60 bg-amber-950/15 text-amber-400 hover:bg-amber-950/25';
    } else {
      return 'border-rose-950/70 bg-rose-950/15 text-rose-400 hover:bg-rose-950/25';
    }
  };

  return (
    <div className="relative flex flex-col xl:flex-row gap-6 items-start">
      
      {/* LEFT COLUMN: MONTH NAVIGATORS & CALENDAR INTERFACE */}
      <div className="flex-1 w-full space-y-4">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-zinc-400" />
              <span>Финансовый Календарь</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Ежедневный аудит эффективности использования ресурсов.</p>
          </div>

          {/* Month controllers */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg self-start">
            <button
              onClick={prevMonth}
              disabled={activeMonthIdx === 0}
              className="p-1 rounded text-zinc-400 hover:text-white disabled:text-zinc-700 disabled:hover:text-zinc-700 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-zinc-200 min-w-[90px] text-center font-mono">
              {selectedMonth.label}
            </span>
            <button
              onClick={nextMonth}
              disabled={activeMonthIdx === availableMonths.length - 1}
              className="p-1 rounded text-zinc-400 hover:text-white disabled:text-zinc-700 disabled:hover:text-zinc-700 hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legend block */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-zinc-900/45 border border-zinc-800/60 p-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-950/30 border border-emerald-900" />
            <span>Низкие потери (&#60;5% потенциала)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-amber-950/20 border border-amber-900" />
            <span>Допустимые потери (5% - 28%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-rose-950/20 border border-rose-900" />
            <span>Критические потери (&#62;28%)</span>
          </div>
        </div>

        {/* CALENDAR MONTH SHAPE */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-xl">
          {/* Weekday Titles */}
          <div className="grid grid-cols-7 border-b border-zinc-800/80 bg-zinc-900/40 text-center py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
            <div>Пн</div>
            <div>Вт</div>
            <div>Ср</div>
            <div>Чт</div>
            <div>Пт</div>
            <div className="text-amber-500/80">Сб</div>
            <div className="text-amber-500/80">Вс</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/50">
            {daysGrid.map((day, idx) => {
              const dayStr = day.dateStr;
              const hasDataDay = dayStr ? metrics.find(m => m.date === dayStr) : undefined;
              const isActiveChoice = dayStr === selectedDate;

              return (
                <div
                  key={idx}
                  onClick={() => dayStr && setSelectedDate(dayStr)}
                  className={`min-h-[75px] sm:min-h-[105px] p-1.5 flex flex-col justify-between transition-all ${
                    dayStr ? 'cursor-pointer' : 'bg-zinc-950/35 text-zinc-800'
                  } ${isActiveChoice ? 'ring-2 ring-amber-400 z-10' : ''} ${getLossClass(hasDataDay)}`}
                >
                  {/* Day Date Label */}
                  <div className="flex justify-between items-start">
                    <span className={`font-mono font-bold text-xs sm:text-sm ${day.isCurrentMonth ? '' : 'text-zinc-700'}`}>
                      {day.dayNum}
                    </span>
                    {dayStr && hasDataDay && hasDataDay.lostRevenue > 0 && (
                      <span className="text-[9px] rounded-full px-1 py-0.5 bg-rose-500/10 border border-rose-500/20 font-bold text-rose-400/80">
                        {Math.round((hasDataDay.lostRevenue / hasDataDay.potentialRevenue) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Pricing Values Indicators */}
                  {dayStr && hasDataDay ? (
                    <div className="text-right space-y-0.5 sm:space-y-1">
                      <div className="text-[10px] sm:text-xs font-bold text-emerald-400 font-mono">
                        +{formatCost(hasDataDay.actualRevenue)}
                      </div>
                      <div className="text-[9px] sm:text-[11px] font-medium text-rose-500/80 font-mono">
                        -{formatCost(hasDataDay.lostRevenue)}
                      </div>
                    </div>
                  ) : dayStr ? (
                    <span className="text-[9px] font-mono text-zinc-500 text-center py-2 block">Нет записей</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SLIDING DETAILED DRAWER PANEL */}
      {selectedDate && (
        <div className="w-full xl:w-[480px] rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl p-5 sticky top-20 self-start transition-all space-y-5 animate-fade-in z-20">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-semibold">Детальная карточка суток</span>
              <h3 className="text-base font-bold text-white font-mono">{selectedDate}</h3>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-zinc-500">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-t-amber-500 border-zinc-800 mr-2" />
              <span className="text-xs">Загрузка сводок юнитов...</span>
            </div>
          ) : detailError ? (
            <p className="text-rose-500 text-xs text-center py-6">{detailError}</p>
          ) : dayDetail ? (
            <div className="space-y-5">
              
              {/* Core summary metrics box */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/55 text-center">
                <div>
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Потенциал</div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-300 font-mono mt-0.5">
                    {formatCost(dayDetail.metrics.potentialRevenue)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Факт</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {formatCost(dayDetail.metrics.actualRevenue)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Потери</div>
                  <div className="text-xs sm:text-sm font-bold text-rose-400 font-mono mt-0.5">
                    {formatCost(dayDetail.metrics.lostRevenue)}
                  </div>
                </div>
              </div>

              {/* Group Category Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400">Потери по категориям</h4>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/20 divide-y divide-zinc-800/70 overflow-hidden text-xs max-h-56 overflow-y-auto">
                  {dayDetail.metrics.categories.map((cat, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center bg-zinc-950/20 hover:bg-zinc-900/30">
                      <div>
                        <div className="font-semibold text-zinc-200">{cat.category}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Занято: {cat.occupiedUnits}/{cat.activeUnits} • Тариф: {formatCost(cat.dailyPrice)}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-zinc-300">+{formatCost(cat.actualRevenue)}</div>
                        {cat.lostRevenue > 0 && (
                          <div className="text-[10px] text-rose-500">-{formatCost(cat.lostRevenue)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical units drilldown */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex justify-between">
                  <span>Физическая занятость юнитов</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Всего номеров: {dayDetail.unitsDetails.length}</span>
                </h4>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/20 divide-y divide-zinc-800/70 max-h-60 overflow-y-auto font-mono text-xs text-zinc-300">
                  {dayDetail.unitsDetails.length > 0 ? (
                    dayDetail.unitsDetails.map((unit, idx) => (
                      <div key={idx} className="p-2 flex justify-between items-center hover:bg-zinc-900/40">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${unit.occupied ? 'bg-emerald-500' : 'bg-zinc-600/55'}`} />
                          <span className="font-semibold text-zinc-200">{unit.unitName}</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">({unit.sourceCategory})</span>
                        </div>
                        <div className="text-right">
                          <div className={unit.occupied ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                            {unit.occupied ? `+${formatCost(unit.actualRevenue)}` : 'Пустует'}
                          </div>
                          {unit.loss > 0 && <div className="text-[10px] text-rose-500">-{formatCost(unit.loss)}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-zinc-500 text-[11px]">Фактическая занятость юнитов не загружена.</p>
                  )}
                </div>
              </div>

              {/* Source materials footer */}
              <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500 space-y-1 bg-zinc-950/20 p-2.5 rounded-lg border border-zinc-800/50">
                <div className="font-bold text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Источники расчёта:</span>
                </div>
                <div className="flex gap-1 items-center truncate">
                  <span className="text-zinc-600 font-mono uppercase text-[9px] bg-zinc-900 px-1 rounded">Bnovo Report:</span>
                  <span className="hover:text-zinc-300" title={dayDetail.sources.bnovoFile || 'Источники не прикреплены'}>
                    {dayDetail.sources.bnovoFile || 'Записи отсутствуют'}
                  </span>
                </div>
                <div className="flex gap-1 items-center truncate">
                  <span className="text-zinc-600 font-mono uppercase text-[9px] bg-zinc-900 px-1 rounded">Tariff list:</span>
                  <span className="hover:text-zinc-300" title={dayDetail.sources.priceListFile || 'Источники не прикреплены'}>
                    {dayDetail.sources.priceListFile || 'Записи отсутствуют'}
                  </span>
                </div>
              </div>

              {/* Future rates warning message if Admin */}
              {isAdmin && (
                <button
                  onClick={() => onNavigateToTab('tariffs')}
                  className="w-full text-center py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-all"
                >
                  Редактировать цену в Тарифах
                </button>
              )}

            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
