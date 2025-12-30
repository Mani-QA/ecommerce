import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="catalog"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <CatalogPage />
            </Suspense>
          }
        />
        <Route
          path="products/:slug"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <ProductPage />
            </Suspense>
          }
        />
        <Route
          path="cart"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <CartPage />
            </Suspense>
          }
        />
        <Route
          path="login"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <CheckoutPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <OrdersPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <OrderConfirmationPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <AdminPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;

