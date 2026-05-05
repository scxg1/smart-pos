import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Receipt, ChevronLeft, ChevronRight, Calendar,
  CreditCard, Banknote, Clock, Filter, X, Download,
  ShoppingBag, ArrowUpRight, Eye,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePOSStore } from '../store/posStore';

function fmt(n: number): string {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function formatTime(d: string): string {
  try { return new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    'نقدي': { bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'cash': { bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'بطاقة': { bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
    'card': { bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
  };
  const s = map[method] || { bg: 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600', text: 'text-gray-600 dark:text-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.bg} ${s.text}`}>
      {method === 'نقدي' || method === 'cash' ? <Banknote size={11} /> : <CreditCard size={11} />}
      {method}
    </span>
  );
}

interface SaleRecord {
  id: number;
  customer_id: number | null;
  total: number;
  cost_total: number;
  profit: number;
  discount: number;
  tax: number;
  payment_method: string;
  note: string;
  receipt_number: string;
  created_at: string;
  items: any[];
  customer?: { id: number; name: string; phone: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SalesPage() {
  const { addToast } = usePOSStore();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchSales = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (q.trim()) params.q = q.trim();
      if (from) params.from = from;
      if (to) params.to = to;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (minTotal) params.min_total = minTotal;
      if (maxTotal) params.max_total = maxTotal;

      const result = await api.searchSales(params);
      setSales(result.data || []);
      setPagination(result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err: any) {
      addToast('error', `فشل في تحميل الفواتير: ${err.message}`);
    }
    setLoading(false);
  }, [q, from, to, paymentMethod, minTotal, maxTotal, addToast]);

  useEffect(() => { fetchSales(1); }, []);
  useEffect(() => { fetchSales(1); }, [paymentMethod, from, to]);

  const handleSearch = () => fetchSales(1);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setQ('');
    setFrom('');
    setTo('');
    setPaymentMethod('');
    setMinTotal('');
    setMaxTotal('');
    setShowFilters(false);
  };

  const hasActiveFilters = q || from || to || paymentMethod || minTotal || maxTotal;

  const openDetail = (sale: SaleRecord) => {
    const saleForReceipt = {
      ...sale,
      receiptNumber: sale.receipt_number || sale.id + 1000,
    };
    setSelectedSale(saleForReceipt);
    setShowDetail(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="shrink-0 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <Receipt size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">سجل الفواتير</h1>
              <p className="text-sm text-slate-400">{pagination.total} فاتورة مسجلة</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter size={15} />
            فلاتر البحث
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">!</span>
            )}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={handleKey}
              placeholder="بحث برقم الفاتورة، اسم المنتج، أو ملاحظة..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
          >
            <Search size={15} />
            بحث
          </button>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">فلاتر متقدمة</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors">
                  <X size={12} />
                  مسح الكل
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">من تاريخ</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">إلى تاريخ</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-blue-400">
                  <option value="">الكل</option>
                  <option value="نقدي">نقدي</option>
                  <option value="بطاقة">بطاقة</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">الحد الأدنى</label>
                  <input type="number" value={minTotal} onChange={e => setMinTotal(e.target.value)} placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-blue-400" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">الحد الأقصى</label>
                  <input type="number" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} placeholder="∞"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-blue-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">جاري التحميل...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Receipt size={28} className="text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">لا توجد فواتير</p>
            <p className="text-sm text-slate-400 mt-1">لم يتم العثور على نتائج مطابقة للبحث</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map(sale => (
              <div
                key={sale.id}
                onClick={() => openDetail(sale)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-12 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      #{sale.receipt_number || sale.id + 1000}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <Clock size={7} />
                      {formatTime(sale.created_at)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">
                        {fmt(sale.total)} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                      </span>
                      <PaymentBadge method={sale.payment_method} />
                      {sale.discount > 0 && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md">
                          خصم {sale.discount}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{formatDate(sale.created_at)}</span>
                      {sale.items && sale.items.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ShoppingBag size={10} />
                          {sale.items.length} منتج
                        </span>
                      )}
                      {sale.customer && (
                        <span>{sale.customer.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0 flex items-center gap-3">
                    <div>
                      <p className={`text-sm font-bold tabular-nums ${sale.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {sale.profit >= 0 ? '+' : ''}{fmt(sale.profit)}
                      </p>
                      <p className="text-[9px] text-slate-400">ربح</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-all">
                      <Eye size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pb-2">
            <button
              onClick={() => fetchSales(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchSales(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => fetchSales(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-400 mr-2">
              صفحة {pagination.page} من {pagination.totalPages}
            </span>
          </div>
        )}
      </div>

      {showDetail && selectedSale && (
        <SaleDetailModal sale={selectedSale} onClose={() => { setShowDetail(false); setSelectedSale(null); }} />
      )}
    </div>
  );
}

function SaleDetailModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  const { settings } = usePOSStore();
  const items = sale.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
  const taxRate = parseFloat(settings.tax_rate || '15');
  const date = new Date(sale.created_at);

  const handlePrint = () => {
    const saleForStore = {
      ...sale,
      items: sale.items?.map((item: any) => ({ ...item, category: item.category || '-' })),
      receiptNumber: sale.receipt_number || sale.id + 1000,
    };
    usePOSStore.setState({ lastSale: saleForStore as any, showReceipt: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Receipt size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">فاتورة #{sale.receipt_number || sale.id + 1000}</h2>
              <p className="text-[11px] text-slate-400">{formatDate(sale.created_at)} — {formatTime(sale.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <PaymentBadge method={sale.payment_method} />
            {sale.customer && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                {sale.customer.name}
              </span>
            )}
            {sale.discount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20">
                خصم {sale.discount}%
              </span>
            )}
          </div>

          <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-[11px]">
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">المنتج</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400">الكمية</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400">السعر</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={i} className="border-t border-slate-50 dark:border-slate-700/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{item.name}</td>
                    <td className="text-center px-3 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums">{item.quantity}</td>
                    <td className="text-center px-3 py-2.5 text-slate-600 dark:text-slate-300 tabular-nums">{Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="text-left px-4 py-2.5 font-semibold text-slate-800 dark:text-white tabular-nums">{Number(item.subtotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>المجموع الفرعي</span>
              <span className="tabular-nums font-medium">{subtotal.toFixed(2)} ج.م</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>خصم ({sale.discount}%)</span>
                <span className="tabular-nums">-{(subtotal * sale.discount / 100).toFixed(2)} ج.م</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>ضريبة ({taxRate}%)</span>
                <span className="tabular-nums">{Number(sale.tax).toFixed(2)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-600">
              <span>الإجمالي</span>
              <span className="tabular-nums text-blue-600">{Number(sale.total).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-slate-500">صافي الربح</span>
              <span className={`font-bold tabular-nums ${sale.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {sale.profit >= 0 ? '+' : ''}{Number(sale.profit).toFixed(2)} ج.م
              </span>
            </div>
          </div>

          {sale.note && (
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              {sale.note}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            طباعة / تحميل
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
