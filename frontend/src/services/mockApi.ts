import type { User, Admin, Pizza, InventoryItem, CartItem, Order, OrderStatus, DashboardStats, ChartData } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 15);
const generateOrderId = () => `FORNO-${Math.floor(10000 + Math.random() * 90000)}`;

// Seed data
const DEFAULT_PIZZAS: Pizza[] = [
  { _id: 'p1', name: 'Margherita Classica', description: 'San Marzano tomatoes, fresh mozzarella, basil', price: 299, category: 'veg', tags: ['bestseller'], imageUrl: import.meta.env.BASE_URL + 'images/pizza-margherita.jpg', ingredients: ['Tomato Sauce', 'Mozzarella', 'Fresh Basil'], isAvailable: true, orderCount: 342 },
  { _id: 'p2', name: 'Pepperoni Fire', description: 'Double pepperoni, mozzarella, chili flakes', price: 399, category: 'non-veg', tags: ['spicy'], imageUrl: import.meta.env.BASE_URL + 'images/pizza-pepperoni.jpg', ingredients: ['Tomato Sauce', 'Mozzarella', 'Double Pepperoni', 'Chili Flakes'], isAvailable: true, orderCount: 287 },
  { _id: 'p3', name: 'BBQ Chicken', description: 'Grilled chicken, BBQ sauce, red onions, cilantro', price: 449, category: 'non-veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-bbq.jpg', ingredients: ['BBQ Sauce', 'Mozzarella', 'Grilled Chicken', 'Red Onion', 'Cilantro'], isAvailable: true, orderCount: 198 },
  { _id: 'p4', name: 'Veggie Supreme', description: 'Bell peppers, olives, onions, tomatoes, corn', price: 349, category: 'veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-veggie.jpg', ingredients: ['Tomato Sauce', 'Mozzarella', 'Bell Peppers', 'Olives', 'Onions', 'Tomatoes', 'Corn'], isAvailable: true, orderCount: 156 },
  { _id: 'p5', name: 'Four Cheese', description: 'Mozzarella, cheddar, parmesan, gorgonzola', price: 429, category: 'veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-four-cheese.jpg', ingredients: ['White Sauce', 'Mozzarella', 'Cheddar', 'Parmesan', 'Gorgonzola'], isAvailable: true, orderCount: 134 },
  { _id: 'p6', name: 'Truffle Mushroom', description: 'Truffle oil, wild mushrooms, mozzarella, thyme', price: 499, category: 'veg', tags: ['bestseller'], imageUrl: import.meta.env.BASE_URL + 'images/pizza-truffle.jpg', ingredients: ['White Sauce', 'Mozzarella', 'Wild Mushrooms', 'Truffle Oil', 'Thyme'], isAvailable: true, orderCount: 89 },
  { _id: 'p7', name: 'Hawaiian Paradise', description: 'Ham, pineapple, mozzarella, tomato sauce', price: 379, category: 'non-veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-margherita.jpg', ingredients: ['Tomato Sauce', 'Mozzarella', 'Ham', 'Pineapple'], isAvailable: true, orderCount: 112 },
  { _id: 'p8', name: 'Mediterranean', description: 'Feta, olives, sun-dried tomatoes, spinach', price: 389, category: 'veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-veggie.jpg', ingredients: ['Pesto Sauce', 'Mozzarella', 'Feta', 'Olives', 'Sun-dried Tomatoes', 'Spinach'], isAvailable: true, orderCount: 76 },
  { _id: 'p9', name: 'Meat Lovers', description: 'Pepperoni, sausage, bacon, ham, mozzarella', price: 479, category: 'non-veg', tags: ['spicy'], imageUrl: import.meta.env.BASE_URL + 'images/pizza-pepperoni.jpg', ingredients: ['Tomato Sauce', 'Mozzarella', 'Pepperoni', 'Sausage', 'Bacon', 'Ham'], isAvailable: true, orderCount: 201 },
  { _id: 'p10', name: 'Spinach & Feta', description: 'Fresh spinach, feta cheese, garlic, olive oil', price: 359, category: 'veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-four-cheese.jpg', ingredients: ['White Sauce', 'Mozzarella', 'Spinach', 'Feta', 'Garlic'], isAvailable: true, orderCount: 95 },
  { _id: 'p11', name: 'Buffalo Chicken', description: 'Buffalo sauce, chicken, ranch drizzle, celery', price: 419, category: 'non-veg', tags: ['spicy'], imageUrl: import.meta.env.BASE_URL + 'images/pizza-bbq.jpg', ingredients: ['Buffalo Sauce', 'Mozzarella', 'Chicken', 'Ranch Drizzle'], isAvailable: true, orderCount: 67 },
  { _id: 'p12', name: 'Prosciutto & Arugula', description: 'Prosciutto, fresh arugula, parmesan, olive oil', price: 459, category: 'non-veg', tags: [], imageUrl: import.meta.env.BASE_URL + 'images/pizza-truffle.jpg', ingredients: ['White Sauce', 'Mozzarella', 'Prosciutto', 'Arugula', 'Parmesan'], isAvailable: true, orderCount: 54 },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { _id: 'b1', name: 'Classic Hand Tossed', category: 'base', currentStock: 45, maxCapacity: 50, threshold: 20, unitPrice: 0, isAvailable: true },
  { _id: 'b2', name: 'Thin Crust', category: 'base', currentStock: 8, maxCapacity: 50, threshold: 20, unitPrice: 20, isAvailable: true },
  { _id: 'b3', name: 'Cheese Burst', category: 'base', currentStock: 32, maxCapacity: 50, threshold: 20, unitPrice: 50, isAvailable: true },
  { _id: 'b4', name: 'Whole Wheat', category: 'base', currentStock: 28, maxCapacity: 50, threshold: 20, unitPrice: 30, isAvailable: true },
  { _id: 'b5', name: 'Gluten Free', category: 'base', currentStock: 15, maxCapacity: 50, threshold: 20, unitPrice: 40, isAvailable: true },
  { _id: 's1', name: 'Classic Tomato', category: 'sauce', currentStock: 40, maxCapacity: 50, threshold: 15, unitPrice: 0, isAvailable: true },
  { _id: 's2', name: 'BBQ Sauce', category: 'sauce', currentStock: 12, maxCapacity: 50, threshold: 15, unitPrice: 20, isAvailable: true },
  { _id: 's3', name: 'White Garlic', category: 'sauce', currentStock: 35, maxCapacity: 50, threshold: 15, unitPrice: 20, isAvailable: true },
  { _id: 's4', name: 'Pesto', category: 'sauce', currentStock: 22, maxCapacity: 50, threshold: 15, unitPrice: 30, isAvailable: true },
  { _id: 's5', name: 'Spicy Arrabbiata', category: 'sauce', currentStock: 18, maxCapacity: 50, threshold: 15, unitPrice: 15, isAvailable: true },
  { _id: 'c1', name: 'Mozzarella', category: 'cheese', currentStock: 15, maxCapacity: 50, threshold: 25, unitPrice: 0, isAvailable: true },
  { _id: 'c2', name: 'Cheddar', category: 'cheese', currentStock: 30, maxCapacity: 50, threshold: 25, unitPrice: 20, isAvailable: true },
  { _id: 'c3', name: 'Four Cheese Blend', category: 'cheese', currentStock: 25, maxCapacity: 50, threshold: 25, unitPrice: 50, isAvailable: true },
  { _id: 'c4', name: 'Vegan Cheese', category: 'cheese', currentStock: 10, maxCapacity: 50, threshold: 25, unitPrice: 40, isAvailable: true },
  { _id: 'v1', name: 'Bell Peppers', category: 'veggies', currentStock: 38, maxCapacity: 50, threshold: 10, unitPrice: 25, isAvailable: true },
  { _id: 'v2', name: 'Mushrooms', category: 'veggies', currentStock: 18, maxCapacity: 50, threshold: 10, unitPrice: 30, isAvailable: true },
  { _id: 'v3', name: 'Onions', category: 'veggies', currentStock: 42, maxCapacity: 50, threshold: 10, unitPrice: 15, isAvailable: true },
  { _id: 'v4', name: 'Olives', category: 'veggies', currentStock: 35, maxCapacity: 50, threshold: 10, unitPrice: 25, isAvailable: true },
  { _id: 'v5', name: 'Tomatoes', category: 'veggies', currentStock: 40, maxCapacity: 50, threshold: 10, unitPrice: 20, isAvailable: true },
  { _id: 'v6', name: 'Jalapeños', category: 'veggies', currentStock: 5, maxCapacity: 50, threshold: 10, unitPrice: 20, isAvailable: true },
  { _id: 'v7', name: 'Spinach', category: 'veggies', currentStock: 30, maxCapacity: 50, threshold: 10, unitPrice: 25, isAvailable: true },
  { _id: 'v8', name: 'Sweet Corn', category: 'veggies', currentStock: 28, maxCapacity: 50, threshold: 10, unitPrice: 20, isAvailable: true },
];

