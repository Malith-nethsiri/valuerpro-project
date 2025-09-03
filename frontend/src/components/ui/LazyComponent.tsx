/**
 * Lazy Component Loading with Suspense
 * Implements code splitting and lazy loading for React components
 */

import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

// Default loading component
const DefaultLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Default error component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load component</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      Try Again
    </button>
  </div>
);

// Error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ComponentType<{ error: Error; retry: () => void }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component failed to load:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <this.props.fallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Wrapper component for lazy loading with error boundary
export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback: LoadingFallback = DefaultLoadingFallback,
  errorFallback: ErrorFallback = DefaultErrorFallback
}) => {
  return (
    <LazyComponentErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </LazyComponentErrorBoundary>
  );
};

// Higher-order component for creating lazy components
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallback?: React.ComponentType;
    errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  } = {}
) {
  const LazyComponent = lazy(importFunc);
  
  return React.forwardRef<any, P>((props, ref) => (
    <LazyComponentWrapper
      fallback={options.fallback}
      errorFallback={options.errorFallback}
    >
      <LazyComponent {...props} ref={ref} />
    </LazyComponentWrapper>
  ));
}

// Preload function for eager loading
export const preloadLazyComponent = (importFunc: () => Promise<any>) => {
  return importFunc();
};

// Hook for progressive enhancement
export const useProgressiveEnhancement = () => {
  const [isJSEnabled, setIsJSEnabled] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    // Detect if JS is enabled (it is if this runs)
    setIsJSEnabled(true);

    // Detect online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isJSEnabled, isOnline };
};

// Skeleton loading components
export const SkeletonLoader: React.FC<{ className?: string; lines?: number }> = ({ 
  className = '', 
  lines = 3 
}) => (
  <div className={`animate-pulse ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className={`bg-gray-300 rounded ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        } h-4 mb-2`}
      />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-300 rounded-lg h-48 mb-4" />
    <div className="bg-gray-300 rounded h-4 w-3/4 mb-2" />
    <div className="bg-gray-300 rounded h-4 w-1/2" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`animate-pulse ${className}`}>
    <table className="w-full">
      <thead>
        <tr>
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className="px-4 py-2">
              <div className="bg-gray-300 rounded h-4 w-full" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <td key={colIndex} className="px-4 py-2">
                <div className="bg-gray-200 rounded h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Performance monitoring for lazy components
export const useComponentPerformance = (componentName: string) => {
  const startTime = React.useRef<number>();
  const [loadTime, setLoadTime] = React.useState<number>();

  React.useEffect(() => {
    startTime.current = performance.now();
  }, []);

  React.useLayoutEffect(() => {
    if (startTime.current) {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      setLoadTime(duration);
      
      // Log performance metrics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'component_load_time', {
          component_name: componentName,
          value: Math.round(duration)
        });
      }
    }
  });

  return { loadTime };
};

// Lazy route component with preloading
export interface LazyRouteProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  preload?: boolean;
  fallback?: React.ComponentType;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component,
  preload = false,
  fallback
}) => {
  const LazyComponent = React.useMemo(() => lazy(component), [component]);

  React.useEffect(() => {
    if (preload) {
      // Preload the component
      component().catch(error => {
        console.warn('Failed to preload component:', error);
      });
    }
  }, [component, preload]);

  return (
    <LazyComponentWrapper fallback={fallback}>
      <LazyComponent />
    </LazyComponentWrapper>
  );
};

// Bundle analyzer helper (development only)
export const analyzeBundleSize = (componentName: string, component: any) => {
  if (process.env.NODE_ENV === 'development') {
    const componentString = component.toString();
    const estimatedSize = new Blob([componentString]).size;
    
    console.log(`Component ${componentName} estimated size:`, {
      bytes: estimatedSize,
      kb: Math.round(estimatedSize / 1024),
      characters: componentString.length
    });
  }
};