import { useState, useCallback } from 'react';
import { ValidationResult, validateWizardStep, validateField, ValidationRule } from '@/lib/validation';

export interface UseValidationReturn {
  errors: Record<string, string>;
  warnings: Record<string, string>;
  isValid: boolean;
  validateStep: (stepId: string, stepData: Record<string, any>) => ValidationResult;
  validateSingleField: (fieldName: string, value: any, rules: ValidationRule[], allData?: any) => void;
  clearError: (fieldName: string) => void;
  clearAllErrors: () => void;
  setError: (fieldName: string, error: string) => void;
  hasErrors: (fieldNames?: string[]) => boolean;
}

export const useValidation = (): UseValidationReturn => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  const validateStep = useCallback((stepId: string, stepData: Record<string, any>): ValidationResult => {
    const result = validateWizardStep(stepId, stepData);
    setErrors(result.errors);
    setWarnings(result.warnings || {});
    return result;
  }, []);

  const validateSingleField = useCallback((
    fieldName: string, 
    value: any, 
    rules: ValidationRule[], 
    allData?: any
  ) => {
    const error = validateField(value, rules, allData);
    setErrors(prev => {
      const updated = { ...prev };
      if (error) {
        updated[fieldName] = error;
      } else {
        delete updated[fieldName];
      }
      return updated;
    });
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setWarnings({});
  }, []);

  const setError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);

  const hasErrors = useCallback((fieldNames?: string[]) => {
    if (!fieldNames) {
      return Object.keys(errors).length > 0;
    }
    return fieldNames.some(field => errors[field]);
  }, [errors]);

  const isValid = Object.keys(errors).length === 0;

  return {
    errors,
    warnings,
    isValid,
    validateStep,
    validateSingleField,
    clearError,
    clearAllErrors,
    setError,
    hasErrors
  };
};