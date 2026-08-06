import type { User, Admin, Pizza, InventoryItem, CartItem, Order, OrderStatus, DashboardStats, ChartData } from '@/types';

// In production the API lives on a different origin, so the backend URL is
// injected at build time via VITE_API_BASE_URL. Falls back to the same-origin
// `/api` path (Vite dev proxy / backend-served static files).
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'forno_token';
const ADMIN_TOKEN_KEY = 'forno_admin_token';
const USER_KEY = 'forno_user';
const ADMIN_KEY = 'forno_admin_user';
const CART_KEY = 'forno_cart_v2';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

// ─── Base fetch helpers ───────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Expired/invalid token — drop session state and send the user to the
    // right login page instead of leaving them on a broken authenticated page.
    if (res.status === 401 && (options.headers as Record<string, string>)?.Authorization) {
      const wasAdmin = !!localStorage.getItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_KEY);
      window.location.href = path.startsWith('/admin') || wasAdmin ? '/admin/login' : '/login';
      throw new Error('Session expired. Please sign in again.');
    }
    throw new Error((data as { message?: string }).message ?? 'Request failed');
  }
  return data as { success: boolean; data: unknown; message?: string };
}

async function authFetch(path: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: { ...(options.headers as Record<string, string>), Authorization: `Bearer ${getToken()}` },
  });
}

async function adminFetch(path: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: { ...(options.headers as Record<string, string>), Authorization: `Bearer ${getAdminToken()}` },
  });
}

// ─── Status mappings ──────────────────────────────────────────────────────

