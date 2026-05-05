import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, Edit3, Save, X, ToggleLeft, ToggleRight, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { usePOSStore } from '../store/posStore';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  note: string;
}

const CATEGORIES = ['رواتب', 'إيجار', 'مشتريات', 'كهرباء وماء', 'صيانة', 'نقل', 'تسويق', 'متنوع', 'عام'];

const emptyForm = { description: '', amount: '', category: 'عام', expense_date: new Date().toISOString().split('T')[0], note: '' };

export default function ExpensesPage() {
  const { settings, saveSettings, addToast } = usePOSStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ total: number; byCategory: any[] }>({ total: 0, byCategory: [] });
  const linkEnabled = settings.link_expenses_to_profit === 'true';

  const load = async () => {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([api.getExpenses(), api.getExpensesSummary()]);
      setExpenses(data);
      setSummary(sum);
    } catch (err: any) {
      addToast('error', `فشل في تحميل المصروفات: ${err.message || 'خطأ في الاتصال'}`);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggleLink = async () => {
    const newVal = linkEnabled ? 'false' : 'true';
    await saveSettings({ ...settings, link_expenses_to_profit: newVal });
    addToast('success', linkEnabled ? 'تم فصل المصروفات عن الأرباح' : 'تم ربط المصروفات بتقارير الأرباح');
  };

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount) {
      addToast('warning', 'الوصف والمبلغ مطلوبان');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateExpense(editingId, { ...form, amount: Number(form.amount) });
        addToast('success', 'تم تحديث المصروف');
      } else {
        await api.createExpense({ ...form, amount: Number(form.amount) });
        addToast('success', 'تم إضافة المصروف');
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch (err: any) {
      addToast('error', `فشل في حفظ المصروف: ${err.message || 'خطأ في الاتصال'}`);
    }
    setSaving(false);
  };

  const handleEdit = (exp: Expense) => {
    setForm({ description: exp.description, amount: String(exp.amount), category: exp.category, expense_date: exp.expense_date, note: exp.note || '' });
    setEditingId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    try {
      await api.deleteExpense(id);
      addToast('success', 'تم الحذف');
      await load();
    } catch (err: any) {
      addToast('error', `فشل في الحذف: ${err.message || 'خطأ في الاتصال'}`);
    }
  };

  const cancelForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-200">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">إدارة المصروفات</h1>
              <p className="text-sm text-slate-400">تسجيل ومتابعة النفقات والمصاريف</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            إضافة مصروف
          </button>
        </div>

        {/* Link to Profit Toggle */}
        <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${
          linkEnabled
            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${linkEnabled ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <TrendingDown size={17} className={linkEnabled ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">ربط المصروفات بتقارير الأرباح</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {linkEnabled
                  ? 'المصروفات تُطرح تلقائياً من إجمالي الأرباح في التقارير'
                  : 'المصروفات مسجّلة للمراجعة فقط ولا تؤثر على حسابات الأرباح'}
              </p>
            </div>
          </div>
          <button onClick={handleToggleLink} className="shrink-0">
            {linkEnabled
              ? <ToggleRight size={36} className="text-rose-500" />
              : <ToggleLeft size={36} className="text-slate-400" />}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">إجمالي المصروفات</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{summary.total.toFixed(2)}</p>
            <p className="text-xs text-slate-400">ج.م</p>
          </div>
          {summary.byCategory.slice(0, 2).map((cat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1 truncate">{cat.category}</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{Number(cat.total).toFixed(2)}</p>
              <p className="text-xs text-slate-400">{cat.count} مصروف</p>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white">{editingId ? 'تعديل المصروف' : 'مصروف جديد'}</h3>
              <button type="button" onClick={cancelForm} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">الوصف *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="مثال: راتب موظف، إيجار شهر يناير..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">الفئة</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">التاريخ</label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ملاحظة</label>
                <input
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="اختياري..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                حفظ
              </button>
              <button type="button" onClick={cancelForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                إلغاء
              </button>
            </div>
          </form>
        )}

        {/* Expenses List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-700/50">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">سجل المصروفات</h3>
            <p className="text-xs text-slate-400 mt-0.5">{expenses.length} مصروف مسجّل</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center mb-3">
                <AlertCircle size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">لا توجد مصروفات مسجّلة</p>
              <p className="text-xs text-slate-300 mt-0.5">ابدأ بإضافة مصروف من الزر أعلاه</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{exp.description}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        {exp.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{exp.expense_date}</span>
                      {exp.note && <span className="text-xs text-slate-400 truncate max-w-[200px]">— {exp.note}</span>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">{Number(exp.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">ج.م</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="w-8 h-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
