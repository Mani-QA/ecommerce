import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import Button from '../ui/Button';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalItems } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100" data-testid="navbar" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" data-testid="navbar-logo" aria-label="QA Demo home">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
              <span className="text-white font-bold text-lg">QA</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Demo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8" data-testid="navbar-desktop-menu">
            <Link
              to="/catalog"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
              data-testid="navbar-products-link"
              aria-label="View products"
            >
              Products
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4" data-testid="navbar-actions">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-slate-600 hover:text-brand-600 transition-colors"
              data-testid="navbar-cart-link"
              aria-label={`Shopping cart with ${totalItems()} items`}
            >
              <ShoppingCart className="w-6 h-6" aria-hidden="true" />
              {totalItems() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  data-testid="navbar-cart-badge"
                  aria-label={`${totalItems()} items in cart`}
                >
                  {totalItems()}
                </motion.span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3" data-testid="navbar-user-menu">
                {user?.userType === 'admin' && (
                  <Link to="/admin" data-testid="navbar-admin-link">
                    <Button variant="ghost" size="sm" aria-label="Admin dashboard">
                      <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link
                  to="/orders"
                  className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="View my orders"
                  data-testid="navbar-username-link"
                  aria-label={`View orders for ${user?.username}`}
                >
                  <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700" data-testid="navbar-username">{user?.username}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="navbar-logout-button" aria-label="Logout">
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Link to="/login" data-testid="navbar-signin-link">
                <Button variant="primary" size="sm" aria-label="Sign in">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-brand-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="navbar-mobile-menu-button"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white"
            data-testid="navbar-mobile-menu"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/catalog"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid="navbar-mobile-products-link"
                role="menuitem"
              >
                Products
              </Link>
              <Link
                to="/cart"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid="navbar-mobile-cart-link"
                role="menuitem"
              >
                Cart ({totalItems()})
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="navbar-mobile-orders-link"
                    role="menuitem"
                  >
                    My Orders ({user?.username})
                  </Link>
                  {user?.userType === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid="navbar-mobile-admin-link"
                      role="menuitem"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    data-testid="navbar-mobile-logout-button"
                    role="menuitem"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid="navbar-mobile-signin-link"
                  role="menuitem"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

