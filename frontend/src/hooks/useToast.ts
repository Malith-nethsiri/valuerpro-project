'use client'

import { useState, useCallback } from 'react'
import { ToastProps } from '@/components/ui/Toast'

interface ToastInput {
  type: ToastProps['type']
  title: string
  message?: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback(({ type, title, message, duration }: ToastInput) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: ToastProps = {
      id,
      type,
      title,
      message,
      duration,
      onClose: removeToast
    }

    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'success', title, message, duration })
  }, [addToast])

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'error', title, message, duration })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'warning', title, message, duration })
  }, [addToast])

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'info', title, message, duration })
  }, [addToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  // Enhanced API error handler
  const apiError = useCallback((error: any, customMessage?: string) => {
    let title = 'Request Failed';
    let message = customMessage || 'An unexpected error occurred. Please try again.';

    if (error?.response?.data) {
      const errorData = error.response.data;
      
      // Handle FastAPI validation errors
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors
          const validationErrors = errorData.detail
            .map((err: any) => {
              const field = Array.isArray(err.loc) ? err.loc.join('.') : 'field';
              return `${field}: ${err.msg}`;
            })
            .slice(0, 3) // Show max 3 validation errors
            .join('; ');
          message = `Validation errors: ${validationErrors}`;
          if (errorData.detail.length > 3) {
            message += ` (and ${errorData.detail.length - 3} more...)`;
          }
        } else {
          message = errorData.detail;
        }
      } else if (errorData.message) {
        message = errorData.message;
      }

      // Set title based on status code
      const status = error.response.status;
      if (status === 400) {
        title = 'Invalid Request';
      } else if (status === 401) {
        title = 'Authentication Required';
        message = 'Your session has expired. Please log in again.';
      } else if (status === 403) {
        title = 'Access Denied';
        message = 'You do not have permission to perform this action.';
      } else if (status === 404) {
        title = 'Resource Not Found';
        message = 'The requested resource could not be found.';
      } else if (status === 422) {
        title = 'Validation Error';
      } else if (status >= 500) {
        title = 'Server Error';
        message = 'A server error occurred. Please try again later.';
      }
    } else if (error?.code === 'NETWORK_ERROR') {
      title = 'Network Error';
      message = 'Unable to connect to the server. Please check your connection.';
    }

    return addToast({ 
      type: 'error', 
      title, 
      message, 
      duration: error?.response?.status === 401 ? 0 : 8000 // Keep auth errors persistent
    });
  }, [addToast])

  // Loading state helpers
  const loading = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message, duration: 0 })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    apiError,
    loading,
    clearAll
  }
}