import { useState, useCallback } from 'react';
import type { AsyncState, LoadingState } from '@/types';
import { parseAPIError } from '@/lib/error-handler';

export function useAsyncState<T>(initialData?: T): {
  state: AsyncState<T>;
  execute: (asyncFn: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
  setData: (data: T) => void;
  setError: (error: string) => void;
} {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: undefined,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | undefined> => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: undefined });
      return result;
    } catch (error) {
      const errorMessage = parseAPIError(error);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: undefined });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: undefined }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return { state, execute, reset, setData, setError };
}

export function useLoadingState(initialState: LoadingState = 'idle'): {
  loadingState: LoadingState;
  isLoading: boolean;
  isIdle: boolean;
  isSuccess: boolean;
  isError: boolean;
  setLoading: () => void;
  setSuccess: () => void;
  setError: () => void;
  setIdle: () => void;
} {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

  return {
    loadingState,
    isLoading: loadingState === 'loading',
    isIdle: loadingState === 'idle',
    isSuccess: loadingState === 'success',
    isError: loadingState === 'error',
    setLoading: () => setLoadingState('loading'),
    setSuccess: () => setLoadingState('success'),
    setError: () => setLoadingState('error'),
    setIdle: () => setLoadingState('idle'),
  };
}

// Form validation hook
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: T[keyof T]) => string | null>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback((field?: keyof T): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    const fieldsToValidate = field ? [field] : Object.keys(validationRules) as (keyof T)[];

    fieldsToValidate.forEach((key) => {
      const rule = validationRules[key];
      if (rule) {
        const error = rule(values[key]);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }
    });

    if (field) {
      setErrors(prev => ({ ...prev, ...newErrors }));
    } else {
      setErrors(newErrors);
    }

    return isValid;
  }, [values, validationRules]);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const handleBlur = useCallback((field: keyof T) => {
    setFieldTouched(field, true);
    validate(field);
  }, [setFieldTouched, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;
  const hasErrors = Object.values(errors).some(error => error !== undefined);

  return {
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    setValue,
    setTouched: setFieldTouched,
    handleBlur,
    validate,
    reset,
  };
}