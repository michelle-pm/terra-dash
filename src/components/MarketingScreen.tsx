import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar } from 'recharts';
import { Target, TrendingUp, Users, Percent, DollarSign, MousePointer, HelpCircle, AlertCircle, ArrowUpRight, ChevronRight, Zap, PiggyBank } from 'lucide-react';

interface CampaignStats {
  name: string;
  id: string;
  spend: number;
  clicks: number;
  conversions: number;
  cr: number; // conversion rate %
  cpa: number; // cost per acquisition
  ctr: number; // click through rate %
  cpc: number; // cost per click
  avgImpPosition: number | string;
  avgClickPosition: number | string;
  impressions: number;
}

export default function MarketingScreen() {
  const campaigns: CampaignStats[] = [
    {
      name: 'РСЯ Пантовая путевка',
      id: '86112338',
      spend: 3301.32,
      clicks: 423,
      conversions: 352,
      cr: 83.22,
      cpa: 9.38,
      ctr: 3.33,
      cpc: 7.80,
      avgImpPosition: '—',
      avgClickPosition: '—',
      impressions: 12702
    },
    {
      name: 'Пантовая путевка',
      id: '85934701',
      spend: 15455.60,
      clicks: 241,
      conversions: 229,
      cr: 95.02,
      cpa: 67.49,
      ctr: 9.30,
      cpc: 64.13,
      avgImpPosition: 3.14,
      avgClickPosition: 2.24,
      impressions: 2591
    },
    {
      name: 'База отдыха',
      id: '111043240',
      spend: 20728.31,
      clicks: 794,
      conversions: 76,
      cr: 9.57,
      cpa: 272.74,
      ctr: 4.19,
      cpc: 26.11,
      avgImpPosition: 4.44,
      avgClickPosition: 2.50,
      impressions: 18950
    }
  ];

  const totalSpend = 39485.22;
  const totalClicks = 1458;
  const totalConversions = 657;
  const totalImpressions = 34243;
  const averageCR = 45.06;
  const averageCPA = 60.10;
  const averageCTR = 4.26;
  const averageCPC = 27.08;
  const totalAvgImp = 4.28;
  const totalAvgClick = 2.44;

  const [selectedCamp, setSelectedCamp] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(val);
  };

  const chartData = campaigns.map(c => ({
    name: c.name,
    'Расход, ₽': c.spend,
    'Клики': c.clicks,
    'Конверсии': c.conversions,
    'CPA, ₽': c.cpa,
    'CPC, ₽': c.cpc
  }));

  const ratioData = campaigns.map(c => ({
    name: c.name,
    'CR %': c.cr,
    'CTR %': c.ctr
  }));

  return (
    <div className="space-y-6 animate-fade-in" id="marketing_screen_container">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            <span>Анализ Рекламы (Яндекс.Директ)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Эффективность рекламных кампаний, конверсии и стоимость привлечения клиентов.</p>
        </div>
        <div className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 font-mono text-zinc-400">
          Активный период: Текущие отчетные сутки
        </div>
      </div>

      {/* KPI TOP GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Spend Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden" id="card_total_spend">
          <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs uppercase tracking-wider mb-2">
            <DollarSign className="h-3.5 w-3.5 text-red-400" />
            <span>Общие расходы</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {formatCurrency(totalSpend)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <span className="text-red-400 font-semibold font-mono">Яндекс.Директ</span> отчет по 3 кампаниям
          </div>
        </div>

        {/* Clicks & Impressions Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden" id="card_clicks_impressions">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs uppercase tracking-wider mb-2">
            <MousePointer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Показы и клики</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {totalClicks} <span className="text-zinc-600 font-normal text-sm">/ {totalImpressions}</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
            <span>CTR: <strong className="text-emerald-400">{averageCTR}%</strong></span>
            <span className="text-zinc-700">|</span>
            <span>CPC: <strong className="text-zinc-300">{averageCPC} ₽</strong></span>
          </div>
        </div>

        {/* Conversions Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden" id="card_conversions">
          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs uppercase tracking-wider mb-2">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>Конверсии</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
            {totalConversions}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5 font-mono">
            <span>CR: <strong className="text-blue-400">{averageCR}%</strong></span>
            <span className="text-zinc-700">|</span>
            <span>CPA: <strong className="text-zinc-300">{averageCPA} ₽</strong></span>
          </div>
        </div>

        {/* Cost per lead Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden" id="card_cpa">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs uppercase tracking-wider mb-2">
            <Percent className="h-3.5 w-3.5 text-amber-400" />
            <span>Средний результат</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-500">
            {averageCPA} ₽
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <span>Ср. позиция показа:</span>
            <span className="font-semibold text-zinc-300 font-mono">{totalAvgImp}</span>
          </div>
        </div>

      </div>

      {/* TWO COLUMN INTERACTIVE: CHARTS & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Bar Chart comparing campaign spend to conversion */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4" id="marketing_comparison_chart">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Сравнительный анализ расходов и конверсий</h3>
              <p className="text-2xs text-zinc-500 mt-0.5 font-sans">Соотношение инвестированных средств к закрытым целевым действиям</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-2 w-2 bg-red-600 rounded"></span> Расход (₽)
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-2 w-2 bg-emerald-500 rounded"></span> Клики
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="h-2 w-2 bg-blue-500 rounded"></span> Конверсии
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis dataKey="name" stroke="#52525B" fontSize={11} tickLine={false} />
                <YAxis stroke="#52525B" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl text-xs font-mono space-y-1">
                          <p className="font-bold border-b border-zinc-800 pb-1 text-zinc-200 mb-1">{payload[0]?.payload.name}</p>
                          <p className="text-red-400">Расход: <span className="font-bold text-zinc-300">{formatCurrency(payload[0]?.value)}</span></p>
                          <p className="text-emerald-400">Клики: <span className="font-semibold">{payload[1]?.value}</span></p>
                          <p className="text-blue-400">Конверсии: <span className="font-semibold text-zinc-300">{payload[2]?.value}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Расход, ₽" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Клики" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Конверсии" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign ratio card & CR insights */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4" id="efficiency_side_insight">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Конверсия и кликабельность</span>
          </h3>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ratioData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis dataKey="name" stroke="#52525B" fontSize={9} tickLine={false} />
                <YAxis stroke="#52525B" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl text-xs font-mono space-y-1">
                          <p className="font-bold border-b border-zinc-800 pb-1 text-zinc-300 mb-1">{payload[0]?.payload.name}</p>
                          <p className="text-blue-400">CR (Конверсия %): <span className="font-semibold text-zinc-100">{payload[0]?.value}%</span></p>
                          <p className="text-emerald-400">CTR (Кликабельность %): <span className="font-semibold text-zinc-100">{payload[1]?.value}%</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="CR %" stroke="#3B82F6" fillOpacity={0.1} fill="#3B82F6" strokeWidth={2} />
                <Area type="monotone" dataKey="CTR %" stroke="#10B981" fillOpacity={0.1} fill="#10B981" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-2xs text-zinc-400 pt-1 border-t border-zinc-800/60 leading-relaxed font-sans">
            <p className="flex items-start gap-1">
              <span className="text-emerald-400 font-bold shrink-0">✔</span>
              <span><strong>Пантовая путевка (РСЯ и Поиск)</strong> показывают феноменальный уровень конверсии (&gt;80%). Это связано с узкоцелевой теплой аудиторией и высокой ценностью оффера.</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="text-red-400 font-bold shrink-0">⚠</span>
              <span><strong>База отдыха</strong> тратит наибольший бюджет (20.7 тыс. руб) при сверхнизкой конверсии CR 9.57%, привлекая много "холодного" общетематического трафика.</span>
            </p>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE DATA TABLE OF CAMPAIGNS */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4" id="yandex_direct_table_container">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Ведомость кампаний Яндекс.Директ</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Полная выгрузка метрик эффективности за отчетный цикл</p>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Рекомендуется к регулярному импорту
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-medium font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Кампания</th>
                <th className="py-3 px-3 text-right">Расход, ₽</th>
                <th className="py-3 px-3 text-right">Показы</th>
                <th className="py-3 px-3 text-right">Клики</th>
                <th className="py-3 px-3 text-right">CTR, %</th>
                <th className="py-3 px-3 text-right">CPC, ₽</th>
                <th className="py-3 px-3 text-right">Конверсии</th>
                <th className="py-3 px-3 text-right">CR, %</th>
                <th className="py-3 px-3 text-right">CPA, ₽</th>
                <th className="py-3 px-3 text-center">Позиция клика</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-zinc-900 hover:bg-zinc-900/20 cursor-pointer transition-colors ${
                    selectedCamp === c.id ? 'bg-zinc-900/40 border-l border-l-red-500' : ''
                  }`}
                  onClick={() => setSelectedCamp(selectedCamp === c.id ? null : c.id)}
                >
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-zinc-200">{c.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">ID: {c.id}</div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold font-mono text-white">
                    {c.spend.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3.5 px-3 text-right text-zinc-400 font-mono">
                    {c.impressions.toLocaleString('ru-RU')}
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold font-mono">
                    {c.clicks}
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-mono font-medium">
                    {c.ctr}%
                  </td>
                  <td className="py-3.5 px-3 text-right text-zinc-300 font-mono">
                    {c.cpc} ₽
                  </td>
                  <td className="py-3.5 px-3 text-right text-blue-400 font-semibold font-mono">
                    {c.conversions}
                  </td>
                  <td className="py-3.5 px-3 text-right text-blue-400 font-mono font-medium">
                    {c.cr}%
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-500 font-semibold font-mono">
                    {c.cpa} ₽
                  </td>
                  <td className="py-3.5 px-3 text-center text-zinc-500 font-mono">
                    {c.avgClickPosition}
                  </td>
                </tr>
              ))}
              
              {/* TOTAL ROW */}
              <tr className="bg-zinc-900/30 border-t-2 border-zinc-700 font-semibold font-mono">
                <td className="py-3.5 px-3 text-zinc-300 uppercase tracking-widest text-[10px]">Итоговые показатели</td>
                <td className="py-3.5 px-3 text-right text-red-500">{totalSpend.toLocaleString('ru-RU')} ₽</td>
                <td className="py-3.5 px-3 text-right text-zinc-400">{totalImpressions.toLocaleString('ru-RU')}</td>
                <td className="py-3.5 px-3 text-right text-emerald-400">{totalClicks}</td>
                <td className="py-3.5 px-3 text-right text-emerald-400">{averageCTR}%</td>
                <td className="py-3.5 px-3 text-right text-zinc-300">{averageCPC} ₽</td>
                <td className="py-3.5 px-3 text-right text-blue-400">{totalConversions}</td>
                <td className="py-3.5 px-3 text-right text-blue-400">{averageCR}%</td>
                <td className="py-3.5 px-3 text-right text-amber-500">{averageCPA} ₽</td>
                <td className="py-3.5 px-3 text-center text-zinc-500">{totalAvgClick}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ADVISOR RECOMMENDATIONS & SMART BUDGET ALLOCATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="yandex_direct_recommendations">
        
        {/* Recommendation Engine */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-amber-400" />
            <span>Рекомендации по распределению бюджета</span>
          </h3>

          <div className="space-y-3.5 text-xs text-zinc-300 font-sans">
            <div className="p-3 bg-zinc-900/40 rounded-lg border border-red-950/40">
              <span className="font-semibold text-red-400 block mb-1">📉 Оптимизация кампании "База отдыха"</span>
              <p className="text-zinc-400 leading-relaxed">
                Кампания съедает <strong>52.5%</strong> рекламного бюджета (20,728 ₽), но даёт всего лишь <strong>11.5%</strong> конверсий (76). Стоимость лида (CPA: 272.74 ₽) здесь в <strong>29 раз выше</strong>, чем в РСЯ! Рекомендуется сузить семантику, убрать информационные запросы и снизить ставки.
              </p>
            </div>

            <div className="p-3 bg-zinc-900/40 rounded-lg border border-emerald-950/40">
              <span className="font-semibold text-emerald-400 block mb-1">🚀 Масштабирование "РСЯ Пантовая путевка"</span>
              <p className="text-zinc-400 leading-relaxed">
                Стоимость лида составляет рекордно низкие <strong>9.38 ₽</strong> при конверсии (CR) в <strong>83.22%</strong>. Кампания недофинансирована (всего 3.3 тыс ₽ расходов). Увеличьте дневной лимит данной кампании в 2.5-3 раза.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign simulator/ROI projection */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <PiggyBank className="h-4.5 w-4.5 text-emerald-400" />
            <span>Прогноз снижения стоимости лида</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Если перераспределить 10 000 ₽ неэффективного бюджета из кампании "База отдыха" в кампанию "РСЯ Пантовая путевка", Вы получите следующий прирост показателей при том же бюджете:
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-center">
            <div className="bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Новые конверсии</div>
              <div className="text-lg font-bold text-emerald-400">+ 1 030 ед.</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">Вместо прежних 36</div>
            </div>
            <div className="bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Сокращение CPA</div>
              <div className="text-lg font-bold text-amber-500">- 45.3%</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">Ср. CPA снизится до 32₽</div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 italic bg-zinc-900/20 p-2.5 rounded border border-zinc-900 text-center font-sans">
            *Расчет произведен автоматически на основе реальных CTR, CPC и CR соответствующих кампаний Яндекс.Директ.
          </div>
        </div>

      </div>

    </div>
  );
}
