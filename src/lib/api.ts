const BASE = 'http://localhost:3001/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

async function request(url: string, options?: RequestInit & { timeout?: number }) {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = (options.headers as any)?.['Content-Type'] || 'application/json';
  }
  const timeoutMs = options?.timeout || 30000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${url}`, { ...options, headers, signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الطلب. حاول مرة أخرى.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Products
export const api = {
  login: (username: string, password: string) => request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }),
  getMe: () => request('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) => request('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  listUsers: () => request('/auth/users'),
  createUser: (data: any) => request('/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteUser: (id: number) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  backupNow: () => request('/backup/now', { method: 'POST' }),
  backupList: () => request('/backup/list'),
  backupRestore: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/backup/restore', { method: 'POST', body: formData });
  },

  getProducts: () => request('/products'),
  getLowStockProducts: () => request('/products/low-stock'),
  createProduct: (formData: FormData) => request('/products', { method: 'POST', body: formData }),
  updateProduct: (id: number, formData: FormData) => request(`/products/${id}`, { method: 'PUT', body: formData }),
  deleteProduct: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: () => request('/sales'),
  searchSales: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sales/search?${qs}`);
  },
  getSale: (id: number) => request(`/sales/${id}`),
  createSale: (data: any) => request('/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  // Customers
  getCustomers: () => request('/customers'),
  createCustomer: (data: any) => request('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateCustomer: (id: number, data: any) => request(`/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteCustomer: (id: number) => request(`/customers/${id}`, { method: 'DELETE' }),
  getCustomerSales: (id: number) => request(`/customers/${id}/sales`),

  // Reports
  getReportsSummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/reports/summary?${params.toString()}`);
  },
  getReportsDaily: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/reports/daily?${params.toString()}`);
  },
  getReportsTopProducts: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/reports/top-products?${params.toString()}`);
  },
  getReportsByCategory: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/reports/by-category?${params.toString()}`);
  },

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data: Record<string, string>) => request('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  // AI
  testAI: () => request('/ai/test'),
  getAIInsights: (period: string) => request('/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  }),
  getAIUpsell: (cartItems: any[]) => request('/ai/upsell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems }),
  }),
  getAIForecast: (productId: number) => request('/ai/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  }),
  sendChat: (messages: { role: string; content: string }[], sessionId?: number) => request('/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, session_id: sessionId }),
    timeout: 180000,
  }),
  getChatSessions: () => request('/ai/sessions'),
  createChatSession: (title?: string) => request('/ai/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || 'محادثة جديدة' }),
  }),
  updateChatSession: (id: number, title: string) => request(`/ai/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  }),
  deleteChatSession: (id: number) => request(`/ai/sessions/${id}`, { method: 'DELETE' }),
  getChatMessages: (sessionId: number) => request(`/ai/sessions/${sessionId}/messages`),
  resetDatabase: () => request('/db/reset', { method: 'POST' }),

  // Expenses
  getExpenses: () => request('/expenses'),
  getExpensesSummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/expenses/summary?${params.toString()}`);
  },
  createExpense: (data: any) => request('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateExpense: (id: number, data: any) => request(`/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteExpense: (id: number) => request(`/expenses/${id}`, { method: 'DELETE' }),
};
