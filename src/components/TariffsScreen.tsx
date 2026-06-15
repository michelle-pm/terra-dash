import React, { useState } from 'react';
import { Settings, Info, Save, ChevronRight, Activity, Calendar, ArrowUpRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface TariffsScreenProps {
  categoriesList: string[];
  isAdmin: boolean;
  onRefreshAll: () => void;
  onShowSuccessToast: (msg: string) => void;
}

export default function TariffsScreen({
  categoriesList,
  isAdmin,
  onRefreshAll,
  onShowSuccessToast
}: TariffsScreenProps) {
  // Rate editor parameters
  const [selectedCategory, setSelectedCategory] = useState(categoriesList[0] || 'Полусфера Neodome');
  const [startDate, setStartDate] = useState('2026-06-15'); // default tomorrow forward
  const [endDate, setEndDate] = useState('2026-08-31');
  const [mode, setMode] = useState<'all' | 'weekdays' | 'weekends'>('all'); // all, weekdays, Friday-Saturday
  const [action, setAction] = useState<'set' | 'increase' | 'decrease'>('set');
  const [amount, setAmount] = useState<number>(12000);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const getAltaiTodayStr = () => {
    const d = new Date();
    const utcOffset = d.getTimezoneOffset() * 60000;
    const utcTime = d.getTime() + utcOffset;
    const altaiDate = new Date(utcTime + (7 * 3600000));
    const yyyy = altaiDate.getFullYear();
    const mm = String(altaiDate.getMonth() + 1).padStart(2, '0');
    const dd = String(altaiDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getAltaiTodayStr();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setEditError('Корректировка тарифов разрешена только роли Администратора.');
      return;
    }

    if (startDate < todayStr) {
      setEditError('Невозможно редактировать тарифы за прошедшие даты. Прошлые периоды неизменяемы для аудита.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    apiFetch('/api/tariff/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: selectedCategory,
        startDate,
        endDate,
        weekdaysOnly: mode === 'weekdays',
        friSatOnly: mode === 'weekends',
        action,
        value: amount
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        onRefreshAll();
        onShowSuccessToast(`Тарифы скорректированы! Изменено дат: ${data.updatedCount} шт.`);
      })
      .catch(err => {
        setEditError(err.message || 'Ошибка обновления тарифов');
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. HEADER TITLE */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          <span>Сетка тарифов (Tariff Override)</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">Оперативное ценообразование, ведение горячих акций и наценок на выходные дни.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Form Panel */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Панель управления ценами будущего</h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm text-zinc-350 font-sans">
            
            {/* Category Select */}
            <div className="space-y-1.5Packed">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Категория отеля:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-200 cursor-pointer outline-none hover:border-zinc-700"
              >
                {categoriesList.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Начало диапазона (не ранее Сегодня):</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    disabled={!isAdmin}
                    min={todayStr}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 font-mono text-xs text-zinc-200 outline-none hover:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Окончание диапазона:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 font-mono text-xs text-zinc-200 outline-none hover:border-zinc-700"
                />
              </div>
            </div>

            {/* Week/Weekend Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Классификатор дней недели:</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-center">
                <button
                  type="button"
                  onClick={() => setMode('all')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${mode === 'all' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Все сутки
                </button>
                <button
                  type="button"
                  onClick={() => setMode('weekdays')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${mode === 'weekdays' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Будни
                </button>
                <button
                  type="button"
                  onClick={() => setMode('weekends')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${mode === 'weekends' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Пятница/Суббота
                </button>
              </div>
            </div>

            {/* Arithmetic Action Setting */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end pt-1">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Действие над прайсом:</label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-0.5 text-xs text-center font-semibold">
                  <button
                    type="button"
                    onClick={() => setAction('set')}
                    className={`py-1.5 rounded cursor-pointer ${action === 'set' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Задать
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('increase')}
                    className={`py-1.5 rounded cursor-pointer ${action === 'increase' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    + Руб
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('decrease')}
                    className={`py-1.5 rounded cursor-pointer ${action === 'decrease' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    - Руб
                  </button>
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Значение (Руб):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value) || 0)}
                  disabled={!isAdmin}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 font-mono text-xs text-zinc-200 outline-none hover:border-zinc-700"
                />
              </div>
            </div>

            {editError && (
              <p className="text-rose-500 text-xs font-semibold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/15">{editError}</p>
            )}

            {/* Submit save button */}
            {isAdmin && (
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 transition-all text-xs cursor-pointer shadow-lg shadow-black/15"
              >
                <Save className="h-4 w-4" />
                <span>Применить изменение в Сетку Сейфа</span>
              </button>
            )}

          </form>
        </div>

        {/* Informative Side Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Info className="h-4 w-4 text-zinc-400" />
              <span>Правила Изменения</span>
            </h3>

            <div className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-amber-500 font-bold font-mono">01</span>
                <p><strong>Ретроспективная заморозка</strong>. Все изменения тарифов за прошедшие даты заблокированы. Прошлые дни являются предметом объективного финансового аудита.</p>
              </div>

              <div className="flex gap-2">
                <span className="text-amber-500 font-bold font-mono">02</span>
                <p><strong>Журналирование действий</strong>. Каждое изменение отслеживается, создавая запись в "Истории корректировок" с точным указанием пользователя, времени, старой и новой цены.</p>
              </div>

              <div className="flex gap-2">
                <span className="text-amber-500 font-bold font-mono">03</span>
                <p><strong>Немедленный эффект</strong>. Календарь, аналитические срезы и прогноз упущенной выгоды (потенциальной упущенной выручки) моментально обновляются по окончании операции.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
