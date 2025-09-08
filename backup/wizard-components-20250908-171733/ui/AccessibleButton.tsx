'use client';

/**
 * Accessible Button Component
 * Provides full keyboard navigation and screen reader support
 */

import React from 'react';
import { forwardRef } from 'react';

export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaHaspopup?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  tooltip?: string;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500 text-gray-700',
  outline: 'border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 text-gray-700'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
};

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText = 'Loading...',
    leftIcon,
    rightIcon,
    isFullWidth = false,
    ariaLabel,
    ariaDescribedBy,
    ariaExpanded,
    ariaHaspopup,
    tooltip,
    className = '',
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-md',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      isFullWidth && 'w-full',
      variantClasses[variant],
      sizeClasses[size],
      className
    ].filter(Boolean).join(' ');

    const buttonProps = {
      ref,
      className: baseClasses,
      disabled: disabled || isLoading,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHaspopup,
      'aria-busy': isLoading,
      title: tooltip,
      ...props
    };

    const content = (
      <>
        {isLoading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!isLoading && leftIcon && (
          <span className="mr-2" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        <span>
          {isLoading ? loadingText : children}
        </span>
        
        {!isLoading && rightIcon && (
          <span className="ml-2" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </>
    );

    return (
      <button {...buttonProps}>
        {content}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';