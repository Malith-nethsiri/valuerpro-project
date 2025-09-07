import { useState, useCallback, useEffect } from 'react';
import { useWizard } from '@/components/wizard/WizardProvider';
import { 
  validateEmail, 
  validatePassword, 
  validateRequired, 
  validateCoordinates,
  validateFileSize,
  validateFileType 
} from '@/lib/error-handler';

export interface FieldValidationOptions {
  required?: boolean;
  type?: 'email' | 'password' | 'number' | 'date' | 'coordinates' | 'file';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => string | null;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface UseFieldValidationReturn {
  error: string | null;
  isValid: boolean;
  isValidating: boolean;
  validate: (value: any) => Promise<string | null>;
  clearError: () => void;
}

export const useFieldValidation = (
  fieldName: string,
  options: FieldValidationOptions = {}
): UseFieldValidationReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  // Note: Temporarily removed wizard context dependency for Group-based architecture
  // const { validateStep, state } = useWizard();
  
  const {
    required = false,
    type,
    min,
    max,
    pattern,
    customValidator,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const validateValue = useCallback(async (value: any): Promise<string | null> => {
    // Required validation
    if (required && (value === undefined || value === null || value === '')) {
      return `${fieldName} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value && !required) return null;

    // Type-specific validations
    switch (type) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      case 'number':
        const num = Number(value);
        if (isNaN(num)) return `${fieldName} must be a valid number`;
        if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
        if (max !== undefined && num > max) return `${fieldName} must be at most ${max}`;
        break;
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) return `${fieldName} must be a valid date`;
        break;
      case 'coordinates':
        if (value && typeof value === 'object') {
          return validateCoordinates(value.latitude, value.longitude);
        }
        break;
      case 'file':
        if (value instanceof File) {
          if (min) {
            const fileSizeError = validateFileSize(value, min);
            if (fileSizeError) return fileSizeError;
          }
          if (max) {
            const allowedTypes = Array.isArray(max) ? max : [max];
            const fileTypeError = validateFileType(value, allowedTypes);
            if (fileTypeError) return fileTypeError;
          }
        }
        break;
    }

    // Pattern validation
    if (pattern && typeof value === 'string' && !pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (customValidator) {
      return customValidator(value);
    }

    return null;
  }, [fieldName, required, type, min, max, pattern, customValidator]);

  const validate = useCallback(async (value: any): Promise<string | null> => {
    setIsValidating(true);
    
    // Add debounce for real-time validation
    if (debounceMs > 0) {
      await new Promise(resolve => setTimeout(resolve, debounceMs));
    }
    
    const validationError = await validateValue(value);
    setError(validationError);
    setIsValidating(false);
    
    return validationError;
  }, [validateValue, debounceMs]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isValid = error === null && !isValidating;

  return {
    error,
    isValid,
    isValidating,
    validate,
    clearError
  };
};

// Hook for step-level validation
export const useStepValidation = (stepIndex: number) => {
  // Note: Temporarily disabled for Group-based architecture
  // const { validateStep } = useWizard();
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async () => {
    setIsValidating(true);
    // Temporarily disabled wizard step validation for Group-based architecture
    const stepErrors: string[] = [];
    setErrors(stepErrors);
    setIsValidating(false);
    return stepErrors;
  }, [stepIndex]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const isValid = errors.length === 0 && !isValidating;

  return {
    errors,
    isValid,
    isValidating,
    validate,
    clearErrors
  };
};

// Hook for form-level validation with multiple fields
export interface FormFieldConfig {
  name: string;
  validation: FieldValidationOptions;
}

export const useFormValidation = (fields: FormFieldConfig[]) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback(async (fieldName: string, value: any): Promise<string | null> => {
    const fieldConfig = fields.find(f => f.name === fieldName);
    if (!fieldConfig) return null;

    const { validation } = fieldConfig;
    const fieldValidator = useFieldValidation(fieldName, validation);
    const error = await fieldValidator.validate(value);
    
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    return error;
  }, [fields]);

  const validateAll = useCallback(async (formData: Record<string, any>) => {
    setIsValidating(true);
    const errors: Record<string, string | null> = {};
    
    for (const field of fields) {
      const value = formData[field.name];
      const fieldValidator = useFieldValidation(field.name, field.validation);
      const error = await fieldValidator.validate(value);
      errors[field.name] = error;
    }
    
    setFieldErrors(errors);
    setIsValidating(false);
    
    return errors;
  }, [fields]);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => ({ ...prev, [fieldName]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasErrors = Object.values(fieldErrors).some(error => error !== null);
  const isValid = !hasErrors && !isValidating;

  return {
    fieldErrors,
    isValid,
    isValidating,
    hasErrors,
    validateField,
    validateAll,
    clearFieldError,
    clearAllErrors
  };
};

// Validation schema definitions for common patterns
export const validationSchemas = {
  lotNumber: {
    required: true,
    pattern: /^[A-Za-z0-9\-\/]+$/,
    customValidator: (value: string) => {
      if (value && value.length > 20) {
        return 'Lot number must be less than 20 characters';
      }
      return null;
    }
  },
  planNumber: {
    required: true,
    pattern: /^[A-Za-z0-9\-\/]+$/,
    customValidator: (value: string) => {
      if (value && value.length > 30) {
        return 'Plan number must be less than 30 characters';
      }
      return null;
    }
  },
  extent: {
    required: true,
    type: 'number' as const,
    min: 0.01,
    max: 10000
  },
  marketValue: {
    required: true,
    type: 'number' as const,
    min: 1,
    max: 999999999999
  },
  coordinates: {
    type: 'coordinates' as const,
    customValidator: (value: any) => {
      if (value && (!value.latitude || !value.longitude)) {
        return 'Both latitude and longitude are required';
      }
      return null;
    }
  },
  phoneNumber: {
    pattern: /^\+?[\d\s\-\(\)]+$/,
    customValidator: (value: string) => {
      if (value && (value.length < 10 || value.length > 15)) {
        return 'Phone number must be between 10 and 15 digits';
      }
      return null;
    }
  }
};