const STATUS_FE_TO_BE: Record<string, string> = {
  received: 'Order Received',
  kitchen: 'In Kitchen',
  delivery: 'Sent to Delivery',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_BE_TO_FE: Record<string, OrderStatus> = {
  'Order Received': 'received',
  'In Kitchen': 'kitchen',
  'Sent to Delivery': 'delivery',
  'Delivered': 'completed',
  'Cancelled': 'cancelled',
};

// ─── Data mappers ─────────────────────────────────────────────────────────

function getPizzaImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('margherita')) return import.meta.env.BASE_URL + 'images/pizza-margherita.jpg';
  if (n.includes('pepperoni')) return import.meta.env.BASE_URL + 'images/pizza-pepperoni.jpg';
  if (n.includes('bbq') || n.includes('chicken')) return import.meta.env.BASE_URL + 'images/pizza-bbq.jpg';
  if (n.includes('veggie') || n.includes('garden') || n.includes('supreme')) return import.meta.env.BASE_URL + 'images/pizza-veggie.jpg';
  if (n.includes('cheese') || n.includes('four')) return import.meta.env.BASE_URL + 'images/pizza-four-cheese.jpg';
  if (n.includes('truffle') || n.includes('mushroom')) return import.meta.env.BASE_URL + 'images/pizza-truffle.jpg';
  return import.meta.env.BASE_URL + 'images/pizza-margherita.jpg';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPizza(p: any): Pizza {
  return {
    _id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    price: p.price ?? p.basePrice,
    category: p.category,
    tags: p.tags ?? [],
    imageUrl: p.imageUrl ?? p.image ?? getPizzaImage(p.name),
    ingredients: p.ingredients ?? [],
    isAvailable: p.isAvailable ?? true,
    orderCount: p.orderCount ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIngredient(ing: any): InventoryItem {
  const catMap: Record<string, InventoryItem['category']> = {
    base: 'base',
    sauce: 'sauce',
    cheese: 'cheese',
    vegetable: 'veggies',
  };
  const stock = ing.currentStock ?? 0;
  return {
    _id: String(ing._id),
    name: ing.name,
    category: catMap[ing.type as string] ?? 'veggies',
    currentStock: stock,
    maxCapacity: ing.maxCapacity ?? Math.max(stock, 50),
    threshold: ing.lowStockThreshold ?? 10,
    unitPrice: ing.price ?? 0,
    isAvailable: ing.isAvailable ?? stock > 0,
    imageUrl: ing.imageUrl ?? ing.image ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(o: any): Order {
  const idStr = String(o._id);
  const shortId = idStr.slice(-5).toUpperCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (o.items ?? []).map((item: any) => {
    if (item.type === 'preset') {
      const pizza = item.pizzaRef;
      return {
        type: 'pizza' as const,
        pizzaId: pizza?._id ? String(pizza._id) : item.pizzaRef ? String(item.pizzaRef) : undefined,
        name: pizza?.name ?? 'Pizza',
        quantity: item.quantity,
        unitPrice: item.quantity > 0 ? Math.round(item.price / item.quantity) : item.price,
        totalPrice: item.price,
      };
    }
    return {
      type: 'custom' as const,
      name: 'Custom Pizza',
      quantity: item.quantity,
      unitPrice: item.quantity > 0 ? Math.round(item.price / item.quantity) : item.price,
      totalPrice: item.price,
      base: item.customBuild?.base,
      sauce: item.customBuild?.sauce,
      cheese: item.customBuild?.cheese,
      veggies: item.customBuild?.vegetables ?? [],
    };
  });

  const total = o.totalAmount ?? 0;
  const tax = o.tax ?? Math.round(total * 0.05 * 100) / 100;
  const deliveryFee = o.deliveryFee ?? (total >= 500 ? 0 : 40);
  const subtotal = o.subtotal ?? Math.round((total - tax - deliveryFee) * 100) / 100;
  const feStatus = STATUS_BE_TO_FE[o.orderStatus as string] ?? 'received';

  const user = o.user;
  const userName = user?.name ?? '';
  const userEmail = user?.email ?? '';
  const userId = user?._id ? String(user._id) : typeof user === 'string' ? user : '';

  const rawHistory = Array.isArray(o.statusHistory) && o.statusHistory.length > 0
    ? o.statusHistory
    : [{ status: o.orderStatus ?? 'Order Received', timestamp: o.statusUpdatedAt ?? o.createdAt }];

  return {
    _id: idStr,
    orderId: `FORNO-${shortId}`,
    userId,
    items,
    subtotal,
    tax,
    deliveryFee,
    total,
    status: feStatus,
    statusHistory: rawHistory.map((h: any) => ({
      status: STATUS_BE_TO_FE[h.status] ?? h.status,
      timestamp: h.timestamp ?? o.createdAt ?? new Date().toISOString(),
      updatedBy: h.updatedBy ?? 'system',
    })),
    payment: {
      status: o.paymentStatus === 'paid' ? 'completed' : o.paymentStatus === 'failed' ? 'failed' : o.paymentStatus === 'refunded' ? 'failed' : 'pending',
      amount: total,
    },
    deliveryAddress: o.deliveryAddress ?? { street: '', city: '', state: '', pincode: '' },
    estimatedTime: o.estimatedTime
      ? new Date(o.estimatedTime).toISOString()
      : (() => {
        const base = o.createdAt ? new Date(o.createdAt).getTime() : NaN;
        const from = Number.isNaN(base) ? Date.now() : base;
        return new Date(from + 30 * 60000).toISOString();
      })(),
    createdAt: o.createdAt ?? new Date().toISOString(),
    updatedAt: o.updatedAt ?? o.createdAt ?? new Date().toISOString(),
    userName,
    userEmail,
  };
}

// ─── Cart (stays in localStorage) ─────────────────────────────────────────

function cartGet(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]'); } catch { return []; }
}
function cartSet(items: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }

export const cartApi = {
  async getCart(): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    return { success: true, data: { items: cartGet() } };
  },

  async addItem(item: CartItem): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    const items = cartGet();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      items.push(item);
    }
    cartSet(items);
    return { success: true, data: { items } };
  },

  async removeItem(id: string): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    const items = cartGet().filter(i => i.id !== id);
    cartSet(items);
    return { success: true, data: { items } };
  },

  async updateQuantity(id: string, quantity: number): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    const items = cartGet();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      if (quantity <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = quantity;
        items[idx].totalPrice = items[idx].unitPrice * quantity;
      }
    }
    cartSet(items);
    return { success: true, data: { items } };
  },

  async clearCart(): Promise<void> {
    cartSet([]);
  },
};

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  async register(data: { fullName: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; message: string; data?: { userId: string; email: string } }> {
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: data.fullName, email: data.email, password: data.password, phone: data.phone }),
      });
      return { success: true, message: res.message ?? 'Registration successful', data: { userId: (res.data as { _id: string })._id, email: data.email } };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async login(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; user: User } }> {
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = res.data as { token: string; user: { id?: string; _id?: string; name: string; email: string } };
      const user: User = {
        _id: payload.user.id ?? payload.user._id ?? '',
        fullName: payload.user.name,
        email: payload.user.email,
        isVerified: true,
        addresses: [],
      };
      localStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { success: true, message: 'Login successful', data: { token: payload.token, user } };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async googleLogin(idToken: string): Promise<{ success: boolean; message: string; data?: { token: string; user: User } }> {
    try {
      const res = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      const payload = res.data as { token: string; user: { id?: string; _id?: string; name: string; email: string } };
      const user: User = {
        _id: payload.user.id ?? payload.user._id ?? '',
        fullName: payload.user.name,
        email: payload.user.email,
        isVerified: true,
        addresses: [],
      };
      localStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { success: true, message: 'Google login successful', data: { token: payload.token, user } };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async adminLogin(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; admin: Admin } }> {
    try {
      const res = await apiFetch('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = res.data as { token: string; admin: { id?: string; _id?: string; name: string; email: string } };
      const admin: Admin = {
        _id: payload.admin.id ?? payload.admin._id ?? '',
        email: payload.admin.email,
        name: payload.admin.name,
        role: 'admin',
      };
      localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
      return { success: true, message: 'Admin login successful', data: { token: payload.token, admin } };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CART_KEY);
  },

  adminLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  },

  getCurrentUser(): User | null {
    try {
      const s = localStorage.getItem(USER_KEY);
      return s ? (JSON.parse(s) as User) : null;
    } catch { return null; }
  },

  getCurrentAdmin(): Admin | null {
    try {
      const s = localStorage.getItem(ADMIN_KEY);
      return s ? (JSON.parse(s) as Admin) : null;
    } catch { return null; }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY) && !!this.getCurrentUser();
  },

  isAdminAuthenticated(): boolean {
    return !!localStorage.getItem(ADMIN_TOKEN_KEY) && !!this.getCurrentAdmin();
  },
};

