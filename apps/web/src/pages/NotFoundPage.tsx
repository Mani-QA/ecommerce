import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center" data-testid="not-found-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-9xl font-bold text-brand-500/20 mb-4" data-testid="not-found-404" aria-hidden="true">404</div>
        <h1 className="text-3xl font-bold text-slate-900" data-testid="not-found-heading">Page Not Found</h1>
        <p className="mt-2 text-lg text-slate-600 max-w-md mx-auto" data-testid="not-found-description">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4" data-testid="not-found-actions">
          <Link to="/">
            <Button leftIcon={<Home className="w-4 h-4" />} data-testid="not-found-go-home-button" aria-label="Go to home page">
              Go Home
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => window.history.back()} data-testid="not-found-go-back-button" aria-label="Go back to previous page">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

