import React, { useState } from 'react';
import { ShoppingCart, Package, BarChart2, Users, Settings, Store, Sparkles, Menu, ChevronRight, Bot, LogOut, Wallet, FileText } from 'lucide-react';
import { usePOSStore } from '../store/posStore';
import { setAuthToken } from '../lib/api';

const allNavItems = [
  { id: 'cashier',   icon: ShoppingCart, label: 'البيع',       roles: ['مدير', 'كاشير'] },
  { id: 'products',  icon: Package,      label: 'المنتجات',   roles: ['مدير', 'كاشير'] },
  { id: 'sales',     icon: FileText,     label: 'الفواتير',   roles: ['مدير'] },
  { id: 'reports',   icon: BarChart2,    label: 'التقارير',   roles: ['مدير'] },
  { id: 'expenses',  icon: Wallet,       label: 'المصروفات',  roles: ['مدير'] },
  { id: 'customers', icon: Users,        label: 'العملاء',    roles: ['مدير', 'كاشير'] },
  { id: 'ai',        icon: Bot,          label: 'المساعد',    roles: ['مدير', 'كاشير'] },
  { id: 'settings',  icon: Settings,     label: 'الإعدادات',  roles: ['مدير'] },
];

export default function Sidebar() {
  const { activePage, setActivePage, products, settings, currentUser, setCurrentUser } = usePOSStore();
  const [collapsed, setCollapsed] = useState(true);
  const lowStockCount = products.filter(p => p.stock < 5).length;
  const storeName = settings.store_name || 'نقطة البيع';
  const userRole = currentUser?.role || 'كاشير';
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));
  const initials = (currentUser?.display_name || currentUser?.username || 'م')[0];

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: collapsed ? '62px' : '224px',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'linear-gradient(180deg, #0f172a 0%, #1a2744 100%)',
      }}
    >
      <div className="shrink-0 border-b border-white/[0.06]" style={{ padding: collapsed ? '12px 10px' : '14px 12px' }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setCollapsed(false)}
              title="فتح القائمة"
              className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors duration-200"
            >
              <Menu size={16} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Store size={14} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Store size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">{storeName}</div>
              <div className="text-indigo-300/60 text-[10px] mt-0.5">نظام البيع الذكي</div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="إغلاق القائمة"
              className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors duration-200 shrink-0"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <nav
        className="flex-1 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden"
        style={{ padding: collapsed ? '8px 6px' : '8px 8px' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-200 relative
                  ${collapsed ? 'justify-center h-9 px-0' : 'gap-3 px-3 py-2'}
                  ${isActive
                    ? 'bg-gradient-to-l from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}`}
              >
                {isActive && !collapsed && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/50 rounded-l-full" />
                )}
                <Icon size={17} />
                {!collapsed && <span className="text-[13px] font-semibold whitespace-nowrap">{item.label}</span>}

                {item.id === 'products' && lowStockCount > 0 && (
                  <span className={`bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center leading-none px-1 shadow-sm
                    ${collapsed ? 'absolute -top-0.5 -right-0.5' : 'absolute left-3 top-1/2 -translate-y-1/2'}`}>
                    {lowStockCount}
                  </span>
                )}
              </button>

              {collapsed && (
                <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl border border-white/10">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-l from-purple-500/10 to-indigo-500/10 border border-purple-500/15">
            <Sparkles size={12} className="text-purple-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-purple-300 font-semibold leading-none">مدير النظام الذكي</div>
              <div className="text-[9px] text-purple-400/50 mt-0.5 truncate">صلاحيات كاملة</div>
            </div>
          </div>
        </div>
      )}

      <div
        className="border-t border-white/[0.06]"
        style={{ padding: collapsed ? '10px 6px' : '10px 10px' }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setAuthToken(null);
                localStorage.removeItem('auth_user');
                setCurrentUser(null);
              }}
              title="تسجيل الخروج"
              className="w-8 h-8 rounded-xl hover:bg-red-500/15 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors duration-200"
            >
              <LogOut size={14} />
            </button>
            <div
              title={`${currentUser?.display_name || currentUser?.username || ''} — ${userRole}`}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-default"
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[13px] font-semibold truncate">{currentUser?.display_name || currentUser?.username || 'المدير'}</div>
              <div className="text-slate-500 text-[11px] truncate">{userRole}</div>
            </div>
            <button
              onClick={() => {
                setAuthToken(null);
                localStorage.removeItem('auth_user');
                setCurrentUser(null);
              }}
              title="تسجيل الخروج"
              className="w-6 h-6 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors duration-200 shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
