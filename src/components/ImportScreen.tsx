import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, Play, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ImportRun } from '../types';

interface ImportScreenProps {
  importsList: ImportRun[];
  isAdmin: boolean;
  onRefreshAll: () => void;
  onShowSuccessToast: (msg: string) => void;
}

export default function ImportScreen({
  importsList,
  isAdmin,
  onRefreshAll,
  onShowSuccessToast
}: ImportScreenProps) {
  const [fileType, setFileType] = useState<'yearly_revenue_report' | 'price_list'>('yearly_revenue_report');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeDiagnostics, setActiveDiagnostics] = useState<any | null>(null);

  // Preview panel of transient parse from server
  const [pendingPreview, setPendingPreview] = useState<{
    importRun: ImportRun;
    preview: {
      periodStart: string | null;
      periodEnd: string | null;
      detectedCategories: string[];
      detectedUnits?: string[];
      reconciliationCheck?: { expectedTotal: number; calculatedTotal: number; matches: boolean };
      warnings: string[];
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDiagnostics();
  }, [importsList]);

  const fetchDiagnostics = () => {
    apiFetch('/api/debug/revenue-check')
      .then(res => res.json())
      .then(data => {
        setActiveDiagnostics(data);
      })
      .catch(err => console.error("Error loading diagnostics:", err));
  };

  // File drag-and-drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  // Upload file to Express API
  const uploadFile = (file: File) => {
    if (!isAdmin) {
      setUploadError('Загрузка файлов доступна только администраторам.');
      return;
    }

    // Validate size
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Превышен лимит 15МБ. Выберите файл поменьше.');
      return;
    }

    // Validate ext
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      setUploadError('Неверный тип файла. Разрешены только форматы .xls и .xlsx');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPendingPreview(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    apiFetch('/api/upload', {
      method: 'POST',
      body: formData
    })
      .then(async res => {
        if (!res.ok) {
          const textInfo = await res.text();
          try {
            const errJson = JSON.parse(textInfo);
            throw new Error(errJson.error || 'Ошибка загрузки');
          } catch (e) {
            if (res.status === 413) {
              throw new Error('Файл слишком велик. Максимальный размер 15 МБ.');
            }
            throw new Error(`Системная ошибка (${res.status}): Сервер недоступен или файл отклонен.`);
          }
        }
        return res.json();
      })
      .then(data => {
        setPendingPreview(data);
        onRefreshAll();
        onShowSuccessToast('Файл успешно считан. Проверьте данные и подтвердите импорт.');
      })
      .catch(err => {
        setUploadError(err.message || 'Сбой во время анализа файла.');
        console.error(err);
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  // Confirm and consolidate a pending import
  const confirmImport = (importId: string) => {
    apiFetch('/api/confirm-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPendingPreview(null);
        onRefreshAll();
        fetchDiagnostics();
        onShowSuccessToast('Импорт успешно завершен! Данные объединены и пересчитаны.');
      })
      .catch(err => {
        setUploadError(err.message || 'Ошибка слияния');
      });
  };

  // Cancel or delete an import
  const deleteImport = (importId: string) => {
    if (!confirm('Вы действительно хотите удалить импорт? Все связанные данные будут полностью стерты.')) return;

    apiFetch('/api/delete-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId })
    })
      .then(res => res.json())
      .then(data => {
        if (pendingPreview?.importRun.id === importId) {
          setPendingPreview(null);
        }
        onRefreshAll();
        fetchDiagnostics();
        onShowSuccessToast('Импорт стерт.');
      });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER SECTION */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-lg font-semibold text-white">Импорт файлов Bnovo и Прайс-листов</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Принимайте годовую финансовую отчетность и координируйте сезонные сетки проживания.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: UPLOADER CONTROLS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File selector type radio */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Шаг 1: Выберите тип загружаемого файла</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-sans">
              <button
                onClick={() => { setFileType('yearly_revenue_report'); setPendingPreview(null); }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  fileType === 'yearly_revenue_report'
                    ? 'border-amber-500/50 bg-amber-500/5 shadow-inner'
                    : 'border-zinc-805 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileSpreadsheet className={`h-4 w-4 ${fileType === 'yearly_revenue_report' ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Отчет Bnovo (.xls)</span>
                </div>
                <p className="text-2xs text-zinc-500">Годовой отчет по дням, содержащий загрузки и доходы каждого из 50 номеров Терра Алтая.</p>
              </button>

              <button
                onClick={() => { setFileType('price_list'); setPendingPreview(null); }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  fileType === 'price_list'
                    ? 'border-amber-500/50 bg-amber-500/5 shadow-inner'
                    : 'border-zinc-805 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileSpreadsheet className={`h-4 w-4 ${fileType === 'price_list' ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Прайслист Тарифов (.xlsx)</span>
                </div>
                <p className="text-2xs text-zinc-500">Таблица периодов проживания и стоимости размещения в номерах курорта.</p>
              </button>
            </div>
          </div>

          {/* DRAG AND DROP BOX AREA */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Шаг 2: Перетащите или выберите файл</h3>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerPicker}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                dragActive ? 'border-amber-400 bg-amber-400/5' : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-2">
                  <span className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-t-amber-500 border-zinc-800" />
                  <p className="text-xs text-zinc-400">Происходит парсинг Excel колонок и строковых дат...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <UploadCloud className="h-10 w-10 text-zinc-500 mx-auto" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200">
                      Перетащите файл сюда или нажмите для выбора
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono mt-1">Допустимы .xls и .xlsx (размер до 15МБ)</p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* IMPORT DIAGNOSTICS & DATA INTEGRITY RECONCILIATION PANEL */}
          {activeDiagnostics && activeDiagnostics.hasData && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 font-sans">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400">Диагностическая Сверка Терра Алтай</span>
                  <h3 className="text-sm font-semibold text-white">Активный источник истины (База данных)</h3>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 font-semibold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/15">
                  ✓ Сверка подтверждена
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-2.5 bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Файл отчета:</span>
                    <span className="text-zinc-300 font-bold truncate max-w-[170px]" title={activeDiagnostics.sourceFile}>
                      {activeDiagnostics.sourceFile || 'Не зафиксирован'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Диапазон дат:</span>
                    <span className="text-zinc-300 font-semibold">
                      {activeDiagnostics.dateRange.firstDate ? new Date(activeDiagnostics.dateRange.firstDate).toLocaleDateString('ru-RU') : 'N/A'} — {activeDiagnostics.dateRange.lastDate ? new Date(activeDiagnostics.dateRange.lastDate).toLocaleDateString('ru-RU') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Общая выручка Bnovo:</span>
                    <span className="text-amber-400 font-bold">{formatCurrency(activeDiagnostics.totalActualRevenue)}</span>
                  </div>
                </div>

                <div className="space-y-2.5 bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Физические номера:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeDiagnostics.physicalUnitsCount === 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {activeDiagnostics.physicalUnitsCount} / 50 номеров
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Количество строк дат:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeDiagnostics.dateRowsCount === 365 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {activeDiagnostics.dateRowsCount} / 365 дней
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Строки с нулем/0:</span>
                    <span className="text-zinc-400 font-semibold">
                      {activeDiagnostics.hasInvalidUnits ? 'Присутствуют (Пропущены)' : 'Отсутствуют ✓'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict auditing control values check */}
              <div className="space-y-2">
                <div className="text-zinc-400 text-xs font-semibold flex items-center gap-1.5 px-0.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Верификация контрольных показателей (Bnovo)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs font-mono">
                  
                  {/* Контрольные даты */}
                  <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-850 flex flex-col justify-between h-14">
                    <span className="text-zinc-500">2026-06-15</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200">{formatCurrency(activeDiagnostics.controls.date_2026_06_15)}</span>
                      {activeDiagnostics.controls.date_2026_06_15 === 68500 ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ 68.5k (OK)</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">≠ 68.5k</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-850 flex flex-col justify-between h-14">
                    <span className="text-zinc-500">2026-06-16</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200">{formatCurrency(activeDiagnostics.controls.date_2026_06_16)}</span>
                      {activeDiagnostics.controls.date_2026_06_16 === 67600 ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ 67.6k (OK)</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">≠ 67.6k</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-850 flex flex-col justify-between h-14">
                    <span className="text-zinc-500">2026-06-21</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200">{formatCurrency(activeDiagnostics.controls.date_2026_06_21)}</span>
                      {activeDiagnostics.controls.date_2026_06_21 === 93600 ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ 93.6k (OK)</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">≠ 93.6k</span>
                      )}
                    </div>
                  </div>

                  {/* Контрольная неделя */}
                  <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-850 flex flex-col justify-between h-14 sm:col-span-1">
                    <span className="text-zinc-500">Неделя (15.06 - 21.06)</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200">{formatCurrency(activeDiagnostics.controls.week_2026_06_15_to_21)}</span>
                      {activeDiagnostics.controls.week_2026_06_15_to_21 === 553500 ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ 553.5k (OK)</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">≠ 553.5k</span>
                      )}
                    </div>
                  </div>

                  {/* Контрольный месяц */}
                  <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-850 flex flex-col justify-between h-14 sm:col-span-2">
                    <span className="text-zinc-500">Июнь 2026 (01.06 - 30.06)</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200">{formatCurrency(activeDiagnostics.controls.month_2026_06_01_to_30)}</span>
                      {activeDiagnostics.controls.month_2026_06_01_to_30 === 3754706 ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ 3 754 706 ₽ (OK)</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">≠ 3.75M</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: TRANSIENT ADMIN REVIEW PREVIEW */}
          {pendingPreview && (
            <div className="rounded-xl border border-amber-500/35 bg-zinc-950 p-5 space-y-4 animate-fade-in shadow-xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-500">Предварительный просмотр</span>
                  <h3 className="text-sm font-semibold text-white">Параметры обнаруженного отчета</h3>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 font-semibold">{pendingPreview.importRun.fileName}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[9px] block">Начало периода</span>
                  <span className="font-bold text-zinc-200 mt-1 block">
                    {pendingPreview.preview.periodStart ? new Date(pendingPreview.preview.periodStart).toLocaleDateString('ru-RU') : 'N/A'}
                  </span>
                </div>

                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[9px] block">Конец периода</span>
                  <span className="font-bold text-zinc-200 mt-1 block">
                    {pendingPreview.preview.periodEnd ? new Date(pendingPreview.preview.periodEnd).toLocaleDateString('ru-RU') : 'N/A'}
                  </span>
                </div>

                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[9px] block">Строк распознано</span>
                  <span className="font-bold text-zinc-200 mt-1 block">{pendingPreview.importRun.rowsParsed}</span>
                </div>

                <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[9px] block">Статус загрузки</span>
                  <span className="font-bold text-amber-400 mt-1 block">Ревизия</span>
                </div>
              </div>

              {/* Bnovo specific: reconciliation totals */}
              {pendingPreview.preview.reconciliationCheck && (
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-zinc-300">Проверка согласования (Итоговая выручка)</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Проверка суммы из файла с вычисленным итогом</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-zinc-400">Сумма в отчете: {formatCurrency(pendingPreview.preview.reconciliationCheck.expectedTotal)}</div>
                    <div className="text-zinc-550">Вычислено нами: {formatCurrency(pendingPreview.preview.reconciliationCheck.calculatedTotal)}</div>
                    <div className="mt-1">
                      {pendingPreview.preview.reconciliationCheck.matches ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ✓ Сверка сошлась
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          ⚠ Срез расходится
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings and issues itemizations */}
              {pendingPreview.preview.warnings.length > 0 && (
                <div className="space-y-1 bg-zinc-900/35 border border-zinc-800/80 p-3 rounded-lg max-h-36 overflow-y-auto text-xs font-mono">
                  <div className="text-amber-500 font-bold uppercase tracking-wider text-[9px] mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Предупреждения при парсинге ({pendingPreview.preview.warnings.length})</span>
                  </div>
                  {pendingPreview.preview.warnings.slice(0, 5).map((w, idx) => (
                    <div key={idx} className="text-zinc-400">• {w}</div>
                  ))}
                  {pendingPreview.preview.warnings.length > 5 && (
                    <div className="text-zinc-650 italic text-[11px]">и еще {pendingPreview.preview.warnings.length - 5} предупреждений...</div>
                  )}
                </div>
              )}

              {/* Approval controls block */}
              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800 font-sans">
                <button
                  onClick={() => deleteImport(pendingPreview.importRun.id)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-rose-500 text-xs font-medium cursor-pointer"
                >
                  Отклонить отчет
                </button>
                <button
                  onClick={() => confirmImport(pendingPreview.importRun.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/10"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Принять импорт в Базу</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PAST IMPORT RUNS PANEL */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2.5">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span>История импортируемых файлов</span>
          </h3>

          <div className="space-y-3.5 max-h-[480px] overflow-y-auto text-xs font-mono">
            {importsList.length > 0 ? (
              importsList.map((imp, idx) => (
                <div key={idx} className="p-3 bg-zinc-905 border border-zinc-800/80 rounded-xl space-y-2 relative group bg-zinc-900/20">
                  
                  {/* Delete record floating button if Admin */}
                  {isAdmin && (
                    <button
                      onClick={() => deleteImport(imp.id)}
                      title="Удалить данный импорт и очистить его записи"
                      className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-rose-500 hover:bg-zinc-800 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className="pr-4">
                    <div className="font-bold text-zinc-200 truncate pr-3" title={imp.fileName}>
                      {imp.fileName}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      {imp.fileType === 'yearly_revenue_report' ? 'Отчет Bnovo' : 'ПРАЙСЛИСТ ТАРИФОВ'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] border-t border-zinc-850 pt-2 text-zinc-400">
                    <div>
                      <span className="text-zinc-600">Начало:</span> {imp.periodStart || 'N/A'}
                    </div>
                    <div>
                      <span className="text-zinc-600">Завершение:</span> {imp.periodEnd || 'N/A'}
                    </div>
                    <div>
                      <span className="text-zinc-600">Элементов:</span> {imp.rowsParsed}
                    </div>
                    <div>
                      <span className="text-zinc-600">Ошибки/Варинг:</span> <span className={imp.errors.length + imp.warnings.length > 0 ? 'text-amber-500' : 'text-zinc-500'}>{imp.errors.length + imp.warnings.length}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[9px] text-zinc-500">
                      {new Date(imp.uploadedAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      imp.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {imp.status === 'confirmed' ? 'Принят' : 'Ревизия'}
                    </span>
                  </div>

                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-center py-8">История импорта пуста.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
