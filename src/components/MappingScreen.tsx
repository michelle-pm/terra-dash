import React, { useState } from 'react';
import { Layers, ArrowRight, Save, HelpCircle, CheckCircle2, FileWarning, RefreshCw } from 'lucide-react';
import { rtdb } from '../firebase';
import { CategoryMapping } from '../types';

interface MappingScreenProps {
  reportCategories: string[];
  priceListCategories: string[];
  mappings: CategoryMapping[];
  isAdmin: boolean;
  onUpdateMappings: (newMappings: CategoryMapping[]) => void;
}

export default function MappingScreen({
  reportCategories,
  priceListCategories,
  mappings,
  isAdmin,
  onUpdateMappings
}: MappingScreenProps) {
  const [localMappings, setLocalMappings] = useState<CategoryMapping[]>([...mappings]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    setLocalMappings([...mappings]);
  }, [mappings]);

  // Handle dropdown alignment change
  const handleMappingChange = (reportCat: string, priceCat: string) => {
    setLocalMappings(prev => {
      const idx = prev.findIndex(m => m.reportCategory === reportCat);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { reportCategory: reportCat, priceListCategory: priceCat };
        return next;
      } else {
        return [...prev, { reportCategory: reportCat, priceListCategory: priceCat }];
      }
    });
  };

  // Submit mappings to Firebase RTDB
  const saveMappings = async () => {
    setIsSaving(true);
    try {
      const { ref, set } = await import('firebase/database');
      await set(ref(rtdb, 'properties/terra_altaya/mappings'), localMappings);
      onUpdateMappings(localMappings);
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if mapping exists for a report category
  const getMappedCategory = (reportCat: string) => {
    const item = localMappings.find(m => m.reportCategory === reportCat);
    return item ? item.priceListCategory : '';
  };

  // Derived unmapped report categories
  const unmappedCategories = reportCategories.filter(
    rc => !localMappings.find(m => m.reportCategory === rc && m.priceListCategory !== '')
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. HEADER DESCRIPTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-400" />
            <span>Соответствия категорий (Mapping)</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-normal">Совмещение имен объектов из годового отчета Bnovo с прайс-листом Терра Алтая.</p>
        </div>

        {/* Action Save button */}
        {isAdmin && (
          <button
            onClick={saveMappings}
            disabled={isSaving}
            className="rounded-xl bg-[#7C5CFF] hover:bg-[#6a4bf5] text-white font-bold text-xs px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#7C5CFF]/15 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Сохранить соответствия</span>
          </button>
        )}
      </div>

      {unmappedCategories.length > 0 && (
        <div className="p-4 rounded-xl border border-[#FF2D63]/30 bg-[#FF2D63]/5 text-[#FF2D63] text-xs sm:text-sm flex gap-2.5 items-start">
          <FileWarning className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Обнаружены несоответствия категорий ({unmappedCategories.length} шт.)</h4>
            <p className="text-[#A1A1AA] text-xs mt-1 leading-relaxed">Ошибки упущенной выручки могут считаться неверно, если у юнитов нет связанного прайс-листа. Свяжите перечисленные ниже категории:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-zinc-200 text-xs">
              {unmappedCategories.map((uc, idx) => (
                <li key={idx} className="font-semibold">{uc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2. MAPPING CANVAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mapping Form Block */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Таблица связей (Калибровка)</h3>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {reportCategories.length > 0 ? (
              reportCategories.map((rc, idx) => {
                const mappedTo = getMappedCategory(rc);
                const isUnmapped = !mappedTo;

                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all ${
                      isUnmapped 
                        ? 'border-[#FF2D63]/20 bg-[#FF2D63]/5' 
                        : 'border-white/5 bg-black/40 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#71717A] font-mono uppercase font-bold">Bnovo отчет:</span>
                      <div className="font-bold text-white text-xs sm:text-sm">{rc}</div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <ArrowRight className="hidden sm:inline h-4 w-4 text-[#71717A]" />
                      
                      {/* Select mapped price list category */}
                      <select
                        value={mappedTo}
                        onChange={e => handleMappingChange(rc, e.target.value)}
                        disabled={!isAdmin}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none font-semibold text-white cursor-pointer ${
                          isUnmapped 
                            ? 'border-[#FF2D63]/30 bg-black text-[#FF2D63] focus:border-[#FF2D63] focus:ring-1 focus:ring-[#FF2D63]' 
                            : 'border-white/10 bg-zinc-950 focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF]'
                        }`}
                      >
                        <option value="" className="bg-zinc-950">-- Выберите из прайс-листа --</option>
                        {priceListCategories.map((pc, pIdx) => (
                          <option key={pIdx} value={pc} className="bg-zinc-950 text-white">
                            {pc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 text-center py-6 font-normal">Загрузите годовой отчет Bnovo для калибровки категорий.</p>
            )}
          </div>
        </div>

        {/* Categories Reference/Info Side Board */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <HelpCircle className="h-4.5 w-4.5 text-zinc-400" />
              <span>Зачем это нужно?</span>
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed font-normal">
              Название одних и тех же объектов различается в системах бронирования и физических прайсах. Например, в годовой ведомости Bnovo используется лаконичный ярлык <strong className="text-[#F8FAFC]">"Ф-Frame"</strong>, а в ценниках отеля — регламентированный <strong className="text-[#F8FAFC]">"А-Фрейм (без завтрака)"</strong>.
            </p>
            <p className="text-xs text-[#A1A1AA] leading-relaxed font-normal">
              Связывая эти имена воедино, мы позволяем математической машине мгновенно извлекать суточный тариф для проверки упущенной выгоды с точностью до рубля по тарифу конкретного дня.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Доступные категории в прайс-листе</h3>
            {priceListCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {priceListCategories.map((pc, idx) => (
                  <span key={idx} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 font-semibold text-zinc-300 font-mono">
                    {pc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-normal">Загрузите Прайслист для просмотра номенклатуры категорий.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
