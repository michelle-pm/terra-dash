import React, { useState } from 'react';
import { History, Search, FileText, Filter, KeyRound } from 'lucide-react';
import { CorrectionLog } from '../types';

interface LogsScreenProps {
  logs: CorrectionLog[];
}

export default function LogsScreen({ logs }: LogsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'price'>('all');

  const formatCurrency = (val: number | string) => {
    if (typeof val === 'string') return val;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  // Filter logs based on search query and category type
  const sortedLogs = [...logs].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  const filteredLogs = sortedLogs.filter(log => {
    const matchesSearch = 
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sourceFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date.includes(searchQuery);

    const matchesType = filterType === 'all' || log.entityType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. HEADER SECTION */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-zinc-400" />
          <span>История корректировок (Audit Log)</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">Полный список зафиксированных автоматических корректировок при повторном импорте годовых отчетов или ручном регулировании цен.</p>
      </div>

      {/* 2. FILTERS PANEL */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по файлу, объекту или автору..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 text-xs sm:text-sm text-zinc-250 font-medium pl-9 pr-4 py-2 rounded-lg border border-zinc-800 focus:border-zinc-700 outline-none"
          />
        </div>

        {/* Type segment switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${filterType === 'all' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Все типы
          </button>
          <button
            onClick={() => setFilterType('revenue')}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${filterType === 'revenue' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-550 hover:text-zinc-300'}`}
          >
            Выручка юнитов
          </button>
          <button
            onClick={() => setFilterType('price')}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${filterType === 'price' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-550 hover:text-zinc-300'}`}
          >
            Сетки тарифов
          </button>
        </div>

      </div>

      {/* 3. LOG LISTINGS PANEL */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 uppercase text-[10px] tracking-wider text-zinc-500 font-mono">
              <tr>
                <th className="px-6 py-3.5">Дата действия</th>
                <th className="px-6 py-3.5">Тип изменения</th>
                <th className="px-6 py-3.5">Юнит/Объект</th>
                <th className="px-6 py-3.5">Показатель</th>
                <th className="px-6 py-3.5 text-right">Было</th>
                <th className="px-6 py-3.5 text-right text-emerald-400">Стало</th>
                <th className="px-6 py-3.5">Файл/Действие</th>
                <th className="px-6 py-3.5">Администратор</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/15 transition-all text-zinc-300">
                    <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                      {new Date(log.changedAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        log.entityType === 'revenue'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {log.entityType === 'revenue' ? 'Выручка' : 'Тариф'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans font-semibold text-zinc-200">{log.entityId}</td>
                    <td className="px-6 py-4 text-zinc-500">{log.fieldName === 'actualRevenue' ? 'Продажи' : 'Тариф дня'}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">{formatCurrency(log.oldValue)}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">{formatCurrency(log.newValue)}</td>
                    <td className="px-6 py-4 text-zinc-400 truncate max-w-[170px]" title={log.sourceFile}>{log.sourceFile}</td>
                    <td className="px-6 py-4 text-zinc-500 font-sans">{log.user}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-zinc-500 font-sans">
                    Записи корректировок не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