const ADMIN_ACCOUNT: Admin = { _id: 'admin1', email: 'admin@forno.com', name: 'Admin', role: 'admin' };

// Initialize localStorage with seed data
function initializeData() {
  if (!localStorage.getItem('forno_pizzas')) {
    localStorage.setItem('forno_pizzas', JSON.stringify(DEFAULT_PIZZAS));
  }
  if (!localStorage.getItem('forno_inventory')) {
    localStorage.setItem('forno_inventory', JSON.stringify(DEFAULT_INVENTORY));
  }
  if (!localStorage.getItem('forno_admin')) {
    localStorage.setItem('forno_admin', JSON.stringify(ADMIN_ACCOUNT));
  }
  if (!localStorage.getItem('forno_orders')) {
    localStorage.setItem('forno_orders', JSON.stringify([]));
  }
  if (!localStorage.getItem('forno_users')) {
    localStorage.setItem('forno_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('forno_cart')) {
    localStorage.setItem('forno_cart', JSON.stringify([]));
  }
}

initializeData();

// Helper functions
function getItem<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Auth Service
export const authApi = {
  async register(data: { fullName: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; message: string; data?: { userId: string; email: string } }> {
    await delay(800);
    const users = getItem<User[]>('forno_users');
    if (users.find(u => u.email === data.email)) {
      return { success: false, message: 'Email already registered' };
    }
    const user: User = {
      _id: generateId(),
      fullName: data.fullName,
      email: data.email,
      isVerified: true, // Auto-verify for demo
      addresses: [],
    };
    // Store password separately (in real app, hash it)
    const passwords = getItem<{userId: string; password: string}[]>('forno_passwords');
    passwords.push({ userId: user._id, password: data.password });
    setItem('forno_passwords', passwords);
    users.push(user);
    setItem('forno_users', users);
    return { success: true, message: 'Registration successful', data: { userId: user._id, email: user.email } };
  },

  async login(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; user: User } }> {
    await delay(600);
    const users = getItem<User[]>('forno_users');
    const user = users.find(u => u.email === data.email);
    if (!user) return { success: false, message: 'Invalid email or password' };
    const passwords = getItem<{userId: string; password: string}[]>('forno_passwords');
    const pwRecord = passwords.find(p => p.userId === user._id);
    if (!pwRecord || pwRecord.password !== data.password) {
      return { success: false, message: 'Invalid email or password' };
    }
    const token = `user_${user._id}_${Date.now()}`;
    localStorage.setItem('forno_token', token);
    localStorage.setItem('forno_user', JSON.stringify(user));
    return { success: true, message: 'Login successful', data: { token, user } };
  },

  async adminLogin(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; admin: Admin } }> {
    await delay(600);
    const admin = getItem<Admin>('forno_admin');
    if (admin.email !== data.email) {
      return { success: false, message: 'Invalid admin credentials' };
    }
    if (data.password !== 'admin123') {
      return { success: false, message: 'Invalid admin credentials' };
    }
    const token = `admin_${admin._id}_${Date.now()}`;
    localStorage.setItem('forno_admin_token', token);
    localStorage.setItem('forno_admin_user', JSON.stringify(admin));
    return { success: true, message: 'Admin login successful', data: { token, admin } };
  },

  logout() {
    localStorage.removeItem('forno_token');
    localStorage.removeItem('forno_user');
    // Keep cart for demo purposes
  },

  adminLogout() {
    localStorage.removeItem('forno_admin_token');
    localStorage.removeItem('forno_admin_user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('forno_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getCurrentAdmin(): Admin | null {
    const adminStr = localStorage.getItem('forno_admin_user');
    return adminStr ? JSON.parse(adminStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('forno_token') && !!this.getCurrentUser();
  },

  isAdminAuthenticated(): boolean {
    return !!localStorage.getItem('forno_admin_token') && !!this.getCurrentAdmin();
  },
};

// Pizza Service
export const pizzaApi = {
  async getAll(filters?: { category?: string; tag?: string; sort?: string; search?: string }): Promise<{ success: boolean; data: { pizzas: Pizza[]; total: number } }> {
    await delay(400);
    let pizzas = getItem<Pizza[]>('forno_pizzas');
    if (filters?.category) pizzas = pizzas.filter(p => p.category === filters.category);
    if (filters?.tag) pizzas = pizzas.filter(p => p.tags.includes(filters.tag!));
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      pizzas = pizzas.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (filters?.sort === 'price_asc') pizzas.sort((a, b) => a.price - b.price);
    if (filters?.sort === 'price_desc') pizzas.sort((a, b) => b.price - a.price);
    if (filters?.sort === 'popular') pizzas.sort((a, b) => b.orderCount - a.orderCount);
    return { success: true, data: { pizzas, total: pizzas.length } };
  },

  async getById(id: string): Promise<{ success: boolean; data: { pizza: Pizza } }> {
    await delay(200);
    const pizzas = getItem<Pizza[]>('forno_pizzas');
    const pizza = pizzas.find(p => p._id === id);
    if (!pizza) throw new Error('Pizza not found');
    return { success: true, data: { pizza } };
  },
};

// Inventory Service
export const inventoryApi = {
  async getAll(filters?: { category?: string; lowStock?: boolean }): Promise<{ success: boolean; data: { items: InventoryItem[]; lowStockCount: number } }> {
    await delay(300);
    let items = getItem<InventoryItem[]>('forno_inventory');
    if (filters?.category) items = items.filter(i => i.category === filters.category);
    if (filters?.lowStock) items = items.filter(i => i.currentStock < i.threshold);
    const lowStockCount = items.filter(i => i.currentStock < i.threshold).length;
    return { success: true, data: { items, lowStockCount } };
  },

  async update(id: string, data: { currentStock?: number; threshold?: number }): Promise<{ success: boolean; data: { item: InventoryItem } }> {
    await delay(400);
    const items = getItem<InventoryItem[]>('forno_inventory');
    const idx = items.findIndex(i => i._id === id);
    if (idx === -1) throw new Error('Item not found');
    if (data.currentStock !== undefined) items[idx].currentStock = Math.max(0, data.currentStock);
    if (data.threshold !== undefined) items[idx].threshold = data.threshold;
    setItem('forno_inventory', items);
    return { success: true, data: { item: items[idx] } };
  },

  async adjust(id: string, amount: number): Promise<{ success: boolean; data: { item: InventoryItem } }> {
    await delay(200);
    const items = getItem<InventoryItem[]>('forno_inventory');
    const idx = items.findIndex(i => i._id === id);
    if (idx === -1) throw new Error('Item not found');
    items[idx].currentStock = Math.max(0, Math.min(items[idx].maxCapacity, items[idx].currentStock + amount));
    setItem('forno_inventory', items);
    return { success: true, data: { item: items[idx] } };
  },

  async decrementIngredients(base: string, sauce: string, cheese: string, veggies: string[]): Promise<void> {
    const items = getItem<InventoryItem[]>('forno_inventory');
    const namesToDecrement = [base, sauce, cheese, ...veggies];
    namesToDecrement.forEach(name => {
      const idx = items.findIndex(i => i.name === name);
      if (idx !== -1 && items[idx].currentStock > 0) {
        items[idx].currentStock -= 1;
      }
    });
    setItem('forno_inventory', items);
  },
};

// Cart Service
export const cartApi = {
  async getCart(): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    await delay(200);
    const items = getItem<CartItem[]>('forno_cart');
    return { success: true, data: { items } };
  },

  async addItem(item: CartItem): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    await delay(300);
    const items = getItem<CartItem[]>('forno_cart');
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      items.push(item);
    }
    setItem('forno_cart', items);
    return { success: true, data: { items } };
  },

  async removeItem(id: string): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    await delay(200);
    const items = getItem<CartItem[]>('forno_cart').filter(i => i.id !== id);
    setItem('forno_cart', items);
    return { success: true, data: { items } };
  },

  async updateItem(id: string, quantity: number): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    await delay(200);
    const items = getItem<CartItem[]>('forno_cart');
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Item not found');
    items[idx].quantity = quantity;
    items[idx].totalPrice = items[idx].unitPrice * quantity;
    setItem('forno_cart', items);
    return { success: true, data: { items } };
  },

  async updateQuantity(id: string, quantity: number): Promise<{ success: boolean; data: { items: CartItem[] } }> {
    await delay(200);
    const items = getItem<CartItem[]>('forno_cart');
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      if (quantity <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = quantity;
        items[idx].totalPrice = items[idx].unitPrice * quantity;
      }
    }
    setItem('forno_cart', items);
    return { success: true, data: { items } };
  },

  async clearCart(): Promise<void> {
    setItem('forno_cart', []);
  },
};

