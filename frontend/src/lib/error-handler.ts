import type { APIError } from '@/types';

export class AppError extends Error {
  public statusCode?: number;
  public isOperational: boolean;

  constructor(message: string, statusCode?: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const parseAPIError = (error: unknown): string => {
  if (!error) return 'An unknown error occurred';
  
  // Axios error with response
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: APIError; status?: number } };
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (axiosError.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (axiosError.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (axiosError.response?.status === 500) {
      return 'An internal server error occurred. Please try again later.';
    }
  }
  
  // Network or other errors
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const messageError = error as { message: string };
    if (messageError.message.includes('Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return messageError.message;
  }
  
  // String error
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  errorMessage?: string
): Promise<{ data?: T; error?: string }> => {
  try {
    const data = await asyncFn();
    return { data };
  } catch (error) {
    const message = errorMessage || parseAPIError(error);
    console.error('Async operation failed:', error);
    return { error: message };
  }
};

export const withErrorBoundary = <T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  fallbackError?: string
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = fallbackError || parseAPIError(error);
      throw new AppError(message);
    }
  }) as T;
};

// Validation helpers
export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  return null;
};

export const validatePasswordStrength = (password: string): string | null => {
  if (!password) return 'Password is required';
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  // Check for lowercase letter  
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)';
  }
  
  return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateCoordinates = (lat?: number, lng?: number): string | null => {
  if (lat === undefined || lng === undefined) {
    return 'Both latitude and longitude are required';
  }
  if (lat < -90 || lat > 90) {
    return 'Latitude must be between -90 and 90';
  }
  if (lng < -180 || lng > 180) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
};

export const validateFileSize = (file: File, maxSizeMB: number): string | null => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }
  return null;
};

export const validateFileType = (file: File, allowedTypes: string[]): string | null => {
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  return null;
};