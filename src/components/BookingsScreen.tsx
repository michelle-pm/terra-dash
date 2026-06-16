import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ALL_BOOKINGS, MANAGERS, Booking, ManagerPerformance } from '../data/bookingData';
import { apiFetch } from '../lib/api';
import { parseBookingsFile } from '../lib/clientImportParsers';
import { rtdb } from '../firebase';
import { 
  Calendar, 
  DollarSign, 
  XSquare, 
  CheckCircle, 
  UserCheck, 
  Search, 
  Filter, 
  DownloadCloud, 
  TrendingUp, 
  Users, 
  Award,
  ChevronDown,
  Info,
  Upload,
  RefreshCw,
  FolderSync
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function BookingsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-06-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-06-15');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [searchQuery, setSearchFilter] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'stay' | 'create'>('stay');
  
  // Custom bookings loaded from server database
  const [dbBookings, setDbBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Upload panel states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadManager, setUploadManager] = useState<string>('auto');
  const [clearExisting, setClearExisting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Transient container for booking list before direct Firebase rewrite
  const [pendingBookings, setPendingBookings] = useState<any[] | null>(null);
  const [bookingsPreview, setBookingsPreview] = useState<{
    fileName: string;
    rawCount: number;
    uniqueCount: number;
    duplicates: string[];
    managers: string[];
    cancelledCount: number;
    activeCount: number;
    activeRevenue: number;
  } | null>(null);

  const [diagnostics, setDiagnostics] = useState<{
    firebasePath: string;
    revenueCount: number;
    priceCount: number;
    bookingsCount: number;
    importsCount: number;
    latestFileName: string;
    latestStatus: string;
  } | null>(null);

  // High-fidelity date helper: local date boundaries
  // All bookings are centered around early 2026 up to dynamic Altai Time today.
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
  const todayDate = new Date(todayStr);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.bookings)) {
          setDbBookings(data.bookings);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching custom bookings from API:', e);
    }

    // Direct Firebase Client fallback
    try {
      const { ref, get } = await import('firebase/database');
      const snap = await get(ref(rtdb, 'properties/terra_altaya/bookings'));
      if (snap.exists() && Array.isArray(snap.val())) {
        setDbBookings(snap.val());
      } else {
        setDbBookings([]);
      }
    } catch (fbErr) {
      console.error('Direct bookings fetch failed too:', fbErr);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Run local excel/csv parser instantly inside user browser on selection
  const runLocalBookingsParser = async (file: File) => {
    setIsUploading(true);
    setUploadMessage(null);
    setBookingsPreview(null);
    setPendingBookings(null);

    try {
      const parsed = await parseBookingsFile(file, uploadManager === 'auto' ? undefined : uploadManager);
      if (parsed.length === 0) {
        throw new Error('Файл не содержит бронирований или неверная структура.');
      }

      // Compute statistics
      const codes = parsed.map(b => b.code);
      const uniqueCodes = Array.from(new Set(codes));
      
      const seen = new Set<string>();
      const duplicates = Array.from(new Set(codes.filter(c => {
        if (seen.has(c)) return true;
        seen.add(c);
        return false;
      })));

      const managers = Array.from(new Set(parsed.map(b => b.manager || 'Внешний')));
      const cancelledCount = parsed.filter(b => b.cancelDate !== null).length;
      const activeCount = parsed.filter(b => b.cancelDate === null).length;
      const activeRevenue = parsed
        .filter(b => b.cancelDate === null)
        .reduce((sum, b) => sum + (b.total || 0), 0);

      setPendingBookings(parsed);
      setBookingsPreview({
        fileName: file.name,
        rawCount: parsed.length,
        uniqueCount: uniqueCodes.length,
        duplicates,
        managers,
        cancelledCount,
        activeCount,
        activeRevenue
      });

      setUploadMessage({
        type: 'success',
        text: `Файл успешно проанализирован: обнаружено ${parsed.length} бронирований. Из них активных: ${activeCount}, отмененных: ${cancelledCount}. Пожалуйста, подтвердите сохранение в БД.`
      });
    } catch (err: any) {
      console.error(err);
      setUploadMessage({
        type: 'error',
        text: err.message || 'Ошибка во время чтения файла бронирований.'
      });
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm and write to Firebase Database directly
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !pendingBookings || !bookingsPreview) {
      setUploadMessage({ type: 'error', text: 'Пожалуйста, сначала выберите и проанализируйте файл.' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const { ref, get, set } = await import('firebase/database');

      const path = 'properties/terra_altaya';
      const snap = await get(ref(rtdb, path));
      const db = snap.exists() ? snap.val() : {};

      if (!db.bookings) {
        db.bookings = [];
      }
      if (!db.imports) {
        db.imports = {};
      }

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

      let resultBookings = [];
      if (clearExisting) {
        resultBookings = pendingBookings;
      } else {
        const currentBookings = [...db.bookings];
        pendingBookings.forEach((newB: any) => {
          const idx = currentBookings.findIndex((b: any) => b.code === newB.code);
          if (idx !== -1) {
            currentBookings[idx] = { ...currentBookings[idx], ...newB };
          } else {
            currentBookings.push(newB);
          }
        });
        resultBookings = currentBookings;
      }

      // Create confirmed import record
      const importId = 'bookings_imp_' + Math.random().toString(36).substr(2, 9);
      const importRun = {
        id: importId,
        fileName: bookingsPreview.fileName,
        fileType: 'bookings_registry' as const,
        sourceKind: 'bookings_registry' as const,
        uploadedBy: 'Администратор',
        uploadedAt: new Date().toISOString(),
        periodStart: null,
        periodEnd: null,
        rowsParsed: pendingBookings.length,
        rowsInserted: pendingBookings.length,
        rowsUpdated: 0,
        warnings: [],
        errors: [],
        status: 'confirmed' as const
      };

      importsMap[importId] = importRun;

      // Record state back to Firebase RTDB
      db.bookings = resultBookings;
      db.imports = importsMap;
      db.hasDemoData = false;

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

      if (vBookings.length === 0) {
        throw new Error('Импорт записан некорректно: данные не найдены после сохранения.');
      }

      // Set diagnostics!
      setDiagnostics({
        firebasePath: path,
        revenueCount: vRevenue.length,
        priceCount: vPrices.length,
        bookingsCount: vBookings.length,
        importsCount: vImportsArray.length,
        latestFileName: importRun.fileName,
        latestStatus: importRun.status
      });

      setUploadMessage({
        type: 'success',
        text: `Данные успешно сохранены в Базу! Записано ${pendingBookings.length} строк. Всего в базе: ${resultBookings.length} бронирований.`
      });

      setUploadFile(null);
      setPendingBookings(null);
      setBookingsPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchBookings();
    } catch (err: any) {
      console.error(err);
      setUploadMessage({
        type: 'error',
        text: err.message || 'Ошибка записи бронирований в Realtime Database.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Reset custom bookings back to empty standard fallbacks
  const handleClearBookings = async () => {
    if (!window.confirm('Вы уверены, что хотите сбросить импортированные бронирования и вернуться к демонстрационным данным?')) {
      return;
    }
    setIsLoading(true);
    try {
      const { ref, get, set } = await import('firebase/database');

      const path = 'properties/terra_altaya';
      const snap = await get(ref(rtdb, path));
      if (snap.exists()) {
        const db = snap.val();
        db.bookings = [];
        await set(ref(rtdb, path), db);
      }
      
      setDbBookings([]);
      setUploadMessage({ type: 'success', text: 'Данные успешно сброшены к стандартному шаблону.' });
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Ошибка сброса данных' });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to custom bookings list if available, else standard fallback template
  const activeBookingsSource = dbBookings.length > 0 ? dbBookings : ALL_BOOKINGS;

  // Filter bookings by standard chosen periods or custom starts/ends
  const filteredBookingsByPeriod = useMemo(() => {
    return activeBookingsSource.filter(b => {
      let startLimit = '';
      let endLimit = '';

      if (selectedPeriod === 'custom') {
        startLimit = customStartDate;
        endLimit = customEndDate;
      } else if (selectedPeriod === 'day') {
        startLimit = todayStr;
        endLimit = todayStr;
      } else if (selectedPeriod === 'all') {
        startLimit = '1970-01-01';
        endLimit = '2099-12-31';
      } else {
        const diffDays = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
        const startD = new Date(todayDate);
        startD.setDate(todayDate.getDate() - diffDays);
        
        const y = startD.getFullYear();
        const m = String(startD.getMonth() + 1).padStart(2, '0');
        const d = String(startD.getDate()).padStart(2, '0');
        startLimit = `${y}-${m}-${d}`;
        endLimit = todayStr;
      }

      if (dateFilterType === 'stay') {
        // Enforce stay overlaps
        const bIn = b.checkIn;
        const bOut = b.checkOut;
        if (!bIn || !bOut) return false;
        return bIn <= endLimit && bOut >= startLimit;
      } else {
        // Enforce creation date interval
        const bDateStr = b.bookingDate;
        if (!bDateStr) return false;
        return bDateStr >= startLimit && bDateStr <= endLimit;
      }
    });
  }, [activeBookingsSource, selectedPeriod, customStartDate, customEndDate, todayStr, todayDate, dateFilterType]);

  // Combined filters: Period, Status, Manager Name, and Text Search
  const processedBookings = useMemo(() => {
    return filteredBookingsByPeriod.filter(b => {
      // 1. Status Filter
      const isCancelled = b.cancelDate !== null && b.cancelDate !== '-';
      if (statusFilter === 'active' && isCancelled) return false;
      if (statusFilter === 'cancelled' && !isCancelled) return false;

      // 2. Manager Filter
      if (managerFilter !== 'all') {
        if (managerFilter === 'unassigned') {
          if (b.manager) return false;
        } else {
          if (b.manager !== managerFilter) return false;
        }
      }

      // 3. Search Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          b.code.toLowerCase().includes(query) ||
          b.guest.toLowerCase().includes(query) ||
          b.category.toLowerCase().includes(query) ||
          (b.roomNum && b.roomNum.toLowerCase().includes(query)) ||
          b.source.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [filteredBookingsByPeriod, statusFilter, managerFilter, searchQuery]);

  // Create an aggregate scope for overall statistics (retains managerFilter, but ignores search/status)
  const statisticsScopeBookings = useMemo(() => {
    return filteredBookingsByPeriod.filter(b => {
      if (managerFilter !== 'all') {
        if (managerFilter === 'unassigned') {
          return !b.manager || b.manager === '-' || b.manager === 'Внешний' || b.manager === 'unassigned';
        }
        return b.manager === managerFilter;
      }
      return true;
    });
  }, [filteredBookingsByPeriod, managerFilter]);

  // Calculate Metrics based on overall statistic scope (unaffected by temporary text search / list status filter)
  const metrics = useMemo(() => {
    let activeCount = 0;
    let cancelledCount = 0;
    let activeSum = 0;
    let cancelledSum = 0;
    let balanceSum = 0;

    statisticsScopeBookings.forEach(b => {
      const isCancelled = b.cancelDate !== null && b.cancelDate !== '-';
      if (isCancelled) {
        cancelledCount++;
        cancelledSum += b.total;
      } else {
        activeCount++;
        activeSum += b.total;
        balanceSum += b.balance;
      }
    });

    const totalCount = statisticsScopeBookings.length;
    const avgTicket = activeCount > 0 ? activeSum / activeCount : 0;

    return {
      totalCount,
      activeCount,
      cancelledCount,
      activeSum,
      cancelledSum,
      balanceSum,
      avgTicket,
      cancelRate: totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0
    };
  }, [statisticsScopeBookings]);

  // Sales per Manager Chart (uses full bookings within filtered period for perfect comparisons)
  const managerPerformanceData = useMemo(() => {
    return MANAGERS.map(m => {
      const managerBookings = filteredBookingsByPeriod.filter(b => b.manager === m.name);
      const active = managerBookings.filter(b => !b.cancelDate || b.cancelDate === '-');
      const activeRevenue = active.reduce((sum, current) => sum + current.total, 0);
      const cancelledCount = managerBookings.length - active.length;

      return {
        name: m.name.split(' ')[0],
        fullName: m.name,
        'Выручка, ₽': activeRevenue,
        'Бронирования': active.length,
        'Отмены': cancelledCount
      };
    });
  }, [filteredBookingsByPeriod]);

  // Booking Source distribution chart (uses filteredBookingsByPeriod for accurate representation)
  const sourceChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredBookingsByPeriod.forEach(b => {
      counts[b.source] = (counts[b.source] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [filteredBookingsByPeriod]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#a855f7', '#6366f1'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="bookings_screen_container">
      {/* POST-IMPORT READBACK DIAGNOSTICS */}
      {diagnostics && (
        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 animate-fade-in text-sans">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <CheckCircle className="h-5 w-5" />
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
              Статус: <span className="font-mono font-bold text-indigo-400">{diagnostics.latestStatus}</span>
            </div>
          </div>
          
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

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-400" />
            <span>Управление Бронированиями (Bnovo & Продавцы)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Контроль заявок, сравнение результатов продажников и детальный анализ отмененных и активных бронирований.
          </p>
        </div>
      </div>

      {/* DUAL SELECTOR CONTROL PANEL */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 bg-zinc-950 border border-zinc-900/40 p-4 rounded-2xl" id="dual_filter_control_pnl">
        {/* Period Selector */}
        <div className="space-y-1.5">
          <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider font-mono block">Временной интервал:</span>
          <div className="flex flex-wrap bg-zinc-900 border border-zinc-800/80 rounded-lg p-0.5 gap-0.5" id="date_period_buttons">
            {(['day', 'week', 'month', 'year', 'all', 'custom'] as const).map(p => {
              const labels = { 
                day: 'День', 
                week: 'Неделя', 
                month: 'Месяц (30д)', 
                year: 'Год', 
                all: 'Весь период', 
                custom: 'Свой период 📅' 
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedPeriod === p
                      ? 'bg-indigo-600/90 text-white shadow-md font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calculation Mode Selector */}
        <div className="space-y-1.5">
          <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider font-mono block">Рассчитывать результаты и доходы по:</span>
          <div className="flex bg-zinc-900 border border-zinc-800/80 rounded-lg p-0.5 gap-0.5" id="date_filter_type_buttons">
            <button
              type="button"
              onClick={() => setDateFilterType('stay')}
              className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                dateFilterType === 'stay'
                  ? 'bg-emerald-600 text-white shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span>🏠</span>
              <span>Датам проживания (заезды на даты)</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('create')}
              className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                dateFilterType === 'create'
                  ? 'bg-indigo-600 text-white shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span>📅</span>
              <span>Дате создания бронирования</span>
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOM DATE RANGE SPREAD (renders when 'custom' period is selected) */}
      {selectedPeriod === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 bg-zinc-950 border border-zinc-900/60 p-4 rounded-xl animate-slide-up" id="custom_period_controls">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs font-sans">Дата начала:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs text-center font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs font-sans">Дата окончания:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs text-center font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            (Поиск и группировка по Алтайскому времени)
          </span>
        </div>
      )}

      {/* BOOKING FILE IMPORT PANEL */}
      <div className="rounded-xl border border-zinc-804 bg-zinc-950 p-5 space-y-4" id="upload_window_box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/15 p-2 rounded-lg text-indigo-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Окно загрузки реестра бронирований</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Загрузите бронирования общие или бронирования по конкретному продажнику.
              </p>
            </div>
          </div>
          
          {dbBookings.length > 0 && (
            <button
              onClick={handleClearBookings}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 text-xs font-medium font-sans flex items-center gap-1.5 transition-all"
              title="Удалить импортированные данные и вернуться к стандартному шаблону (демо)"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Восстановить шаблонные данные</span>
            </button>
          )}
        </div>

        <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* File select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-medium text-zinc-400 font-sans">Файл отчета Excel (.xlsx) или CSV:</label>
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadFile(file);
                  if (file) {
                    runLocalBookingsParser(file);
                  } else {
                    setBookingsPreview(null);
                    setPendingBookings(null);
                  }
                }}
                className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-zinc-900 file:text-zinc-200 hover:file:bg-zinc-800 file:transition-all cursor-pointer bg-zinc-909 border border-zinc-800 p-1.5 rounded-lg"
              />
            </div>
          </div>

          {/* Salesperson selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-sans">Продавник:</label>
            <select
              value={uploadManager}
              onChange={(e) => setUploadManager(e.target.value)}
              className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="auto">📍 Общий (авто-определение)</option>
              <option value="unassigned">Внешний (без сотрудника)</option>
              {MANAGERS.map(m => (
                <option key={m.name} value={m.name}>Sales: {m.name}</option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <button
            type="submit"
            disabled={isUploading || !uploadFile || !pendingBookings}
            className={`w-full py-2 px-4 rounded-lg text-xs font-semibold font-sans flex items-center justify-center gap-2 transition-all ${
              isUploading || !uploadFile || !pendingBookings
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-[#533BF5] hover:bg-[#6852ff] text-white shadow-lg shadow-[#533BF5]/15'
            }`}
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <FolderSync className="h-3.5 w-3.5" />
                <span>Загрузить реестр</span>
              </>
            )}
          </button>
        </form>

        {/* Advanced clean option */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <input
            type="checkbox"
            id="clear_existing_checkbox"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="clear_existing_checkbox" className="cursor-pointer select-none font-sans">
            Очистить всю текущую базу бронирований перед импортом (в перезапись)
          </label>
        </div>

        {/* Bookings Preview Card */}
        {bookingsPreview && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-[#818CF8] uppercase text-[10px] font-bold">Предварительный просмотр реестра</span>
              <span className="text-zinc-400 text-[11px]">{bookingsPreview.fileName}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Строк в файле</span>
                <span className="font-semibold text-zinc-200 mt-1 block">{bookingsPreview.rawCount} строк</span>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Уникальные брони</span>
                <span className="font-semibold text-zinc-200 mt-1 block">{bookingsPreview.uniqueCount} кодов</span>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Активные брони</span>
                <span className="font-semibold text-zinc-200 mt-1 block">{bookingsPreview.activeCount} шт</span>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Отмененные брони</span>
                <span className="font-semibold text-[#FF2D63] mt-1 block">{bookingsPreview.cancelledCount} шт</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Выручка по активным броням</span>
                <span className="font-semibold text-emerald-400 mt-1 block text-sm">
                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(bookingsPreview.activeRevenue)}
                </span>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 uppercase text-[9px] font-bold block">Обнаруженные продажники</span>
                <div className="text-zinc-300 mt-1 text-[11px] font-sans flex flex-wrap gap-1 leading-normal">
                  {bookingsPreview.managers.map((m, idx) => (
                    <span key={idx} className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 border border-zinc-700">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {bookingsPreview.duplicates.length > 0 && (
              <div className="bg-rose-950/25 border border-rose-900/30 p-2.5 rounded text-rose-300 text-[11px]">
                <span className="font-bold block uppercase text-[9px] tracking-wide text-rose-400 mb-1">Дубликаты номеров броней в файле:</span>
                <div className="flex flex-wrap gap-1.5">
                  {bookingsPreview.duplicates.slice(0, 10).map((d, i) => (
                    <span key={i} className="bg-rose-950/40 px-1.5 py-0.5 rounded text-[10px] border border-rose-900/45 text-rose-200 font-mono">{d}</span>
                  ))}
                  {bookingsPreview.duplicates.length > 10 && (
                    <span className="text-zinc-500 text-[10px] self-center">...и еще {bookingsPreview.duplicates.length - 10} кодов</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Messages */}
        {uploadMessage && (
          <div className={`p-3 rounded-lg text-xs font-mono border ${
            uploadMessage.type === 'success' 
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
          }`}>
            {uploadMessage.text}
          </div>
        )}

        {/* Status indicator */}
        <div className="text-[11px] text-zinc-500 flex items-center justify-between font-mono bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Источник данных: <b>{dbBookings.length > 0 ? 'Загружен пользовательский реестр' : 'Системный шаблон (демо-данные)'}</b></span>
          </div>
          <span>Активно записей: {activeBookingsSource.length}</span>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Bookings */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Всего заявок</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {metrics.totalCount}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            За выбранный временной период
          </p>
        </div>

        {/* HIGHLIGHTED TARGET METRIC: Revenue for Selected Period */}
        <div className="rounded-xl border border-indigo-500/30 bg-zinc-950 p-4 relative overflow-hidden shadow-lg shadow-indigo-600/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-400 font-semibold text-xs uppercase tracking-wider">Доход за выбранный период</span>
            <DollarSign className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-400">
            {formatCurrency(metrics.activeSum)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            За активные бронирования ({metrics.activeCount} шт)
          </p>
        </div>

        {/* Cancelled Bookings */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Отмененные</span>
            <XSquare className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-500">
            {metrics.cancelledCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between font-mono">
            <span>Упущенная выгода:</span>
            <span className="text-rose-400 font-semibold">{formatCurrency(metrics.cancelledSum)}</span>
          </div>
        </div>

        {/* Average Ticket or Conversion */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Процент отмен</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {metrics.cancelRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-505 mt-1 font-mono">
            Средний чек: {formatCurrency(metrics.avgTicket)}
          </div>
        </div>

      </div>

      {/* DETAILED MANAGER PERFORMANCE STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales by Manager Chart (2 columns) */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Выработка менеджеров по продажам</h3>
              <p className="text-[11px] text-zinc-500">Общие активные бронирования и отмены за период.</p>
            </div>
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={managerPerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Выручка, ₽" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Бронирования" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Distribution of bookings by channel type */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Источники заявок</h3>
              <p className="text-[11px] text-zinc-500">Доли каналов бронирования</p>
            </div>
            <Info className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-zinc-600 text-xs font-mono">Нет данных</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-zinc-900 pt-3 max-h-24 overflow-y-auto">
            {sourceChartData.map((s, idx) => (
              <div key={s.name} className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate max-w-[80px]" title={s.name}>{s.name}</span>
                <span className="text-zinc-500 ml-auto">({s.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ACCORDION / GRID REPORT BY MANAGERS */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Сводная эффективность продавцов</h3>
        <p className="text-xs text-zinc-500 mb-4 font-sans">
          Реальные продажи на основе сверки кодов ведомости Bnovo. Исключает любое дублирование данных.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {MANAGERS.map(m => {
            const mBookings = filteredBookingsByPeriod.filter(b => b.manager === m.name);
            const active = mBookings.filter(b => !b.cancelDate || b.cancelDate === '-');
            const cancelled = mBookings.filter(b => b.cancelDate && b.cancelDate !== '-');
            const totalRev = active.reduce((sum, curr) => sum + curr.total, 0);

            return (
              <div 
                key={m.name} 
                onClick={() => {
                  setManagerFilter(m.name);
                  const listEl = document.getElementById('bookings_table_section');
                  if (listEl) listEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded-lg p-3 border cursor-pointer hover:border-indigo-500/50 transition-all ${
                  managerFilter === m.name 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-zinc-900 bg-zinc-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-white truncate">{m.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400">
                    {active.length} закл.
                  </span>
                </div>
                
                <div className="space-y-1 text-[11px] font-mono text-zinc-400">
                  <div className="flex justify-between">
                    <span>Выручка:</span>
                    <span className="text-white font-semibold">{formatCurrency(totalRev)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Отменено:</span>
                    <span className="text-rose-400 font-semibold">{cancelled.length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Проживание (отчет):</span>
                    <span>{formatCurrency(m.revenueHousing)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & BOOKINGS REGISTER TABLE */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" id="bookings_table_section">
        
        {/* Controls row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-900">
          <div>
            <h3 className="text-sm font-semibold text-white">Реестр бронирований</h3>
            <p className="text-[11px] text-zinc-500">Индивидуальные брони отеля из импортированных систем.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск по гостю, коду..."
                value={searchQuery}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-44 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none font-mono"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="cancelled">Отмененные</option>
            </select>

            {/* Manager Filter */}
            <select
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none font-mono"
            >
              <option value="all">Все менеджеры</option>
              <option value="unassigned">Не назначенные (внешние)</option>
              {MANAGERS.map(m => (
                <option key={m.name} value={m.name}>{m.name.split(' ')[0]}</option>
              ))}
            </select>

            {/* Reset buttons */}
            {(statusFilter !== 'all' || managerFilter !== 'all' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setManagerFilter('all');
                  setSearchFilter('');
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 font-medium text-[10px] uppercase font-mono tracking-wider">
                <th className="py-2.5 px-3">Код</th>
                <th className="py-2.5 px-3">Статус</th>
                <th className="py-2.5 px-3 max-w-[120px] truncate">Гость</th>
                <th className="py-2.5 px-3">Заезд / Выезд</th>
                <th className="py-2.5 px-3">Категория</th>
                <th className="py-2.5 px-3">Источник</th>
                <th className="py-2.5 px-3">Продажник</th>
                <th className="py-2.5 px-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs font-mono text-zinc-300">
              {processedBookings.length > 0 ? (
                processedBookings.map(b => {
                  const isCancelled = b.cancelDate !== null && b.cancelDate !== '-';
                  return (
                    <tr key={b.code} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{b.code}</td>
                      <td className="py-2.5 px-3">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                            Отменено ({b.cancelDate})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            Активно
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-zinc-200 truncate max-w-[150px]" title={b.guest}>
                        {b.guest}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 text-[11px]">
                        {b.checkIn} <span className="text-zinc-600">→</span> {b.checkOut}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{b.category}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{b.source}</td>
                      <td className="py-2.5 px-3">
                        {b.manager ? (
                          <span className="text-neutral-200 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/20 rounded-full text-[10px]">
                            👤 {b.manager.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">Не назначен (Bnovo)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {formatCurrency(b.total)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 text-xs">
                    Записи, соответствующие выбранным фильтрам, не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Counter of lines */}
        <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-4 border-t border-zinc-900 pt-3">
          <span>Показано: {processedBookings.length} из {filteredBookingsByPeriod.length} записей за выбранный период</span>
          <span>Базовый отель: Южные Склоны</span>
        </div>

      </div>
    </div>
  );
}