// ─── Pizza ─────────────────────────────────────────────────────────────────

export const pizzaApi = {
  async getAll(filters?: { category?: string; tag?: string; sort?: string; search?: string }): Promise<{ success: boolean; data: { pizzas: Pizza[]; total: number } }> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.sort) params.set('sort', filters.sort);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`/pizzas${query}`);
    let pizzas = ((res.data as { pizzas?: unknown[] }).pizzas ?? (Array.isArray(res.data) ? (res.data as unknown[]) : [])).map(mapPizza);

    return { success: true, data: { pizzas, total: pizzas.length } };
  },

  async getById(id: string): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    const res = await apiFetch(`/pizzas/${id}`);
    return { success: true, data: { pizza: mapPizza(res.data) } };
  },

  async adminGetAll(): Promise<{ success: boolean; data: { pizzas: Pizza[]; total: number } }> {
    const res = await adminFetch('/pizzas/admin/list');
    let pizzas = ((res.data as { pizzas?: unknown[] }).pizzas ?? (Array.isArray(res.data) ? (res.data as unknown[]) : [])).map(mapPizza);
    return { success: true, data: { pizzas, total: pizzas.length } };
  },

  async adminCreate(pizza: { name: string; description?: string; price: number; category: string; tags?: string[]; imageUrl?: string; ingredients?: string[]; isAvailable?: boolean }): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    const res = await adminFetch('/pizzas/admin/create', {
      method: 'POST',
      body: JSON.stringify(pizza)
    });
    return { success: true, data: { pizza: mapPizza(res.data) } };
  },

  async adminUpdate(id: string, pizza: Partial<{ name?: string; description?: string; price?: number; category?: string; tags?: string[]; imageUrl?: string; ingredients?: string[]; isAvailable?: boolean }>): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    const res = await adminFetch(`/pizzas/admin/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pizza)
    });
    return { success: true, data: { pizza: mapPizza(res.data) } };
  },

  async adminDelete(id: string): Promise<{ success: boolean; message?: string }> {
    await adminFetch(`/pizzas/admin/delete/${id}`, { method: 'DELETE' });
    return { success: true };
  },

  async adminToggleAvailability(id: string): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    const res = await adminFetch(`/pizzas/admin/toggle/${id}`, {
      method: 'PATCH'
    });
    return { success: true, data: { pizza: mapPizza(res.data) } };
  }
};

// ─── Inventory ─────────────────────────────────────────────────────────────

export const inventoryApi = {
  async getAll(filters?: { category?: string; lowStock?: boolean }): Promise<{ success: boolean; data: { items: InventoryItem[]; lowStockCount: number } }> {
    const res = await adminFetch('/admin/inventory');
    const rawItems = Array.isArray(res.data) ? (res.data as unknown[]) : [];
    let items = rawItems.map(mapIngredient);

    if (filters?.category && filters.category !== 'All') {
      items = items.filter(i => i.category === filters.category);
    }
    if (filters?.lowStock) items = items.filter(i => i.currentStock < i.threshold);

    const lowStockCount = items.filter(i => i.currentStock < i.threshold).length;
    return { success: true, data: { items, lowStockCount } };
  },

  // The Build-Your-Own pizza page needs every ingredient across all
  // categories, unfiltered, and is used by regular (non-admin) users —
  // GET /admin/inventory is intentionally public, so hit it without an
  // admin token rather than reusing adminFetch/getAll.
  async getAllForBuilder(): Promise<{ success: boolean; data: { items: InventoryItem[] } }> {
    const res = await apiFetch('/admin/inventory');
    const rawItems = Array.isArray(res.data) ? (res.data as unknown[]) : [];
    const items = rawItems.map(mapIngredient).filter(i => i.isAvailable);
    return { success: true, data: { items } };
  },

  async update(id: string, data: { currentStock?: number; threshold?: number }): Promise<{ success: boolean; data: { item: InventoryItem } }> {
    let raw: unknown = null;

    if (data.currentStock !== undefined) {
      const res = await adminFetch(`/admin/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'set', amount: data.currentStock }),
      });
      raw = res.data;
    }

    if (data.threshold !== undefined) {
      const res = await adminFetch(`/admin/inventory/${id}/threshold`, {
        method: 'PATCH',
        body: JSON.stringify({ lowStockThreshold: data.threshold }),
      });
      raw = res.data;
    }

    return { success: true, data: { item: mapIngredient(raw ?? {}) } };
  },

  async adjust(id: string, amount: number): Promise<{ success: boolean; data: { item: InventoryItem } }> {
    const action = amount >= 0 ? 'increment' : 'decrement';
    const res = await adminFetch(`/admin/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, amount: Math.abs(amount) }),
    });
    return { success: true, data: { item: mapIngredient(res.data) } };
  },

  async create(data: { type: string; name: string; unit: string; price?: number; currentStock?: number; maxCapacity?: number; lowStockThreshold?: number }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await adminFetch('/admin/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return { success: true, message: res.message };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async remove(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await adminFetch(`/admin/inventory/${id}`, { method: 'DELETE' });
      return { success: true, message: res.message };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },
};

// ─── Razorpay ──────────────────────────────────────────────────────────────

interface RazorpayPaymentResult {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const razorpayApi = {
  async createOrder(orderId: string, _amount: number): Promise<{ success: boolean; data: RazorpayPaymentResult }> {
    const res = await authFetch(`/orders/${orderId}/payment`, { method: 'POST' });
    const payload = res.data as { razorpayOrderId: string; amount: number; currency: string; keyId: string; mock?: boolean };

    // No real Razorpay credentials configured on the backend (dev/test
    // environment) — the server already told us via `mock: true`, so skip
    // the real checkout widget entirely and simulate an instant success.
    if (payload.mock) {
      return {
        success: true,
        data: {
          razorpayOrderId: payload.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Math.random().toString(36).slice(2)}`,
          razorpaySignature: `sig_mock_${Math.random().toString(36).slice(2)}`,
        },
      };
    }

    return new Promise((resolve, reject) => {
      if (!(window as Window & { Razorpay?: unknown }).Razorpay) {
        reject(new Error('Razorpay SDK not loaded. Please refresh the page.'));
        return;
      }
      const options = {
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        order_id: payload.razorpayOrderId,
        name: 'Forno Pizza',
        description: 'Pizza Order',
        handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          resolve({
            success: true,
            data: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          });
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
        theme: { color: '#FF6B35' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => reject(new Error('Payment failed')));
      rzp.open();
    });
  },
};