// Order Service
export const orderApi = {
  async create(data: { items: any[]; deliveryAddress: any }): Promise<{ success: boolean; data: { order: Order } }> {
    await delay(600);
    const user = authApi.getCurrentUser();
    const subtotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const deliveryFee = subtotal >= 500 ? 0 : 40;
    const order: Order = {
      _id: generateId(),
      orderId: generateOrderId(),
      userId: user?._id || 'guest',
      items: data.items,
      subtotal,
      tax,
      deliveryFee,
      total: subtotal + tax + deliveryFee,
      status: 'received',
      statusHistory: [{ status: 'received', timestamp: new Date().toISOString(), updatedBy: 'system' }],
      payment: { status: 'pending', amount: subtotal + tax + deliveryFee },
      deliveryAddress: data.deliveryAddress,
      estimatedTime: new Date(Date.now() + 30 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userName: user?.fullName || 'Guest',
      userEmail: user?.email || '',
    };
    const orders = getItem<Order[]>('forno_orders');
    orders.unshift(order);
    setItem('forno_orders', orders);
    return { success: true, data: { order } };
  },

  async verifyPayment(orderId: string): Promise<{ success: boolean; message: string; data?: { order: Order } }> {
    await delay(800);
    const orders = getItem<Order[]>('forno_orders');
    const idx = orders.findIndex(o => o._id === orderId);
    if (idx === -1) return { success: false, message: 'Order not found' };
    orders[idx].payment.status = 'completed';
    orders[idx].status = 'kitchen';
    orders[idx].statusHistory.push({ status: 'kitchen', timestamp: new Date().toISOString(), updatedBy: 'system' });
    orders[idx].updatedAt = new Date().toISOString();
    setItem('forno_orders', orders);

    // Decrement inventory
    for (const item of orders[idx].items) {
      if (item.type === 'custom' && item.base && item.sauce && item.cheese) {
        await inventoryApi.decrementIngredients(item.base, item.sauce, item.cheese, item.veggies || []);
      }
    }

    return { success: true, message: 'Payment verified', data: { order: orders[idx] } };
  },

  async getMyOrders(): Promise<{ success: boolean; data: { orders: Order[] } }> {
    await delay(400);
    const user = authApi.getCurrentUser();
    const orders = getItem<Order[]>('forno_orders').filter(o => o.userId === user?._id);
    return { success: true, data: { orders } };
  },

  async getById(id: string): Promise<{ success: boolean; data: { order: Order } }> {
    await delay(300);
    const orders = getItem<Order[]>('forno_orders');
    const order = orders.find(o => o._id === id || o.orderId === id);
    if (!order) throw new Error('Order not found');
    return { success: true, data: { order } };
  },

  async getStatus(orderId: string): Promise<{ success: boolean; data: { orderId: string; status: OrderStatus; updatedAt: string; estimatedTime: string } }> {
    await delay(200);
    const orders = getItem<Order[]>('forno_orders');
    const order = orders.find(o => o._id === orderId || o.orderId === orderId);
    if (!order) throw new Error('Order not found');
    return { success: true, data: { orderId: order.orderId, status: order.status, updatedAt: order.updatedAt, estimatedTime: order.estimatedTime } };
  },
};

// Admin Order Service
export const adminOrderApi = {
  async getAll(filters?: { status?: string; page?: number; limit?: number; search?: string }): Promise<{ success: boolean; data: { orders: Order[]; total: number; page: number; totalPages: number } }> {
    await delay(500);
    let orders = getItem<Order[]>('forno_orders');
    if (filters?.status) orders = orders.filter(o => o.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(o => o.orderId.toLowerCase().includes(q) || (o.userName || '').toLowerCase().includes(q));
    }
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const totalPages = Math.ceil(orders.length / limit);
    const paginated = orders.slice((page - 1) * limit, page * limit);
    return { success: true, data: { orders: paginated, total: orders.length, page, totalPages } };
  },

  async updateStatus(id: string, status: OrderStatus): Promise<{ success: boolean; data: { order: Order } }> {
    await delay(400);
    const orders = getItem<Order[]>('forno_orders');
    const idx = orders.findIndex(o => o._id === id || o.orderId === id);
    if (idx === -1) throw new Error('Order not found');
    orders[idx].status = status;
    orders[idx].statusHistory.push({ status, timestamp: new Date().toISOString(), updatedBy: 'admin' });
    orders[idx].updatedAt = new Date().toISOString();
    setItem('forno_orders', orders);
    return { success: true, data: { order: orders[idx] } };
  },
};

// Dashboard Service
export const dashboardApi = {
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    await delay(400);
    const orders = getItem<Order[]>('forno_orders');
    const inventory = getItem<InventoryItem[]>('forno_inventory');
    const lowStock = inventory.filter(i => i.currentStock < i.threshold).length;
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const revenueToday = todayOrders.reduce((sum, o) => sum + (o.payment.status === 'completed' ? o.total : 0), 0);
    return {
      success: true,
      data: {
        totalOrders: orders.length + 1284,
        pendingOrders: orders.filter(o => o.status === 'received' || o.status === 'kitchen').length + 23,
        lowStockItems: lowStock,
        revenueToday: Math.round(revenueToday * 100) / 100 || 24560,
        changes: { totalOrders: '+8%', pendingOrders: '-2%', lowStockItems: `+${lowStock}`, revenueToday: '+15%' },
      },
    };
  },

  async getOrdersChart(days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    await delay(300);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [45, 62, 38, 71, 55, 89, 67];
    return { success: true, data: { labels: labels.slice(0, days), data: data.slice(0, days) } };
  },

  async getRevenueChart(days: number = 7): Promise<{ success: boolean; data: ChartData }> {
    await delay(300);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [3200, 4500, 2800, 5100, 3900, 6200, 4800];
    return { success: true, data: { labels: labels.slice(0, days), data: data.slice(0, days) } };
  },

  async getPopularPizzas(): Promise<{ success: boolean; data: { name: string; count: number }[] }> {
    await delay(300);
    return {
      success: true,
      data: [
        { name: 'Margherita', count: 342 },
        { name: 'Pepperoni', count: 287 },
        { name: 'Meat Lovers', count: 201 },
        { name: 'BBQ Chicken', count: 198 },
        { name: 'Veggie Supreme', count: 156 },
        { name: 'Four Cheese', count: 134 },
        { name: 'Truffle Mush.', count: 89 },
        { name: 'Hawaiian', count: 76 },
      ],
    };
  },

  async getStatusDistribution(): Promise<{ success: boolean; data: { name: string; value: number }[] }> {
    await delay(300);
    return {
      success: true,
      data: [
        { name: 'Received', value: 45 },
        { name: 'Kitchen', value: 78 },
        { name: 'Delivery', value: 34 },
        { name: 'Completed', value: 1102 },
        { name: 'Cancelled', value: 25 },
      ],
    };
  },

  async getHourlyOrders(): Promise<{ success: boolean; data: ChartData }> {
    await delay(300);
    const labels = ['11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM'];
    const data = [12, 28, 45, 38, 22, 18, 35, 52, 48, 30, 15, 8];
    return { success: true, data: { labels, data } };
  },
};

// Simulate Razorpay
export const razorpayApi = {
  async createOrder(orderId: string, amount: number): Promise<{ success: boolean; data: { razorpayOrderId: string; amount: number; currency: string; key: string } }> {
    await delay(600);
    return {
      success: true,
      data: {
        razorpayOrderId: `order_${generateId()}`,
        amount: amount * 100,
        currency: 'INR',
        key: 'rzp_test_FornoPizza2024',
      },
    };
  },
};
