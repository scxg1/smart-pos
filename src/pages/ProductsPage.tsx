import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Package, AlertTriangle, Edit, Trash2, Loader2, X, Upload } from 'lucide-react';
import Modal from '../components/Modal';
import { usePOSStore, Product } from '../store/posStore';
import { api } from '../lib/api';

const API_BASE = 'http://localhost:3001';
const UNITS = ['قطعة', 'كيلو', 'لتر', 'علبة', 'كرتون', 'دزينة'];

export default function ProductsPage() {
  const { products, productsLoading, fetchProducts, addToast, setShowProductModal, showProductModal, editingProduct, setConfirmDialog } = usePOSStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const stockValue = products.reduce((sum, p) => sum + p.stock * p.cost_price, 0);
  const lowStockCount = products.filter(p => p.stock < 5).length;

  const categories = useMemo(() => ['الكل', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search);
    const matchCategory = categoryFilter === 'الكل' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleDelete = (product: Product) => {
    setConfirmDialog({
      show: true,
      message: `هل تريد حذف المنتج "${product.name}"؟`,
      onConfirm: async () => {
        try {
          await api.deleteProduct(product.id);
          addToast('success', `تم حذف المنتج "${product.name}"`);
          fetchProducts();
        } catch {
          addToast('error', 'فشل في حذف المنتج');
        }
        setConfirmDialog(null);
      },
    });
  };

  const stats = [
    { label: 'إجمالي المنتجات', value: totalProducts, iconBg: 'bg-blue-500',   icon: Package,       sub: 'صنف مسجّل'      },
    { label: 'إجمالي المخزون',  value: totalStock,    iconBg: 'bg-green-500',  icon: Package,       sub: 'وحدة متوفرة'    },
    { label: 'قيمة المخزون',    value: `${stockValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`, iconBg: 'bg-purple-500', icon: Package, sub: 'بسعر التكلفة' },
    { label: 'منتجات منخفضة',  value: lowStockCount, iconBg: lowStockCount > 0 ? 'bg-red-500' : 'bg-slate-400', icon: AlertTriangle, sub: 'أقل من 5 وحدات' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 p-6 shadow-sm flex items-center gap-5 transition-all hover:shadow-md relative overflow-hidden group">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-50 dark:bg-slate-700/30 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/5 transition-colors"></div>
            <div className={`w-14 h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shadow-lg shrink-0 relative z-10`}>
              <stat.icon size={24} className="text-white" />
            </div>
            <div className="min-w-0 relative z-10">
              <p className="text-xs text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-text-primary dark:text-white mt-1 truncate">{stat.value}</p>
              <p className="text-[11px] text-text-muted dark:text-slate-500 mt-0.5 font-medium">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="w-full pr-12 pl-4 py-3 border border-card-border dark:border-slate-600/50 rounded-2xl text-sm bg-slate-50/50 dark:bg-slate-900/50 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-card-border dark:border-slate-600/50 rounded-2xl px-5 py-3 text-sm bg-slate-50/50 dark:bg-slate-900/50 text-text-primary dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm appearance-none min-w-[140px]"
        >
          {categories.map(c => <option key={c} value={c}>{c === 'الكل' ? 'كل الفئات' : c}</option>)}
        </select>

        <button
          onClick={() => setShowProductModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-primary to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-primary-dark hover:to-indigo-700 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          <Plus size={18} />
          إضافة منتج
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-card-border dark:border-slate-700/50 overflow-hidden shadow-sm">
        {productsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted dark:text-slate-400">
            <Package size={48} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-card-border dark:border-slate-600">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">الصورة</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">اسم المنتج</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">الفئة</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">الباركود</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">سعر الجملة</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">سعر البيع</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">هامش الربح%</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">المخزون</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">الوحدة</th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted dark:text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const margin = product.selling_price > 0
                    ? ((product.selling_price - product.cost_price) / product.selling_price * 100).toFixed(1)
                    : '0';
                  const stockColor = product.stock >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : product.stock >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';

                  return (
                    <tr key={product.id} className="border-b border-card-border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 overflow-hidden">
                          {product.image_path ? (
                            <img src={product.image_path.startsWith('http') ? product.image_path : `${API_BASE}${product.image_path}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=' + encodeURIComponent(product.name); }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary dark:text-white">{product.name}</td>
                      <td className="px-4 py-3 text-text-muted dark:text-slate-400">{product.category}</td>
                      <td className="px-4 py-3 text-text-muted dark:text-slate-400 font-mono text-xs">{product.barcode || '-'}</td>
                      <td className="px-4 py-3 text-text-primary dark:text-white">{product.cost_price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium text-primary">{product.selling_price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${parseFloat(margin) >= 30 ? 'text-green-600 dark:text-green-400' : parseFloat(margin) >= 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockColor}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted dark:text-slate-400">{product.unit}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 transition-opacity">
                          <button
                            onClick={() => setShowProductModal(true, product)}
                            className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-primary flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-danger flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog />
      <ProductModal />
    </div>
  );
}

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

function ProductModal() {
  const { showProductModal, setShowProductModal, editingProduct, fetchProducts, addToast } = usePOSStore();
  const [form, setForm] = useState({ name: '', category: '', barcode: '', cost_price: '', selling_price: '', stock: '', unit: 'قطعة' });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        category: editingProduct.category,
        barcode: editingProduct.barcode,
        cost_price: String(editingProduct.cost_price),
        selling_price: String(editingProduct.selling_price),
        stock: String(editingProduct.stock),
        unit: editingProduct.unit,
      });
      setPreview(editingProduct.image_path ? (editingProduct.image_path.startsWith('http') ? editingProduct.image_path : `${API_BASE}${editingProduct.image_path}`) : '');
    } else {
      setForm({ name: '', category: '', barcode: '', cost_price: '', selling_price: '', stock: '', unit: 'قطعة' });
      setPreview('');
      setImage(null);
    }
  }, [showProductModal, editingProduct]);

  const margin = parseFloat(form.selling_price) > 0
    ? (((parseFloat(form.selling_price) - parseFloat(form.cost_price)) / parseFloat(form.selling_price)) * 100).toFixed(1)
    : '0';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('category', form.category || 'عام');
      formData.append('barcode', form.barcode);
      formData.append('cost_price', form.cost_price);
      formData.append('selling_price', form.selling_price);
      formData.append('stock', form.stock);
      formData.append('unit', form.unit);
      if (image) formData.append('image', image);
      if (editingProduct?.image_path && !image) {
        formData.append('current_image', editingProduct.image_path);
      }

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        addToast('success', 'تم تحديث المنتج');
      } else {
        await api.createProduct(formData);
        addToast('success', 'تم إضافة المنتج');
      }

      fetchProducts();
      setShowProductModal(false);
    } catch {
      addToast('error', 'فشل في حفظ المنتج');
    }
    setSaving(false);
  };

  const existingCategories = Array.from(new Set(usePOSStore.getState().products.map(p => p.category).filter(Boolean)));

  return (
    <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'تعديل منتج' : 'إضافة منتج'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">اسم المنتج *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الفئة *</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            list="categories"
            className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
          />
          <datalist id="categories">
            {existingCategories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الباركود</label>
          <input
            type="text"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">سعر الجملة *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">سعر البيع *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-slate-300">
          هامش الربح: <span className={`font-bold ${parseFloat(margin) >= 30 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{margin}%</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الكمية *</label>
            <input
              type="number"
              required
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">الوحدة</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-card-border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-text-primary dark:text-white focus:outline-none focus:border-primary"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">صورة المنتج</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-card-border dark:border-slate-600 rounded-lg text-sm text-text-muted dark:text-slate-400 hover:border-primary hover:text-primary"
            >
              <Upload size={16} />
              اختر صورة
            </button>
            {preview && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-card-border dark:border-slate-600">
                <img src={preview} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400/1e293b/ffffff?text=Image'; }} />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
          </button>
          <button
            type="button"
            onClick={() => setShowProductModal(false)}
            className="px-6 py-2.5 rounded-xl border border-card-border dark:border-slate-600 text-text-muted dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
