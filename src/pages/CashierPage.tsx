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
      const summary = await api.getReportsSummary(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
      const topProducts = await api.getReportsTopProducts(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
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
        <div className="bg-white dark:bg-slate-800">
          <div className={`flex items-center gap-3 px-4 overflow-hidden transition-all duration-300 ease-in-out ${headerExpanded ? 'max-h-16 py-2.5 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400" />
              <input
                id="cashier-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج... (F2)"
                className="w-full pr-11 pl-4 py-2.5 border border-card-border dark:border-slate-600/50 rounded-xl text-sm bg-slate-50/50 dark:bg-slate-900/50 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <div className="relative w-40">
              <ScanBarcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                onKeyDown={handleBarcodeScan}
                placeholder="مسح باركود..."
                className="w-full pr-9 pl-3 py-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-slate-50/50 dark:bg-slate-900/50 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-2 pt-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200
                  ${selectedCategory === cat
                    ? 'bg-gradient-to-l from-primary to-indigo-600 text-white shadow-sm shadow-primary/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                {cat}
              </button>
            ))}
            <div className="mr-auto" />
            <button
              onClick={() => setHeaderExpanded(!headerExpanded)}
              className={`w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 ${headerExpanded ? 'rotate-180' : ''}`}
              title={headerExpanded ? 'إخفاء البحث' : 'إظهار البحث'}
            >
              <ChevronDown size={16} />
            </button>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {productsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={40} className="animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-muted dark:text-slate-400">
              <Search size={48} className="text-gray-300 dark:text-slate-600 mb-4" />
              <p className="text-lg">لا توجد منتجات</p>
              <p className="text-sm mt-1">جرّب تغيير البحث أو الفئة</p>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
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
        className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2.5 hover:-translate-y-1 group"
      >
        <Bot size={22} className="group-hover:animate-bounce" />
        <span className="text-sm font-bold tracking-wide">المدير الذكي</span>
      </button>

      {showAI && (
        <div className="fixed bottom-24 left-6 z-40 w-[340px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white tracking-wide">المدير الذكي</h3>
            </div>
            <button onClick={() => setShowAI(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            <button
              onClick={handleAIInsights}
              disabled={aiLoading}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 flex items-center justify-center gap-2"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              رؤى المبيعات اليوم
            </button>

            {aiInsights.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 space-y-2">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                    <span className="text-gray-700 dark:text-slate-300">{insight}</span>
                  </div>
                ))}
              </div>
            )}

            {aiSuggestion && (
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">اقتراح للبيع الإضافي:</div>
                <div className="text-sm text-green-800 dark:text-green-300">{aiSuggestion}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
