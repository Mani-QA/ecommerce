interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'data-testid'?: string;
}

export default function LoadingSpinner({ size = 'md', className = '', 'data-testid': dataTestId }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div 
      className={`flex items-center justify-center p-8 ${className}`}
      data-testid={dataTestId || 'loading-spinner'}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div
        className={`${sizeClasses[size]} rounded-full border-brand-200 border-t-brand-600 animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

