import { Link } from 'react-router-dom';
import { getAdminPassword } from '@qademo/shared';
import { useAuthStore } from '@/stores/authStore';

export default function Footer() {
  const { isAuthenticated } = useAuthStore();

  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">QA</span>
              </div>
              <span className="text-xl font-bold text-white">Demo</span>
            </Link>
            <p className="mt-4 text-sm">
              An e-commerce testing platform designed for automated testing purposes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalog" className="text-sm hover:text-brand-400 transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm hover:text-brand-400 transition-colors">
                  Cart
                </Link>
              </li>
              {!isAuthenticated && (
                <li>
                  <Link to="/login" className="text-sm hover:text-brand-400 transition-colors">
                    Sign In
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Test Accounts */}
          <div>
            <h3 className="text-white font-semibold mb-4">Test Accounts</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-500">Standard:</span> standard_user / standard123
              </li>
              <li>
                <span className="text-slate-500">Locked:</span> locked_user / locked123
              </li>
              <li>
                <span className="text-slate-500">Admin:</span> admin_user / {getAdminPassword()}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm space-y-1">
          <p>&copy; {new Date().getFullYear()} QA Demo. Built for testing purposes.</p>
          <p>
            Developed by{' '}
            <a
              href="https://ManiG.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 transition-colors"
              aria-label="Visit ManiG's website"
              data-testid="footer-manig-link"
            >
              ManiG
            </a>
            {' '}with{' '}
            <span className="text-red-500" aria-label="love" role="img">❤</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

