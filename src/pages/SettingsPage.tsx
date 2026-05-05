import React, { useState, useEffect, useRef } from 'react';
import { Settings, Store, FileText, Bot, Save, Loader2, Percent, CheckCircle, XCircle, BadgeInfo, Sun, Moon, Monitor, Database, Trash2, Shield, Users, Plus, UserCircle, AlertTriangle } from 'lucide-react';
import { usePOSStore } from '../store/posStore';
import { useThemeStore } from '../store/themeStore';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function SettingsPage() {
  const { settings, saveSettings, addToast, fetchProducts, fetchCustomers, clearCart } = usePOSStore();
  const { theme, setTheme } = useThemeStore();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'كاشير', display_name: '' });
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const backupFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const loadUsers = async () => {
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (err: any) {
      addToast('error', `فشل في تحميل المستخدمين: ${err.message || 'خطأ في الاتصال'}`);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await api.backupList();
      setBackups(data);
    } catch (err: any) {
      addToast('error', `فشل في تحميل النسخ الاحتياطية: ${err.message || 'خطأ في الاتصال'}`);
    }
  };

  useEffect(() => { loadUsers(); loadBackups(); }, []);

  const handleAddUser = async () => {
    try {
      await api.createUser(newUser);
      addToast('success', 'تم إضافة المستخدم');
      setNewUser({ username: '', password: '', role: 'كاشير', display_name: '' });
      setShowUserModal(false);
      loadUsers();
    } catch (err: any) {
      addToast('error', err.message || 'فشل في إضافة المستخدم');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api.deleteUser(id);
      addToast('success', 'تم حذف المستخدم');
      loadUsers();
    } catch (err: any) {
      addToast('error', err.message || 'فشل في حذف المستخدم');
    }
  };

  const handleBackupNow = async () => {
    setBackupLoading(true);
    try {
      await api.backupNow();
      addToast('success', 'تم النسخ الاحتياطي بنجاح');
      loadBackups();
    } catch (err: any) { addToast('error', `فشل في النسخ الاحتياطي: ${err.message || 'خطأ في الاتصال'}`); }
    setBackupLoading(false);
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      await api.backupRestore(file);
      addToast('success', 'تمت الاستعادة بنجاح — أعد تحميل الصفحة');
    } catch (err: any) { addToast('error', `فشل في الاستعادة: ${err.message || 'خطأ في الاتصال'}`); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
  };

  const handleAITest = async () => {
    setTestingAI(true);
    setAiTestResult(null);
    try {
      const result = await api.testAI();
      setAiTestResult({ success: true, message: result.message });
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message || 'فشل الاتصال' });
    }
    setTestingAI(false);
  };

  const handleResetDB = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      await api.resetDatabase();
      addToast('success', 'تم تنظيف قاعدة البيانات بنجاح');
      fetchProducts();
      fetchCustomers();
      clearCart();
    } catch (err: any) {
      addToast('error', `فشل في تنظيف قاعدة البيانات: ${err.message || 'خطأ في الاتصال'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-card-border dark:border-slate-700/50 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Settings size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-text-primary dark:text-white tracking-tight">الإعدادات</h1>
          <p className="text-sm text-text-muted dark:text-slate-400 mt-1">ضبط إعدادات النظام وتخصيص المتجر الخاص بك</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Sun size={18} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">المظهر</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">اختر المظهر المناسب لك</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'فاتح', icon: Sun, desc: 'مظهر نهاري' },
              { id: 'dark', label: 'داكن', icon: Moon, desc: 'مظهر ليلي' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id as 'light' | 'dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === t.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <t.icon size={24} className={theme === t.id ? 'text-primary' : 'text-slate-400 dark:text-slate-500'} />
                <span className={`text-sm font-semibold ${theme === t.id ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>
                  {t.label}
                </span>
                <span className="text-[10px] text-text-muted dark:text-slate-500">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Store size={18} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">معلومات المتجر</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">البيانات الأساسية للمتجر</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">اسم المتجر</label>
              <input
                type="text"
                value={form.store_name || ''}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">العنوان</label>
              <input
                type="text"
                value={form.store_address || ''}
                onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">رقم الهاتف</label>
              <input
                type="text"
                value={form.store_phone || ''}
                onChange={(e) => setForm({ ...form, store_phone: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">الرقم الضريبي</label>
              <input
                type="text"
                value={form.store_tax_number || ''}
                onChange={(e) => setForm({ ...form, store_tax_number: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileText size={18} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">إعدادات الفاتورة</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">رسائل تظهر على الفاتورة</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">رسالة الترحيب</label>
              <input
                type="text"
                value={form.receipt_header || ''}
                onChange={(e) => setForm({ ...form, receipt_header: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1.5">رسالة الشكر</label>
              <input
                type="text"
                value={form.receipt_footer || ''}
                onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-primary/20 dark:border-primary/30 p-7 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Percent size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">إدارة الضرائب</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">ضبط إعدادات الضريبة على المبيعات</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-card-border dark:border-slate-600">
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white">تفعيل الضريبة</p>
                <p className="text-xs text-text-muted dark:text-slate-400 mt-0.5">تطبيق تلقائي على جميع الفواتير</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.tax_enabled === 'true'}
                  onChange={(e) => setForm({ ...form, tax_enabled: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className={`transition-opacity duration-200 ${form.tax_enabled !== 'true' ? 'opacity-40 pointer-events-none' : ''}`}>
              <label className="block text-sm font-semibold text-text-primary dark:text-white mb-2">نسبة الضريبة</label>
              <div className="flex items-center gap-3">
                <div className="relative w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={form.tax_enabled !== 'true'}
                    value={form.tax_rate ?? '15'}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (!isNaN(raw)) {
                        setForm({ ...form, tax_rate: String(Math.min(100, Math.max(0, raw))) });
                      } else {
                        setForm({ ...form, tax_rate: '' });
                      }
                    }}
                    className="w-full border border-card-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary text-center font-bold"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400 font-bold">%</span>
                </div>
                <p className="text-xs text-text-muted dark:text-slate-400">تحسب بعد الخصم</p>
              </div>
            </div>

            {form.tax_enabled === 'true' && parseFloat(form.tax_rate ?? '0') > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-card-border dark:border-slate-600">
                <div className="flex items-center gap-1 text-xs font-semibold text-text-muted dark:text-slate-400 mb-3 uppercase tracking-wide">
                  <BadgeInfo size={13} />
                  مثال توضيحي (فاتورة 100 ج.م)
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-muted dark:text-slate-400">
                    <span>المجموع الفرعي</span>
                    <span>100.00 ج.م</span>
                  </div>
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>ضريبة ({form.tax_rate}%)</span>
                    <span>+ {(parseFloat(form.tax_rate ?? '0')).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-bold text-text-primary dark:text-white border-t border-dashed border-gray-300 dark:border-slate-600 pt-2">
                    <span>الإجمالي</span>
                    <span className="text-primary">{(100 + parseFloat(form.tax_rate ?? '0')).toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">ج.م</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">الجنيه المصري (EGP)</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">العملة الرسمية</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Bot size={18} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">الذكاء الاصطناعي</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">إعدادات مدير النظام الذكي</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-card-border dark:border-slate-600">
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white">تفعيل المساعد الذكي</p>
                <p className="text-xs text-text-muted dark:text-slate-400 mt-0.5">تمكين ميزات AI وصلاحيات الإدارة</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ai_enabled === 'true'}
                  onChange={(e) => setForm({ ...form, ai_enabled: e.target.checked ? 'true' : 'false' })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAITest}
                disabled={testingAI}
                className="flex items-center gap-2 px-5 py-2.5 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-50 transition-colors"
              >
                {testingAI ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                اختبار الاتصال
              </button>
              {aiTestResult && (
                <div className={`flex items-center gap-2 text-sm ${aiTestResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {aiTestResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>{aiTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
              <Shield size={18} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">صلاحيات المدير الذكي</p>
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">إضافة/تعديل/حذف المنتجات والعملاء · تحليل البيانات · تقارير ذكية</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users size={18} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">إدارة المستخدمين</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">إضافة وحذف الكاشيرين</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 border border-card-border dark:border-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-primary">
                    <UserCircle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary dark:text-white">{u.display_name || u.username}</div>
                    <div className="text-xs text-text-muted dark:text-slate-400">@{u.username} · {u.role}</div>
                  </div>
                </div>
                {u.role !== 'مدير' && (
                  <button
                    onClick={() => { if (confirm(`حذف المستخدم "${u.username}"؟`)) handleDeleteUser(u.id); }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            إضافة كاشير
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-7 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Database size={18} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">النسخ الاحتياطي</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">نسخ واستعادة البيانات</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={handleBackupNow}
              disabled={backupLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {backupLoading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              نسخ احتياطي الآن
            </button>
            <button
              type="button"
              onClick={() => backupFileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 border border-card-border dark:border-slate-600 rounded-xl text-sm font-medium text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              استعادة من نسخة
            </button>
            <input
              ref={backupFileRef}
              type="file"
              accept=".db"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleRestoreBackup(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
          {backups.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted dark:text-slate-400">النسخ المتوفرة ({backups.length}/7):</p>
              {backups.slice(0, 5).map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 border border-card-border dark:border-slate-600">
                  <span className="text-text-muted dark:text-slate-400">{new Date(b.created_at).toLocaleString('ar-EG')}</span>
                  <span className="text-text-muted dark:text-slate-500">{(b.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-500/20 p-7 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Database size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">إدارة البيانات</h2>
              <p className="text-xs text-text-muted dark:text-slate-400">تنظيف وإدارة قاعدة البيانات</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDB}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
            تنظيف جميع البيانات
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-gradient-to-l from-primary to-indigo-600 text-white font-bold text-lg hover:from-primary-dark hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-1"
        >
          {saving ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} />}
          حفظ الإعدادات بالكامل
        </button>
      </form>

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="إضافة كاشير جديد">
        <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">اسم المستخدم *</label>
            <input
              type="text"
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">كلمة المرور *</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الاسم المعروض</label>
            <input
              type="text"
              value={newUser.display_name}
              onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700">إضافة</button>
            <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 rounded-xl border border-card-border dark:border-slate-600 text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
