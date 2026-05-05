import React, { useState, useEffect, useRef } from 'react';
import { Search, Bot, X, Sparkles, Loader2, TrendingUp, ScanBarcode, ChevronDown, ChevronUp } from 'lucide-react';
import CartPanel from '../components/CartPanel';
import ProductCard from '../components/ProductCard';
import ReceiptModal from '../components/ReceiptModal';
import { usePOSStore } from '../store/posStore';
import { api } from '../lib/api';

export default function CashierPage() {
  const { products, productsLoading, completeSale, cart, fetchAIInsights, fetchAIUpsell, aiInsights, aiLoading, aiSuggestion } = usePOSStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showAI, setShowAI] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [dailyStats, setDailyStats] = useState({ total: 0, count: 0, topProduct: '' });
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { addToCart } = usePOSStore();

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value.trim();
      if (!val) return;
      const product = products.find(p => p.barcode === val);
      if (product) {
        addToCart(product);
        (e.target as HTMLInputElement).value = '';
        usePOSStore.getState().addToast('success', `تم إضافة "${product.name}" للسلة`);
      } else {
        usePOSStore.getState().addToast('warning', 'المنتج غير موجود');
      }
    }
  };

  const loadDailyStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const summary = await api.getReportsSummary(today, today);
      const topProducts = await api.getReportsTopProducts(today, today);
      setDailyStats({
        total: summary.total_sales || 0,
        count: summary.invoice_count || 0,
        topProduct: topProducts.length > 0 ? topProducts[0].name : '-',
      });
    } catch {}
  };

  useEffect(() => { loadDailyStats(); const timer = setInterval(loadDailyStats, 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('cashier-search')?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) completeSale();
      }
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        const { showReceipt } = usePOSStore.getState();
        if (!showReceipt && cart.length > 0) {
          e.preventDefault();
          completeSale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, completeSale]);

  useEffect(() => {
    if (cart.length > 0) {
      fetchAIUpsell();
    }
  }, [cart.length]);

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search) || p.category.includes(search);
    const matchCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleAIInsights = () => {
    fetchAIInsights('today');
  };

  return (
    <div className="flex h-full">
      <CartPanel />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="bg-white dark:bg-slate-800/50">
          <div className={`flex items-center gap-3 px-4 overflow-hidden transition-all duration-300 ease-in-out ${headerExpanded ? 'max-h-14 py-2 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
              <input
                id="cashier-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج... (F2)"
                className="input-field pr-10 py-2"
              />
            </div>
            <div className="relative w-36">
              <ScanBarcode size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
              <input
                ref={barcodeInputRef}
                type="text"
                onKeyDown={handleBarcodeScan}
                placeholder="مسح باركود..."
                className="input-field pr-8 py-2 border-dashed font-mono text-[12px]"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-2 pt-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all duration-200
                  ${selectedCategory === cat
                    ? 'bg-gradient-to-l from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {cat}
              </button>
            ))}
            <div className="mr-auto" />
            <button
              onClick={() => setHeaderExpanded(!headerExpanded)}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shrink-0 ${headerExpanded ? 'rotate-180' : ''}`}
              title={headerExpanded ? 'إخفاء البحث' : 'إظهار البحث'}
            >
              <ChevronDown size={14} />
            </button>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {productsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={36} className="animate-spin text-indigo-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-600">
              <Search size={40} className="mb-3" />
              <p className="text-base font-medium">لا توجد منتجات</p>
              <p className="text-[12px] mt-1 text-slate-400">جرّب تغيير البحث أو الفئة</p>
            </div>
          ) : (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ReceiptModal />

      <button
        onClick={() => setShowAI(!showAI)}
        className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4.5 py-3 rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 group"
      >
        <Bot size={20} className="group-hover:animate-bounce" />
        <span className="text-[13px] font-bold">المدير الذكي</span>
      </button>

      {showAI && (
        <div className="fixed bottom-24 left-6 z-40 w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                <Sparkles size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">المدير الذكي</h3>
            </div>
            <button onClick={() => setShowAI(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
            <button
              onClick={handleAIInsights}
              disabled={aiLoading}
              className="w-full py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 flex items-center justify-center gap-2 transition-colors"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              رؤى المبيعات اليوم
            </button>

            {aiInsights.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 space-y-1.5">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex gap-2 text-[12px]">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span className="text-slate-600 dark:text-slate-300">{insight}</span>
                  </div>
                ))}
              </div>
            )}

            {aiSuggestion && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/15 rounded-xl p-3">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">اقتراح للبيع الإضافي:</div>
                <div className="text-[12px] text-emerald-800 dark:text-emerald-300">{aiSuggestion}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
