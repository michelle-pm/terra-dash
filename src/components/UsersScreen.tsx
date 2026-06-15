import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Users, Trash2, CheckCircle2, UserCheck, Search, Loader2, ArrowRightLeft, ShieldX } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'Admin' | 'Viewer';
  creationTime?: string;
  lastSignInTime?: string;
}

interface UsersScreenProps {
  currentUserEmail: string | null;
  onShowSuccessToast: (msg: string) => void;
}

export default function UsersScreen({ currentUserEmail, onShowSuccessToast }: UsersScreenProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const mainOwnerEmail = 'pm.michelle.kreps@gmail.com';
  const isOwner = currentUserEmail?.toLowerCase().trim() === mainOwnerEmail;

  const fetchUsers = () => {
    setIsLoading(true);
    setError(null);
    apiFetch('/api/admin/users')
      .then((res) => {
        if (!res.ok) {
          throw new Error('У вас нет прав для просмотра списка пользователей, либо сессия истекла.');
        }
        return res.json();
      })
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        } else {
          setUsers([]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Ошибка загрузки пользователей.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = (targetUid: string, email: string, currentRole: 'Admin' | 'Viewer') => {
    if (!isOwner) {
      alert('Внимание: Только главный управляющий аккаунт (pm.michelle.kreps@gmail.com) имеет полномочия изменять роли.');
      return;
    }

    if (email.toLowerCase().trim() === mainOwnerEmail) {
      alert('Невозможно понизить роль главного управляющего аккаунта.');
      return;
    }

    const newRole = currentRole === 'Admin' ? 'Viewer' : 'Admin';
    const confirmMsg = `Вы уверены, что хотите перевести пользователя "${email}" из статуса "${
      currentRole === 'Admin' ? 'Администратор' : 'Наблюдатель'
    }" в статус "${newRole === 'Admin' ? 'Администратор' : 'Наблюдатель'}"?`;

    if (!confirm(confirmMsg)) return;

    setUpdatingUid(targetUid);
    apiFetch('/api/admin/users/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetUid, newRole }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Ошибка обновления роли.');
        }
        onShowSuccessToast(`Роль пользователя успешно изменена на "${newRole === 'Admin' ? 'Администратор' : 'Наблюдатель'}"!`);
        fetchUsers();
      })
      .catch((err) => {
        alert(err.message || 'Сбой на сервере при обновлении роли.');
      })
      .finally(() => {
        setUpdatingUid(null);
      });
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold">Окружение Системы</span>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            <span>Управление ролями и доступом</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Распределение полномочий пользователей отеля Терра Алтай. Администраторы могут изменять тарифы и загружать данные, Наблюдатели имеют права только на чтение.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2 text-zinc-300">
            <Shield className="h-3.5 w-3.5 text-zinc-400" />
            <span>Ваш аккаунт: <strong className="text-white font-bold">{currentUserEmail || 'N/A'}</strong></span>
          </div>
          {isOwner ? (
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 text-center">
              ♛ Главный аккаунт управления
            </span>
          ) : (
            <span className="text-[10px] text-amber-500 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15 text-center flex items-center justify-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Только просмотр ролей
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/35 bg-red-500/5 text-red-400 text-xs leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <div>
            <span className="font-bold">Ошибка авторизации:</span> {error}
            <button onClick={fetchUsers} className="underline ml-2 hover:text-white font-medium">Попробовать снова</button>
          </div>
        </div>
      )}

      {/* SEARCH AND CONTROL BAR */}
      <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск пользователей по почте или имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-xs font-semibold placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors text-white"
          />
        </div>
        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-3.5 py-2 text-xs font-semibold bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 active:bg-zinc-950 rounded-lg transition-all text-zinc-300 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Обновить</span>}
        </button>
      </div>

      {/* USER LIST CARDS */}
      {isLoading ? (
        <div className="py-24 text-center rounded-2xl border border-zinc-900 bg-zinc-950/10 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin mb-3" />
          <p className="text-xs font-mono text-zinc-500">Запрос списка пользователей в базе данных...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-zinc-900 bg-zinc-950/20">
          <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-mono text-zinc-500">Пользователи не найдены.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/20">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950 text-[10px] font-mono font-bold tracking-wider text-zinc-400">
                  <th className="p-4">Пользователь (Email)</th>
                  <th className="p-4">Отображаемое имя</th>
                  <th className="p-4">Дата регистрации</th>
                  <th className="p-4">Текущая роль</th>
                  <th className="p-4 text-right">Управление статусом</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-sans text-xs">
                {filteredUsers.map((u) => {
                  const isUserOwner = u.email.toLowerCase().trim() === mainOwnerEmail;
                  const isCurrentUser = u.email.toLowerCase().trim() === currentUserEmail?.toLowerCase().trim();
                  
                  return (
                    <tr key={u.uid} className="hover:bg-zinc-900/15 transition-all group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white tracking-tight">{u.email}</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">UID: {u.uid}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-zinc-300 font-medium">{u.displayName}</span>
                      </td>
                      <td className="p-4 text-zinc-400 font-mono">
                        {u.creationTime ? new Date(u.creationTime).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'Не зафиксирована'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'Admin'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {u.role === 'Admin' ? (
                            <>
                              <Shield className="h-3 w-3 shrink-0 text-red-400" />
                              <span>Администратор</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="h-3 w-3 shrink-0 text-zinc-500" />
                              <span>Наблюдатель (Viewer)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isUserOwner ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                            Владелец системы
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.uid, u.email, u.role)}
                            disabled={!isOwner || updatingUid === u.uid}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              !isOwner 
                                ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' 
                                : u.role === 'Admin'
                                  ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 hover:text-amber-500 text-zinc-400'
                                  : 'bg-red-950/20 border-red-500/20 hover:bg-red-950/40 hover:border-red-500/40 text-red-400'
                            }`}
                            title={!isOwner ? "Только главный аккаунт (pm.michelle.kreps@gmail.com) может изменять роли." : undefined}
                          >
                            {updatingUid === u.uid ? (
                              <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                            ) : (
                              <>
                                <ArrowRightLeft className="h-3 w-3" />
                                <span>{u.role === 'Admin' ? 'Перевести в Наблюдателя' : 'Сделать Администратором'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOOTER INFORMATIONAL BLOCK */}
      <div className="p-4.5 rounded-xl border border-zinc-900 bg-zinc-950/40 font-mono text-[10px] leading-relaxed text-zinc-500 space-y-1">
        <h4 className="text-xs font-semibold text-zinc-400 font-sans mb-1.5">Правила разграничения прав доступа:</h4>
        <p>• <strong className="text-zinc-400">Администратор (Admin):</strong> Доступен полный функционал — импорт годовых и броневых еженедельных Excel отчетов Bnovo, ручное переназначение тарифов, обновление маппинга номеров, очистка данных.</p>
        <p>• <strong className="text-zinc-400">Наблюдатель (Viewer):</strong> Доступен только просмотр и навигация по аналитическим дашбордам, календарю потерь и графикам. Все действия по замене и импорту данных скрыты или заблокированы.</p>
        <p>• <strong className="text-zinc-400">Владелец (pm.michelle.kreps@gmail.com):</strong> Обладает сверхполномочиями и является единственным лицом, способным назначать и снимать статус Администратора.</p>
      </div>

    </div>
  );
}
