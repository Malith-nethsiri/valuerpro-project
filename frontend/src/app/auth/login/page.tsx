'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import type { LoginFormData } from '@/types';
import { parseAPIError, validateEmail, validatePassword } from '@/lib/error-handler';
import { useFormValidation } from '@/hooks/useAsyncState';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    values,
    errors,
    touched,
    setValue,
    handleBlur,
    validate
  } = useFormValidation<LoginFormData>(
    { email: '', password: '' },
    {
      email: (value) => validateEmail(value as string),
      password: (value) => validatePassword(value as string)
    }
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    const isValid = validate();
    if (!isValid) {
      setError('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      await login(values.email, values.password);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(parseAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to ValuerPro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Property Valuation Reports
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Email address"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => handleBlur('email')}
              />
              {errors.email && touched.email && (
                <div className="text-red-500 text-xs mt-1">{errors.email}</div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                onBlur={() => handleBlur('password')}
              />
              {errors.password && touched.password && (
                <div className="text-red-500 text-xs mt-1">{errors.password}</div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/register"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}