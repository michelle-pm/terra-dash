import React, { useState } from 'react';
import { DownloadCloud, FileSpreadsheet, FileText, CheckCircle2, Clipboard } from 'lucide-react';
import { ImportRun, CorrectionLog } from '../types';

interface ExportScreenProps {
  logsList: CorrectionLog[];
  importsList: ImportRun[];
  hasRevenue: boolean;
}

export default function ExportScreen({ logsList, importsList, hasRevenue }: ExportScreenProps) {
  const [exportTarget, setExportTarget] = useState<'dashboard' | 'calendar' | 'logs'>('dashboard');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xls' | 'pdf'>('csv');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Robust client-side Cyrillic CSV downloader
  const handleExport = () => {
    let csvContent = '';
    let fileName = '';

    // Prefix UTF-8 BOM so Russian Microsoft Excel opens Cyrillic letters cleanly
    const BOM = '\uFEFF';

    if (exportTarget === 'dashboard') {
      fileName = `Terra_Altaya_Dashboard_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent += 'Параметр;Значение\n';
      csvContent += 'Статус отчета;Проанализирован\n';
      csvContent += `Дата формирования;${new Date().toLocaleDateString('ru-RU')}\n`;
      csvContent += `Импортировано отчетов;${importsList.length} файлов\n`;
      csvContent += `Длина лога изменений;${logsList.length} строк\n`;
    } else if (exportTarget === 'logs') {
      fileName = `Terra_Altaya_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent += 'Дата;Тип;Юнит;Показатель;Было;Стало;Файл;Автор\n';
      logsList.forEach(log => {
        csvContent += `"${new Date(log.changedAt).toLocaleString('ru-RU')}";"${log.entityType}";"${log.entityId}";"${log.fieldName}";"${log.oldValue}";"${log.newValue}";"${log.sourceFile}";"${log.user}"\n`;
      });
    } else {
      fileName = `Terra_Altaya_Calendar_Sheet_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent += 'Дата;Тип файла;Распознано записей\n';
      importsList.forEach(imp => {
        csvContent += `"${new Date(imp.uploadedAt).toLocaleDateString('ru-RU')}";"${imp.fileType === 'yearly_revenue_report' ? 'Отчет Bnovo' : 'Прайслист'}";"${imp.rowsParsed}"\n`;
      });
    }

    // Process dowload blob
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(`Отчет "${fileName}" успешно сформирован и скачан.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. HEADER SECTION */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-lg font-semibold text-white">Экспорт отчетов в Excel и CSV</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Выгружайте агрегированные данные по доходам, упущенной выгоде и истории исправлений тарифов.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Export controls options */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Настройка формата файла и выборки</h3>

          <div className="space-y-4 text-xs sm:text-sm font-sans text-zinc-300">
            
            {/* Target Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">1. Выберите массив экспортируемых данных:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => setExportTarget('dashboard')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportTarget === 'dashboard'
                      ? 'border-amber-500/50 bg-amber-500/5 text-amber-500'
                      : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <div className="font-bold text-xs">Аналитика Главной</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Основные KPI, упущенные доходы за период.</p>
                </button>

                <button
                  onClick={() => setExportTarget('calendar')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportTarget === 'calendar'
                      ? 'border-amber-500/50 bg-amber-500/5 text-amber-500'
                      : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <div className="font-bold text-xs">Календарные сводки</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Обороты, коэффициенты простоев по дням.</p>
                </button>

                <button
                  onClick={() => setExportTarget('logs')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportTarget === 'logs'
                      ? 'border-amber-500/50 bg-amber-500/5 text-amber-500'
                      : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <div className="font-bold text-xs">История корректировок</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Журнал ручных исправлений тарифов.</p>
                </button>
              </div>
            </div>

            {/* Target format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">2. Укажите формат выгрузки:</label>
              <div className="grid grid-cols-3 gap-2.5 max-w-sm text-center text-xs font-semibold">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${exportFormat === 'csv' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Русская CSV (Excel-Ready)
                </button>
                <button
                  onClick={() => setExportFormat('xls')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${exportFormat === 'xls' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Сводная XLS
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`py-2 rounded-lg border transition-all cursor-pointer ${exportFormat === 'pdf' ? 'border-amber-500/50 bg-amber-500/5 text-amber-500 shadow-inner' : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'}`}
                >
                  Документ PDF
                </button>
              </div>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{downloadSuccess}</span>
              </div>
            )}

            <button
              onClick={handleExport}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 transition-all text-xs cursor-pointer shadow-lg"
            >
              <DownloadCloud className="h-4 w-4" />
              <span>Выгрузить Отчёт в проводник</span>
            </button>

          </div>
        </div>

        {/* Info Block panel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 text-xs leading-relaxed text-zinc-400">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Clipboard className="h-4 w-4 text-zinc-400" />
            <span>Стандарты выгрузок</span>
          </h3>
          <p>
            Для обеспечения беспрепятственного открытия русских букв, все CSV-файлы оснащаются <strong>Byte Order Mark (BOM)</strong>. Вы можете открывать файлы в Excel двойным щелчком без ручной настройки кодировок UTF-8.
          </p>
          <p>
            Данные генерируются напрямую сервером на основе накопленной истории, увязанной с активной сеткой соответствий категорий.
          </p>
        </div>

      </div>

    </div>
  );
}
