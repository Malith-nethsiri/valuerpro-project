/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling and user-friendly error display
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AccessibleButton } from './AccessibleButton';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableReporting?: boolean;
  showDetails?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateStaticErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report error to monitoring service if enabled
    if (this.props.enableReporting) {
      this.reportError(error, errorInfo);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateStaticErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    // For example: Sentry, LogRocket, or a custom API
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId'), // If available
    };

    // Example API call (commented out for development)
    /*
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    }).catch(reportingError => {
      console.error('Failed to report error:', reportingError);
    });
    */

    console.log('Error report:', errorReport);
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: this.generateErrorId()
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = `
Error ID: ${errorId}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace available'}
Component Stack: ${errorInfo?.componentStack || 'No component stack available'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorDetails;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Error Message */}
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>

              {/* Error ID */}
              <p className="mt-2 text-xs text-gray-500">
                Error ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{errorId}</code>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {canRetry && (
                <AccessibleButton
                  onClick={this.handleRetry}
                  variant="primary"
                  isFullWidth
                  ariaLabel="Retry the failed operation"
                >
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </AccessibleButton>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AccessibleButton
                  onClick={this.handleReload}
                  variant="secondary"
                  ariaLabel="Reload the current page"
                >
                  Reload Page
                </AccessibleButton>

                <AccessibleButton
                  onClick={this.handleGoHome}
                  variant="outline"
                  ariaLabel="Return to home page"
                >
                  Go Home
                </AccessibleButton>
              </div>

              <AccessibleButton
                onClick={this.copyErrorDetails}
                variant="ghost"
                isFullWidth
                ariaLabel="Copy error details for support"
              >
                Copy Error Details
              </AccessibleButton>
            </div>

            {/* Detailed Error Information (Development/Debug Mode) */}
            {(process.env.NODE_ENV === 'development' || this.props.showDetails) && error && (
              <details className="mt-8 text-left">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Technical Details
                </summary>
                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                  <div className="text-sm">
                    <p className="font-medium text-red-800 mb-2">Error Message:</p>
                    <p className="text-red-700 mb-4 font-mono text-xs">{error.message}</p>
                    
                    {error.stack && (
                      <>
                        <p className="font-medium text-red-800 mb-2">Stack Trace:</p>
                        <pre className="text-red-700 text-xs whitespace-pre-wrap overflow-auto max-h-32 mb-4">
                          {error.stack}
                        </pre>
                      </>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <>
                        <p className="font-medium text-red-800 mb-2">Component Stack:</p>
                        <pre className="text-red-700 text-xs whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Support Information */}
            <div className="text-center text-sm text-gray-500">
              Need help? Contact{' '}
              <a
                href="mailto:support@valuerpro.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                support@valuerpro.com
              </a>{' '}
              with the error ID above.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary programmatically
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    // In a real app, you might want to trigger error boundary or report error
    console.error('useErrorHandler:', error, errorInfo);
    
    // You could also dispatch to a global error state or context
    throw error; // This will trigger the nearest error boundary
  };
};