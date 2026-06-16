import React, { useState } from 'react';
import { Shield, Eye, RefreshCw, Layers, Database, Compass, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface HeaderProps {
  role: 'Admin' | 'Viewer';
  onToggleRole: () => void;
  onLoadDemo: () => void;
  onClearDb: () => void;
  hasRevenue: boolean;
  hasPrices: boolean;
}

export default function Header({
  role,
  onToggleRole,
  onLoadDemo,
  onClearDb,
  hasRevenue,
  hasPrices
}: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error', e);
    }
    setIsLoggingOut(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1F1F1F] bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-tr from-red-600 to-orange-400 rounded-md shadow-lg shadow-red-900/20 shrink-0"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-widest text-[#71717A] uppercase">Revenue Intelligence</span>
              <span className="inline-flex items-center rounded-full bg-[#1F1F1F] px-1.5 py-0.5 text-[8px] font-medium text-zinc-400">v1.2</span>
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              Terra Altaya <span className="text-zinc-500 font-normal">Intelligence</span>
            </h1>
          </div>
        </div>

        {/* Status flags & Configuration stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-full bg-[#0F0F0F] border border-[#1F1F1F] px-3 py-1 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${hasRevenue ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
            <span className="text-zinc-400">Отчет Bnovo:</span>
            <span className={`font-medium ${hasRevenue ? 'text-zinc-200' : 'text-zinc-500'}`}>
              {hasRevenue ? 'Активен' : 'Отсутствует'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-[#0F0F0F] border border-[#1F1F1F] px-3 py-1 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${hasPrices ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
            <span className="text-zinc-400">Прайслист XLSX:</span>
            <span className={`font-medium ${hasPrices ? 'text-zinc-200' : 'text-zinc-500'}`}>
              {hasPrices ? 'Активен' : 'Отсутствует'}
            </span>
          </div>
        </div>

        {/* Controls, roles, demo widgets */}
        <div className="flex items-center gap-2.5">
          {/* Quick Sandbox Tools */}
          <div className="flex items-center border border-[#1F1F1F] rounded-lg p-0.5 bg-[#0F0F0F]">
            <button
              onClick={onLoadDemo}
              title="Загрузить демонстрационные данные для демонстрации"
              className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-white transition-all flex items-center gap-1 hover:bg-zinc-900"
            >
              <Database className="h-3 w-3 text-orange-400" />
              <span>Демо</span>
            </button>
            <button
              onClick={onClearDb}
              title="Очистить базу данных для проверки пустых состояний"
              className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-red-400 transition-all flex items-center gap-1 hover:bg-zinc-900"
            >
              <RefreshCw className="h-3 w-3 text-red-500/70" />
              <span>Очистить</span>
            </button>
          </div>

          {/* Role Changer Toggle */}
          <button
            onClick={onToggleRole}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
              role === 'Admin'
                ? 'bg-white text-black border-zinc-200 hover:bg-zinc-200 shadow-md shadow-black/10'
                : 'bg-[#0F0F0F] text-zinc-300 border-[#1F1F1F] hover:bg-zinc-900'
            }`}
          >
            {role === 'Admin' ? (
              <>
                <Shield className="h-3.5 w-3.5 text-green-600" />
                <span className="hidden sm:inline">Администратор</span>
                <span className="sm:hidden">Админ</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-zinc-500" />
                <span>Наблюдатель</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Выйти"
            className="flex items-center justify-center p-2 rounded-lg border border-[#1F1F1F] bg-[#0F0F0F] text-zinc-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/50 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
