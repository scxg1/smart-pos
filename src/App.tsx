import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import CashierPage from './pages/CashierPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import AIPage from './pages/AIPage';
import ExpensesPage from './pages/ExpensesPage';
import SalesPage from './pages/SalesPage';
import LoginPage from './pages/LoginPage';
import { usePOSStore } from './store/posStore';
import { useThemeStore } from './store/themeStore';
import { Bell, Sun, Moon, Loader2 } from 'lucide-react';
import { setAuthToken, getAuthToken } from './lib/api';

const pages: Record<string, React.FC> = {
  cashier: CashierPage,
  products: ProductsPage,
  reports: ReportsPage,
  sales: SalesPage,
  customers: CustomersPage,
  ai: AIPage,
  settings: SettingsPage,
  expenses: ExpensesPage,
};

const pageMeta: Record<string, { title: string; sub: string }> = {
  cashier:  { title: 'نقطة البيع',     sub: 'إدارة المبيعات والكاشير' },
  products: { title: 'المنتجات',       sub: 'إدارة المخزون والأصناف' },
  reports:  { title: 'التقارير',       sub: 'تحليلات وإحصائيات المبيعات' },
  sales:    { title: 'الفواتير',       sub: 'سجل جميع الفواتير والعمليات' },
  customers:{ title: 'العملاء',        sub: 'إدارة بيانات وسجل العملاء' },
  ai:       { title: 'المساعد الذكي',  sub: 'مدير النظام بالذكاء الاصطناعي' },
  settings: { title: 'الإعدادات',      sub: 'ضبط إعدادات النظام والمتجر' },
  expenses: { title: 'المصروفات',      sub: 'تسجيل ومتابعة المصاريف والنفقات' },
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
    <header className="h-[56px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between px-6 shrink-0">
      <div className="flex flex-col justify-center leading-none">
        <h1 className="text-[15px] font-bold text-slate-800 dark:text-white">{meta.title}</h1>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-[2px]">{meta.sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 px-3 py-1.5 rounded-lg">
          {dateStr}
        </span>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button className="relative w-8 h-8 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200">
          <Bell size={15} />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-sm">
              {lowStockCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const { activePage, fetchSettings, fetchProducts, currentUser, setCurrentUser, fetchCustomers } = usePOSStore();
  const { setTheme } = useThemeStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved as 'light' | 'dark');
  }, []);

  useEffect(() => {
    setCurrentUser(null);
    localStorage.removeItem('auth_user');
    const token = getAuthToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    fetch('http://localhost:3001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('invalid');
      })
      .then(data => {
        setCurrentUser(data.user);
      })
      .catch(() => {
        setAuthToken(null);
        setCurrentUser(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSettings();
      fetchProducts();
      if (activePage === 'customers' || activePage === 'cashier') {
        fetchCustomers();
      }
    }
  }, [currentUser, activePage]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={(token, user) => {
          setAuthToken(token);
          setCurrentUser(user);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }} />
        <Toast />
      </>
    );
  }

  const PageComponent = pages[activePage] || CashierPage;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900" dir="rtl">
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
