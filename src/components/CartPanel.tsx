import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, UserPlus, StickyNote } from 'lucide-react';
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

  const subtotal = getCartSubtotal();
  const tax = getCartTax();
  const total = getCartTotal();
  const discountAmount = subtotal * cartDiscount / 100;

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
            <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5">
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
                <div className="text-xs text-text-muted dark:text-slate-400">{item.unit_price.toFixed(2)} ج.م × {item.quantity}</div>
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
                <div className="text-sm font-bold text-primary">{(item.unit_price * item.quantity).toFixed(2)}</div>
                <button
                  onClick={() => removeFromCart(item.product_id)}
                  className="text-danger hover:text-red-700 text-xs mt-0.5"
                >
                  <Trash2 size={14} />
                </button>
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
          disabled={cart.length === 0}
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
          <button className="flex-1 py-2 rounded-lg border border-card-border dark:border-slate-600 text-sm text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">
            حفظ الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
