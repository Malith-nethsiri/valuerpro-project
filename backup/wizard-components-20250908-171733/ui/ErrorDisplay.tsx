import React from 'react';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface ErrorDisplayProps {
  errors?: string[];
  error?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors = [],
  error,
  type = 'error',
  title,
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  // Combine single error and errors array
  const allErrors = error ? [error, ...errors] : errors;
  
  if (allErrors.length === 0) return null;

  const getConfig = () => {
    switch (type) {
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-yellow-400'
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900',
          icon: InformationCircleIcon,
          iconColor: 'text-blue-400'
        };
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          titleColor: 'text-green-900',
          icon: CheckCircleIcon,
          iconColor: 'text-green-400'
        };
      default: // error
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          titleColor: 'text-red-900',
          icon: XCircleIcon,
          iconColor: 'text-red-400'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;
  const defaultTitle = type === 'error' ? 'Validation Error' : 
                     type === 'warning' ? 'Warning' : 
                     type === 'success' ? 'Success' : 'Information';

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {(title || allErrors.length > 1) && (
            <h4 className={`text-sm font-medium ${config.titleColor} mb-2`}>
              {title || defaultTitle}
              {allErrors.length > 1 && ` (${allErrors.length} issues)`}
            </h4>
          )}
          
          {allErrors.length === 1 ? (
            <p className={`text-sm ${config.textColor}`}>
              {allErrors[0]}
            </p>
          ) : (
            <ul className={`text-sm ${config.textColor} space-y-1`}>
              {allErrors.map((errorMessage, index) => (
                <li key={index} className="flex items-start">
                  <span className={`w-1.5 h-1.5 ${config.iconColor.replace('text-', 'bg-')} rounded-full mt-2 mr-2 flex-shrink-0`} />
                  <span>{errorMessage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {dismissible && onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className={`inline-flex ${config.textColor} hover:${config.titleColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${config.bgColor.split('-')[1]}-50 focus:ring-${config.iconColor.split('-')[1]}-500`}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;

// Field-level error display component
export interface FieldErrorProps {
  error?: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <p className={`text-sm text-red-600 mt-1 ${className}`}>
      {error}
    </p>
  );
};

// Validation status indicator
export interface ValidationStatusProps {
  isValid?: boolean;
  isValidating?: boolean;
  error?: string;
  className?: string;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  isValid,
  isValidating,
  error,
  className = ''
}) => {
  if (isValidating) {
    return (
      <div className={`inline-flex items-center text-xs text-gray-500 ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-gray-600 mr-1"></div>
        Validating...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center text-xs text-red-600 ${className}`}>
        <XCircleIcon className="w-3 h-3 mr-1" />
        {error}
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={`inline-flex items-center text-xs text-green-600 ${className}`} title="Field is valid">
        <CheckCircleIcon className="w-3 h-3" />
      </div>
    );
  }

  return null;
};

// Toast-style error notification
export interface ErrorToastProps {
  error: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white border-l-4 border-red-500 rounded-lg shadow-lg">
      <div className="p-4">
        <div className="flex items-start">
          <XCircleIcon className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">Error</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};