const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Request failed' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API request error:', error);
    return { success: false, message: 'Network error' };
  }
}

// Pizza Service
export const pizzaApi = {
  async getAll(filters?: { category?: string; tag?: string; sort?: string; search?: string }): Promise<{ success: boolean; data: { pizzas: any[]; total: number } }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = `/pizzas${queryString ? `?${queryString}` : ''}`;
    
    return request(endpoint) as Promise<{ success: boolean; data: { pizzas: any[]; total: number } }>;
  },

  async getById(id: string): Promise<{ success: boolean; data: { pizza: any } }> {
    return request(`/pizzas/${id}`) as Promise<{ success: boolean; data: { pizza: any } }>;
  },
};

// Inventory Service
export const inventoryApi = {
  async getAll(filters?: { category?: string; lowStock?: boolean }): Promise<{ success: boolean; data: { items: any[]; lowStockCount: number } }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;
    
    return request(endpoint) as Promise<{ success: boolean; data: { items: any[]; lowStockCount: number } }>;
  },

  async getAllForBuilder(): Promise<{ success: boolean; data: { items: any[]; lowStockCount: number } }> {
    return request('/pizzas/ingredients/all') as Promise<{ success: boolean; data: { items: any[]; lowStockCount: number } }>;
  },

  async adjust(id: string, amount: number): Promise<{ success: boolean; message?: string }> {
    return request(`/inventory/${id}/adjust`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    }) as Promise<{ success: boolean; message?: string }>;
  },

  async update(id: string, data: { currentStock?: number; threshold?: number }): Promise<{ success: boolean; message?: string }> {
    if (data.threshold !== undefined) {
      return request(`/inventory/${id}/threshold`, {
        method: 'PATCH',
        body: JSON.stringify({ lowStockThreshold: data.threshold }),
      }) as Promise<{ success: boolean; message?: string }>;
    }
    if (data.currentStock !== undefined) {
      return request(`/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'set', amount: data.currentStock }),
      }) as Promise<{ success: boolean; message?: string }>;
    }
    return { success: false, message: 'No valid update data provided' };
  },
};

// Cart Service (using localStorage for now)
export const cartApi = {
  async getCart(): Promise<{ success: boolean; data: { items: any[] } }> {
    await delay(200);
    const items = JSON.parse(localStorage.getItem('forno_cart') || '[]');
    return { success: true, data: { items } };
  },

  async addItem(item: any): Promise<{ success: boolean; data: { items: any[] } }> {
    await delay(300);
    const items = JSON.parse(localStorage.getItem('forno_cart') || '[]');
    const existing = items.find((i: any) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      items.push(item);
    }
    localStorage.setItem('forno_cart', JSON.stringify(items));
    return { success: true, data: { items } };
  },

  async removeItem(id: string): Promise<{ success: boolean; data: { items: any[] } }> {
    await delay(200);
    const items = JSON.parse(localStorage.getItem('forno_cart') || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem('forno_cart', JSON.stringify(items));
    return { success: true, data: { items } };
  },

  async updateItem(id: string, quantity: number): Promise<{ success: boolean; data: { items: any[] } }> {
    await delay(200);
    const items = JSON.parse(localStorage.getItem('forno_cart') || '[]');
    const idx = items.findIndex((i: any) => i.id === id);
    if (idx === -1) throw new Error('Item not found');
    items[idx].quantity = quantity;
    items[idx].totalPrice = items[idx].unitPrice * quantity;
    localStorage.setItem('forno_cart', JSON.stringify(items));
    return { success: true, data: { items } };
  },

  async updateQuantity(id: string, quantity: number): Promise<{ success: boolean; data: { items: any[] } }> {
    await delay(200);
    const items = JSON.parse(localStorage.getItem('forno_cart') || '[]');
    const idx = items.findIndex((i: any) => i.id === id);
    if (idx !== -1) {
      if (quantity <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = quantity;
        items[idx].totalPrice = items[idx].unitPrice * quantity;
      }
    }
    localStorage.setItem('forno_cart', JSON.stringify(items));
    return { success: true, data: { items } };
  },

  async clearCart(): Promise<void> {
    localStorage.setItem('forno_cart', '[]');
  },
};

// Auth Service (using localStorage for now)
export const authApi = {
  async register(data: { fullName: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; message: string; data?: { userId: string; email: string } }> {
    await delay(800);
    const users = JSON.parse(localStorage.getItem('forno_users') || '[]');
    if (users.find((u: any) => u.email === data.email)) {
      return { success: false, message: 'Email already registered' };
    }
    const user = {
      _id: Math.random().toString(36).substring(2, 15),
      fullName: data.fullName,
      email: data.email,
      isVerified: true,
      addresses: [],
    };
    const passwords = JSON.parse(localStorage.getItem('forno_passwords') || '[]');
    passwords.push({ userId: user._id, password: data.password });
    localStorage.setItem('forno_passwords', JSON.stringify(passwords));
    users.push(user);
    localStorage.setItem('forno_users', JSON.stringify(users));
    return { success: true, message: 'Registration successful', data: { userId: user._id, email: user.email } };
  },

  async login(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; user: any } }> {
    await delay(600);
    const users = JSON.parse(localStorage.getItem('forno_users') || '[]');
    const user = users.find((u: any) => u.email === data.email);
    if (!user) return { success: false, message: 'Invalid email or password' };
    const passwords = JSON.parse(localStorage.getItem('forno_passwords') || '[]');
    const pwRecord = passwords.find((p: any) => p.userId === user._id);
    if (!pwRecord || pwRecord.password !== data.password) {
      return { success: false, message: 'Invalid email or password' };
    }
    const token = `user_${user._id}_${Date.now()}`;
    localStorage.setItem('forno_token', token);
    localStorage.setItem('forno_user', JSON.stringify(user));
    return { success: true, message: 'Login successful', data: { token, user } };
  },

  async adminLogin(data: { email: string; password: string }): Promise<{ success: boolean; message: string; data?: { token: string; admin: any } }> {
    await delay(600);
    // Initialize admin account if not exists
    let admin = JSON.parse(localStorage.getItem('forno_admin') || '{}');
    if (!admin._id) {
      admin = { _id: 'admin1', email: 'admin@forno.com', name: 'Admin', role: 'admin' };
      localStorage.setItem('forno_admin', JSON.stringify(admin));
    }
    
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
  },

  adminLogout() {
    localStorage.removeItem('forno_admin_token');
    localStorage.removeItem('forno_admin_user');
  },

  getCurrentUser(): any {
    const userStr = localStorage.getItem('forno_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getCurrentAdmin(): any {
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
