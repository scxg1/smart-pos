import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, UserPlus, StickyNote, Clock, X, AlertCircle } from 'lucide-react';
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
  const discountAmount = subtotal * cartDiscount / 100;

  const hasPriceIssue = cart.some(item => item.needs_price || item.unit_price <= 0);

  const setItemPrice = (productId: number, price: number) => {
    usePOSStore.setState(s => ({
      cart: s.cart.map(item =>
        item.product_id === productId
          ? { ...item, unit_price: price }
          : item
      ),
    }));
  };

  const confirmItemPrice = (productId: number) => {
    usePOSStore.setState(s => ({
      cart: s.cart.map(item =>
        item.product_id === productId
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

  const handleCustomerSelect = (customer: any) => {
    setCartCustomer(customer);
    setShowCustomerPicker(false);
  };

  return (
    <div className="w-[320px] bg-white dark:bg-slate-800 border-l border-card-border dark:border-slate-700 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-card-border dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary" />
          <h2 className="font-bold text-text-primary dark:text-white">سلة المشتريات</h2>
          <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 mr-auto">
            {cart.length}
          </span>
        </div>

        <button
          onClick={() => {
            fetchCustomers();
            setShowCustomerPicker(!showCustomerPicker);
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
        >
          <UserPlus size={16} />
          {cartCustomer ? cartCustomer.name : 'عميل جديد +'}
        </button>

        {cartCustomer && (
          <div className="mt-2 text-xs text-text-muted dark:text-slate-400 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
            <span>العميل: <strong className="text-primary">{cartCustomer.name}</strong></span>
            <button onClick={() => setCartCustomer(null)} className="text-danger hover:underline text-xs">إزالة</button>
          </div>
        )}

        {showCustomerPicker && (
          <div className="mt-2 border border-card-border dark:border-slate-600 rounded-lg max-h-40 overflow-auto bg-white dark:bg-slate-800 shadow-lg">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCustomerSelect(c)}
                className="w-full text-right px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm border-b border-card-border dark:border-slate-700 last:border-0"
              >
                <div className="font-medium text-text-primary dark:text-white">{c.name}</div>
                <div className="text-xs text-text-muted dark:text-slate-400">{c.phone}</div>
              </button>
            ))}
            <button
              onClick={() => { setShowCustomerPicker(false); setShowCustomerModal(true); }}
              className="w-full text-right px-3 py-2 text-primary text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              + إضافة عميل جديد
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center text-text-muted dark:text-slate-400 text-sm py-10">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
            <p>السلة فارغة</p>
            <p className="text-xs mt-1">اضغط على منتج لإضافته</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product_id} className={`bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5 ${item.needs_price ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-600 shrink-0 overflow-hidden">
                  {item.image_path ? (
                    <img src={item.image_path.startsWith('http') ? item.image_path : `${API_BASE}${item.image_path}`} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(item.name); }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">
                      <ShoppingCart size={16} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-primary dark:text-white truncate">{item.name}</h4>
                  {item.needs_price || item.unit_price <= 0 ? (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle size={12} className="text-amber-500 shrink-0" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="أدخل السعر"
                        autoFocus
                        value={item.unit_price || ''}
                        className="w-full text-xs border border-amber-300 dark:border-amber-600 rounded px-1.5 py-1 bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItemPrice(item.product_id, val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && item.unit_price > 0) {
                            confirmItemPrice(item.product_id);
                          }
                        }}
                      />
                      <button 
                        onClick={() => { if (item.unit_price > 0) confirmItemPrice(item.product_id); }}
                        className="p-1 bg-primary text-white rounded hover:bg-blue-600 shadow-sm shrink-0"
                      >
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted dark:text-slate-400">{item.unit_price.toFixed(2)} ج.م × {item.quantity}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                    className="w-6 h-6 rounded-md bg-white dark:bg-slate-600 border border-card-border dark:border-slate-500 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-500"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-sm font-medium text-text-primary dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                    className="w-6 h-6 rounded-md bg-white dark:bg-slate-600 border border-card-border dark:border-slate-500 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-500"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="text-left shrink-0">
                  {!item.needs_price && item.unit_price > 0 && (
                    <div className="text-sm font-bold text-primary">{(item.unit_price * item.quantity).toFixed(2)}</div>
                  )}
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-danger hover:text-red-700 text-xs mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4">
        {showNote ? (
          <textarea
            value={cartNote}
            onChange={(e) => setCartNote(e.target.value)}
            placeholder="إضافة ملاحظة..."
            className="w-full border border-card-border dark:border-slate-600 rounded-lg p-2 text-sm resize-none h-16 bg-white dark:bg-slate-700 text-text-primary dark:text-white"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setShowNote(true)}
            className="flex items-center gap-2 text-sm text-text-muted dark:text-slate-400 hover:text-primary py-2"
          >
            <StickyNote size={14} />
            إضافة ملاحظة...
          </button>
        )}
      </div>

      {hasPriceIssue && (
        <div className="mx-4 mb-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>أدخل السعر للمنتجات المحددة لإتمام البيع</span>
        </div>
      )}

      <div className="border-t border-card-border dark:border-slate-700 p-4 space-y-3">
        <div className="flex justify-between text-sm text-text-muted dark:text-slate-400">
          <span>المجموع الفرعي</span>
          <span>{subtotal.toFixed(2)} ج.م</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted dark:text-slate-400">الخصم</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={cartDiscount}
              onChange={(e) => setCartDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-14 text-center border border-card-border dark:border-slate-600 rounded-md py-0.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white"
            />
            <span className="text-text-muted dark:text-slate-400">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-text-muted dark:text-slate-400">ضريبة {settings.tax_rate || 15}%</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <span className="text-text-muted dark:text-slate-400">{tax.toFixed(2)} ج.م</span>
        </div>

        <div className="border-t border-dashed border-card-border dark:border-slate-600 pt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-text-primary dark:text-white text-lg">الإجمالي</span>
            <span className="font-bold text-primary text-xl">{total.toFixed(2)} ج.م</span>
          </div>
        </div>

        <div className="flex gap-2">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${paymentMethod === m.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 text-text-muted dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={completeSale}
          disabled={cart.length === 0 || hasPriceIssue}
          className="w-full py-3 rounded-xl bg-success text-white font-bold text-lg hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          دفع {total.toFixed(2)} ج.م
        </button>

        <div className="flex gap-2">
          <button
            onClick={clearCart}
            className="flex-1 py-2 rounded-lg border border-card-border dark:border-slate-600 text-sm text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            مسح السلة
          </button>
          <button
            onClick={saveOrder}
            disabled={cart.length === 0}
            className="flex-1 py-2 rounded-lg border border-card-border dark:border-slate-600 text-sm text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            حفظ الطلب
          </button>
        </div>

        {showSavedOrders && (
          <div className="border border-card-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-lg max-h-60 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-3 py-2 border-b border-card-border dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary dark:text-white">الطلبات المحفوظة</span>
              <button onClick={() => setShowSavedOrders(false)} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
            {getSavedOrders().length === 0 ? (
              <div className="text-center py-6 text-text-muted dark:text-slate-400 text-sm">لا توجد طلبات محفوظة</div>
            ) : (
              getSavedOrders().map((order: any) => (
                <div key={order.id} className="px-3 py-2 border-b border-card-border dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary dark:text-white">
                      {order.cart.length} منتج — {order.cart.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0).toFixed(2)} ج.م
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => loadOrder(order)} className="text-[11px] text-primary hover:underline">استرجاع</button>
                      <button onClick={() => deleteSavedOrder(order.id)} className="text-[11px] text-danger hover:underline mr-2">حذف</button>
                    </div>
                  </div>
                  <div className="text-[11px] text-text-muted dark:text-slate-400">{order.savedAt}</div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setShowSavedOrders(!showSavedOrders)}
          className="w-full py-2 rounded-lg border border-card-border dark:border-slate-600 text-sm text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1"
        >
          <Clock size={14} />
          الطلبات المحفوظة ({getSavedOrders().length})
        </button>
      </div>
    </div>
  );
}
