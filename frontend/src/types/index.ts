export interface User {
  _id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  addresses: Address[];
}

export interface Address {
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Admin {
  _id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
}

export interface Pizza {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'veg' | 'non-veg';
  tags: string[];
  imageUrl: string;
  hasImage?: boolean;
  ingredients: string[];
  isAvailable: boolean;
  orderCount: number;
  createdAt?: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  category: 'base' | 'sauce' | 'cheese' | 'veggies';
  currentStock: number;
  maxCapacity: number;
  threshold: number;
  unitPrice: number;
  unit?: string;
  isAvailable: boolean;
  imageUrl?: string;
}

export interface CartItem {
  id: string;
  type: 'pizza' | 'custom';
  name: string;
  pizzaId?: string;
  imageUrl?: string;
  base?: string;
  baseId?: string;
  sauce?: string;
  sauceId?: string;
  cheese?: string;
  cheeseId?: string;
  veggies?: string[];
  veggieIds?: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderItem {
  type: 'pizza' | 'custom';
  pizzaId?: string;
  name: string;
  base?: string;
  sauce?: string;
  cheese?: string;
  veggies?: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  _id: string;
  orderId: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: 'received' | 'approved' | 'kitchen' | 'ready' | 'delivery' | 'completed' | 'cancelled';
  statusHistory: { status: string; timestamp: string; updatedBy: string }[];
  payment: {
    status: 'pending' | 'completed' | 'failed';
    amount: number;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  estimatedTime: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
}

export type OrderStatus = 'received' | 'approved' | 'kitchen' | 'ready' | 'delivery' | 'completed' | 'cancelled';

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  revenueToday: number;
  changes: {
    totalOrders: string;
    pendingOrders: string;
    lowStockItems: string;
    revenueToday: string;
  };
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface BuilderSelection {
  base: InventoryItem | null;
  sauce: InventoryItem | null;
  cheese: InventoryItem | null;
  veggies: InventoryItem[];
}
