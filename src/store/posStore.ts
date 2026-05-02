import { create } from 'zustand';
import { api } from '../lib/api';

export interface Product {
  id: number;
  name: string;
  category: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  unit: string;
  image_path: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  total_purchases: number;
  last_visit?: string;
}

export interface CartItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  unit: string;
  image_path: string;
  category: string;
}

export interface Sale {
  id: number;
  customer_id: number | null;
  total: number;
  cost_total: number;
  profit: number;
  discount: number;
  tax: number;
  payment_method: string;
  note: string;
  created_at: string;
  items?: any[];
  receiptNumber?: number;
}

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface POSState {
  // Navigation
  activePage: string;
  setActivePage: (page: string) => void;

  // Products
  products: Product[];
  productsLoading: boolean;
  fetchProducts: () => Promise<void>;

  // Cart
  cart: CartItem[];
  cartCustomer: Customer | null;
  cartDiscount: number;
  cartNote: string;
  paymentMethod: string;
  taxEnabled: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setCartCustomer: (customer: Customer | null) => void;
  setCartDiscount: (discount: number) => void;
  setCartNote: (note: string) => void;
  setPaymentMethod: (method: string) => void;
  setTaxEnabled: (enabled: boolean) => void;
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getCartTax: () => number;

  // Sales
  lastSale: Sale | null;
  completeSale: () => Promise<void>;
  showReceipt: boolean;
  setShowReceipt: (show: boolean) => void;

  // Customers
  customers: Customer[];
  fetchCustomers: () => Promise<void>;

  // Settings
  settings: Record<string, string>;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Record<string, string>) => Promise<void>;

  // Toast
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], message: string) => void;
  removeToast: (id: number) => void;

  // AI
  aiMessages: any[];
  aiActiveSessionId: number | null;
  setAiMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  setAiActiveSessionId: (id: number | null) => void;
  aiInsights: string[];
  aiLoading: boolean;
  aiSuggestion: string;
  fetchAIInsights: (period: string) => Promise<void>;
  fetchAIUpsell: () => Promise<void>;

  // Modals
  showProductModal: boolean;
  editingProduct: Product | null;
  setShowProductModal: (show: boolean, product?: Product | null) => void;
  showCustomerModal: boolean;
  editingCustomer: Customer | null;
  setShowCustomerModal: (show: boolean, customer?: Customer | null) => void;
  showCustomerHistory: boolean;
  selectedCustomerHistory: Sale[];
  setShowCustomerHistory: (show: boolean, sales?: Sale[]) => void;
  confirmDialog: { show: boolean; message: string; onConfirm: () => void } | null;
  setConfirmDialog: (dialog: { show: boolean; message: string; onConfirm: () => void } | null) => void;
}

let toastId = 0;

