/**
 * Accessible Form Components
 * Provides comprehensive form accessibility including ARIA labels, error announcements, and keyboard navigation
 */

import React, { createContext, useContext, useId, useState, useRef, useEffect } from 'react';

// Form Context for managing form state and accessibility
interface FormContextType {
  errors: Record<string, string>;
  setFieldError: (fieldName: string, error: string) => void;
  clearFieldError: (fieldName: string) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
}

const FormContext = createContext<FormContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within an AccessibleForm');
  }
  return context;
};

// Main Form Component
interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ...props
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const announceRef = useRef<HTMLDivElement>(null);

  const setFieldError = (fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const announceMessage = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      // Clear after 5 seconds to avoid cluttering screen readers
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 5000);
    }
  };

  const announceError = (message: string) => {
    announceMessage(`Error: ${message}`);
  };

  const announceSuccess = (message: string) => {
    announceMessage(`Success: ${message}`);
  };

  const contextValue: FormContextType = {
    errors,
    setFieldError,
    clearFieldError,
    announceError,
    announceSuccess
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        {...props}
        onSubmit={onSubmit}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        noValidate // We'll handle validation ourselves for better accessibility
      >
        {children}
        
        {/* Screen reader announcements */}
        <div
          ref={announceRef}
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        />
      </form>
    </FormContext.Provider>
  );
};

// Field Group Component
interface FieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`} role="group">
      {children}
    </div>
  );
};

// Label Component
interface AccessibleLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  isRequired?: boolean;
  htmlFor: string;
}

export const AccessibleLabel: React.FC<AccessibleLabelProps> = ({
  children,
  isRequired = false,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
      {...props}
    >
      {children}
      {isRequired && (
        <span className="text-red-500 ml-1" aria-label="required">
          *
        </span>
      )}
    </label>
  );
};

// Input Component
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  name: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  showLabel?: boolean;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  name,
  error,
  helperText,
  isRequired = false,
  showLabel = true,
  className = '',
  ...props
}) => {
  const { errors, setFieldError, clearFieldError } = useFormContext();
  const id = useId();
  const errorId = useId();
  const helperTextId = useId();
  
  const fieldError = error || errors[name];
  
  useEffect(() => {
    if (error) {
      setFieldError(name, error);
    }
  }, [error, name, setFieldError]);

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    props.onBlur?.(event);
    
    // Basic validation on blur
    if (isRequired && !event.target.value.trim()) {
      setFieldError(name, `${label || name} is required`);
    } else if (props.type === 'email' && event.target.value && !isValidEmail(event.target.value)) {
      setFieldError(name, 'Please enter a valid email address');
    } else {
      clearFieldError(name);
    }
  };

  const inputClasses = [
    'mt-1 block w-full rounded-md shadow-sm',
    'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    fieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  const describedByIds = [
    helperText ? helperTextId : '',
    fieldError ? errorId : ''
  ].filter(Boolean).join(' ');

  return (
    <FieldGroup>
      {showLabel && label && (
        <AccessibleLabel htmlFor={id} isRequired={isRequired}>
          {label}
        </AccessibleLabel>
      )}
      
      <input
        {...props}
        id={id}
        name={name}
        className={inputClasses}
        aria-invalid={!!fieldError}
        aria-describedby={describedByIds || undefined}
        aria-required={isRequired}
        onBlur={handleBlur}
      />
      
      {helperText && (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {fieldError && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}
    </FieldGroup>
  );
};

// Textarea Component
interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  name: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  showLabel?: boolean;
}

export const AccessibleTextarea: React.FC<AccessibleTextareaProps> = ({
  label,
  name,
  error,
  helperText,
  isRequired = false,
  showLabel = true,
  className = '',
  ...props
}) => {
  const { errors, setFieldError, clearFieldError } = useFormContext();
  const id = useId();
  const errorId = useId();
  const helperTextId = useId();
  
  const fieldError = error || errors[name];
  
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    props.onBlur?.(event);
    
    if (isRequired && !event.target.value.trim()) {
      setFieldError(name, `${label || name} is required`);
    } else {
      clearFieldError(name);
    }
  };

  const textareaClasses = [
    'mt-1 block w-full rounded-md shadow-sm',
    'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    fieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  const describedByIds = [
    helperText ? helperTextId : '',
    fieldError ? errorId : ''
  ].filter(Boolean).join(' ');

  return (
    <FieldGroup>
      {showLabel && label && (
        <AccessibleLabel htmlFor={id} isRequired={isRequired}>
          {label}
        </AccessibleLabel>
      )}
      
      <textarea
        {...props}
        id={id}
        name={name}
        className={textareaClasses}
        aria-invalid={!!fieldError}
        aria-describedby={describedByIds || undefined}
        aria-required={isRequired}
        onBlur={handleBlur}
      />
      
      {helperText && (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {fieldError && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}
    </FieldGroup>
  );
};

// Select Component
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  name: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  showLabel?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  label,
  name,
  error,
  helperText,
  isRequired = false,
  showLabel = true,
  options,
  placeholder = 'Select an option...',
  className = '',
  ...props
}) => {
  const { errors, setFieldError, clearFieldError } = useFormContext();
  const id = useId();
  const errorId = useId();
  const helperTextId = useId();
  
  const fieldError = error || errors[name];
  
  const handleBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    props.onBlur?.(event);
    
    if (isRequired && !event.target.value) {
      setFieldError(name, `${label || name} is required`);
    } else {
      clearFieldError(name);
    }
  };

  const selectClasses = [
    'mt-1 block w-full rounded-md shadow-sm',
    'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    fieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  const describedByIds = [
    helperText ? helperTextId : '',
    fieldError ? errorId : ''
  ].filter(Boolean).join(' ');

  return (
    <FieldGroup>
      {showLabel && label && (
        <AccessibleLabel htmlFor={id} isRequired={isRequired}>
          {label}
        </AccessibleLabel>
      )}
      
      <select
        {...props}
        id={id}
        name={name}
        className={selectClasses}
        aria-invalid={!!fieldError}
        aria-describedby={describedByIds || undefined}
        aria-required={isRequired}
        onBlur={handleBlur}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {helperText && (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
      
      {fieldError && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}
    </FieldGroup>
  );
};

// Checkbox Component
interface AccessibleCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  helperText?: string;
}

export const AccessibleCheckbox: React.FC<AccessibleCheckboxProps> = ({
  label,
  name,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const { errors } = useFormContext();
  const id = useId();
  const errorId = useId();
  const helperTextId = useId();
  
  const fieldError = error || errors[name];

  const describedByIds = [
    helperText ? helperTextId : '',
    fieldError ? errorId : ''
  ].filter(Boolean).join(' ');

  return (
    <FieldGroup>
      <div className="flex items-start">
        <input
          {...props}
          type="checkbox"
          id={id}
          name={name}
          className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
          aria-invalid={!!fieldError}
          aria-describedby={describedByIds || undefined}
        />
        <div className="ml-2 text-sm">
          <label htmlFor={id} className="text-gray-700 cursor-pointer">
            {label}
          </label>
          
          {helperText && (
            <p id={helperTextId} className="text-gray-500">
              {helperText}
            </p>
          )}
          
          {fieldError && (
            <p id={errorId} className="text-red-600" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      </div>
    </FieldGroup>
  );
};

// Utility functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};