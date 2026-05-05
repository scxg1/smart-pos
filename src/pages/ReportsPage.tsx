import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp, DollarSign, FileText, Sparkles, Loader2, Award,
  ShoppingBag, ArrowUpRight, Calendar, BarChart3, Target, Receipt,
  CreditCard, Banknote, Clock, PackageOpen, Download,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, CartesianGrid as Grid,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../lib/api';
import { usePOSStore } from '../store/posStore';

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6'];

interface Summary {
  invoice_count: number;
  total_sales: number;
  total_profit: number;
  total_cost: number;
  profit_margin: string;
  avg_invoice: number;
}

const PERIODS = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'all', label: 'الكل' },
];

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-white/10 min-w-[140px]">
      {label && <p className="text-slate-300 mb-2 font-semibold text-[11px]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}</span>
          </div>
          <span className="font-bold tabular-nums" style={{ color: p.color }}>
            {typeof p.value === 'number' ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-white/10">
      <p className="text-slate-300 mb-1 font-semibold text-[11px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentPill({ method }: { method: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    'نقدي': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
    'cash': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
    'بطاقة': { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-400' },
    'card': { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-400' },
  };
  const s = map[method] || { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300', dot: 'bg-gray-400 dark:bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {method}
    </span>
  );
}

function EmptyChart({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-3">
        <Icon size={24} className="text-slate-300 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-400">{title}</p>
      <p className="text-xs text-slate-300 mt-0.5">{desc}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { fetchAIInsights, aiInsights, aiLoading, addToast } = usePOSStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({
    invoice_count: 0, total_sales: 0, total_profit: 0,
    total_cost: 0, profit_margin: '0', avg_invoice: 0,
  });
  const [daily, setDaily] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [prevSummary, setPrevSummary] = useState<Summary>({
    invoice_count: 0, total_sales: 0, total_profit: 0,
    total_cost: 0, profit_margin: '0', avg_invoice: 0,
  });

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`تقرير_${dateStr}.pdf`);
    } catch {}
    setExporting(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sum, day, top, cat] = await Promise.all([
        api.getReportsSummary(from, to),
        api.getReportsDaily(from, to),
        api.getReportsTopProducts(from, to),
        api.getReportsByCategory(from, to),
      ]);
      const avgInvoice = sum.invoice_count > 0 ? sum.total_sales / sum.invoice_count : 0;
      setSummary({ ...sum, avg_invoice: avgInvoice });
      setDaily(day);
      setTopProducts(top);
      setByCategory(cat);

      let prevFrom = '';
      let prevTo = '';
      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const diff = (toDate.getTime() - fromDate.getTime()) / 86400000;
        const prevToDate = new Date(fromDate.getTime() - 86400000);
        const prevFromDate = new Date(prevToDate.getTime() - diff * 86400000);
        prevFrom = prevFromDate.toISOString().split('T')[0];
        prevTo = prevToDate.toISOString().split('T')[0];
      } else {
        const now = new Date();
        prevFrom = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
        prevTo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      }
      try {
        const prevSum = await api.getReportsSummary(prevFrom, prevTo);
        const prevAvg = prevSum.invoice_count > 0 ? prevSum.total_sales / prevSum.invoice_count : 0;
        setPrevSummary({ ...prevSum, avg_invoice: prevAvg });
      } catch {}
    } catch (err: any) {
      addToast('error', `فشل في تحميل التقارير: ${err.message || 'خطأ في الاتصال'}`);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    api.getSales().then(s => setRecentSales(s.slice(0, 10))).catch(() => {});
  }, []);

  const applyPeriod = (key: string) => {
    setActivePeriod(key);
    const now = new Date(), today = now.toISOString().split('T')[0];
    if (key === 'today') { setFrom(today); setTo(today); }
    else if (key === 'yesterday') {
      const y = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      setFrom(y); setTo(y);
    }
    else if (key === 'week') {
      setFrom(new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]); setTo(today);
    }
    else if (key === 'month') {
      setFrom(new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]); setTo(today);
    }
    else if (key === 'all') { setFrom(''); setTo(''); }
  };

  const handleAI = () => {
    const diff = from ? Math.ceil((Date.now() - new Date(from).getTime()) / 86400000) : 0;
    fetchAIInsights(diff <= 1 ? 'today' : diff <= 7 ? 'week' : 'month');
  };

  const totalCat = byCategory.reduce((s, d) => s + d.total, 0);

  const dailyWithLabels = useMemo(() =>
    daily.map(d => ({ ...d, dayLabel: formatDay(d.date) })),
    [daily]
  );

  const paymentStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    recentSales.forEach(s => {
      const m = s.payment_method || 'أخرى';
      if (!stats[m]) stats[m] = { count: 0, total: 0 };
      stats[m].count++;
      stats[m].total += s.total;
    });
    return Object.entries(stats).map(([method, data]) => ({ method, ...data }));
  }, [recentSales]);

  const hasData = summary.invoice_count > 0;

  const getChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="p-6 space-y-5 max-w-[1440px] mx-auto">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">لوحة التقارير</h1>
              <p className="text-sm text-slate-400 mt-0.5">تحليل شامل لأداء المبيعات والأرباح</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF} disabled={exporting || !hasData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              تصدير PDF
            </button>
            <button
              onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-200
                         bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              تحليل ذكي
            </button>
          </div>
        </div>

        {/* ══ AI Insights ══ */}
        {aiInsights.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-violet-200/60 bg-gradient-to-l from-violet-600 to-indigo-700 p-5 text-white shadow-xl shadow-violet-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles size={15} className="text-white" />
              </div>
              <span className="font-bold text-sm">تحليل ذكي للبيانات</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {aiInsights.map((ins, i) => (
                <div key={i} className="flex gap-2.5 bg-white/10 backdrop-blur rounded-xl px-3.5 py-2.5 text-sm">
                  <span className="font-bold text-white/50 shrink-0">{i + 1}.</span>
                  <span className="text-white/90 leading-snug">{ins}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Period Filter ══ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-3.5 flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-slate-50 dark:bg-slate-700 rounded-xl p-1 border border-slate-100 dark:border-slate-600">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => applyPeriod(p.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activePeriod === p.key
                    ? 'bg-white dark:bg-slate-600 text-primary shadow-sm border border-slate-100 dark:border-slate-500'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={14} className="text-slate-400" />
            <span>من</span>
            <input type="date" value={from}
              onChange={e => { setFrom(e.target.value); setActivePeriod(null); }}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            <span>إلى</span>
            <input type="date" value={to}
              onChange={e => { setTo(e.target.value); setActivePeriod(null); }}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
          </div>
          <button onClick={fetchData}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-100 transition-colors">
            تطبيق
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader2 size={36} className="animate-spin text-primary" />
            <p className="text-sm text-slate-400">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div ref={reportRef}>
            {/* ══ KPI Cards ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'إجمالي المبيعات',
                  value: fmt(summary.total_sales),
                  unit: 'ج.م',
                  sub: `${summary.invoice_count} فاتورة`,
                  icon: DollarSign,
                  bg: 'from-blue-500 to-blue-700',
                  shadow: 'shadow-blue-200/50',
                  change: getChange(summary.total_sales, prevSummary.total_sales),
                },
                {
                  label: 'صافي الأرباح',
                  value: fmt(summary.total_profit),
                  unit: 'ج.م',
                  sub: `هامش ${summary.profit_margin}%`,
                  icon: TrendingUp,
                  bg: 'from-emerald-500 to-emerald-700',
                  shadow: 'shadow-emerald-200/50',
                  change: getChange(summary.total_profit, prevSummary.total_profit),
                },
                {
                  label: 'متوسط الفاتورة',
                  value: fmt(summary.avg_invoice),
                  unit: 'ج.م',
                  sub: 'لكل معاملة',
                  icon: Target,
                  bg: 'from-violet-500 to-violet-700',
                  shadow: 'shadow-violet-200/50',
                  change: getChange(summary.avg_invoice, prevSummary.avg_invoice),
                },
                {
                  label: 'إجمالي الفواتير',
                  value: summary.invoice_count.toLocaleString('ar-EG'),
                  unit: '',
                  sub: `تكلفة ${fmt(summary.total_cost)} ج.م`,
                  icon: Receipt,
                  bg: 'from-amber-500 to-amber-700',
                  shadow: 'shadow-amber-200/50',
                  change: getChange(summary.invoice_count, prevSummary.invoice_count),
                },
              ].map((k, i) => (
                <div key={i} className={`rounded-2xl p-5 bg-gradient-to-br ${k.bg} text-white shadow-lg ${k.shadow} relative overflow-hidden`}>
                  <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/[0.07]" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <k.icon size={18} className="text-white" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-white/60 text-[11px] font-medium bg-white/10 px-2 py-0.5 rounded-md">{k.sub}</span>
                        {k.change !== 0 && (
                          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${k.change > 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                            {k.change > 0 ? <ArrowUpRight size={11} /> : <ArrowUpRight size={11} className="rotate-90" />}
                            {k.change > 0 ? '+' : ''}{k.change}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl lg:text-3xl font-black leading-none tracking-tight tabular-nums">
                      {k.value}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-white/70 text-sm font-medium">{k.label}</p>
                      {k.unit && <span className="text-white/80 text-sm font-bold">{k.unit}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ══ Charts Row 2 ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Bar Chart - Top Products */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">أكثر المنتجات مبيعاً</h3>
                    <p className="text-xs text-slate-400 mt-0.5">أعلى 8 منتجات من حيث الكمية</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <Award size={16} className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                </div>
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ right: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100}
                        tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="qty_sold" name="الكمية المباعة" radius={[0, 8, 8, 0]} maxBarSize={24}>
                        {topProducts.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart icon={PackageOpen} title="لا توجد منتجات مباعة" desc="لم يتم بيع أي منتجات في الفترة المحددة" />
                )}
              </div>

              {/* Donut - Category Distribution */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">توزيع الفئات</h3>
                    <p className="text-xs text-slate-400 mt-0.5">حسب إجمالي المبيعات</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
                    <BarChart3 size={16} className="text-cyan-500 dark:text-cyan-400" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  {byCategory.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={byCategory} dataKey="total" nameKey="category"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                            {byCategory.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full space-y-2 mt-2">
                        {byCategory.slice(0, 6).map((d, i) => {
                          const pct = totalCat > 0 ? (d.total / totalCat) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                              <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">{d.category}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-8 text-left tabular-nums">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyChart icon={BarChart3} title="لا توجد بيانات" desc="لم تسجل أي مبيعات حسب الفئات" />
                  )}
                </div>
              </div>
            </div>

            {/* ══ Tables Row ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Top Products Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center gap-2.5 bg-gradient-to-l from-amber-50/50 dark:from-amber-500/10 to-transparent">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                    <Award size={15} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">ترتيب المنتجات</h3>
                    <p className="text-[11px] text-slate-400">حسب الكمية المباعة والإيرادات</p>
                  </div>
                </div>
                {topProducts.length > 0 ? (
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {topProducts.slice(0, 8).map((p, i) => {
                      const maxQty = topProducts[0]?.qty_sold || 1;
                      const pct = (p.qty_sold / maxQty) * 100;
                      return (
                        <div key={i} className="flex items-center px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="w-7 shrink-0">
                            {i === 0 ? <span className="text-sm">🥇</span>
                              : i === 1 ? <span className="text-sm">🥈</span>
                              : i === 2 ? <span className="text-sm">🥉</span>
                              : <span className="text-[11px] text-slate-400 font-bold">{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0 mx-2">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 flex-1 max-w-[100px] overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                              </div>
                              <span className="text-[10px] text-slate-400 tabular-nums">{p.qty_sold} وحدة</span>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{fmt(p.revenue || 0)}</p>
                            <p className="text-[10px] text-emerald-500 font-semibold tabular-nums">+{fmt(p.profit || 0)} ربح</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyChart icon={PackageOpen} title="لا توجد مبيعات" desc="لم يتم بيع أي منتجات بعد" />
                )}
              </div>

              {/* Recent Sales Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-gradient-to-l from-blue-50/50 dark:from-blue-500/10 to-transparent">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <ShoppingBag size={15} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">آخر الفواتير</h3>
                      <p className="text-[11px] text-slate-400">أحدث عمليات البيع المسجلة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => usePOSStore.getState().setActivePage('sales')}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20 transition-colors"
                  >
                    عرض الكل
                    <ArrowUpRight size={12} />
                  </button>
                </div>
                {recentSales.length > 0 ? (
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {recentSales.slice(0, 8).map((sale) => (
                      <div key={sale.id} className="flex items-center px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="w-12 h-10 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">#{sale.id + 1000}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                            <Clock size={8} />
                            {formatTime(sale.created_at)}
                          </span>
                        </div>
                        <div className="flex-1 mx-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{fmt(sale.total)}</span>
                            <span className="text-[10px] text-slate-400">ج.م</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md tabular-nums">
                              +{fmt(sale.profit)}
                            </span>
                            <span className="text-[9px] text-slate-300 dark:text-slate-500">ربح</span>
                          </div>
                        </div>
                        <PaymentPill method={sale.payment_method} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart icon={Receipt} title="لا توجد فواتير" desc="لم تسجل أي عمليات بيع بعد" />
                )}
              </div>
            </div>

            {/* ══ Payment Summary ══ */}
            {paymentStats.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <CreditCard size={15} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">ملخص طرق الدفع</h3>
                    <p className="text-[11px] text-slate-400">توزيع المبيعات حسب طريقة الدفع</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {paymentStats.map((ps, i) => {
                    const icons: Record<string, any> = {
                      'نقدي': Banknote,
                      'cash': Banknote,
                      'بطاقة': CreditCard,
                      'card': CreditCard,
                    };
                    const colors: Record<string, string> = {
                      'نقدي': 'from-emerald-500 to-emerald-600',
                      'cash': 'from-emerald-500 to-emerald-600',
                      'بطاقة': 'from-blue-500 to-blue-600',
                      'card': 'from-blue-500 to-blue-600',
                    };
                    const Icon = icons[ps.method] || CreditCard;
                    const color = colors[ps.method] || 'from-slate-500 to-slate-600';
                    return (
                      <div key={i} className={`rounded-xl p-4 bg-gradient-to-br ${color} text-white relative overflow-hidden`}>
                        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                        <Icon size={20} className="text-white/80 mb-2" />
                        <p className="text-lg font-black tabular-nums">{fmt(ps.total)}</p>
                        <p className="text-white/70 text-xs">ج.م</p>
                        <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
                          <span className="text-white/70 text-[11px]">{ps.method}</span>
                          <span className="text-white/90 text-[11px] font-bold">{ps.count} فاتورة</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
