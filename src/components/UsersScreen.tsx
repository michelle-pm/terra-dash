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
    const emailMatch = u.email?.toLowerCase().includes(q) || false;
    const nameMatch = u.displayName?.toLowerCase().includes(q) || false;
    return emailMatch || nameMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#7C5CFF] font-bold">Панель Управления</span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-1">
            <Users className="h-5 w-5 text-[#7C5CFF]" />
            <span>Управление ролями и доступом</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1.5 font-normal leading-relaxed">
            Распределение полномочий пользователей отеля Терра Алтай. Администраторы могут изменять тарифы и загружать данные, Наблюдатели имеют права только на чтение.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 shrink-0 self-start xl:self-center">
          <div className="text-xs font-semibold px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-zinc-300">
            <Shield className="h-4 w-4 text-[#7C5CFF]" />
            <span>Ваш аккаунт: <strong className="text-white font-bold">{currentUserEmail || 'N/A'}</strong></span>
          </div>
          {isOwner ? (
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/15 text-center">
              ♛ Главный аккаунт управления
            </span>
          ) : (
            <span className="text-[10px] text-[#FFB020] font-mono font-bold bg-[#FFB020]/10 px-3 py-1 rounded-lg border border-[#FFB020]/15 text-center flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Только просмотр ролей
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-[#FF2D63]/30 bg-[#FF2D63]/5 text-[#FF2D63] text-xs leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Ошибка авторизации:</span> {error}
            <button onClick={fetchUsers} className="underline ml-2 hover:text-white font-medium cursor-pointer">Попробовать снова</button>
          </div>
        </div>
      )}

      {/* SEARCH AND CONTROL BAR */}
      <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск пользователей по почте или имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs font-semibold placeholder-[#71717A] focus:outline-none focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF] transition-colors text-white"
          />
        </div>
        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:bg-white/5 rounded-lg transition-all text-zinc-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C5CFF]" /> : <span>Обновить</span>}
        </button>
      </div>

      {/* USER LIST CARDS */}
      {isLoading ? (
        <div className="py-24 text-center rounded-2xl border border-white/5 bg-black/20 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#7C5CFF] animate-spin mb-3" />
          <p className="text-xs font-mono text-[#71717A]">Запрос списка пользователей в базе данных...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-white/5 bg-black/20">
          <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-mono text-[#71717A]">Пользователи не найдены.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-mono font-bold tracking-wider text-[#A1A1AA] uppercase">
                  <th className="p-4">Пользователь (Email)</th>
                  <th className="p-4">Отображаемое имя</th>
                  <th className="p-4">Дата регистрации</th>
                  <th className="p-4">Текущая роль</th>
                  <th className="p-4 text-right">Управление статусом</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans text-xs">
                {filteredUsers.map((u) => {
                  const isUserOwner = u.email?.toLowerCase().trim() === mainOwnerEmail;
                  
                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.01] transition-all group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white tracking-tight">{u.email}</span>
                          <span className="text-[10px] text-[#71717A] font-mono mt-0.5">UID: {u.uid}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[#A1A1AA] font-semibold">{u.displayName || 'Не указано'}</span>
                      </td>
                      <td className="p-4 text-[#A1A1AA] font-mono">
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
                            ? 'bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/15'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {u.role === 'Admin' ? (
                            <>
                              <Shield className="h-3 w-3 shrink-0" />
                              <span>Администратор</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="h-3 w-3 shrink-0" />
                              <span>Наблюдатель (Viewer)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isUserOwner ? (
                          <span className="text-[10px] font-mono text-[#00E09D] font-bold bg-[#00E09D]/10 px-2.5 py-1 rounded-lg border border-[#00E09D]/20">
                            Владелец системы
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.uid, u.email, u.role)}
                            disabled={!isOwner || updatingUid === u.uid}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              !isOwner 
                                ? 'bg-white/[0.01] border-white/5 text-zinc-600 cursor-not-allowed opacity-50' 
                                : u.role === 'Admin'
                                  ? 'bg-black border-white/5 hover:bg-white/5 hover:border-white/10 hover:text-[#FFB020] text-zinc-300'
                                  : 'bg-[#7C5CFF]/10 border-[#7C5CFF]/20 hover:bg-[#7C5CFF]/20 hover:border-[#7C5CFF]/30 text-[#7253fa]'
                            }`}
                            title={!isOwner ? "Только главный аккаунт (pm.michelle.kreps@gmail.com) может изменять роли." : undefined}
                          >
                            {updatingUid === u.uid ? (
                              <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                            ) : (
                              <>
                                <ArrowRightLeft className="h-3 w-3 animate-pulse" />
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
      <div className="p-5 rounded-2xl border border-white/5 bg-black/40 font-mono text-[11px] leading-relaxed text-[#71717A] space-y-1.5">
        <h4 className="text-xs font-semibold text-zinc-400 font-sans mb-1.5">Правила разграничения прав доступа:</h4>
        <p>• <strong className="text-zinc-300 font-bold">Администратор (Admin):</strong> Доступен полный функционал — импорт годовых отчетностей Bnovo, ручное переназначение цен, обновление маппинга номеров, очистка данных.</p>
        <p>• <strong className="text-zinc-300 font-bold">Наблюдатель (Viewer):</strong> Доступен только просмотр и навигация по аналитическим дашбордам, календарю потерь и графикам. Все действия по замене и импорту данных скрыты или заблокированы.</p>
        <p>• <strong className="text-zinc-300 font-bold">Владелец (pm.michelle.kreps@gmail.com):</strong> Обладает сверхполномочиями и является единственным лицом, способным назначать и снимать статус Администратора.</p>
      </div>

    </div>
  );
}
