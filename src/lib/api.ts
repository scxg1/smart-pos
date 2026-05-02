const BASE = 'http://localhost:3001/api';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Products
export const api = {
  // Products
  getProducts: () => request('/products'),
  getLowStockProducts: () => request('/products/low-stock'),
  createProduct: (formData: FormData) => request('/products', { method: 'POST', body: formData }),
  updateProduct: (id: number, formData: FormData) => request(`/products/${id}`, { method: 'PUT', body: formData }),
  deleteProduct: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: () => request('/sales'),
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
};
