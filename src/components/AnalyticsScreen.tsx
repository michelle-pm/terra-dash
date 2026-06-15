import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Line } from 'recharts';
import { BarChart3, Filter, Calendar, Settings, DollarSign, DownloadCloud } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface CategoryItem {
  category: string;
  potential: number;
  actual: number;
  lost: number;
  active: number;
  occupied: number;
  occupancy: number;
}

interface TimelineItem {
  label: string;
  potential: number;
  actual: number;
  lost: number;
  occupancy: number;
}

interface AnalyticsScreenProps {
  categoriesList: string[];
}

export default function AnalyticsScreen({ categoriesList }: AnalyticsScreenProps) {
  // Filters State
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');

  // Chart data fetched from API
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load analytical summaries from API
  useEffect(() => {
    setIsLoading(true);
    setErrorMsg(null);

    const query = new URLSearchParams({
      start: startDate,
      end: endDate,
      category: categoryFilter,
      period
    });

    apiFetch(`/api/analytics-metrics?${query.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка связи с сервером');
        return res.json();
      })
      .then(data => {
        setTimelineData(data.timeline);
        setCategorySummary(data.categories);
      })
      .catch(err => {
        setErrorMsg('Не удалось загрузить аналитические выборки.');
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [period, categoryFilter, startDate, endDate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-xl text-xs space-y-2 font-mono">
          <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1 mb-1">{label}</p>
          <p className="text-zinc-400">
            Потенциал: <span className="font-bold text-zinc-100">{formatCurrency(payload[0]?.value || 0)}</span>
          </p>
          <p className="text-emerald-400 font-semibold">
            Фактически: <span className="font-bold">{formatCurrency(payload[1]?.value || 0)}</span>
          </p>
          <p className="text-rose-400">
            Упущено: <span className="font-bold">{formatCurrency(payload[2]?.value || 0)}</span>
          </p>
          {payload[3] !== undefined && (
            <p className="text-amber-400 border-t border-zinc-800/60 pt-1 mt-1 text-[10px]">
              Загрузка: <span className="font-bold">{payload[3]?.value?.toFixed(1)}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & FILTER RAIL */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-zinc-400" />
            <span>Аналитический Центр</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Исследование временных трендов, плотности продаж и финансовых потерь.</p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-2 rounded-xl text-xs text-zinc-300">
          
          {/* Period grouping select */}
          <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3 mr-1">
            <Settings className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              className="bg-transparent text-zinc-200 outline-none font-medium cursor-pointer"
            >
              <option value="day" className="bg-zinc-950">Группировка: День</option>
              <option value="week" className="bg-zinc-950">Группировка: Неделя</option>
              <option value="month" className="bg-zinc-950">Группировка: Месяц</option>
              <option value="quarter" className="bg-zinc-950">Группировка: Квартал</option>
              <option value="year" className="bg-zinc-950">Группировка: Год</option>
            </select>
          </div>

          {/* Category filter select */}
          <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3 mr-1">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none font-medium cursor-pointer max-w-[130px] sm:max-w-none"
            >
              <option value="all" className="bg-zinc-950">Все категории</option>
              {categoriesList.map((cat, idx) => (
                <option key={idx} value={cat} className="bg-zinc-950">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-500 mr-1" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer font-mono text-[11px] border border-zinc-800 rounded px-1"
            />
            <span className="text-zinc-600">-</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer font-mono text-[11px] border border-zinc-800 rounded px-1"
            />
          </div>

        </div>
      </div>

      {/* 2. MAIN FINANCIALS TREND AREA CHART */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-white mb-4">Тренды Доходов и Потерь</h3>

        {isLoading ? (
          <div className="h-80 flex items-center justify-center text-zinc-500">
            <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-amber-500 border-zinc-800 mr-3" />
            <span>Компиляция логов...</span>
          </div>
        ) : errorMsg ? (
          <p className="h-80 flex items-center justify-center text-rose-500 text-sm">{errorMsg}</p>
        ) : timelineData.length === 0 ? (
          <p className="h-80 flex items-center justify-center text-zinc-500 text-sm">Данные за указанный период отсутствуют.</p>
        ) : (
          <div className="h-80 w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#52525b" 
                  tickLine={false} 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  stroke="#52525b" 
                  tickLine={false} 
                  tickFormatter={tick => `${(tick / 1000).toFixed(0)}k`} 
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
                />
                
                <Area 
                  name="Потенциальная выручка" 
                  type="monotone" 
                  dataKey="potential" 
                  stroke="#71717a" 
                  fillOpacity={1} 
                  fill="url(#colorPotential)" 
                />
                <Area 
                  name="Фактическая выручка" 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorActual)" 
                />
                <Area 
                  name="Упущенная выручка" 
                  type="monotone" 
                  dataKey="lost" 
                  stroke="#f43f5e" 
                  fillOpacity={1} 
                  fill="url(#colorLost)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. DETAILED CATEGORIES PERFORMANCE TABLE */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/40">
          <h3 className="text-sm font-semibold text-white">Выработка каждой категории размещения</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Подробный аудит потенциальных, реальных поступлений и потерь за выбранный интервал времени.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 uppercase text-[10px] tracking-wider text-zinc-500 font-mono">
              <tr>
                <th className="px-6 py-3.5">Категория размещения</th>
                <th className="px-6 py-3.5 text-right">Потенциал</th>
                <th className="px-6 py-3.5 text-right text-emerald-400">Фактически</th>
                <th className="px-6 py-3.5 text-right text-rose-400">Упущено</th>
                <th className="px-6 py-3.5 text-right">Свободно объектов (всего)</th>
                <th className="px-6 py-3.5 text-right">Средняя загрузка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-500">Вычисление финансовых показателей...</td>
                </tr>
              ) : categorySummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-500">Нет записей для формирования сводной таблицы.</td>
                </tr>
              ) : (
                categorySummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/25 transition-all">
                    <td className="px-6 py-4 font-sans font-semibold text-zinc-100">{item.category}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">{formatCurrency(item.potential)}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">{formatCurrency(item.actual)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${item.lost > 0 ? 'text-rose-500' : 'text-zinc-600'}`}>
                      {formatCurrency(item.lost)}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400">{(item.active - item.occupied).toFixed(0)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={item.occupancy < 40 ? 'text-amber-500 font-bold' : 'text-zinc-300'}>
                          {Math.round(item.occupancy)}%
                        </span>
                        <div className="h-1.5 w-12 bg-zinc-900 rounded-full overflow-hidden inline-flex">
                          <div 
                            className={`h-full ${item.occupancy < 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${item.occupancy}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
