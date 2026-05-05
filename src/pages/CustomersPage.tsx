import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, UserCircle, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';
import { usePOSStore, Customer, Sale } from '../store/posStore';
import { api } from '../lib/api';

function ConfirmDialog() {
  const { confirmDialog, setConfirmDialog } = usePOSStore();
  if (!confirmDialog?.show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDialog(null)} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-yellow-500" />
          <h3 className="font-bold text-lg text-text-primary dark:text-white">تأكيد الحذف</h3>
        </div>
        <p className="text-text-muted dark:text-slate-400 mb-6">{confirmDialog.message}</p>
        <div className="flex gap-3">
          <button onClick={confirmDialog.onConfirm} className="flex-1 py-2.5 rounded-xl bg-danger text-white font-medium hover:bg-red-600">حذف</button>
          <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 rounded-xl border border-card-border dark:border-slate-600 text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { customers, fetchCustomers, addToast, setShowCustomerModal, showCustomerModal, editingCustomer, setConfirmDialog } = usePOSStore();
  const [search, setSearch] = useState('');
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historySales, setHistorySales] = useState<Sale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const totalPurchases = customers.reduce((sum, c) => sum + c.total_purchases, 0);

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search)
  );

  const handleDelete = (customer: Customer) => {
    setConfirmDialog({
      show: true,
      message: `هل تريد حذف العميل "${customer.name}"؟`,
      onConfirm: async () => {
        try {
          await api.deleteCustomer(customer.id);
          addToast('success', 'تم حذف العميل');
          fetchCustomers();
        } catch (err: any) {
          addToast('error', `فشل في حذف العميل: ${err.message || 'خطأ في الاتصال'}`);
        }
        setConfirmDialog(null);
      },
    });
  };

  const showHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setHistoryLoading(true);
    try {
      const sales = await api.getCustomerSales(customer.id);
      setHistorySales(sales);
    } catch (err: any) {
      addToast('error', `فشل في تحميل سجل المشتريات: ${err.message || 'خطأ في الاتصال'}`);
    }
    setHistoryLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-6 shadow-sm flex items-center gap-5 transition-all hover:shadow-md relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-50 dark:bg-slate-700/30 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/5 transition-colors"></div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative z-10">
            <Users size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider">إجمالي العملاء</p>
            <p className="text-2xl font-black text-text-primary dark:text-white mt-1">{customers.length}</p>
            <p className="text-[11px] text-text-muted dark:text-slate-500 mt-0.5 font-medium">عميل مسجّل</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-6 shadow-sm flex items-center gap-5 transition-all hover:shadow-md relative overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-50 dark:bg-slate-700/30 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/5 transition-colors"></div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 relative z-10">
            <Users size={24} className="text-white" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-xs text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider">إجمالي المشتريات</p>
            <p className="text-2xl font-black text-text-primary dark:text-white mt-1 truncate">{totalPurchases.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
            <p className="text-[11px] text-text-muted dark:text-slate-500 mt-0.5 font-medium">قيمة إجمالية</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن عميل..."
            className="w-full pr-12 pl-4 py-3 border border-card-border dark:border-slate-600/50 rounded-2xl text-sm bg-slate-50/50 dark:bg-slate-900/50 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setShowCustomerModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-primary to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-primary-dark hover:to-indigo-700 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          <Plus size={18} />
          إضافة عميل
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 overflow-hidden shadow-sm">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted dark:text-slate-400">
            <Users size={48} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p>لا يوجد عملاء بعد</p>
            <p className="text-sm mt-1">أضف عميلك الأول</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-card-border dark:border-slate-600">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">الاسم</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">رقم الهاتف</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">إجمالي المشتريات</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">آخر زيارة</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-card-border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => showHistory(customer)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-primary">
                        <UserCircle size={20} />
                      </div>
                      <span className="font-medium text-text-primary dark:text-white">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted dark:text-slate-400">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-primary font-medium">{customer.total_purchases.toFixed(2)} ج.م</td>
                  <td className="px-4 py-3 text-text-muted dark:text-slate-400 text-xs">
                    {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => showHistory(customer)}
                        className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-500/10 text-success flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                        title="سجل المشتريات"
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={() => setShowCustomerModal(true, customer)}
                        className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-primary flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                        title="تعديل"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-danger flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog />
      <CustomerModal />

      <Modal
        isOpen={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        title={historyCustomer ? `سجل مشتريات: ${historyCustomer.name}` : ''}
        maxWidth="max-w-2xl"
      >
        {historyLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : historySales.length === 0 ? (
          <div className="text-center text-text-muted dark:text-slate-400 py-10">
            <p>لا توجد مشتريات سابقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historySales.map((sale) => (
              <div key={sale.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary dark:text-white">فاتورة #{sale.id + 1000}</span>
                  <span className="text-xs text-text-muted dark:text-slate-400">{new Date(sale.created_at).toLocaleDateString('ar-EG')} - {new Date(sale.created_at).toLocaleTimeString('ar-EG')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-text-muted dark:text-slate-400">المجموع: </span>
                    <span className="font-medium text-primary">{sale.total.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-text-muted dark:text-slate-400">الربح: </span>
                    <span className="font-medium text-success">{sale.profit.toFixed(2)} ج.م</span>
                  </div>
                  <div>
                    <span className="text-text-muted dark:text-slate-400">الدفع: </span>
                    <span className="text-text-primary dark:text-slate-300">{sale.payment_method}</span>
                  </div>
                </div>
                {sale.items && sale.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sale.items.map((item: any, i: number) => (
                      <span key={i} className="text-xs bg-white dark:bg-slate-600 px-2 py-1 rounded-md border border-card-border dark:border-slate-500 text-text-primary dark:text-slate-300">
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function CustomerModal() {
  const { showCustomerModal, setShowCustomerModal, editingCustomer, fetchCustomers, addToast } = usePOSStore();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCustomer) {
      setForm({ name: editingCustomer.name, phone: editingCustomer.phone });
    } else {
      setForm({ name: '', phone: '' });
    }
  }, [showCustomerModal, editingCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, form);
        addToast('success', 'تم تحديث العميل');
      } else {
        await api.createCustomer(form);
        addToast('success', 'تم إضافة العميل');
      }
      fetchCustomers();
      setShowCustomerModal(false);
    } catch (err: any) {
      addToast('error', `فشل في حفظ العميل: ${err.message || 'خطأ في الاتصال'}`);
    }
    setSaving(false);
  };

  return (
    <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title={editingCustomer ? 'تعديل عميل' : 'إضافة عميل'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الاسم *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">رقم الهاتف</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editingCustomer ? 'تحديث' : 'إضافة'}
          </button>
          <button
            type="button"
            onClick={() => setShowCustomerModal(false)}
            className="px-6 py-2.5 rounded-xl border border-card-border dark:border-slate-600 text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
