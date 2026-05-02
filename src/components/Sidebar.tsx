import React, { useState } from 'react';
import { ShoppingCart, Package, BarChart2, Users, Settings, Store, Sparkles, Menu, ChevronRight, Bot } from 'lucide-react';
import { usePOSStore } from '../store/posStore';

const navItems = [
  { id: 'cashier',   icon: ShoppingCart, label: 'البيع'       },
  { id: 'products',  icon: Package,      label: 'المنتجات'   },
  { id: 'reports',   icon: BarChart2,    label: 'التقارير'   },
  { id: 'customers', icon: Users,        label: 'العملاء'    },
  { id: 'ai',        icon: Bot,          label: 'المساعد'    },
  { id: 'settings',  icon: Settings,     label: 'الإعدادات'  },
];

export default function Sidebar() {
  const { activePage, setActivePage, products, settings } = usePOSStore();
  const [collapsed, setCollapsed] = useState(true);
  const lowStockCount = products.filter(p => p.stock < 5).length;
  const storeName = settings.store_name || 'نقطة البيع';

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: collapsed ? '64px' : '230px',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        background: 'linear-gradient(180deg, #0f172a 0%, #1a2744 100%)',
      }}
    >
      <div className="shrink-0 border-b border-white/[0.08]" style={{ padding: collapsed ? '12px 10px' : '16px 14px' }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setCollapsed(false)}
              title="فتح القائمة"
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <Store size={15} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 shrink-0">
              <Store size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">{storeName}</div>
              <div className="text-blue-400 text-[11px] mt-0.5">نظام البيع الذكي</div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="إغلاق القائمة"
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors shrink-0"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      <nav
        className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden"
        style={{ padding: collapsed ? '12px 8px' : '12px 10px' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-150 relative
                  ${collapsed ? 'justify-center h-10 px-0' : 'gap-3 px-4 py-2.5'}
                  ${isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'}`}
              >
                {isActive && !collapsed && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/40 rounded-l-full" />
                )}
                <Icon size={18} />
                {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>}

                {item.id === 'products' && lowStockCount > 0 && (
                  <span className={`bg-danger text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center leading-none px-1
                    ${collapsed ? 'absolute -top-1 -right-1' : 'absolute left-3 top-1/2 -translate-y-1/2'}`}>
                    {lowStockCount}
                  </span>
                )}
              </button>

              {collapsed && (
                <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: collapsed ? '0 8px 8px' : '0 10px 8px' }}>
        {collapsed ? (
          <div className="flex justify-center py-1">
            <div
              title="مساعد ذكي مفعّل"
              className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/25 flex items-center justify-center cursor-default"
            >
              <Sparkles size={15} className="text-purple-300" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-l from-purple-500/15 to-indigo-500/15 border border-purple-500/20">
            <Sparkles size={13} className="text-purple-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-purple-300 font-semibold leading-none">مدير النظام الذكي</div>
              <div className="text-[10px] text-purple-400/60 mt-0.5 truncate">صلاحيات كاملة</div>
            </div>
          </div>
        )}
      </div>

      <div
        className="border-t border-white/[0.08]"
        style={{ padding: collapsed ? '12px 8px' : '12px 12px' }}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <div
              title="المدير — مدير المتجر"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-default"
            >
              م
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
              م
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">المدير</div>
              <div className="text-slate-400 text-xs truncate">مدير المتجر</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
