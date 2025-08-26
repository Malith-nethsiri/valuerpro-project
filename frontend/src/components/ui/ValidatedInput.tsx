import React, { useState, useEffect, useCallback } from 'react';
import { useFieldValidation, FieldValidationOptions } from '@/hooks/useFieldValidation';
import { FieldError, ValidationStatus } from './ErrorDisplay';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  fieldName: string;
  validation?: FieldValidationOptions;
  value?: string | number;
  onChange?: (value: string | number, isValid: boolean) => void;
  showValidationStatus?: boolean;
  helpText?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  fieldName,
  validation = {},
  value = '',
  onChange,
  showValidationStatus = true,
  helpText,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  errorClassName = '',
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  ...inputProps
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value || ''));
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    error,
    isValid,
    isValidating,
    validate,
    clearError
  } = useFieldValidation(fieldName, { ...validation, required });

  // Update internal value when prop value changes
  useEffect(() => {
    setInputValue(String(value || ''));
  }, [value]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (touched && validation.validateOnChange !== false) {
      await validate(type === 'number' ? Number(newValue) : newValue);
    }
    
    if (onChange) {
      const processedValue = type === 'number' ? Number(newValue) : newValue;
      onChange(processedValue, !error && !isValidating);
    }
  }, [touched, validation.validateOnChange, validate, type, onChange, error, isValidating]);

  const handleBlur = useCallback(async () => {
    setTouched(true);
    if (validation.validateOnBlur !== false) {
      await validate(type === 'number' ? Number(inputValue) : inputValue);
    }
  }, [validation.validateOnBlur, validate, type, inputValue]);

  const handleFocus = useCallback(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Determine input type for password fields
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Base input classes with error states
  const baseInputClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-offset-0 
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error && touched ? 
      'border-red-300 focus:border-red-500 focus:ring-red-500' : 
      'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${inputClassName}
  `;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {isValidating && (
            <span className="ml-2 text-xs text-gray-500">
              <div className="inline-block animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-gray-600"></div>
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          {...inputProps}
          type={inputType}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInputClasses.trim()}
        />

        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}

        {/* Validation status indicator */}
        {showValidationStatus && touched && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <ValidationStatus 
              isValid={isValid}
              isValidating={isValidating}
              error={error}
            />
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-600">{helpText}</p>
      )}

      {/* Error message */}
      {touched && error && (
        <FieldError error={error} className={errorClassName} />
      )}
    </div>
  );
};

// Validated textarea component
export interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  fieldName: string;
  validation?: FieldValidationOptions;
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  showValidationStatus?: boolean;
  helpText?: string;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  errorClassName?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  label,
  fieldName,
  validation = {},
  value = '',
  onChange,
  showValidationStatus = true,
  helpText,
  containerClassName = '',
  labelClassName = '',
  textareaClassName = '',
  errorClassName = '',
  placeholder,
  disabled = false,
  required = false,
  maxLength,
  showCharCount = false,
  rows = 3,
  ...textareaProps
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value || ''));
  const [touched, setTouched] = useState(false);
  
  const {
    error,
    isValid,
    isValidating,
    validate,
    clearError
  } = useFieldValidation(fieldName, { ...validation, required });

  useEffect(() => {
    setInputValue(String(value || ''));
  }, [value]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (touched && validation.validateOnChange !== false) {
      await validate(newValue);
    }
    
    if (onChange) {
      onChange(newValue, !error && !isValidating);
    }
  }, [touched, validation.validateOnChange, validate, onChange, error, isValidating]);

  const handleBlur = useCallback(async () => {
    setTouched(true);
    if (validation.validateOnBlur !== false) {
      await validate(inputValue);
    }
  }, [validation.validateOnBlur, validate, inputValue]);

  const handleFocus = useCallback(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  const baseTextareaClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-offset-0 
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error && touched ? 
      'border-red-300 focus:border-red-500 focus:ring-red-500' : 
      'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${textareaClassName}
  `;

  const charCount = inputValue.length;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          {...textareaProps}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={baseTextareaClasses.trim()}
        />

        {/* Validation status indicator */}
        {showValidationStatus && touched && (
          <div className="absolute top-2 right-2">
            <ValidationStatus 
              isValid={isValid}
              isValidating={isValidating}
              error={error}
            />
          </div>
        )}
      </div>

      {/* Character count */}
      {showCharCount && maxLength && (
        <div className="flex justify-between mt-1">
          <div className="flex-1">
            {helpText && !error && (
              <p className="text-sm text-gray-600">{helpText}</p>
            )}
          </div>
          <p className={`text-xs ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
            {charCount}/{maxLength}
          </p>
        </div>
      )}

      {/* Error message */}
      {touched && error && (
        <FieldError error={error} className={errorClassName} />
      )}
    </div>
  );
};

// Validated select component
export interface ValidatedSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  fieldName: string;
  validation?: FieldValidationOptions;
  value?: string | number;
  onChange?: (value: string | number, isValid: boolean) => void;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
  showValidationStatus?: boolean;
  helpText?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  errorClassName?: string;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  fieldName,
  validation = {},
  value = '',
  onChange,
  options,
  placeholder = 'Select an option...',
  showValidationStatus = true,
  helpText,
  containerClassName = '',
  labelClassName = '',
  selectClassName = '',
  errorClassName = '',
  disabled = false,
  required = false,
  ...selectProps
}) => {
  const [selectValue, setSelectValue] = useState<string>(String(value || ''));
  const [touched, setTouched] = useState(false);
  
  const {
    error,
    isValid,
    isValidating,
    validate,
    clearError
  } = useFieldValidation(fieldName, { ...validation, required });

  useEffect(() => {
    setSelectValue(String(value || ''));
  }, [value]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSelectValue(newValue);
    setTouched(true);
    
    await validate(newValue);
    
    if (onChange) {
      onChange(newValue, !error && !isValidating);
    }
  }, [validate, onChange, error, isValidating]);

  const baseSelectClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-offset-0 
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error && touched ? 
      'border-red-300 focus:border-red-500 focus:ring-red-500' : 
      'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${selectClassName}
  `;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          {...selectProps}
          value={selectValue}
          onChange={handleChange}
          disabled={disabled}
          className={baseSelectClasses.trim()}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
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

        {/* Validation status indicator */}
        {showValidationStatus && touched && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <ValidationStatus 
              isValid={isValid}
              isValidating={isValidating}
              error={error}
            />
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-600">{helpText}</p>
      )}

      {/* Error message */}
      {touched && error && (
        <FieldError error={error} className={errorClassName} />
      )}
    </div>
  );
};