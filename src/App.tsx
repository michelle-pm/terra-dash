import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { auth, isFirebaseConfigMissing, rtdb } from './firebase';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import DashboardScreen from './components/DashboardScreen';
import CalendarScreen from './components/CalendarScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import ForecastScreen from './components/ForecastScreen';
import MarketingScreen from './components/MarketingScreen';
import BookingsScreen from './components/BookingsScreen';
import ImportScreen from './components/ImportScreen';
import MappingScreen from './components/MappingScreen';
import TariffsScreen from './components/TariffsScreen';
import LogsScreen from './components/LogsScreen';
import ExportScreen from './components/ExportScreen';
import UsersScreen from './components/UsersScreen';
import {
  compileCalendarMetrics,
  compileDashboardState,
  getInitialDatabase,
  populateDemoData
} from './lib/clientDbEngine';

import {
  Compass,
  Calendar as CalendarIcon,
  BarChart3,
  Sparkles,
  UploadCloud,
  Layers,
  Settings,
  History,
  DownloadCloud,
  CheckCircle2,
  X,
  Target,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutGrid,
  Users
} from 'lucide-react';
import { ImportRun, CorrectionLog, CategoryMapping } from './types';

// Start of App
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Server state storage
  const [dbState, setDbState] = useState<any>(null);
  const [summaryState, setSummaryState] = useState<any>(null);
  const [calendarMetrics, setCalendarMetrics] = useState<any[]>([]);
  const [dashboardState, setDashboardState] = useState<any>(null);

  // Navigation states
  const [isLoading, setIsLoading] = useState(true);

  // Floating notifications toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4050);
  };

  // Central sync function
  const refreshAllState = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const snap = await get(ref(rtdb, 'properties/terra_altaya'));
      const rawDb = snap.exists() ? snap.val() : {};
      const defaults = getInitialDatabase();

      const db = {
        ...defaults,
        ...rawDb,
        imports: Array.isArray(rawDb.imports)
          ? rawDb.imports
          : rawDb.imports && typeof rawDb.imports === 'object'
            ? Object.values(rawDb.imports)
            : defaults.imports,
        revenueData: Array.isArray(rawDb.revenueData) ? rawDb.revenueData : defaults.revenueData,
        priceData: Array.isArray(rawDb.priceData) ? rawDb.priceData : defaults.priceData,
        bookings: Array.isArray(rawDb.bookings) ? rawDb.bookings : defaults.bookings,
        mappings: Array.isArray(rawDb.mappings) ? rawDb.mappings : defaults.mappings,
        correctionLog: Array.isArray(rawDb.correctionLog) ? rawDb.correctionLog : defaults.correctionLog,
        tariffs: rawDb.tariffs && typeof rawDb.tariffs === 'object' ? rawDb.tariffs : defaults.tariffs,
        role: rawDb.role || 'Admin'
      };

      const summary = {
        importsCount: db.imports.length,
        revenueRows: db.revenueData.length,
        priceRows: db.priceData.length,
        mappingsCount: db.mappings.length,
        hasRevenue: db.revenueData.length > 0,
        hasPrices: db.priceData.length > 0
      };

      setDbState(db);
      setSummaryState(summary);
      setCalendarMetrics(compileCalendarMetrics(db));
      setDashboardState(compileDashboardState(db));
    } catch (err) {
      console.error('Core Firebase synchronization failed', err);

      const db = getInitialDatabase();

      setDbState(db);
      setSummaryState({
        importsCount: 0,
        revenueRows: 0,
        priceRows: 0,
        mappingsCount: db.mappings.length,
        hasRevenue: false,
        hasPrices: false
      });
      setCalendarMetrics([]);
      setDashboardState({ hasData: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Run on start and when user becomes available
  useEffect(() => {
    if (user) {
      refreshAllState();
    }
  }, [user]);

  if (isFirebaseConfigMissing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-[#EDEDED] font-sans">
        <div className="max-w-md w-full bg-[#0A0A0A] border border-red-500/35 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-600" />
          <div className="flex flex-col items-center text-center">
            <span className="p-3 bg-red-500/10 rounded-full text-red-500 mb-4 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h1 className="text-lg font-bold text-white mb-2">Отсутствует VITE_FIREBASE_API_KEY</h1>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              В конфигурации клиента отсутствует переменная окружения <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-red-400 font-mono">VITE_FIREBASE_API_KEY</code>. Пожалуйста, сопоставьте API-ключ Firebase клиента в настройках.
            </p>
            <div className="w-full text-left bg-zinc-900/60 rounded-lg p-3.5 border border-zinc-800 text-[11px] text-zinc-400 space-y-2 leading-relaxed">
              <p className="font-mono text-zinc-300">Добавьте в глобальные настройки или файл .env:</p>
              <pre className="font-mono text-xs text-red-400 overflow-x-auto select-all p-1.5 bg-[#050505] rounded">VITE_FIREBASE_API_KEY=ваш_api_key</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authInitialized) {
     return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Загрузка...</div>;
  }

  if (!user) {
     return <AuthScreen />;
  }

  // Sandbox: Toggle between Admin and Viewer role profiles
  const toggleRole = async () => {
    const nextRole = role === 'Admin' ? 'Viewer' : 'Admin';
    const nextDb = { ...(dbState || getInitialDatabase()), role: nextRole };

    await set(ref(rtdb, 'properties/terra_altaya'), nextDb);

    showToast(`Профиль изменен на: ${nextRole === 'Admin' ? 'Администратор' : 'Наблюдатель'}`);
    refreshAllState();
  };

  // Sandbox: Populate full simulation demo dataset
  const triggerDemoLoad = async () => {
    if (!confirm('Вы хотите перезаписать текущие данные демонстрационными? Это займет секунду.')) return;

    setIsLoading(true);

    const demoDb = { ...populateDemoData(), role };
    await set(ref(rtdb, 'properties/terra_altaya'), demoDb);

    showToast('Демонстрационная модель Терра Алтая успешно загружена!');
    refreshAllState();
  };

  // Sandbox: Flush database entirely to blank empty initial states
  const triggerPurge = async () => {
    if (!confirm('Внимание! Все загруженные файлы годовых отчетов, ручные изменения тарифов и связи категорий будут безвозвратно удалены. Продолжить?')) return;

    setIsLoading(true);

    await set(ref(rtdb, 'properties/terra_altaya'), { ...getInitialDatabase(), role });

    showToast('База данных полностью сброшена в исходное состояние!');
    refreshAllState();
  };

  const handleUpdateMappings = () => {
    showToast('Соответствия категорий успешно обновлены!');
    refreshAllState();
  };

  if (isLoading && !dbState) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-400">
        <span className="animate-spin rounded-full h-12 w-12 border-4 border-t-red-600 border-[#1F1F1F] mb-4" />
        <h2 className="text-sm font-mono tracking-widest uppercase text-zinc-500">Загрузка репозиториев отеля...</h2>
      </div>
    );
  }

  // Extract variables safely
  const role = dbState?.role || 'Admin';
  const isAdmin = role === 'Admin';
  
  const imports: ImportRun[] = Array.isArray(dbState?.imports)
    ? dbState.imports
    : (dbState?.imports && typeof dbState.imports === 'object')
      ? Object.values(dbState.imports) as ImportRun[]
      : [];
  const logs: CorrectionLog[] = dbState?.correctionLog || [];
  const mappings: CategoryMapping[] = dbState?.mappings || [];

  const hasRevenue = summaryState?.hasRevenue || false;
  const hasPrices = summaryState?.hasPrices || false;

  // Extract category lists
  const reportCategories = (dbState && Array.isArray(dbState.revenueData)) ? Array.from(new Set<string>(dbState.revenueData.map((r: any) => r.sourceCategory))) : [];
  const priceListCategories = (dbState && Array.isArray(dbState.priceData)) ? Array.from(new Set<string>(dbState.priceData.map((p: any) => p.category))) : [];

  // Derive unmapped categories count
  const unmappedCount = reportCategories.filter(
    rc => !mappings.find((m: any) => m.reportCategory === rc && m.priceListCategory !== '')
  ).length;

  const tabGroups = [
    {
      title: 'Аналитика и Сводка',
      items: [
        { id: 'dashboard', name: 'Главная сводка', icon: Compass },
        { id: 'calendar', name: 'Календарь потерь', icon: CalendarIcon },
        { id: 'analytics', name: 'Анализ продаж', icon: BarChart3 },
        { id: 'forecast', name: 'Прогнозы рисков', icon: Sparkles },
      ]
    },
    {
      title: 'Бизнес',
      items: [
        { id: 'bookings', name: 'Бронирования', icon: UserCheck },
        { id: 'marketing', name: 'Реклама', icon: Target },
      ]
    },
    {
      title: 'Настройки и Импорт',
      items: [
        { id: 'import', name: 'Импорт Excel', icon: UploadCloud, badge: isAdmin ? undefined : 'Наблюдатель' },
        { id: 'mappings', name: 'Соответствия', icon: Layers, badge: unmappedCount > 0 ? unmappedCount : undefined, attention: unmappedCount > 0 },
        { id: 'tariffs', name: 'Тарифная сетка', icon: Settings },
        { id: 'users', name: 'Управление ролями', icon: Users },
        { id: 'logs', name: 'Журнал коррекций', icon: History },
        { id: 'export', name: 'Выгрузки', icon: DownloadCloud },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-transparent text-[#EDEDED] selection:bg-red-600 selection:text-white font-sans">
      
      {/* Central Notification Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-red-500/25 bg-[#0A0A0A]/95 p-4 shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md max-w-sm">
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          <div className="text-xs text-zinc-300 font-medium leading-relaxed">{toastMessage}</div>
          <button onClick={() => setToastMessage(null)} className="text-zinc-600 hover:text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CORE APPLICATION HEADER */}
      <Header
        role={role}
        onToggleRole={toggleRole}
        onLoadDemo={triggerDemoLoad}
        onClearDb={triggerPurge}
        hasRevenue={hasRevenue}
        hasPrices={hasPrices}
      />

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* SIDEBAR FOR DESKTOP */}
          <aside className={`shrink-0 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          } hidden md:block glass-panel rounded-xl p-3 h-auto sticky top-20`}>
            
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center mb-4' : 'justify-between mb-4 pb-2 border-b border-[#1F1F1F]'}`}>
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-1.5 px-1">
                  <LayoutGrid className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Навигация</span>
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 rounded-md bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <nav className="space-y-4">
              {tabGroups.map(group => (
                <div key={group.title} className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-2.5 pt-2 pb-1">
                      {group.title}
                    </div>
                  )}
                  {isSidebarCollapsed && (
                    <div className="h-px bg-zinc-900 my-2" />
                  )}
                  
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center transition-all px-2.5 py-2 rounded-lg text-xs cursor-pointer ${
                            isSidebarCollapsed ? 'justify-center' : 'justify-between'
                          } ${
                            isActive
                              ? 'bg-red-600 border border-red-700 text-white shadow-lg font-medium'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                          }`}
                          title={isSidebarCollapsed ? item.name : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!isSidebarCollapsed && <span className="font-medium">{item.name}</span>}
                          </div>
                          
                          {!isSidebarCollapsed && item.badge !== undefined && (
                            <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold ${
                              item.attention ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* MOBILE TOGGLER & DROP DOWN */}
          <div className="md:hidden w-full glass-panel rounded-xl p-2.5 mb-2">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-950 hover:bg-zinc-905 border border-[#1F1F1F] rounded-lg text-xs font-semibold text-zinc-200"
              >
                <Menu className="h-4 w-4 text-red-500" />
                <span>Разделы меню</span>
              </button>
              <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-[#1F1F1F] px-3 py-1.5 rounded-lg text-xs leading-none">
                <span className="text-zinc-500 font-medium">Экран:</span>
                <span className="text-red-400 font-bold">
                  {tabGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.name || activeTab}
                </span>
              </div>
            </div>

            {isMobileMenuOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-[#1F1F1F] space-y-3">
                {tabGroups.map(group => (
                  <div key={group.title} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 pt-1">
                      {group.title}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all text-left cursor-pointer ${
                              isActive
                                ? 'bg-red-600 text-white font-medium'
                                : 'bg-zinc-950/40 hover:bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTENT WORKSPACE AREA */}
          <div className="flex-1 w-full min-w-0">
            
            {/* LOADING SHIM */}
            {isLoading && (
              <div className="relative py-12 text-center text-zinc-500 bg-[#050505] rounded-xl border border-[#1F1F1F] mb-6">
                <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-red-600 border-[#1F1F1F]" />
                <p className="text-xs text-zinc-500 font-mono mt-1">Переподключение и вычисление финансовых моделей...</p>
              </div>
            )}

            <div className={isLoading ? 'opacity-30 pointer-events-none transition-all' : 'transition-all'}>
              {activeTab === 'dashboard' && (
                <DashboardScreen
                  data={dashboardState || { hasData: false }}
                  dbState={dbState}
                  onNavigateToTab={setActiveTab}
                  onLoadDemo={triggerDemoLoad}
                  hasRevenue={hasRevenue}
                  hasPrices={hasPrices}
                  unmappedCount={unmappedCount}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarScreen
                  metrics={calendarMetrics}
                  isAdmin={isAdmin}
                  onNavigateToTab={setActiveTab}
                  dbState={dbState}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsScreen categoriesList={reportCategories} dbState={dbState} />
              )}

              {activeTab === 'forecast' && <ForecastScreen dbState={dbState} />}

              {activeTab === 'bookings' && <BookingsScreen />}

              {activeTab === 'marketing' && <MarketingScreen />}

              {activeTab === 'import' && (
                <ImportScreen
                  importsList={imports}
                  dbState={dbState}
                  isAdmin={isAdmin}
                  onRefreshAll={refreshAllState}
                  onShowSuccessToast={showToast}
                />
              )}

              {activeTab === 'mappings' && (
                <MappingScreen
                  reportCategories={reportCategories}
                  priceListCategories={priceListCategories}
                  mappings={mappings}
                  isAdmin={isAdmin}
                  onUpdateMappings={handleUpdateMappings}
                />
              )}

              {activeTab === 'tariffs' && (
                <TariffsScreen
                  categoriesList={priceListCategories}
                  isAdmin={isAdmin}
                  onRefreshAll={refreshAllState}
                  onShowSuccessToast={showToast}
                />
              )}

              {activeTab === 'users' && (
                <UsersScreen
                  currentUserEmail={user.email}
                  onShowSuccessToast={showToast}
                />
              )}

              {activeTab === 'logs' && <LogsScreen logs={logs} />}

              {activeTab === 'export' && (
                <ExportScreen
                  logsList={logs}
                  importsList={imports}
                  hasRevenue={hasRevenue}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
