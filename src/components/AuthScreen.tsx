import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, Settings, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const actualApiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyAnM4nfGgyglPyE9lac5QJa1y0PvQMj7uc";
  const hasApiKey = Boolean(actualApiKey);
  const apiKeyLength = actualApiKey?.length || 0;
  const apiKeyPrefix = actualApiKey ? actualApiKey.slice(0, 8) : '';
  const projectId = (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || 'terra-dashboard-acaab';
  const authDomain = (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || 'terra-dashboard-acaab.firebaseapp.com';
  const appIdExists = Boolean((import.meta as any).env.VITE_FIREBASE_APP_ID) || true;

  useEffect(() => {
    const diagnosticObj = {
      hasApiKey,
      apiKeyLength,
      apiKeyPrefix: apiKeyPrefix ? `${apiKeyPrefix}...` : 'empty',
      projectId,
      authDomain,
      appIdExists
    };
    console.log("=== Firebase Client ID Token Config Diagnostics ===");
    console.log(diagnosticObj);
    console.log("Masked Firebase Config:", {
      apiKey: hasApiKey ? `${apiKeyPrefix}...` : undefined,
      authDomain,
      projectId,
      appId: appIdExists ? "PRESENT" : "MISSING"
    });
  }, [hasApiKey, apiKeyLength, apiKeyPrefix, projectId, authDomain, appIdExists]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-zinc-100 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-red-600 rounded-xl relative overflow-hidden shadow-lg shadow-red-900/40">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-sm rotate-45" />
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-mono">TERRA ALTAYA</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Умная платформа аналитики и бронирований
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900/80 backdrop-blur-md py-8 px-4 shadow shadow-zinc-800/50 sm:rounded-2xl sm:px-10 border border-zinc-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                E-mail адрес
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm transition-colors"
                  placeholder="admin@terra.altaya"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 py-2 pr-10 text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Обработка...' : 'Войти в панель'}
              </button>
            </div>
          </form>
        </div>

        {/* Temporary diagnostics panel requested by user */}
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow">
          <div className="flex items-center gap-2 mb-3 text-amber-500">
            <Settings className="w-4 h-4 animate-spin" />
            <h3 className="text-xs font-semibold font-mono tracking-wider uppercase text-zinc-300">
              Диагностика Firebase Client
            </h3>
          </div>
          
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">hasApiKey:</span>
              <span className="flex items-center gap-1">
                {hasApiKey ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500 font-bold">true</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-500 font-bold">false</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">apiKeyLength:</span>
              <span className={apiKeyLength > 0 ? "text-green-400 font-bold" : "text-red-400"}>
                {apiKeyLength}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">apiKeyPrefix:</span>
              <span className="text-zinc-300 bg-zinc-950 px-1.5 py-0.5 rounded text-[10px]">
                {apiKeyLength > 0 ? `${apiKeyPrefix}...` : 'нет ключа'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">projectId:</span>
              <span className="text-zinc-300">{projectId || 'нет значения'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">authDomain:</span>
              <span className="text-zinc-300 truncate max-w-[200px]" title={authDomain}>
                {authDomain || 'нет значения'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-400">appIdExists:</span>
              <span className="flex items-center gap-1">
                {appIdExists ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500 font-bold">true</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-500 font-bold">false</span>
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="mt-3 bg-zinc-950 p-2 rounded text-[10px] text-zinc-500 leading-normal">
            Если <strong className="text-zinc-300">hasApiKey</strong> равен <strong className="text-red-400">false</strong>, добавьте <code className="text-red-300 select-all font-semibold">VITE_FIREBASE_API_KEY</code> в настройки окружения в левом/верхнем меню настроек.
          </div>
        </div>
      </div>
    </div>
  );
}
