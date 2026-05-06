import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CartProvider } from '@/context/CartContext';

// Customer pages
import CustomerMenu from '@/pages/CustomerMenu';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderTracking from '@/pages/OrderTracking';
import CustomerOrders from '@/pages/CustomerOrders';
import CustomerProfile from '@/pages/CustomerProfile';
import PaymentSuccess from '@/pages/PaymentSuccess';
import StripeCheckoutPage from '@/pages/StripeCheckout';
import CustomerLayout from '@/components/layout/CustomerLayout';

// Restaurant pages
import RestaurantDashboard from '@/pages/restaurant/Dashboard';
import MenuManagement from '@/pages/restaurant/MenuManagement';
import OrderManagement from '@/pages/restaurant/OrderManagement';
import BannerManagement from '@/pages/restaurant/BannerManagement';
import CategoryManagement from '@/pages/restaurant/CategoryManagement';
import ChoiceGroupManagement from '@/pages/restaurant/ChoiceGroupManagement';

import CouponManagement from '@/pages/restaurant/CouponManagement';
import CrossSelling from '@/pages/restaurant/CrossSelling';
import PrinterSettings from '@/pages/restaurant/PrinterSettings.jsx';
import PrinterDiag from '@/pages/restaurant/PrinterDiag';
import RestaurantSettings from '@/pages/restaurant/Settings';
import ReceiptDesigner from '@/pages/restaurant/ReceiptDesigner';
import RestaurantLayout from '@/components/layout/RestaurantLayout';

// Driver pages
import DriverDashboard from '@/pages/driver/DriverDashboard';
import DriverHistory from '@/pages/driver/DriverHistory';
import DriverProfile from '@/pages/driver/DriverProfile';
import DriverLayout from '@/components/layout/DriverLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <CartProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ minHeight: '100vh' }}
        >
          <Routes location={location}>
            {/* Customer routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<CustomerMenu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<CustomerOrders />} />
              <Route path="/order/:id" element={<OrderTracking />} />
              <Route path="/profile" element={<CustomerProfile />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/stripe-checkout" element={<StripeCheckoutPage />} />
            </Route>

            {/* Restaurant routes */}
            <Route element={<RestaurantLayout />}>
              <Route path="/restaurant" element={<RestaurantDashboard />} />
              <Route path="/restaurant/menu" element={<MenuManagement />} />
              <Route path="/restaurant/orders" element={<OrderManagement />} />
              <Route path="/restaurant/banners" element={<BannerManagement />} />
              <Route path="/restaurant/categories" element={<CategoryManagement />} />
              <Route path="/restaurant/choice-groups" element={<ChoiceGroupManagement />} />

              <Route path="/restaurant/coupons" element={<CouponManagement />} />
              <Route path="/restaurant/cross-selling" element={<CrossSelling />} />
              <Route path="/restaurant/printer" element={<PrinterSettings />} />
              <Route path="/restaurant/printer-diag" element={<PrinterDiag />} />
              <Route path="/restaurant/settings" element={<RestaurantSettings />} />
              <Route path="/restaurant/receipt-designer" element={<ReceiptDesigner />} />
            </Route>

            {/* Driver routes */}
            <Route element={<DriverLayout />}>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/history" element={<DriverHistory />} />
              <Route path="/driver/profile" element={<DriverProfile />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </CartProvider>
  );
};


function App() {
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App