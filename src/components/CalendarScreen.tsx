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
    if (!dayMetrics || dayMetrics.potentialRevenue === 0) {
      return 'border border-white/5 bg-white/[0.02] text-zinc-500 hover:bg-white/[0.04]';
    }

    const ratio = dayMetrics.lostRevenue / dayMetrics.potentialRevenue;
    
    // Select styling
    if (ratio <= 0.05) {
      return 'border border-[#00E09D]/20 bg-[#00E09D]/5 text-[#00E09D] hover:bg-[#00E09D]/10';
    } else if (ratio < 0.28) {
      return 'border border-[#FFB020]/25 bg-[#FFB020]/5 text-[#FFB020] hover:bg-[#FFB020]/10';
    } else {
      return 'border border-[#FF2D63]/30 bg-[#FF2D63]/5 text-[#FF2D63] hover:bg-[#FF2D63]/10';
    }
  };

  return (
    <div className="relative flex flex-col xl:flex-row gap-6 items-start font-sans">
      
      {/* LEFT COLUMN: MONTH NAVIGATORS & CALENDAR INTERFACE */}
      <div className="flex-1 w-full space-y-4">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-zinc-400" />
              <span>Тепловая карта потерь</span>
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5 font-normal">Ежедневный аудит эффективности использования фонда.</p>
          </div>

          {/* Month controllers */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-lg self-start">
            <button
              onClick={prevMonth}
              disabled={activeMonthIdx === 0}
              className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:text-zinc-700 disabled:hover:text-zinc-700 hover:bg-white/5 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-zinc-200 min-w-[90px] text-center font-mono">
              {selectedMonth.label}
            </span>
            <button
              onClick={nextMonth}
              disabled={activeMonthIdx === availableMonths.length - 1}
              className="p-1 rounded text-[#A1A1AA] hover:text-white disabled:text-zinc-700 disabled:hover:text-zinc-700 hover:bg-white/5 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legend block */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-black/40 border border-white/5 p-3.5 text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded bg-[#00E09D]/10 border border-[#00E09D]/30" />
            <span>Низкие потери (&#60;5% потенциала)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded bg-[#FFB020]/10 border border-[#FFB020]/30" />
            <span>Допустимые потери (5% - 28%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded bg-[#FF2D63]/10 border border-[#FF2D63]/40" />
            <span>Критические потери (&#62;28%)</span>
          </div>
        </div>

        {/* CALENDAR MONTH SHAPE */}
        <div className="rounded-2xl border border-white/5 bg-black/30 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Weekday Titles */}
          <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02] text-center py-3 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider font-mono">
            <div>Пн</div>
            <div>Вт</div>
            <div>Ср</div>
            <div>Чт</div>
            <div>Пт</div>
            <div className="text-[#FFB020]/90">Сб</div>
            <div className="text-[#FFB020]/90">Вс</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-white/5 border-t border-l border-white/5">
            {daysGrid.map((day, idx) => {
              const dayStr = day.dateStr;
              const hasDataDay = dayStr ? metrics.find(m => m.date === dayStr) : undefined;
              const isActiveChoice = dayStr === selectedDate;

              return (
                <div
                  key={idx}
                  onClick={() => dayStr && setSelectedDate(dayStr)}
                  className={`min-h-[75px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-all select-none duration-200 ${
                    dayStr ? 'cursor-pointer' : 'bg-[#050507]/20 text-[#71717A]/40'
                  } ${isActiveChoice ? 'ring-2 ring-[#7C5CFF] z-10' : ''} ${getLossClass(hasDataDay)}`}
                >
                  {/* Day Date Label */}
                  <div className="flex justify-between items-start">
                    <span className={`font-mono font-bold text-xs sm:text-sm ${day.isCurrentMonth ? 'text-white' : 'text-zinc-600'}`}>
                      {day.dayNum}
                    </span>
                    {dayStr && hasDataDay && hasDataDay.lostRevenue > 0 && (
                      <span className="text-[9px] rounded-full px-1.5 py-0.5 bg-[#FF2D63]/10 border border-[#FF2D63]/25 font-bold text-[#FF2D63]">
                        {Math.round((hasDataDay.lostRevenue / hasDataDay.potentialRevenue) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Pricing Values Indicators */}
                  {dayStr && hasDataDay ? (
                    <div className="text-right space-y-0.5 sm:space-y-1">
                      <div className="text-[10px] sm:text-xs font-bold text-[#00E09D] font-mono leading-none">
                        +{formatCost(hasDataDay.actualRevenue)}
                      </div>
                      <div className="text-[9px] sm:text-[11px] font-medium text-[#FF2D63] font-mono leading-none">
                        -{formatCost(hasDataDay.lostRevenue)}
                      </div>
                    </div>
                  ) : dayStr ? (
                    <span className="text-[9px] font-mono text-[#71717A] text-center w-full py-2 block font-normal">Пусто</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SLIDING DETAILED COCKPIT PANEL */}
      {selectedDate && (
        <div className="w-full xl:w-[480px] glass-panel rounded-2xl shadow-2xl p-6 sticky top-20 self-start transition-all space-y-6 animate-fade-in z-20">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-xs font-mono text-[#7C5CFF] uppercase tracking-widest font-bold">Панель Суток</span>
              <h3 className="text-base font-bold text-white font-mono mt-0.5">
                {selectedDate.split('-').reverse().join('.')}
              </h3>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 px-2.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer font-bold text-xs"
            >
              Закрыть
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-[#A1A1AA]">
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-t-[#7C5CFF] border-white/20 mr-2.5 align-middle" />
              <span className="text-xs font-normal">Загрузка сводок юнитов...</span>
            </div>
          ) : detailError ? (
            <p className="text-[#FF2D63] text-xs text-center py-6 font-normal">{detailError}</p>
          ) : dayDetail ? (
            <div className="space-y-6">
              
              {/* HERO LOST REVENUE BADGE OVERLAY */}
              <div className="p-4 rounded-xl border border-[#FF2D63]/30 bg-[#FF2D63]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-[#FF2D63]/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#FF2D63] font-bold">Упущенная выручка за день</span>
                <div className="text-3xl font-black text-[#FF2D63] font-mono tracking-tight leading-none mt-2">
                  {formatCost(dayDetail.metrics.lostRevenue)}
                </div>
                <p className="text-[10px] text-[#A1A1AA] mt-1.5 leading-normal font-normal">
                  Недополучено денег из-за простоя {dayDetail.metrics.freeUnits} объектов проживания.
                </p>
              </div>

              {/* Potential & Actual Subcards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-white/5 bg-black/40">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-[#A1A1AA]">Потенциал</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {formatCost(dayDetail.metrics.potentialRevenue)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/5 bg-black/40">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-[#A1A1AA]">Фактически</span>
                  <div className="text-lg font-bold text-[#00E09D] font-mono mt-0.5">
                    {formatCost(dayDetail.metrics.actualRevenue)}
                  </div>
                </div>
              </div>

              {/* Group Category Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA] font-mono">Аудит по Категориям</h4>
                <div className="rounded-xl border border-white/5 bg-black/20 divide-y divide-white/5 overflow-hidden text-xs max-h-56 overflow-y-auto">
                  {dayDetail.metrics.categories.map((cat, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center bg-black/10 hover:bg-white/[0.02]">
                      <div>
                        <div className="font-semibold text-white">{cat.category}</div>
                        <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">
                          Занято: <span className="text-zinc-200">{cat.occupiedUnits}/{cat.activeUnits}</span> • Тариф: <span className="text-zinc-300">{formatCost(cat.dailyPrice)}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-[#00E09D]">+{formatCost(cat.actualRevenue)}</div>
                        {cat.lostRevenue > 0 && (
                          <div className="text-[10px] text-[#FF2D63] font-bold">-{formatCost(cat.lostRevenue)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical units drilldown */}
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA] flex justify-between font-mono">
                  <span>Занятость Юнитов</span>
                  <span className="text-[10px] text-[#71717A] font-normal">Инвентарь: {dayDetail.unitsDetails.length}</span>
                </h4>
                <div className="rounded-xl border border-white/5 bg-black/20 divide-y divide-white/5 max-h-60 overflow-y-auto text-xs font-mono text-zinc-300">
                  {dayDetail.unitsDetails.length > 0 ? (
                    dayDetail.unitsDetails.map((unit, idx) => (
                      <div key={idx} className="p-2 px-3 flex justify-between items-center hover:bg-white/[0.02] bg-black/10">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${unit.occupied ? 'bg-[#00E09D] shadow-[0_0_8px_#00E09D]' : 'bg-zinc-700'}`} />
                          <span className="font-semibold text-white">{unit.unitName}</span>
                          <span className="text-[9px] text-[#71717A] uppercase tracking-wider">({unit.mappedCategory || 'Связь отсутствует'})</span>
                        </div>
                        <div className="text-right">
                          <div className={unit.occupied ? 'text-[#00E09D] font-semibold' : 'text-[#71717A]'}>
                            {unit.occupied ? `+${formatCost(unit.actualRevenue)}` : 'Свободен'}
                          </div>
                          {unit.loss > 0 && <div className="text-[10px] text-[#FF2D63] font-bold">-{formatCost(unit.loss)}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-[#71717A] text-[11px] font-normal font-sans">Спецификация юнитов Bnovo пуста.</p>
                  )}
                </div>
              </div>

              {/* Source materials footer */}
              <div className="pt-3 border-t border-white/5 text-[11px] text-[#71717A] space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5 font-sans font-normal">
                <div className="font-bold text-[#A1A1AA] mb-1 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-[#A1A1AA]" />
                  <span>Источники расчета за сутки:</span>
                </div>
                <div className="flex gap-1 items-center truncate">
                  <span className="text-[#71717A] font-bold font-mono uppercase text-[9px] bg-white/5 px-1 rounded">Заезды Bnovo:</span>
                  <span className="text-[#A1A1AA] hover:text-white" title={dayDetail.sources.bnovoFile || 'Нет источников'}>
                    {dayDetail.sources.bnovoFile || 'Записи отсутствуют'}
                  </span>
                </div>
                <div className="flex gap-1 items-center truncate">
                  <span className="text-[#71717A] font-bold font-mono uppercase text-[9px] bg-white/5 px-1 rounded">База тарифов:</span>
                  <span className="text-[#A1A1AA] hover:text-white" title={dayDetail.sources.priceListFile || 'Нет источников'}>
                    {dayDetail.sources.priceListFile || 'Записи отсутствуют'}
                  </span>
                </div>
              </div>

              {/* Edit tariffs link button if Admin */}
              {isAdmin && (
                <button
                  onClick={() => onNavigateToTab('tariffs')}
                  className="w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sans"
                >
                  Редактировать цену в тарифах
                </button>
              )}

            </div>
          ) : null}
        </div>
      )}

    </div>
  );
}
