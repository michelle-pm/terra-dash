import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, AlertOctagon, TrendingDown, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

interface RiskCategory {
  category: string;
  lostPotential: number;
  occupancyAvg: number;
  riskRating: 'high' | 'medium' | 'low';
}

interface ForecastData {
  hasForecast: boolean;
  forecastedPotential: number;
  forecastedBooked: number;
  forecastedLost: number;
  riskCategories: RiskCategory[];
  periodDays: number;
}

export default function ForecastScreen() {
  const [daysPeriod, setDaysPeriod] = useState<30 | 60 | 90>(30);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load forecast metrics on change
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/forecast?periodDays=${daysPeriod}`)
      .then(res => res.json())
      .then(data => {
        setForecast(data);
      })
      .catch(err => {
        console.error('Forecast fetch details failed', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [daysPeriod]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  const getRiskBadge = (rating: 'high' | 'medium' | 'low') => {
    if (rating === 'high') {
      return (
        <span className="inline-flex items-center rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-2xs font-medium text-rose-400 font-sans">
          Высокий риск
        </span>
      );
    } else if (rating === 'medium') {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-2xs font-medium text-amber-400 font-sans">
          Средний риск
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-2xs font-medium text-emerald-400 font-sans">
          Низкий риск
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP INTERACTIVES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            <span>Интеллектуальный Прогноз Выручки</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Оценка рисков упущения выгоды на основе исторического спроса и текущих тарифов.</p>
        </div>

        {/* Period controller buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg self-start text-xs font-mono font-bold">
          <button
            onClick={() => setDaysPeriod(30)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${daysPeriod === 30 ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-white'}`}
          >
            30 дней
          </button>
          <button
            onClick={() => setDaysPeriod(60)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${daysPeriod === 60 ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-white'}`}
          >
            60 дней
          </button>
          <button
            onClick={() => setDaysPeriod(90)}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${daysPeriod === 90 ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-white'}`}
          >
            90 дней
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-zinc-500">
          <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-amber-500 border-zinc-800 mr-3" />
          <span className="text-xs">Вычисление прогностических моделей...</span>
        </div>
      ) : forecast && forecast.hasForecast ? (
        <div className="space-y-6">
          
          {/* 2. FORECAST KPI BOXES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Forecast Potential */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-inner">
              <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Прогноз потенциального ресурса</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {formatCurrency(forecast.forecastedPotential)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Ожидаемая 100% выручка при нулевом простое</p>
            </div>

            {/* Forecast Current Bookings */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-inner">
              <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2 text-emerald-400">Ожидаемая выручка (забронировано/факт)</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {formatCurrency(forecast.forecastedBooked)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Прогнозируемый сбор на основе исторических трендов</p>
            </div>

            {/* Forecast Potential Loss */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-5 shadow-lg border-rose-950/40">
              <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2 text-rose-500">Потенциальная упущенная выручка</div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-500 animate-pulse">
                {formatCurrency(forecast.forecastedLost)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Средства из-за простоя объектов, требующие внимания</p>
            </div>

          </div>

          {/* 3. CAT THREAT LEVELS & RECOMMENDATIONS CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List of Risks */}
            <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Рейтинг риска категорий размещения</h3>
                  <p className="text-xs text-zinc-500 font-sans mt-0.5">Уровни угрозы на следующие {daysPeriod} дней</p>
                </div>
                <ShieldAlert className="h-4 w-4 text-rose-500" />
              </div>

              <div className="space-y-3.5">
                {forecast.riskCategories.map((rc, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900/35 border border-zinc-800/70 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 text-sm">{rc.category}</span>
                        {getRiskBadge(rc.riskRating)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        Прогнозируемая загрузка: {Math.round(rc.occupancyAvg)}%
                      </div>
                    </div>

                    <div className="text-right font-mono self-end sm:self-center">
                      <div className="text-[10px] text-zinc-500">Риск упущенной выручки:</div>
                      <div className={`font-bold ${rc.lostPotential > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                        {formatCurrency(rc.lostPotential)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Predictive Guidance Actions */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <AlertOctagon className="h-4 w-4 text-amber-500 animate-bounce" />
                <span>Рекомендованные меры</span>
              </h3>

              <div className="space-y-4 text-xs text-zinc-300">
                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                  <h4 className="font-semibold text-amber-400">🚨 Снизьте цены на свободные Купола</h4>
                  <p className="text-zinc-400">Прогноз показывает риск упущенного дохода в {formatCurrency(forecast.forecastedLost * 0.15)} из-за критического недозаселения по будням.</p>
                </div>

                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                  <h4 className="font-semibold text-amber-400">📈 Корректируйте цены на Выходные</h4>
                  <p className="text-zinc-400">Weekend-коэффициент Пятницы-Субботы можно увеличить на 10-15% для Полусфер Neodome, так как историческая загрузка составляет 95%.</p>
                </div>

                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                  <h4 className="font-semibold text-amber-400 font-sans">🛡️ Раннее Бронирование Апартаментов</h4>
                  <p className="text-zinc-400">Запустите промотариф на проживание от 5 суток — это стабилизирует доходы в периоды затишья у реки.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="text-center py-16 text-zinc-500 text-xs text-zinc-500">
          Запустите импорт файлов или загрузите демонстрационную модель для активации прогноза.
        </div>
      )}

    </div>
  );
}
