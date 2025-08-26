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

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}