export const usePOSStore = create<POSState>((set, get) => ({
  // Navigation
  activePage: 'cashier',
  setActivePage: (page) => set({ activePage: page }),

  // Products
  products: [],
  productsLoading: false,
  fetchProducts: async () => {
    set({ productsLoading: true });
    try {
      const products = await api.getProducts();
      set({ products, productsLoading: false });
    } catch (err: any) {
      set({ productsLoading: false });
      get().addToast('error', 'فشل في تحميل المنتجات');
    }
  },

  // Cart
  cart: [],
  cartCustomer: null,
  cartDiscount: 0,
  cartNote: '',
  paymentMethod: 'نقدي',
  taxEnabled: true,

  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        get().addToast('warning', 'المخزون غير كافٍ');
        return;
      }
      set({
        cart: cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      if (product.stock <= 0) {
        get().addToast('warning', 'المنتج غير متوفر في المخزون');
        return;
      }
      set({
        cart: [...cart, {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.selling_price,
          cost_price: product.cost_price,
          unit: product.unit,
          image_path: product.image_path,
          category: product.category,
        }],
      });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.product_id !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    });
  },

  clearCart: () => set({ cart: [], cartCustomer: null, cartDiscount: 0, cartNote: '' }),
  setCartCustomer: (customer) => set({ cartCustomer: customer }),
  setCartDiscount: (discount) => set({ cartDiscount: discount }),
  setCartNote: (note) => set({ cartNote: note }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setTaxEnabled: (enabled) => set({ taxEnabled: enabled }),

  getCartSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  },

  getCartTax: () => {
    const { taxEnabled, settings, cartDiscount } = get();
    if (!taxEnabled) return 0;
    const taxRate = parseFloat(settings.tax_rate || '15') / 100;
    const subtotal = get().getCartSubtotal();
    const afterDiscount = subtotal - (subtotal * cartDiscount / 100);
    return afterDiscount * taxRate;
  },

  getCartTotal: () => {
    const subtotal = get().getCartSubtotal();
    const discountAmount = subtotal * get().cartDiscount / 100;
    const tax = get().getCartTax();
    return subtotal - discountAmount + tax;
  },

  // Sales
  lastSale: null,
  showReceipt: false,
  setShowReceipt: (show) => set({ showReceipt: show }),

  completeSale: async () => {
    const { cart, cartCustomer, cartDiscount, cartNote, paymentMethod } = get();
    if (cart.length === 0) return;

    const subtotal = get().getCartSubtotal();
    const tax = get().getCartTax();
    const total = get().getCartTotal();
    const costTotal = cart.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
    const profit = total - tax - costTotal;

    try {
      const sale = await api.createSale({
        customer_id: cartCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          subtotal: item.unit_price * item.quantity,
        })),
        total,
        cost_total: costTotal,
        profit,
        discount: cartDiscount,
        tax,
        payment_method: paymentMethod,
        note: cartNote,
      });

      set({
        lastSale: sale,
        showReceipt: true,
        cart: [],
        cartCustomer: null,
        cartDiscount: 0,
        cartNote: '',
      });
      get().addToast('success', 'تمت عملية البيع بنجاح');
      get().fetchProducts();
    } catch (err: any) {
      get().addToast('error', 'فشل في إتمام عملية البيع');
    }
  },

  // Customers
  customers: [],
  fetchCustomers: async () => {
    try {
      const customers = await api.getCustomers();
      set({ customers });
    } catch (err: any) {
      get().addToast('error', 'فشل في تحميل العملاء');
    }
  },

  // Settings
  settings: {},
  fetchSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings, taxEnabled: settings.tax_enabled === 'true' });
    } catch (err: any) {
      // Settings not loaded yet, server might not be running
    }
  },
  saveSettings: async (newSettings) => {
    try {
      await api.updateSettings(newSettings);
      set({ settings: newSettings, taxEnabled: newSettings.tax_enabled === 'true' });
      get().addToast('success', 'تم حفظ الإعدادات');
    } catch (err: any) {
      get().addToast('error', 'فشل في حفظ الإعدادات');
    }
  },

  // Toast
  toasts: [],
  addToast: (type, message) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, type, message }] });
    setTimeout(() => get().removeToast(id), 3000);
  },
  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) });
  },

  // AI
  aiMessages: [],
  aiActiveSessionId: null,
  setAiMessages: (messages) => set((state) => ({
    aiMessages: typeof messages === 'function' ? messages(state.aiMessages) : messages
  })),
  setAiActiveSessionId: (id) => set({ aiActiveSessionId: id }),
  aiInsights: [],
  aiLoading: false,
  aiSuggestion: '',
  fetchAIInsights: async (period) => {
    set({ aiLoading: true });
    try {
      const result = await api.getAIInsights(period);
      set({ aiInsights: result.insights || [], aiLoading: false });
    } catch (err: any) {
      set({ aiLoading: false });
      get().addToast('error', 'فشل في الحصول على الرؤى');
    }
  },
  fetchAIUpsell: async () => {
    const { cart } = get();
    if (cart.length === 0) return;
    try {
      const result = await api.getAIUpsell(cart);
      set({ aiSuggestion: result.suggestion || '' });
    } catch (err: any) {
      // Silently fail
    }
  },

  // Modals
  showProductModal: false,
  editingProduct: null,
  setShowProductModal: (show, product = null) => set({ showProductModal: show, editingProduct: product || null }),
  showCustomerModal: false,
  editingCustomer: null,
  setShowCustomerModal: (show, customer = null) => set({ showCustomerModal: show, editingCustomer: customer || null }),
  showCustomerHistory: false,
  selectedCustomerHistory: [],
  setShowCustomerHistory: (show, sales = []) => set({ showCustomerHistory: show, selectedCustomerHistory: sales || [] }),
  confirmDialog: null,
  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
}));
