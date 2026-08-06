import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { authApi } from '@/services/api';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import UserLayout from '@/pages/user/UserLayout';
import MenuPage from '@/pages/user/MenuPage';
import BuilderPage from '@/pages/user/BuilderPage';
import CheckoutPage from '@/pages/user/CheckoutPage';
import OrderTrackingPage from '@/pages/user/OrderTrackingPage';
import OrdersPage from '@/pages/user/OrdersPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminInventory from '@/pages/admin/AdminInventory';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminPizzas from '@/pages/admin/AdminPizzas';
import PizzaDetailPage from '@/pages/user/PizzaDetailPage';
import { Toaster } from '@/components/shared/Toaster';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  useEffect(() => { setAuth(authApi.isAuthenticated()); }, []);
  if (auth === null) return <div className="min-h-screen bg-forno-bg-primary" />;
  return auth ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  useEffect(() => { setAuth(authApi.isAdminAuthenticated()); }, []);
  if (auth === null) return <div className="min-h-screen bg-forno-bg-primary" />;
  return auth ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Toaster />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
          <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />

          {/* User dashboard routes */}
          <Route path="/dashboard" element={<PrivateRoute><UserLayout /></PrivateRoute>}>
            <Route index element={<MenuPage />} />
            <Route path="builder" element={<BuilderPage />} />
            <Route path="pizza/:pizzaId" element={<PizzaDetailPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrderTrackingPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<PublicLayout><AdminLoginPage /></PublicLayout>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pizzas" element={<AdminPizzas />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
