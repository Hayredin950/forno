import type { User, Admin, Pizza, InventoryItem, CartItem, Order, OrderStatus, DashboardStats, ChartData } from '@/types';

const API_BASE = '/api';

const TOKEN_KEY = 'forno_token';
const ADMIN_TOKEN_KEY = 'forno_admin_token';
const USER_KEY = 'forno_user';
const ADMIN_KEY = 'forno_admin_user';
const CART_KEY = 'forno_cart';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

// ─── Base fetch helpers ────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...((options.headers as Record<string, string>) ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Request failed');
  return data as { success: boolean; data: unknown; message?: string };
}

async function authFetch(path: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: { ...((options.headers as Record<string, string>) ?? {}), Authorization: `Bearer ${getToken()}` },
  });
}

async function adminFetch(path: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: { ...((options.headers as Record<string, string>) ?? {}), Authorization: `Bearer ${getAdminToken()}` },
  });
}

// ─── Status mappings ───────────────────────────────────────────────────────

const STATUS_FE_TO_BE: Record<string, string> = {
  received: 'Order Received',
  kitchen: 'In Kitchen',
  delivery: 'Sent to Delivery',
  completed: 'Delivered',
  cancelled: 'Delivered',
};

const STATUS_BE_TO_FE: Record<string, OrderStatus> = {
  'Order Received': 'received',
  'In Kitchen': 'kitchen',
  'Sent to Delivery': 'delivery',
  'Delivered': 'completed',
};

// ─── Data mappers ──────────────────────────────────────────────────────────

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
    price: p.basePrice,
    category: p.category,
    tags: [],
    imageUrl: p.image ?? getPizzaImage(p.name),
    ingredients: [],
    isAvailable: true,
    orderCount: 0,
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
  return {
    _id: String(ing._id),
    name: ing.name,
    category: catMap[ing.type as string] ?? 'veggies',
    currentStock: ing.currentStock ?? 0,
    maxCapacity: Math.max((ing.currentStock ?? 0) * 2, 100),
    threshold: ing.lowStockThreshold ?? 10,
    unitPrice: ing.price ?? 0,
    isAvailable: (ing.currentStock ?? 0) > 0,
    imageUrl: ing.image ?? undefined,
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
  const tax = Math.round(total * 0.05 * 100) / 100;
  const deliveryFee = total >= 500 ? 0 : 40;
  const subtotal = Math.round((total - tax - deliveryFee) * 100) / 100;
  const feStatus = STATUS_BE_TO_FE[o.orderStatus as string] ?? 'received';

  const user = o.user;
  const userName = user?.name ?? '';
  const userEmail = user?.email ?? '';
  const userId = user?._id ? String(user._id) : typeof user === 'string' ? user : '';

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
    statusHistory: [{ status: feStatus, timestamp: o.statusUpdatedAt ?? o.createdAt, updatedBy: 'system' }],
    payment: {
      status: o.paymentStatus === 'paid' ? 'completed' : o.paymentStatus === 'failed' ? 'failed' : 'pending',
      amount: total,
    },
    deliveryAddress: o.deliveryAddress ?? { street: '', city: '', state: '', pincode: '' },
    estimatedTime: new Date(new Date(o.createdAt).getTime() + 30 * 60000).toISOString(),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt ?? o.createdAt,
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
    const res = await apiFetch('/pizzas');
    let pizzas = ((res.data as { pizzas?: unknown[] }).pizzas ?? (Array.isArray(res.data) ? (res.data as unknown[]) : [])).map(mapPizza);

    if (filters?.category) pizzas = pizzas.filter(p => p.category === filters.category);
    if (filters?.tag) pizzas = pizzas.filter(p => p.tags.includes(filters.tag!));
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      pizzas = pizzas.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (filters?.sort === 'price_asc') pizzas.sort((a, b) => a.price - b.price);
    if (filters?.sort === 'price_desc') pizzas.sort((a, b) => b.price - a.price);

    return { success: true, data: { pizzas, total: pizzas.length } };
  },

  async getById(id: string): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    const res = await apiFetch(`/pizzas/${id}`);
    return { success: true, data: { pizza: mapPizza(res.data) } };
  },
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
    const payload = res.data as { razorpayOrderId: string; amount: number; currency: string; keyId: string };

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
      body: JSON.stringify({ items: backendItems }),
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
    const res = await authFetch(`/orders/${id}/status`);
    return { success: true, data: { order: mapOrder({ _id: id, ...res.data }) } };
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
    return { success: true, data: { order: mapOrder({ _id: id, ...res.data }) } };
  },
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    try {
      const [allRes, pendingRes, lowStockRes] = await Promise.all([
        adminFetch('/admin/orders?limit=1'),
        adminFetch('/admin/orders?status=Order%20Received&limit=1'),
        adminFetch('/admin/inventory'),
      ]);

      const allData = allRes.data as { total?: number };
      const pendingData = pendingRes.data as { total?: number };
      const inventory = Array.isArray(lowStockRes.data) ? (lowStockRes.data as unknown[]).map(mapIngredient) : [];
      const lowStockItems = inventory.filter(i => i.currentStock < i.threshold).length;

      return {
        success: true,
        data: {
          totalOrders: allData.total ?? 0,
          pendingOrders: pendingData.total ?? 0,
          lowStockItems,
          revenueToday: 0,
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

  async getOrdersChart(_days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    return { success: true, data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [45, 62, 38, 71, 55, 89, 67] } };
  },

  async getRevenueChart(_days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    return { success: true, data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [3200, 4500, 2800, 5100, 3900, 6200, 4800] } };
  },

  async getPopularPizzas(): Promise<{ success: boolean; data: { name: string; count: number }[] }> {
    return {
      success: true,
      data: [
        { name: 'Margherita', count: 342 }, { name: 'Pepperoni', count: 287 },
        { name: 'BBQ Chicken', count: 198 }, { name: 'Veggie Supreme', count: 156 },
        { name: 'Four Cheese', count: 134 }, { name: 'Truffle Mushroom', count: 89 },
      ],
    };
  },

  async getStatusDistribution(): Promise<{ success: boolean; data: { name: string; value: number }[] }> {
    try {
      const [r, k, d, c] = await Promise.all([
        adminFetch('/admin/orders?status=Order%20Received&limit=1'),
        adminFetch('/admin/orders?status=In%20Kitchen&limit=1'),
        adminFetch('/admin/orders?status=Sent%20to%20Delivery&limit=1'),
        adminFetch('/admin/orders?status=Delivered&limit=1'),
      ]);
      return {
        success: true,
        data: [
          { name: 'Received', value: (r.data as { total?: number }).total ?? 0 },
          { name: 'Kitchen', value: (k.data as { total?: number }).total ?? 0 },
          { name: 'Delivery', value: (d.data as { total?: number }).total ?? 0 },
          { name: 'Completed', value: (c.data as { total?: number }).total ?? 0 },
        ],
      };
    } catch {
      return { success: true, data: [{ name: 'Received', value: 0 }, { name: 'Kitchen', value: 0 }, { name: 'Delivery', value: 0 }, { name: 'Completed', value: 0 }] };
    }
  },

  async getHourlyOrders(): Promise<{ success: boolean; data: ChartData }> {
    return {
      success: true,
      data: { labels: ['11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM'], data: [12, 28, 45, 38, 22, 18, 35, 52, 48, 30, 15, 8] },
    };
  },
};
