import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import CashierPage from './pages/CashierPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import AIPage from './pages/AIPage';
import { usePOSStore } from './store/posStore';
import { useThemeStore } from './store/themeStore';
import { Bell, Sun, Moon } from 'lucide-react';

const pages: Record<string, React.FC> = {
  cashier: CashierPage,
  products: ProductsPage,
  reports: ReportsPage,
  customers: CustomersPage,
  ai: AIPage,
  settings: SettingsPage,
};

const pageMeta: Record<string, { title: string; sub: string }> = {
  cashier:   { title: 'نقطة البيع',  sub: 'إدارة المبيعات والكاشير'          },
  products:  { title: 'المنتجات',    sub: 'إدارة المخزون والأصناف'            },
  reports:   { title: 'التقارير',    sub: 'تحليلات وإحصائيات المبيعات'        },
  customers: { title: 'العملاء',     sub: 'إدارة بيانات وسجل العملاء'         },
  ai:        { title: 'المساعد الذكي', sub: 'مدير النظام بالذكاء الاصطناعي'    },
  settings:  { title: 'الإعدادات',   sub: 'ضبط إعدادات النظام والمتجر'        },
};

function TopBar() {
  const { activePage, products } = usePOSStore();
  const { theme, toggleTheme } = useThemeStore();
  const meta = pageMeta[activePage] || pageMeta.cashier;
  const lowStockCount = products.filter(p => p.stock < 5).length;
  const dateStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header className="h-[58px] bg-white dark:bg-slate-800 border-b border-card-border dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex flex-col justify-center leading-none">
        <h1 className="text-[15px] font-bold text-text-primary dark:text-white">{meta.title}</h1>
        <p className="text-xs text-text-muted dark:text-slate-400 mt-[3px]">{meta.sub}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs text-text-muted dark:text-slate-400 bg-gray-50 dark:bg-slate-700 border border-card-border dark:border-slate-600 px-3 py-1.5 rounded-lg">
          {dateStr}
        </span>

        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 border border-card-border dark:border-slate-600 flex items-center justify-center text-text-muted dark:text-slate-400 transition-colors"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button className="relative w-9 h-9 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 border border-card-border dark:border-slate-600 flex items-center justify-center text-text-muted dark:text-slate-400 transition-colors">
          <Bell size={16} />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {lowStockCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const { activePage, fetchSettings, fetchProducts } = usePOSStore();
  const { setTheme } = useThemeStore();

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved as 'light' | 'dark');
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchProducts();
  }, []);

  const PageComponent = pages[activePage] || CashierPage;

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg dark:bg-slate-900" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <PageComponent />
        </main>
      </div>
      <Toast />
    </div>
  );
}
