import React, { useState } from 'react';
import { Layers, ArrowRight, Save, HelpCircle, CheckCircle2, FileWarning, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';
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

  // Submit mappings to Express API
  const saveMappings = () => {
    setIsSaving(true);
    apiFetch('/api/mapping/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings: localMappings })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        onUpdateMappings(localMappings);
      })
      .catch(err => {
        alert(err.message || 'Ошибка сохранения');
      })
      .finally(() => {
        setIsSaving(false);
      });
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
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. HEADER DESCRIPTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-400" />
            <span>Соответствия категорий (Mapping)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Совмещение имен объектов из годового отчета (Bnovo) с прайс-листом (Terra Altaya).</p>
        </div>

        {/* Action Save button */}
        {isAdmin && (
          <button
            onClick={saveMappings}
            disabled={isSaving}
            className="rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs px-4 py-2 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Сохранить соответствия</span>
          </button>
        )}
      </div>

      {unmappedCategories.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-950/40 bg-rose-500/5 text-rose-400 text-xs sm:text-sm flex gap-2.5 items-start">
          <FileWarning className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Обнаружены несоответствия категорий ({unmappedCategories.length} шт.)</h4>
            <p className="text-zinc-400 text-xs mt-1">Ошибки упущенной выручки могут считаться неверно, если у юнитов нет связанного прайс-листа. Свяжите перечисленные ниже категории:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-mono text-zinc-300">
              {unmappedCategories.map((uc, idx) => (
                <li key={idx}>{uc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2. MAPPING CANVAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mapping Form Block */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">Таблица связей (Калибровка)</h3>
          
          <div className="space-y-3">
            {reportCategories.length > 0 ? (
              reportCategories.map((rc, idx) => {
                const mappedTo = getMappedCategory(rc);
                const isUnmapped = !mappedTo;

                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all ${
                      isUnmapped 
                        ? 'border-rose-950 bg-rose-500/5' 
                        : 'border-zinc-800 bg-zinc-900/10'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs text-zinc-500 font-mono">Bnovo отчет:</span>
                      <div className="font-semibold text-zinc-200 text-xs sm:text-sm">{rc}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="hidden sm:inline h-4 w-4 text-zinc-600" />
                      
                      {/* Select mapped price list category */}
                      <select
                        value={mappedTo}
                        onChange={e => handleMappingChange(rc, e.target.value)}
                        disabled={!isAdmin}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none font-medium text-zinc-200 cursor-pointer ${
                          isUnmapped 
                            ? 'border-rose-800 bg-zinc-950' 
                            : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                        }`}
                      >
                        <option value="" className="bg-zinc-950">-- Выберите из прайс-листа --</option>
                        {priceListCategories.map((pc, pIdx) => (
                          <option key={pIdx} value={pc} className="bg-zinc-950">
                            {pc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 text-center py-6">Загрузите годовой отчет Bnovo для калибровки категорий.</p>
            )}
          </div>
        </div>

        {/* Categories Reference/Info Side Board */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-zinc-400" />
              <span>Зачем это нужно?</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Название одних и тех же объектов различается в системах бронирования и физических прайсах. Например, в годовой ведомости Bnovo используется лаконичный ярлык <strong>"Ф-Frame"</strong>, а в ценниках отеля — регламентированный <strong>"А-Фрейм (без завтрака)"</strong>.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Связывая эти имена воедино, мы позволяем математической машине мгновенно извлекать суточный тариф для проверки упущенной выгоды (потенциальной упущенной выручки) с точностью до рубля по тарифу конкретного дня.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Доступные категории в прайс-листе</h3>
            {priceListCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                {priceListCategories.map((pc, idx) => (
                  <span key={idx} className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 font-medium text-zinc-400">
                    {pc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Загрузите Прайслист для просмотра номенклатуры категорий.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
