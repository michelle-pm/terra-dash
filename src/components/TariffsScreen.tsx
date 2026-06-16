import React, { useState } from 'react';
import { Settings, Info, Save, ChevronRight, Activity, Calendar, ArrowUpRight } from 'lucide-react';
import { rtdb } from '../firebase';

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const { ref, get, set } = await import('firebase/database');
      const { expandPeriodToDays } = await import('../lib/clientDbEngine');

      const snap = await get(ref(rtdb, 'properties/terra_altaya'));
      const db = snap.exists() ? snap.val() : {};

      if (!db.tariffs) {
        db.tariffs = {};
      }
      if (!db.tariffs[selectedCategory]) {
        db.tariffs[selectedCategory] = {};
      }
      if (!db.correctionLog) {
        db.correctionLog = [];
      }

      const datesStr = expandPeriodToDays(startDate, endDate);
      let updatedCount = 0;

      datesStr.forEach((day: string) => {
        if (day < todayStr) return;

        const dateObj = new Date(day);
        const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

        if (mode === 'weekends' && dayOfWeek !== 5 && dayOfWeek !== 6) return;
        if (mode === 'weekdays' && (dayOfWeek === 5 || dayOfWeek === 6)) return;

        let currentPrice = 0;
        if (db.tariffs[selectedCategory][day] !== undefined) {
          currentPrice = db.tariffs[selectedCategory][day];
        } else {
          const standardPriceRecord = (db.priceData || []).find((p: any) => p.category === selectedCategory && p.date === day);
          currentPrice = standardPriceRecord ? standardPriceRecord.price : 0;
        }

        let nextPrice = currentPrice;
        const parsedValue = parseFloat(amount as any);

        if (action === 'set') {
          nextPrice = parsedValue;
        } else if (action === 'increase') {
          nextPrice = currentPrice + parsedValue;
        } else if (action === 'decrease') {
          nextPrice = Math.max(0, currentPrice - parsedValue);
        }

        db.tariffs[selectedCategory][day] = nextPrice;

        db.correctionLog.push({
          id: 'corr_' + Math.random().toString(36).substr(2, 9),
          date: day,
          entityType: 'price',
          entityId: selectedCategory,
          fieldName: 'price',
          oldValue: currentPrice,
          newValue: nextPrice,
          sourceFile: 'Ручная корректировка тарифа',
          user: 'Администратор (pm.michelle)',
          changedAt: new Date().toISOString()
        });

        updatedCount++;
      });

      await set(ref(rtdb, 'properties/terra_altaya'), db);
      onRefreshAll();
      onShowSuccessToast(`Тарифы скорректированы! Изменено дат: ${updatedCount} шт.`);
    } catch (err: any) {
      setEditError(err.message || 'Ошибка обновления тарифов');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. HEADER TITLE */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          <span>Сетка тарифов (Tariff Override)</span>
        </h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5 font-normal">Оперативное ценообразование, ведение горячих акций и наценок на выходные дни.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editor Form Panel */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Панель корректировки тарифов</h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm text-zinc-300 font-sans">
            
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">Категория отеля:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white cursor-pointer outline-none focus:border-[#7C5CFF] hover:border-white/20"
              >
                {categoriesList.map((cat, idx) => (
                  <option key={idx} value={cat} className="bg-zinc-950 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">Начало диапазона (не ранее Сегодня):</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={!isAdmin}
                  min={todayStr}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#7C5CFF] hover:border-white/20 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">Окончание диапазона:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#7C5CFF] hover:border-white/20 cursor-pointer"
                />
              </div>
            </div>

            {/* Week/Weekend Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">Классификатор дней недели:</label>
              <div className="grid grid-cols-3 gap-2.5 text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setMode('all')}
                  className={`py-2.5 rounded-lg border transition-all cursor-pointer ${mode === 'all' ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/15 text-[#7253fa] shadow-inner font-black' : 'border-white/10 bg-black/40 text-[#A1A1AA] hover:border-white/20'}`}
                >
                  Все сутки
                </button>
                <button
                  type="button"
                  onClick={() => setMode('weekdays')}
                  className={`py-2.5 rounded-lg border transition-all cursor-pointer ${mode === 'weekdays' ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/15 text-[#7253fa] shadow-inner font-black' : 'border-white/10 bg-black/40 text-[#A1A1AA] hover:border-white/20'}`}
                >
                  Будни
                </button>
                <button
                  type="button"
                  onClick={() => setMode('weekends')}
                  className={`py-2.5 rounded-lg border transition-all cursor-pointer ${mode === 'weekends' ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/15 text-[#7253fa] shadow-inner font-black' : 'border-white/10 bg-black/40 text-[#A1A1AA] hover:border-white/20'}`}
                >
                  Пятница/Суббота
                </button>
              </div>
            </div>

            {/* Arithmetic Action Setting */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end pt-1">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">Действие над прайсом:</label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-zinc-950 p-0.5 text-xs text-center font-bold">
                  <button
                    type="button"
                    onClick={() => setAction('set')}
                    className={`py-2 rounded cursor-pointer transition-all ${action === 'set' ? 'bg-[#7C5CFF] text-white shadow-lg' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
                  >
                    Задать
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('increase')}
                    className={`py-2 rounded cursor-pointer transition-all ${action === 'increase' ? 'bg-[#7C5CFF] text-white shadow-lg' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
                  >
                    + Руб
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('decrease')}
                    className={`py-2 rounded cursor-pointer transition-all ${action === 'decrease' ? 'bg-[#7C5CFF] text-white shadow-lg' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
                  >
                    - Руб
                  </button>
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block">Значение (Руб):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value) || 0)}
                  disabled={!isAdmin}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2 font-mono text-xs text-white outline-none focus:border-[#7C5CFF] hover:border-white/20"
                />
              </div>
            </div>

            {editError && (
              <p className="text-[#FF2D63] text-xs font-semibold bg-[#FF2D63]/10 p-2.5 rounded-lg border border-[#FF2D63]/25">{editError}</p>
            )}

            {/* Submit save button */}
            {isAdmin && (
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#7C5CFF] hover:bg-[#6a4bf5] text-white font-bold py-3 transition-all text-xs cursor-pointer shadow-lg shadow-[#7C5CFF]/15 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Применить изменения в системе тарифов</span>
              </button>
            )}

          </form>
        </div>

        {/* Informative Side Card */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wide">
              <Info className="h-4.5 w-4.5 text-zinc-450" />
              <span>Правила Изменения</span>
            </h3>

            <div className="space-y-4 text-xs text-[#A1A1AA] leading-relaxed font-normal font-sans">
              <div className="flex gap-2.5">
                <span className="text-[#7C5CFF] font-bold font-mono">01</span>
                <div>
                  <h4 className="font-bold text-white">Ретроспективная заморозка</h4>
                  <p className="mt-0.5">Все изменения тарифов за прошедшие даты заблокированы. Прошлые дни являются предметом объективного финансового аудита.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="text-[#7C5CFF] font-bold font-mono">02</span>
                <div>
                  <h4 className="font-bold text-white">Журналирование действий</h4>
                  <p className="mt-0.5">Каждое изменение отслеживается, создавая запись в истории корректировок с указанием пользователя, времени, старой и новой цены.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="text-[#7C5CFF] font-bold font-mono">03</span>
                <div>
                  <h4 className="font-bold text-white">Немедленный эффект</h4>
                  <p className="mt-0.5">Календарь, аналитические срезы и расчет упущенной выручки моментально обновляются по окончании операции.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
