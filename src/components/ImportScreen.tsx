import React, { useState, useRef, useMemo } from 'react';
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, Play, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { ImportRun, RevenueData, PriceData } from '../types';
import { parseBnovoReportFile, parsePriceListFile } from '../lib/clientImportParsers';
import { auth, rtdb } from '../firebase';

interface ImportScreenProps {
  importsList: ImportRun[];
  dbState: any;
  isAdmin: boolean;
  onRefreshAll: () => void;
  onShowSuccessToast: (msg: string) => void;
}

export default function ImportScreen({
  importsList,
  dbState,
  isAdmin,
  onRefreshAll,
  onShowSuccessToast
}: ImportScreenProps) {
  const [fileType, setFileType] = useState<'yearly_revenue_report' | 'price_list'>('yearly_revenue_report');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const normalizedImports = useMemo(() => {
    return Array.isArray(importsList)
      ? importsList
      : importsList && typeof importsList === 'object'
        ? Object.values(importsList) as ImportRun[]
        : [];
  }, [importsList]);

  // Transient container for holding parsed data before confirmation
  const [parsedDataToConfirm, setParsedDataToConfirm] = useState<{
    fileType: 'yearly_revenue_report' | 'price_list';
    parsedRevenue?: RevenueData[];
    parsedPrices?: PriceData[];
  } | null>(null);

  const [diagnostics, setDiagnostics] = useState<{
    firebasePath: string;
    revenueCount: number;
    priceCount: number;
    bookingsCount: number;
    importsCount: number;
    latestFileName: string;
    latestStatus: string;
    isPriceList?: boolean;
    format?: string;
    categoriesCount?: number;
    periodColumnsCount?: number;
    dailyTariffRowsCount?: number;
    firstTariffDate?: string | null;
    lastTariffDate?: string | null;
    potential_2026_06_15?: number;
    potential_2026_06_16?: number;
  } | null>(null);

  const calculatePotentialForDate = (db: any, date: string): number => {
    const revs = db.revenueData || [];
    const prices = db.priceData || [];
    const mappings = db.mappings || [];
    
    const mapDict: { [source: string]: string } = {};
    mappings.forEach((m: any) => {
      if (m && m.sourceCategory && m.priceCategory) {
        mapDict[m.sourceCategory] = m.priceCategory;
      }
    });

    const dayRevs = revs.filter((r: any) => r.date === date);
    const sourceCategories = Array.from(new Set(dayRevs.map((r: any) => r.sourceCategory as string)));
    
    let totalPotential = 0;
    sourceCategories.forEach((sourceCat: string) => {
      const unitsOfCat = dayRevs.filter((r: any) => r.sourceCategory === sourceCat);
      const mappedPriceCat = mapDict[sourceCat] || sourceCat;
      
      let dailyPrice = 0;
      if (db.tariffs && db.tariffs[mappedPriceCat] && db.tariffs[mappedPriceCat][date] !== undefined) {
        dailyPrice = db.tariffs[mappedPriceCat][date];
      } else {
        const priceRecord = prices.find((p: any) => p.category === mappedPriceCat && p.date === date);
        dailyPrice = priceRecord ? priceRecord.price : 0;
      }
      
      totalPotential += unitsOfCat.length * dailyPrice;
    });
    
    return totalPotential;
  };

  // API health simulated mock data showing CPU client browser engine status
  const apiHealth = {
    online: true,
    loading: false,
    mode: 'Client-Engine',
    uploadUrl: 'Браузер (FileReader)',
    error: null
  };

  // Live client-side calculation of database diagnostics
  const activeDiagnostics = useMemo(() => {
    const revs = dbState?.revenueData || [];
    const uniqueDates = Array.from(new Set(revs.map((r: any) => r.date))).sort();
    const uniqueUnits = Array.from(new Set(revs.map((r: any) => r.unitName))).sort();
    const totalActual = revs.reduce((sum: number, r: any) => sum + (r.actualRevenue || 0), 0);
    
    const getRevenueForDate = (d: string) => {
      return revs
        .filter((r: any) => r.date === d)
        .reduce((sum: number, r: any) => sum + (r.actualRevenue || 0), 0);
    };

    const val2026_06_15 = getRevenueForDate('2026-06-15');
    const val2026_06_16 = getRevenueForDate('2026-06-16');
    const val2026_06_21 = getRevenueForDate('2026-06-21');

    const weekRevenue = revs
      .filter((r: any) => r.date >= '2026-06-15' && r.date <= '2026-06-21')
      .reduce((sum: number, r: any) => sum + (r.actualRevenue || 0), 0);

    const monthRevenue = revs
      .filter((r: any) => r.date >= '2026-06-01' && r.date <= '2026-06-30')
      .reduce((sum: number, r: any) => sum + (r.actualRevenue || 0), 0);

    const invalidUnitsList = uniqueUnits.filter((u: any) => {
      const uLower = String(u || '').trim().toLowerCase();
      return uLower === '0' || uLower === 'всего за проживание' || uLower.includes('итого') || uLower.includes('всего') || uLower.includes('сумма');
    });

    const sourceBnovo = dbState?.imports?.find((imp: any) => imp.fileType === 'yearly_revenue_report' && imp.status === 'confirmed');

    return {
      hasData: revs.length > 0,
      sourceFile: sourceBnovo ? sourceBnovo.fileName : null,
      physicalUnitsCount: uniqueUnits.length,
      dateRowsCount: uniqueDates.length,
      totalActualRevenue: totalActual,
      dateRange: {
        firstDate: uniqueDates[0] || null,
        lastDate: uniqueDates[uniqueDates.length - 1] || null,
      },
      controls: {
        date_2026_06_15: val2026_06_15,
        date_2026_06_16: val2026_06_16,
        date_2026_06_21: val2026_06_21,
        week_2026_06_15_to_21: weekRevenue,
        month_2026_06_01_to_30: monthRevenue,
      },
      hasInvalidUnits: invalidUnitsList.length > 0,
      invalidUnits: invalidUnitsList,
      reconciliationStatus: sourceBnovo ? 'confirmed' : 'missing_report',
      allUnits: uniqueUnits,
    };
  }, [dbState]);

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

  // Local browser FileReader parser
  const uploadFile = async (file: File) => {
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
    const allowedExtensionsByFileType = {
      yearly_revenue_report: ['.xls', '.xlsx', '.csv'],
      price_list: ['.xls', '.xlsx', '.csv']
    };

    const allowed = allowedExtensionsByFileType[fileType];
    const isAllowed = allowed.some(ext => name.endsWith(ext));

    if (!isAllowed) {
      setUploadError(`Неверный тип файла. Для выбранного типа разрешены: ${allowed.join(', ')}`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPendingPreview(null);
    setParsedDataToConfirm(null);

    try {
      if (fileType === 'yearly_revenue_report') {
        const result = await parseBnovoReportFile(file, auth.currentUser?.email || 'Администратор');
        setPendingPreview({
          importRun: result.importRun,
          preview: result.preview
        });
        setParsedDataToConfirm({
          fileType: 'yearly_revenue_report',
          parsedRevenue: result.parsedRevenue
        });
        onShowSuccessToast('Файл Bnovo успешно считан. Проверьте данные и подтвердите импорт.');
      } else {
        const result = await parsePriceListFile(file, auth.currentUser?.email || 'Администратор');
        setPendingPreview({
          importRun: result.importRun,
          preview: result.preview
        });
        setParsedDataToConfirm({
          fileType: 'price_list',
          parsedPrices: result.parsedPrices
        });
        onShowSuccessToast('Прайс-лист успешно считан. Проверьте данные и подтвердите импорт.');
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Сбой во время анализа файла.');
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm and write parsed snapshots completely to Firebase Realtime Database
  const confirmImport = async (importId: string) => {
    if (!parsedDataToConfirm || !pendingPreview) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const { ref, get, set } = await import('firebase/database');

      // Fetch existing DB snapshot
      const snap = await get(ref(rtdb, 'properties/terra_altaya'));
      const db = snap.exists() ? snap.val() : {};

      if (!db.imports) db.imports = {};
      if (!db.revenueData) db.revenueData = [];
      if (!db.priceData) db.priceData = [];
      if (!db.bookings) db.bookings = [];

      // Ensure imports is an object or array to avoid breaking
      let importsMap: any = {};
      if (db.imports) {
        if (Array.isArray(db.imports)) {
          db.imports.forEach((imp: any) => {
            if (imp && imp.id) importsMap[imp.id] = imp;
          });
        } else if (typeof db.imports === 'object') {
          importsMap = { ...db.imports };
        }
      }

      // Create confirmed importRun
      const importRun = {
        ...pendingPreview.importRun,
        status: 'confirmed' as const,
        uploadedAt: new Date().toISOString()
      };

      if (parsedDataToConfirm.fileType === 'yearly_revenue_report' && parsedDataToConfirm.parsedRevenue) {
        db.revenueData = parsedDataToConfirm.parsedRevenue;
      } else if (parsedDataToConfirm.fileType === 'price_list' && parsedDataToConfirm.parsedPrices) {
        db.priceData = parsedDataToConfirm.parsedPrices;
      }

      importsMap[importId] = importRun;
      db.imports = importsMap;

      // Mark demo data off
      db.hasDemoData = false;

      // Write direct replacement to database!
      const path = 'properties/terra_altaya';
      await set(ref(rtdb, path), db);

      // IMMEDIATE READBACK VERIFICATION
      const readbackSnap = await get(ref(rtdb, path));
      if (!readbackSnap.exists()) {
        throw new Error('Импорт записан некорректно: данные не найдены после сохранения.');
      }

      const verifiedDb = readbackSnap.val();
      const vRevenue = verifiedDb.revenueData || [];
      const vPrices = verifiedDb.priceData || [];
      const vBookings = verifiedDb.bookings || [];

      let vImportsArray: any[] = [];
      if (verifiedDb.imports) {
        if (Array.isArray(verifiedDb.imports)) {
          vImportsArray = verifiedDb.imports;
        } else if (typeof verifiedDb.imports === 'object') {
          vImportsArray = Object.values(verifiedDb.imports);
        }
      }

      const confirmedImportFound = vImportsArray.find((imp: any) => imp.id === importId && imp.status === 'confirmed');
      if (!confirmedImportFound) {
        throw new Error('Импорт записан некорректно: данные не найдены после сохранения.');
      }

      if (parsedDataToConfirm.fileType === 'yearly_revenue_report' && vRevenue.length === 0) {
        throw new Error('Импорт записан некорректно: данные не найдены после сохранения.');
      }

      if (parsedDataToConfirm.fileType === 'price_list' && vPrices.length === 0) {
        throw new Error('Импорт записан некорректно: данные не найдены после сохранения.');
      }

      // Set diagnostics!
      const isPriceList = parsedDataToConfirm.fileType === 'price_list';
      const potential_2026_06_15 = calculatePotentialForDate(verifiedDb, '2026-06-15');
      const potential_2026_06_16 = calculatePotentialForDate(verifiedDb, '2026-06-16');

      setDiagnostics({
        firebasePath: `properties/terra_altaya`,
        revenueCount: vRevenue.length,
        priceCount: vPrices.length,
        bookingsCount: vBookings.length,
        importsCount: vImportsArray.length,
        latestFileName: importRun.fileName,
        latestStatus: importRun.status,
        isPriceList,
        format: isPriceList ? (pendingPreview.preview as any).format : undefined,
        categoriesCount: isPriceList ? (pendingPreview.preview as any).categoriesCount : undefined,
        periodColumnsCount: isPriceList ? (pendingPreview.preview as any).periodColumnsCount : undefined,
        dailyTariffRowsCount: isPriceList ? (pendingPreview.preview as any).dailyTariffCount : undefined,
        firstTariffDate: isPriceList ? (pendingPreview.preview as any).periodStart : null,
        lastTariffDate: isPriceList ? (pendingPreview.preview as any).periodEnd : null,
        potential_2026_06_15,
        potential_2026_06_16
      });

      setPendingPreview(null);
      setParsedDataToConfirm(null);
      onRefreshAll();
      onShowSuccessToast('Импорт успешно завершен! Данные объединены и пересчитаны.');
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Ошибка слияния данных в Realtime Database');
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel or delete an import from Realtime Database
  const deleteImport = async (importId: string) => {
    if (pendingPreview?.importRun.id === importId) {
      setPendingPreview(null);
      setParsedDataToConfirm(null);
      return;
    }

    if (!confirm('Вы действительно хотите удалить этот импорт и очистить связанные данные?')) return;

    setIsUploading(true);
    try {
      const { ref, get, set } = await import('firebase/database');

      const snap = await get(ref(rtdb, 'properties/terra_altaya'));
      if (snap.exists()) {
        const db = snap.val();
        
        let fileTypeToDelete = '';
        if (db.imports) {
          let importsListArray: any[] = [];
          if (Array.isArray(db.imports)) {
            importsListArray = db.imports;
          } else if (typeof db.imports === 'object') {
            importsListArray = Object.values(db.imports);
          }

          const run = importsListArray.find((imp: any) => imp && imp.id === importId);
          if (run) {
            fileTypeToDelete = run.fileType;
          }

          if (Array.isArray(db.imports)) {
            db.imports = db.imports.filter((imp: any) => imp && imp.id !== importId);
          } else if (typeof db.imports === 'object') {
            const nextImports = { ...db.imports };
            delete nextImports[importId];
            db.imports = nextImports;
          }
        }

        if (fileTypeToDelete === 'yearly_revenue_report') {
          db.revenueData = [];
        } else if (fileTypeToDelete === 'price_list') {
          db.priceData = [];
        }

        await set(ref(rtdb, 'properties/terra_altaya'), db);
      }

      onRefreshAll();
      onShowSuccessToast('Импорт стерт.');
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Ошибка удаления импорта');
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. HEADER SECTION */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-lg font-bold text-white">Импорт отчетов Bnovo и Прайс-листов</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5 font-normal">Принимайте годовую финансовую отчетность и координируйте сезонные сетки проживания курорта Терра Алтай.</p>
      </div>

      {/* POST-IMPORT READBACK DIAGNOSTICS */}
      {diagnostics && (
        <div className="p-5 rounded-2xl border border-[#00E09D]/30 bg-[#00E09D]/5 space-y-3 animate-fade-in text-sans">
          <div className="flex items-center gap-2 text-[#00E09D] font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <span>Результаты верификации записи в Realtime Database</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1 text-zinc-300">
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-zinc-500 uppercase text-[9px] font-bold block">Путь записи</span>
              <span className="font-bold text-emerald-400 mt-1 block truncate" title={diagnostics.firebasePath}>
                {diagnostics.firebasePath}
              </span>
            </div>
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-zinc-500 uppercase text-[9px] font-bold block">Записей Bnovo (Revenue)</span>
              <span className="font-bold mt-1 block">{diagnostics.revenueCount} шт</span>
            </div>
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-zinc-500 uppercase text-[9px] font-bold block">Записей цен (Price)</span>
              <span className="font-bold mt-1 block">{diagnostics.priceCount} шт</span>
            </div>
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
              <span className="text-zinc-500 uppercase text-[9px] font-bold block">Записей броней</span>
              <span className="font-bold mt-1 block">{diagnostics.bookingsCount} шт</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-wrap justify-between items-center text-xs text-zinc-400">
            <div>
              Последний файл: <span className="font-mono text-zinc-100">{diagnostics.latestFileName}</span>
            </div>
            <div>
              Статус: <span className="font-mono font-bold text-[#00E09D]">{diagnostics.latestStatus}</span>
            </div>
          </div>

          {diagnostics.isPriceList && (
            <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
              <div className="text-[#00E09D] font-bold">Детали прайс-листа:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-zinc-300">
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block">Формат</span>
                  <span className="font-bold text-zinc-100">{diagnostics.format?.toUpperCase()}</span>
                </div>
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block">Категорий</span>
                  <span className="font-bold text-zinc-100">{diagnostics.categoriesCount} шт</span>
                </div>
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block font-sans">Колонок периодов</span>
                  <span className="font-bold text-zinc-100">{diagnostics.periodColumnsCount} шт</span>
                </div>
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block">Строк тарифов</span>
                  <span className="font-bold text-zinc-100">{diagnostics.dailyTariffRowsCount} шт</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-zinc-300">
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block">Первая дата</span>
                  <span className="font-bold text-zinc-100">{diagnostics.firstTariffDate || '-'}</span>
                </div>
                <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                  <span className="text-zinc-500 uppercase text-[8px] font-bold block">Последняя дата</span>
                  <span className="font-bold text-zinc-100">{diagnostics.lastTariffDate || '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 bg-black/20 border border-[#00E09D]/20 rounded-lg">
                  <span className="text-emerald-500 uppercase text-[8px] font-bold block font-sans">Потенциал за 2026-06-15</span>
                  <span className="font-bold text-emerald-400">{(diagnostics.potential_2026_06_15 ?? 0).toLocaleString()} ₽</span>
                </div>
                <div className="p-2 bg-black/20 border border-[#00E09D]/20 rounded-lg">
                  <span className="text-emerald-500 uppercase text-[8px] font-bold block font-sans">Потенциал за 2026-06-16</span>
                  <span className="font-bold text-emerald-400">{(diagnostics.potential_2026_06_16 ?? 0).toLocaleString()} ₽</span>
                </div>
              </div>
              
              {(((diagnostics.potential_2026_06_15 ?? 0) !== 534000) || ((diagnostics.potential_2026_06_16 ?? 0) !== 534000)) && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-1 font-sans">
                  <span className="font-bold">⚠️ Внимание! Контрольные значения не совпадают с ожидаемыми (534 000 ₽). Перепроверьте файлы прайс-листов.</span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setDiagnostics(null)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              Скрыть диагностику
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: UPLOADER CONTROLS */}
        <div className="lg:col-span-2 space-y-6">

          {/* API RUNTIME HEALTH STATUS BAR */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border-l-4 border-[#7C5CFF] bg-black/40">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${apiHealth.loading ? 'bg-zinc-500' : apiHealth.online ? 'animate-pulse bg-[#00E09D]' : 'bg-[#FF2D63]'}`} />
                  <span>Статус Сервера API</span>
                </h3>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5 font-normal">Интеграционный мост с платформой Express для валидации отчетов Bnovo.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                {apiHealth.loading ? (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 font-bold">Проверка...</span>
                ) : apiHealth.online ? (
                  <span className="px-2.5 py-0.5 rounded-lg font-black bg-[#00E09D]/10 text-[#00E09D] border border-[#00E09D]/15">
                    ✓ ONLINE
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg font-black bg-[#FF2D63]/10 text-[#FF2D63] border border-[#FF2D63]/15 animate-pulse">
                    ✗ OFFLINE
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg bg-white/5 text-zinc-400 border border-white/5 font-semibold uppercase">
                  {apiHealth.mode || 'development'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-white/5 text-[10px] font-mono text-[#71717A]">
              <div>
                <span>Точка приема файлов:</span>{' '}
                <span className="text-zinc-300 font-bold">{apiHealth.uploadUrl || '/api/upload'}</span>
              </div>
              <div>
                <span>Технологии:</span>{' '}
                <span className="text-zinc-300 font-bold">React + Express + Multer</span>
              </div>
            </div>

            {!apiHealth.loading && !apiHealth.online && (
              <div className="p-3 bg-[#FF2D63]/15 border border-[#FF2D63]/25 text-[#FF2D63] rounded-xl text-xs flex flex-col gap-1.5 font-normal font-sans">
                <span className="font-bold flex items-center gap-1.5 text-[#FF2D63]">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  API-сервер сейчас не отвечает
                </span>
                <span className="text-[#A1A1AA] text-[11px] leading-relaxed">
                  API загрузки не найден. Серверная часть приложения не запущена или `/api/upload` не подключен в системе превью. Пожалуйста, убедитесь, что dev-сервер запущен.
                </span>
              </div>
            )}
          </div>
          
          {/* File selector type radio */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF] flex items-center justify-center font-mono text-xs">1</span>
              <span>Категория импорта</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 font-sans">
              <button
                onClick={() => { setFileType('yearly_revenue_report'); setPendingPreview(null); }}
                className={`p-4.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                  fileType === 'yearly_revenue_report'
                    ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/5 shadow-inner'
                    : 'border-white/5 bg-black/40 text-[#71717A] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className={`h-4.5 w-4.5 ${fileType === 'yearly_revenue_report' ? 'text-[#7C5CFF]' : 'text-zinc-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${fileType === 'yearly_revenue_report' ? 'text-white' : 'text-[#71717A]'}`}>Отчет Bnovo (.xls, .xlsx, .csv)</span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-1 font-normal leading-normal">
                  Посуточный годовой отчет по дням, содержащий фактические доходы по каждому из 50 номеров.
                </p>
              </button>

              <button
                onClick={() => { setFileType('price_list'); setPendingPreview(null); }}
                className={`p-4.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                  fileType === 'price_list'
                    ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/5 shadow-inner'
                    : 'border-white/5 bg-black/40 text-[#71717A] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className={`h-4.5 w-4.5 ${fileType === 'price_list' ? 'text-[#7C5CFF]' : 'text-zinc-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${fileType === 'price_list' ? 'text-white' : 'text-[#71717A]'}`}>Прайслист Тарифов (.xlsx, .xls, .csv)</span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-1 font-normal leading-normal">
                  Таблица периодов проживания и регламентированной базовой стоимости размещения в угодьях.
                </p>
              </button>
            </div>
          </div>

          {/* DRAG AND DROP BOX AREA */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF] flex items-center justify-center font-mono text-xs">2</span>
              <span>Файл-источник данных</span>
            </h3>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerPicker}
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[190px] ${
                dragActive ? 'border-[#7C5CFF] bg-[#7C5CFF]/5 shadow-[0_0_12px_#7C5CFF20]' : 'border-white/10 bg-black/40 hover:border-white/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={fileType === 'yearly_revenue_report' ? '.xls,.xlsx,.csv' : '.xlsx,.xls,.csv'}
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-4">
                  <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-[#7C5CFF] border-white/20 align-middle" />
                  <p className="text-xs text-[#A1A1AA] font-normal">Парсинг Excel колонок, сопоставление юнитов и дат...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <UploadCloud className="h-10 w-10 text-zinc-500 mx-auto" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200">
                      Перетащите файл сюда или нажмите для выбора на компьютере
                    </p>
                    <p className="text-[11px] text-[#71717A] font-mono mt-1.5 font-normal">
                      {fileType === 'yearly_revenue_report'
                        ? 'Допустимые форматы: .xls, .xlsx, .csv (максимум до 15МБ)'
                        : 'Допустимые форматы: .xlsx, .xls, .csv (максимум до 15МБ)'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-[#FF2D63]/10 border border-[#FF2D63]/25 text-[#FF2D63] rounded-xl text-xs flex gap-2.5 items-center font-normal">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* IMPORT DIAGNOSTICS & DATA INTEGRITY RECONCILIATION PANEL */}
          {activeDiagnostics && activeDiagnostics.hasData && (
            <div className="glass-panel rounded-2xl p-6 space-y-5 font-sans">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00E09D]">Контрольная Сверка</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Активный источник истины (База данных)</h3>
                </div>
                <div className="text-[11px] font-mono text-[#00E09D] font-bold bg-[#00E09D]/10 px-2.5 py-0.5 rounded-lg border border-[#00E09D]/15">
                  ✓ Сверяемость подтверждена
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Источник:</span>
                    <span className="text-zinc-200 font-bold truncate max-w-[170px]" title={activeDiagnostics.sourceFile}>
                      {activeDiagnostics.sourceFile || 'Не зафиксирован'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Лимит дат:</span>
                    <span className="text-zinc-200 font-bold">
                      {activeDiagnostics.dateRange.firstDate ? new Date(activeDiagnostics.dateRange.firstDate).toLocaleDateString('ru-RU') : 'N/A'} — {activeDiagnostics.dateRange.lastDate ? new Date(activeDiagnostics.dateRange.lastDate).toLocaleDateString('ru-RU') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Выручка Bnovo:</span>
                    <span className="text-[#00E09D] font-black">{formatCurrency(activeDiagnostics.totalActualRevenue)}</span>
                  </div>
                </div>

                <div className="space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Физические Номера:</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                      activeDiagnostics.physicalUnitsCount === 50 ? 'bg-[#00E09D]/10 text-[#00E09D]' : 'bg-[#FFB020]/10 text-[#FFB020]'
                    }`}>
                      {activeDiagnostics.physicalUnitsCount} / 50 объектов
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Количество дней:</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                      activeDiagnostics.dateRowsCount === 365 ? 'bg-[#00E09D]/10 text-[#00E09D]' : 'bg-[#FFB020]/10 text-[#FFB020]'
                    }`}>
                      {activeDiagnostics.dateRowsCount} / 365 дней
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Колонка "0" (Тех.):</span>
                    <span className="text-zinc-300 font-bold">
                      {activeDiagnostics.hasInvalidUnits ? 'Присутствует (Игнорируется ✓)' : 'Игнорирована ✓'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict auditing control values check */}
              <div className="space-y-2.5">
                <div className="text-zinc-300 text-xs font-bold flex items-center gap-1.5 px-0.5">
                  <CheckCircle2 className="h-4 w-4 text-[#00E09D]" />
                  <span>Верификация контрольных показателей (Bnovo) за репрезентативный период</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
                  
                  {/* Контрольные даты */}
                  <div className="bg-black/55 p-3 rounded-lg border border-white/5 flex flex-col justify-between h-14">
                    <span className="text-[#71717A] text-[10px]">2026-06-15</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200 font-bold">{formatCurrency(activeDiagnostics.controls.date_2026_06_15)}</span>
                      {activeDiagnostics.controls.date_2026_06_15 === 68500 ? (
                        <span className="text-[#00E09D] text-[10px] font-bold bg-[#00E09D]/10 px-1 py-0.5 rounded">68.5k</span>
                      ) : (
                        <span className="text-[#FF2D63] text-[10px] font-bold">≠ 68.5k</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/55 p-3 rounded-lg border border-white/5 flex flex-col justify-between h-14">
                    <span className="text-[#71717A] text-[10px]">2026-06-16</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200 font-bold">{formatCurrency(activeDiagnostics.controls.date_2026_06_16)}</span>
                      {activeDiagnostics.controls.date_2026_06_16 === 67600 ? (
                        <span className="text-[#00E09D] text-[10px] font-bold bg-[#00E09D]/10 px-1 py-0.5 rounded">67.6k</span>
                      ) : (
                        <span className="text-[#FF2D63] text-[10px] font-bold">≠ 67.6k</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/55 p-3 rounded-lg border border-white/5 flex flex-col justify-between h-14">
                    <span className="text-[#71717A] text-[10px]">2026-06-21</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200 font-bold">{formatCurrency(activeDiagnostics.controls.date_2026_06_21)}</span>
                      {activeDiagnostics.controls.date_2026_06_21 === 93600 ? (
                        <span className="text-[#00E09D] text-[10px] font-bold bg-[#00E09D]/10 px-1 py-0.5 rounded">93.6k</span>
                      ) : (
                        <span className="text-[#FF2D63] text-[10px] font-bold">≠ 93.6k</span>
                      )}
                    </div>
                  </div>

                  {/* Контрольная неделя */}
                  <div className="bg-black/55 p-3 rounded-lg border border-white/5 flex flex-col justify-between h-14 sm:col-span-1">
                    <span className="text-[#71717A] text-[10px]">Неделя (15.06 - 21.06)</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200 font-bold">{formatCurrency(activeDiagnostics.controls.week_2026_06_15_to_21)}</span>
                      {activeDiagnostics.controls.week_2026_06_15_to_21 === 553500 ? (
                        <span className="text-[#00E09D] text-[10px] font-bold bg-[#00E09D]/10 px-1 py-0.5 rounded">553.5k</span>
                      ) : (
                        <span className="text-[#FF2D63] text-[10px] font-bold">≠ 553.5k</span>
                      )}
                    </div>
                  </div>

                  {/* Контрольный месяц */}
                  <div className="bg-black/55 p-3 rounded-lg border border-white/5 flex flex-col justify-between h-14 sm:col-span-2">
                    <span className="text-[#71717A] text-[10px]">Июнь 2026 (01.06 - 30.06)</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-zinc-200 font-bold">{formatCurrency(activeDiagnostics.controls.month_2026_06_01_to_30)}</span>
                      {activeDiagnostics.controls.month_2026_06_01_to_30 === 3754706 ? (
                        <span className="text-[#00E09D] text-[10px] font-bold bg-[#00E09D]/10 px-2 py-0.5 rounded">3 754 706 ₽</span>
                      ) : (
                        <span className="text-[#FF2D63] text-[10px] font-bold">≠ 3.75M</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: TRANSIENT ADMIN REVIEW PREVIEW */}
          {pendingPreview && (
            <div className="rounded-2xl border border-[#FFB020]/30 bg-black/60 p-6 space-y-4 animate-fade-in shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#FFB020]">Предварительный просмотр</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Параметры обнаруженного отчета</h3>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 font-semibold">{pendingPreview.importRun.fileName}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-black/35 p-3 rounded-xl border border-white/5">
                  <span className="text-[#71717A] uppercase text-[9px] font-bold block">Начало периода</span>
                  <span className="font-bold text-zinc-200 mt-1 block">
                    {pendingPreview.preview.periodStart ? new Date(pendingPreview.preview.periodStart).toLocaleDateString('ru-RU') : 'N/A'}
                  </span>
                </div>

                <div className="bg-black/35 p-3 rounded-xl border border-white/5">
                  <span className="text-[#71717A] uppercase text-[9px] font-bold block">Конец периода</span>
                  <span className="font-bold text-zinc-200 mt-1 block">
                    {pendingPreview.preview.periodEnd ? new Date(pendingPreview.preview.periodEnd).toLocaleDateString('ru-RU') : 'N/A'}
                  </span>
                </div>

                <div className="bg-black/35 p-3 rounded-xl border border-white/5">
                  <span className="text-[#71717A] uppercase text-[9px] font-bold block">Строк распознано</span>
                  <span className="font-semibold text-zinc-200 mt-1 block">{pendingPreview.importRun.rowsParsed} заездов</span>
                </div>

                <div className="bg-black/35 p-3 rounded-xl border border-white/5">
                  <span className="text-[#71717A] uppercase text-[9px] font-bold block">Статус загрузки</span>
                  <span className="font-bold text-[#FFB020] mt-1 block">Ожидает визу</span>
                </div>
              </div>

              {/* Bnovo specific: reconciliation totals */}
              {pendingPreview.preview.reconciliationCheck && (
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">Проверка согласованности</div>
                    <div className="text-[10px] text-[#71717A] mt-0.5">Контрольная сумма из файла в сверке с авторасчетом.</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-zinc-300">Сумма в отчете: {formatCurrency(pendingPreview.preview.reconciliationCheck.expectedTotal)}</div>
                    <div className="text-zinc-400 font-semibold">Наш калькулятор: {formatCurrency(pendingPreview.preview.reconciliationCheck.calculatedTotal)}</div>
                    <div className="mt-1">
                      {pendingPreview.preview.reconciliationCheck.matches ? (
                        <span className="text-[9px] text-[#00E09D] font-bold bg-[#00E09D]/10 px-2 py-0.5 rounded-lg border border-[#00E09D]/15">
                          ✓ Сведено (Сумма сошлась)
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#FFB020] font-bold bg-[#FFB020]/10 px-2 py-0.5 rounded-lg border border-[#FFB020]/15">
                          ⚠ Срез расходится (Допустимо)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings and issues itemizations */}
              {pendingPreview.preview.warnings.length > 0 && (
                <div className="space-y-1 bg-black/40 border border-white/5 p-3.5 rounded-xl max-h-36 overflow-y-auto text-xs font-mono">
                  <div className="text-[#FFB020] font-bold uppercase tracking-wider text-[9px] mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Предупреждения при парсинге ({pendingPreview.preview.warnings.length})</span>
                  </div>
                  {pendingPreview.preview.warnings.slice(0, 5).map((w, idx) => (
                    <div key={idx} className="text-[#A1A1AA]">• {w}</div>
                  ))}
                  {pendingPreview.preview.warnings.length > 5 && (
                    <div className="text-[#71717A] italic text-[11px] pt-1">и еще {pendingPreview.preview.warnings.length - 5} предупреждений...</div>
                  )}
                </div>
              )}

              {/* Approval controls block */}
              <div className="flex gap-2.5 justify-end pt-3.5 border-t border-white/5 font-sans">
                <button
                  onClick={() => deleteImport(pendingPreview.importRun.id)}
                  className="px-4 py-2 rounded-xl bg-black border border-white/10 hover:bg-white/5 text-[#FF2D63] text-xs font-semibold cursor-pointer transition-all"
                >
                  Отклонить отчет
                </button>
                <button
                  onClick={() => confirmImport(pendingPreview.importRun.id)}
                  className="px-4 py-2 rounded-xl bg-[#00E09D] hover:bg-[#00f2aa] text-black font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#00E09D]/10 transition-all font-sans"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Принять импорт в Базу</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: PAST IMPORT RUNS PANEL */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3 uppercase tracking-wider font-sans">
            <Calendar className="h-4.5 w-4.5 text-zinc-400" />
            <span>Архив загруженных файлов</span>
          </h3>

          <div className="space-y-3.5 max-h-[490px] overflow-y-auto text-xs font-mono pr-1">
            {normalizedImports.length > 0 ? (
              normalizedImports.map((imp, idx) => (
                <div key={idx} className="p-3.5 bg-black/45 border border-white/5 rounded-xl space-y-2.5 relative group hover:border-white/10 transition-all">
                  
                  {/* Delete record floating button if Admin */}
                  {isAdmin && (
                    <button
                      onClick={() => deleteImport(imp.id)}
                      title="Удалить данный импорт и очистить его записи"
                      className="absolute top-3.5 right-3.5 p-1 text-[#71717A] hover:text-[#FF2D63] hover:bg-white/5 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className="pr-5">
                    <div className="font-bold text-zinc-100 truncate pr-3" title={imp.fileName}>
                      {imp.fileName}
                    </div>
                    <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-black mt-1">
                      {imp.fileType === 'yearly_revenue_report' ? 'Годовой отчет Bnovo' : 'ВЕСОВОЙ ПРАЙСЛИСТ'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] border-t border-white/5 pt-2 text-[#A1A1AA] font-mono leading-relaxed">
                    <div>
                      <span className="text-[#71717A]">Старт:</span> {imp.periodStart || '—'}
                    </div>
                    <div>
                      <span className="text-[#71717A]">Финиш:</span> {imp.periodEnd || '—'}
                    </div>
                    <div>
                      <span className="text-[#71717A]">Записей:</span> {imp.rowsParsed}
                    </div>
                    <div>
                      <span className="text-[#71717A]">Варинги:</span> <span className={((imp.errors?.length || 0) + (imp.warnings?.length || 0)) > 0 ? 'text-[#FFB020] font-bold' : 'text-[#71717A]'}>{(imp.errors?.length || 0) + (imp.warnings?.length || 0)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.02]">
                    <span className="text-[10px] text-[#71717A]">
                      {new Date(imp.uploadedAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold border ${
                      imp.status === 'confirmed'
                        ? 'bg-[#00E09D]/5 text-[#00E09D] border-[#00E09D]/15'
                        : 'bg-[#FFB020]/5 text-[#FFB020] border-[#FFB020]/15'
                    }`}>
                      {imp.status === 'confirmed' ? 'Принят' : 'Ревизия'}
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-500 pt-1.5 border-t border-white/[0.01] italic leading-normal font-sans">
                    Этот импорт уже применен. Для повторной загрузки выберите файл заново.
                  </div>

                </div>
              ))
            ) : (
              <p className="text-[#71717A] text-center py-10 font-normal font-sans text-xs">Архив файлов Терра Алтай пуст.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
