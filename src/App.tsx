import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardScreen from './components/DashboardScreen';
import CalendarScreen from './components/CalendarScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import ForecastScreen from './components/ForecastScreen';
import ImportScreen from './components/ImportScreen';
import MappingScreen from './components/MappingScreen';
import TariffsScreen from './components/TariffsScreen';
import LogsScreen from './components/LogsScreen';
import ExportScreen from './components/ExportScreen';

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
  X
} from 'lucide-react';
import { ImportRun, CorrectionLog, CategoryMapping } from './types';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Server state storage
  const [dbState, setDbState] = useState<any>(null);
  const [summaryState, setSummaryState] = useState<any>(null);
  const [calendarMetrics, setCalendarMetrics] = useState<any[]>([]);
  const [dashboardState, setDashboardState] = useState<any>(null);

  // Navigation states
  const [isLoading, setIsLoading] = useState(true);

  // Floating notifications toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4050);
  };

  // Central sync function
  const refreshAllState = () => {
    setIsLoading(true);
    // Fetch DB states
    const p1 = fetch('/api/db')
      .then(res => res.json())
      .then(data => {
        setDbState(data.db);
        setSummaryState(data.summary);
      });

    // Fetch Calendar summary metrics
    const p2 = fetch('/api/calendar-metrics')
      .then(res => res.json())
      .then(data => {
        setCalendarMetrics(data.metrics);
      });

    // Fetch compiled dashboard analytical aggregations
    const p3 = fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardState(data);
      });

    Promise.all([p1, p2, p3])
      .catch(err => {
        console.error('Core synchronizations failed', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Run on start
  useEffect(() => {
    refreshAllState();
  }, []);

  // Sandbox: Toggle between Admin and Viewer role profiles
  const toggleRole = () => {
    fetch('/api/role/toggle', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        showToast(`Профиль изменен на: ${data.role === 'Admin' ? 'Администратор' : 'Наблюдатель'}`);
        refreshAllState();
      });
  };

  // Sandbox: Populate full simulation demo dataset
  const triggerDemoLoad = () => {
    if (!confirm('Вы хотите перезаписать текущие данные демонстрационными? Это займет секунду.')) return;
    setIsLoading(true);
    fetch('/api/db/demo', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        showToast('Демонстрационная модель Терра Алтая успешно загружена!');
        refreshAllState();
      });
  };

  // Sandbox: Flush database entirely to blank empty initial states
  const triggerPurge = () => {
    if (!confirm('Внимание! Все загруженные файлы годовых отчетов, ручные изменения тарифов и связи категорий будут безвозвратно удалены. Продолжить?')) return;
    setIsLoading(true);
    fetch('/api/db/clear', { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        showToast('База данных полностью сброшена в исходное состояние!');
        refreshAllState();
      });
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
  
  const imports: ImportRun[] = dbState?.imports || [];
  const logs: CorrectionLog[] = dbState?.correctionLog || [];
  const mappings: CategoryMapping[] = dbState?.mappings || [];

  const hasRevenue = summaryState?.hasRevenue || false;
  const hasPrices = summaryState?.hasPrices || false;

  // Extract category lists
  const reportCategories = dbState ? Array.from(new Set<string>(dbState.revenueData.map((r: any) => r.sourceCategory))) : [];
  const priceListCategories = dbState ? Array.from(new Set<string>(dbState.priceData.map((p: any) => p.category))) : [];

  // Derive unmapped categories count
  const unmappedCount = reportCategories.filter(
    rc => !mappings.find((m: any) => m.reportCategory === rc && m.priceListCategory !== '')
  ).length;

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] selection:bg-red-600 selection:text-white font-sans">
      
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* TAB WORKSPACE NAVIGATOR RAIL */}
        <div className="flex bg-[#0A0A0A] p-1.5 rounded-xl border border-[#1F1F1F] mb-8 font-semibold overflow-x-auto gap-1.5 scrollbar-thin">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Главная сводка</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Календарь потерь</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Анализ продаж</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'forecast'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Прогнозы рисков</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'import'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            } ${isAdmin ? '' : 'opacity-70'}`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Импорт Excel</span>
            <span className="text-[9px] px-1 py-0.5 bg-zinc-800 rounded font-normal text-zinc-400 hidden sm:inline">Админ</span>
          </button>

          <button
            onClick={() => setActiveTab('mappings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'mappings'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            } ${unmappedCount > 0 ? 'ring-1 ring-red-500' : ''}`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Соответствия</span>
            {unmappedCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[9px] text-white font-bold">{unmappedCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tariffs')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tariffs'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Тарифная сетка</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Журнал коррекций</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'export'
                ? 'bg-red-600 border border-red-700 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            <span>Выгрузки</span>
          </button>

        </div>

        {/* LOADING SHIM */}
        {isLoading && (
          <div className="relative py-12 text-center text-zinc-500 bg-[#050505]">
            <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-red-600 border-[#1F1F1F]" />
            <p className="text-xs text-zinc-500 font-mono mt-1">Переподключение и вычисление финансовых моделей...</p>
          </div>
        )}

        {/* PRIMARY PANES CONTROLLERS */}
        <div className={isLoading ? 'opacity-30 pointer-events-none transition-all' : 'transition-all'}>
          {activeTab === 'dashboard' && (
            <DashboardScreen
              data={dashboardState || { hasData: false }}
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
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsScreen categoriesList={reportCategories} />
          )}

          {activeTab === 'forecast' && <ForecastScreen />}

          {activeTab === 'import' && (
            <ImportScreen
              importsList={imports}
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
  );
}
