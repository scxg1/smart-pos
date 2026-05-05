import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, UserPlus, StickyNote, X, AlertCircle } from 'lucide-react';
import { usePOSStore } from '../store/posStore';

const API_BASE = 'http://localhost:3001';

export default function CartPanel() {
  const {
    cart, cartCustomer, cartDiscount, cartNote, paymentMethod, taxEnabled, settings,
    removeFromCart, updateCartQuantity, setCartCustomer, setCartDiscount, setCartNote,
    setPaymentMethod, setTaxEnabled, getCartTotal, getCartSubtotal, getCartTax,
    completeSale, clearCart, customers, fetchCustomers,
    setShowCustomerModal,
  } = usePOSStore();

  const [showNote, setShowNote] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showSavedOrders, setShowSavedOrders] = useState(false);

  const subtotal = getCartSubtotal();
  const tax = getCartTax();
  const total = getCartTotal();

  const hasPriceIssue = cart.some(item => item.needs_price || item.unit_price <= 0);

  const setItemPrice = (uid: number, price: number) => {
    usePOSStore.setState(s => ({
      cart: s.cart.map(item =>
        item.uid === uid
          ? { ...item, unit_price: price }
          : item
      ),
    }));
  };

  const confirmItemPrice = (uid: number) => {
    usePOSStore.setState(s => ({
      cart: s.cart.map(item =>
        item.uid === uid
          ? { ...item, needs_price: false }
          : item
      ),
    }));
  };

  const getSavedOrders = (): any[] => {
    try {
      return JSON.parse(localStorage.getItem('saved_orders') || '[]');
    } catch { return []; }
  };

  const saveOrder = () => {
    if (cart.length === 0) return;
    const orders = getSavedOrders();
    orders.push({
      id: Date.now(),
      cart: [...cart],
      customer: cartCustomer,
      discount: cartDiscount,
      note: cartNote,
      paymentMethod,
      savedAt: new Date().toLocaleString('ar-EG'),
    });
    localStorage.setItem('saved_orders', JSON.stringify(orders));
    clearCart();
    usePOSStore.getState().addToast('success', 'تم حفظ الطلب بنجاح');
  };

  const loadOrder = (order: any) => {
    const { addToCart, updateCartQuantity } = usePOSStore.getState();
    clearCart();
    if (order.customer) setCartCustomer(order.customer);
    if (order.discount) setCartDiscount(order.discount);
    if (order.note) setCartNote(order.note);
    if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
    order.cart.forEach((item: any) => {
      const existing = usePOSStore.getState().cart.find(c => c.product_id === item.product_id);
      if (existing) {
        updateCartQuantity(item.product_id, existing.quantity + item.quantity);
      } else {
        usePOSStore.setState(s => ({ cart: [...s.cart, item] }));
      }
    });
    setShowSavedOrders(false);
    usePOSStore.getState().addToast('success', 'تم استرجاع الطلب');
  };

  const deleteSavedOrder = (orderId: number) => {
    const orders = getSavedOrders().filter(o => o.id !== orderId);
    localStorage.setItem('saved_orders', JSON.stringify(orders));
    setShowSavedOrders(false);
    setTimeout(() => setShowSavedOrders(true), 10);
  };

  const paymentMethods = [
    { id: 'نقدي', label: 'نقدي' },
    { id: 'بطاقة', label: 'بطاقة' },
    { id: 'آجل', label: 'آجل' },
  ];

  return (
    <div className="w-[310px] bg-white dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700/50 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-indigo-500" />
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">سلة المشتريات</h2>
          <span className="bg-indigo-500 text-white text-[10px] rounded-full px-2 py-0.5 mr-auto font-bold">
            {cart.length}
          </span>
        </div>

        <button
          onClick={() => {
            fetchCustomers();
            setShowCustomerPicker(!showCustomerPicker);
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors duration-200"
        >
          <UserPlus size={15} />
          {cartCustomer ? cartCustomer.name : 'عميل جديد +'}
        </button>

        {cartCustomer && (
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
            <span>العميل: <strong className="text-indigo-600 dark:text-indigo-400">{cartCustomer.name}</strong></span>
            <button onClick={() => setCartCustomer(null)} className="text-red-500 hover:underline">إزالة</button>
          </div>
        )}

        {showCustomerPicker && (
          <div className="mt-2 border border-slate-200 dark:border-slate-600 rounded-xl max-h-36 overflow-auto bg-white dark:bg-slate-800 shadow-lg">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCartCustomer(c); setShowCustomerPicker(false); }}
                className="w-full text-right px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors"
              >
                <div className="font-medium text-slate-800 dark:text-white">{c.name}</div>
                <div className="text-[11px] text-slate-400">{c.phone}</div>
              </button>
            ))}
            <button
              onClick={() => { setShowCustomerPicker(false); setShowCustomerModal(true); }}
              className="w-full text-right px-3 py-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
            >
              + إضافة عميل جديد
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-10">
            <ShoppingCart size={36} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
            <p>السلة فارغة</p>
            <p className="text-[11px] mt-1 text-slate-300 dark:text-slate-600">اضغط على منتج لإضافته</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.uid} className={`bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2.5 transition-all duration-200 ${item.needs_price ? 'ring-2 ring-amber-400/60 dark:ring-amber-500/50' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-600 shrink-0 overflow-hidden">
                  {item.image_path ? (
                    <img src={item.image_path.startsWith('http') ? item.image_path : `${API_BASE}${item.image_path}`} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(item.name); }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500">
                      <ShoppingCart size={14} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-medium text-slate-800 dark:text-white truncate">{item.name}</h4>
                  {item.needs_price || item.unit_price <= 0 ? (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle size={11} className="text-amber-500 shrink-0" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="أدخل السعر"
                        autoFocus
                        value={item.unit_price || ''}
                        className="w-full text-[11px] border border-amber-300 dark:border-amber-600 rounded px-1.5 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItemPrice(item.uid, val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && item.unit_price > 0) {
                            confirmItemPrice(item.uid);
                          }
                        }}
                      />
                      <button 
                        onClick={() => { if (item.unit_price > 0) confirmItemPrice(item.uid); }}
                        className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 shadow-sm shrink-0"
                      >
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{item.unit_price.toFixed(2)} ج.م × {item.quantity}</div>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => updateCartQuantity(item.uid, item.quantity - 1)}
                    className="w-5 h-5 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-6 text-center text-[11px] font-semibold text-slate-800 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.uid, item.quantity + 1)}
                    className="w-5 h-5 rounded-md bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <div className="text-left shrink-0">
                  {!item.needs_price && item.unit_price > 0 && (
                    <div className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{(item.unit_price * item.quantity).toFixed(2)}</div>
                  )}
                  <button
                    onClick={() => removeFromCart(item.uid)}
                    className="text-red-400 hover:text-red-600 text-[11px] mt-0.5 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-3">
        {showNote ? (
          <textarea
            value={cartNote}
            onChange={(e) => setCartNote(e.target.value)}
            placeholder="إضافة ملاحظة..."
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2 text-sm resize-none h-14 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setShowNote(true)}
            className="flex items-center gap-2 text-[12px] text-slate-400 hover:text-indigo-500 py-2 transition-colors"
          >
            <StickyNote size={13} />
            إضافة ملاحظة...
          </button>
        )}
      </div>

      {hasPriceIssue && (
        <div className="mx-3 mb-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] rounded-xl px-3 py-2 flex items-center gap-2">
          <AlertCircle size={13} className="shrink-0" />
          <span>أدخل السعر للمنتجات المحددة</span>
        </div>
      )}

      <div className="border-t border-slate-100 dark:border-slate-700/50 p-3 space-y-2.5">
        <div className="flex justify-between text-[12px] text-slate-400">
          <span>المجموع الفرعي</span>
          <span>{subtotal.toFixed(2)} ج.م</span>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span className="text-slate-400">الخصم</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={cartDiscount}
              onChange={(e) => setCartDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-12 text-center border border-slate-200 dark:border-slate-600 rounded-lg py-0.5 text-[11px] bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
            />
            <span className="text-slate-400">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">ضريبة {settings.tax_rate || 15}%</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-7 h-3.5 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
          <span className="text-slate-400">{tax.toFixed(2)} ج.م</span>
        </div>

        <div className="border-t border-dashed border-slate-200 dark:border-slate-600 pt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800 dark:text-white">الإجمالي</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{total.toFixed(2)} ج.م</span>
          </div>
        </div>

        <div className="flex gap-1.5">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200
                ${paymentMethod === m.id ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={completeSale}
          disabled={cart.length === 0 || hasPriceIssue}
          className="btn-success w-full py-3 text-base"
        >
          دفع {total.toFixed(2)} ج.م
        </button>

        <div className="flex gap-1.5">
          <button
            onClick={clearCart}
            className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-[11px] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            مسح السلة
          </button>
          <button
            onClick={saveOrder}
            disabled={cart.length === 0}
            className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-[11px] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            حفظ الطلب
          </button>
        </div>

        {showSavedOrders && (
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">الطلبات المحفوظة</span>
              <button onClick={() => setShowSavedOrders(false)} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            </div>
            {getSavedOrders().length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-[11px]">لا توجد طلبات محفوظة</div>
            ) : (
              getSavedOrders().map((order: any) => (
                <div key={order.id} className="px-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                      {order.cart.length} منتج — {order.cart.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0).toFixed(2)} ج.م
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadOrder(order)} className="text-[10px] text-indigo-500 hover:underline">استرجاع</button>
                      <button onClick={() => deleteSavedOrder(order.id)} className="text-[10px] text-red-500 hover:underline">حذف</button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">{order.savedAt}</div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setShowSavedOrders(!showSavedOrders)}
          className="w-full py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-[11px] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1 transition-colors"
        >
          الطلبات المحفوظة ({getSavedOrders().length})
        </button>
      </div>
    </div>
  );
}