// ─── Orders ────────────────────────────────────────────────────────────────

export const orderApi = {
  async create(data: { items: CartItem[]; deliveryAddress: { street: string; city: string; state: string; pincode: string } }): Promise<{ success: boolean; data: { order: Order } }> {
    const backendItems = data.items.map(item => {
      if (item.type === 'pizza') {
        return { type: 'preset', pizzaRef: item.pizzaId, quantity: item.quantity, price: item.totalPrice };
      }
      return {
        type: 'custom',
        customBuild: {
          base: item.baseId ?? item.base ?? '',
          sauce: item.sauceId ?? item.sauce ?? '',
          cheese: item.cheeseId ?? item.cheese ?? '',
          vegetables: item.veggieIds ?? [],
        },
        quantity: item.quantity,
        price: item.totalPrice,
      };
    });

    const res = await authFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ items: backendItems, deliveryAddress: data.deliveryAddress }),
    });
    return { success: true, data: { order: mapOrder(res.data) } };
  },

  async verifyPayment(orderId: string, paymentData?: RazorpayPaymentResult): Promise<{ success: boolean; message: string; data?: { order: Order } }> {
    if (!paymentData) return { success: false, message: 'No payment data provided' };
    const res = await authFetch(`/orders/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return { success: true, message: res.message ?? 'Payment verified', data: undefined };
  },

  async getMyOrders(): Promise<{ success: boolean; data: { orders: Order[] } }> {
    const res = await authFetch('/orders/my-orders');
    const raw = Array.isArray(res.data) ? (res.data as unknown[]) : [];
    return { success: true, data: { orders: raw.map(mapOrder) } };
  },

  async getById(id: string): Promise<{ success: boolean; data: { order: Order } }> {
    // GET /orders/:id/status is a minimal polling endpoint (no items, no
    // createdAt, no address) — use the full-detail endpoint here instead so
    // the order tracking page has everything it needs to render.
    const res = await authFetch(`/orders/${id}`);
    return { success: true, data: { order: mapOrder(res.data) } };
  },

  async getStatus(orderId: string): Promise<{ success: boolean; data: { orderId: string; status: OrderStatus; updatedAt: string; estimatedTime: string } }> {
    const res = await authFetch(`/orders/${orderId}/status`);
    const d = res.data as { orderStatus: string; statusUpdatedAt: string; paymentStatus: string };
    return {
      success: true,
      data: {
        orderId,
        status: STATUS_BE_TO_FE[d.orderStatus] ?? 'received',
        updatedAt: d.statusUpdatedAt,
        estimatedTime: new Date(Date.now() + 30 * 60000).toISOString(),
      },
    };
  },
};

// ─── Admin Orders ──────────────────────────────────────────────────────────

export const adminOrderApi = {
  async getAll(filters?: { status?: string; page?: number; limit?: number; search?: string }): Promise<{ success: boolean; data: { orders: Order[]; total: number; page: number; totalPages: number } }> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'All') {
      params.set('status', STATUS_FE_TO_BE[filters.status] ?? filters.status);
    }
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await adminFetch(`/admin/orders${query}`);
    const d = res.data as { orders: unknown[]; total: number; page: number; pages: number };

    let orders = (d.orders ?? []).map(mapOrder);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(o => o.orderId.toLowerCase().includes(q) || (o.userName ?? '').toLowerCase().includes(q));
    }

    return {
      success: true,
      data: { orders, total: d.total ?? orders.length, page: d.page ?? 1, totalPages: d.pages ?? 1 },
    };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<{ success: boolean; data: { order: Order } }> {
    const backendStatus = STATUS_FE_TO_BE[status] ?? 'Order Received';
    const res = await adminFetch(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus: backendStatus }),
    });
    return { success: true, data: { order: mapOrder({ _id: id, ...(res.data as Record<string, unknown>) }) } };
  },
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    try {
      const [allRes, pendingRes, lowStockRes, revRes] = await Promise.all([
        adminFetch('/admin/orders?limit=1'),
        adminFetch('/admin/orders?status=Order%20Received&limit=1'),
        adminFetch('/admin/inventory'),
        adminFetch('/admin/analytics/revenue-today'),
      ]);

      const allData = allRes.data as { total?: number };
      const pendingData = pendingRes.data as { total?: number };
      const revenueToday = (revRes.data as { revenue?: number }).revenue ?? 0;
      const inventory = Array.isArray(lowStockRes.data) ? (lowStockRes.data as unknown[]).map(mapIngredient) : [];
      const lowStockItems = inventory.filter(i => i.currentStock < i.threshold).length;

      return {
        success: true,
        data: {
          totalOrders: allData.total ?? 0,
          pendingOrders: pendingData.total ?? 0,
          lowStockItems,
          revenueToday,
          changes: { totalOrders: '+0%', pendingOrders: '+0%', lowStockItems: `${lowStockItems}`, revenueToday: '+0%' },
        },
      };
    } catch {
      return {
        success: true,
        data: { totalOrders: 0, pendingOrders: 0, lowStockItems: 0, revenueToday: 0, changes: { totalOrders: '+0%', pendingOrders: '+0%', lowStockItems: '0', revenueToday: '+0%' } },
      };
    }
  },

  async getOrdersChart(days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    try {
      const res = await adminFetch(`/admin/analytics/orders?days=${days}`);
      const d = res.data as ChartData;
      return { success: true, data: { labels: d.labels, data: d.data } };
    } catch {
      return { success: true, data: { labels: [], data: [] } };
    }
  },

  async getRevenueChart(days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    try {
      const res = await adminFetch(`/admin/analytics/revenue?days=${days}`);
      const d = res.data as ChartData;
      return { success: true, data: { labels: d.labels, data: d.data } };
    } catch {
      return { success: true, data: { labels: [], data: [] } };
    }
  },

  async getPopularPizzas(): Promise<{ success: boolean; data: { name: string; count: number }[] }> {
    try {
      const res = await adminFetch('/admin/analytics/popular');
      const data = (res.data as { name: string; count: number }[]) ?? [];
      return { success: true, data };
    } catch {
      return { success: true, data: [] };
    }
  },

  async getStatusDistribution(): Promise<{ success: boolean; data: { name: string; value: number }[] }> {
    try {
      const res = await adminFetch('/admin/analytics/status');
      const data = (res.data as { name: string; value: number }[]) ?? [];
      return { success: true, data };
    } catch {
      return { success: true, data: [] };
    }
  },

  async getHourlyOrders(): Promise<{ success: boolean; data: ChartData }> {
    try {
      const res = await adminFetch('/admin/analytics/hourly');
      const d = res.data as ChartData;
      return { success: true, data: { labels: d.labels, data: d.data } };
    } catch {
      return { success: true, data: { labels: [], data: [] } };
    }
  },
};

// ─── Admin Users ───────────────────────────────────────────────────────────

export const adminUserApi = {
  async getAll(params: { search?: string; page?: number; limit?: number } = {}): Promise<{ success: boolean; data: { users: { _id: string; name: string; email: string; isVerified: boolean; isActive: boolean; googleId: string | null; createdAt: string }[]; total: number; page: number; pages: number } }> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const res = await adminFetch(`/admin/users${q.toString() ? `?${q}` : ''}`);
    const d = res.data as { users: unknown[]; total: number; page: number; pages: number };
    const users = (d.users ?? []).map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      isVerified: u.isVerified ?? false,
      isActive: u.isActive ?? true,
      googleId: u.googleId ?? null,
      createdAt: u.createdAt,
    }));
    return { success: true, data: { users, total: d.total ?? users.length, page: d.page ?? 1, pages: d.pages ?? 1 } };
  },

  async toggleActive(id: string): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`/admin/users/${id}/toggle`, { method: 'PATCH' });
    return { success: true, message: res.message ?? 'User updated' };
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`/admin/users/${id}`, { method: 'DELETE' });
    return { success: true, message: res.message ?? 'User deleted' };
  },
};

// ─── Forgot / Reset password ───────────────────────────────────────────────

export const passwordApi = {
  async forgot(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true, message: res.message ?? 'If that email is registered, a reset link has been sent.' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async reset(token: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      return { success: true, message: res.message ?? 'Password reset successfully' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch(`/auth/verify-email/${token}`);
      return { success: true, message: res.message ?? 'Email verified successfully' };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },
};
