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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
              <span className="text-white font-bold text-lg">QA</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Demo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/catalog"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
            >
              Products
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-slate-600 hover:text-brand-600 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {totalItems()}
                </motion.span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {user?.userType === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link
                  to="/orders"
                  className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  title="View my orders"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{user?.username}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-brand-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
          >
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/catalog"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                to="/cart"
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cart ({totalItems()})
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Orders ({user?.username})
                  </Link>
                  {user?.userType === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
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
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
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

