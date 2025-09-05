'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import type { ProfileCompletionStatus } from '@/types/api';

interface FormData {
  qualifications: string;
  registration_no: string;
  company_name: string;
  contact_phones: string;
}

export default function ProfileCompletePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileCompletionStatus | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    qualifications: '',
    registration_no: '',
    company_name: '',
    contact_phones: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfileStatus();
  }, []);

  const loadProfileStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Get profile status first
      const status = await authAPI.getProfileStatus();
      setProfileStatus(status);

      // If already complete, redirect to dashboard
      if (status.can_create_reports) {
        router.push('/dashboard?message=Profile already complete');
        return;
      }

      // Load current user data to populate form
      const userData = await authAPI.getCurrentUser();
      setFormData({
        qualifications: userData.valuer_profile?.qualifications?.join(', ') || '',
        registration_no: userData.valuer_profile?.registration_no || '',
        company_name: userData.valuer_profile?.company_name || '',
        contact_phones: userData.valuer_profile?.contact_phones?.join(', ') || '',
      });

    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/auth/login');
      } else {
        setError('Failed to load profile information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: '',
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.qualifications.trim()) {
      errors.qualifications = 'Professional qualifications are required';
    }

    if (!formData.registration_no.trim()) {
      errors.registration_no = 'Registration number is required';
    }

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }

    if (!formData.contact_phones.trim()) {
      errors.contact_phones = 'Contact phone is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Prepare valuer profile data
      const profileData = {
        qualifications: formData.qualifications ? 
          formData.qualifications.split(',').map(q => q.trim()).filter(q => q) : [],
        registration_no: formData.registration_no.trim(),
        company_name: formData.company_name.trim(),
        contact_phones: formData.contact_phones ? 
          formData.contact_phones.split(',').map(p => p.trim()).filter(p => p) : [],
      };

      // Get current user to check if profile exists
      const userData = await authAPI.getCurrentUser();

      if (userData.valuer_profile) {
        // Update existing profile
        await authAPI.updateValuerProfile(profileData);
      } else {
        // Create new profile
        await authAPI.createValuerProfile(profileData);
      }

      setSuccess('Profile completed successfully! You can now create reports.');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard?message=Profile completed successfully');
      }, 2000);

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const progressPercentage = profileStatus ? Math.round(profileStatus.completion_percentage) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
            <svg
              className="h-6 w-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Complete Your Professional Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Add the required information to create professional valuation reports
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Profile Completion</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Professional Qualifications */}
            <div>
              <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700">
                Professional Qualifications *
              </label>
              <input
                id="qualifications"
                name="qualifications"
                type="text"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  fieldErrors.qualifications ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="AIVSL, BSc Surveying, RICS"
                value={formData.qualifications}
                onChange={handleChange}
              />
              {fieldErrors.qualifications && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.qualifications}</div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple qualifications with commas
              </p>
            </div>

            {/* Registration Number */}
            <div>
              <label htmlFor="registration_no" className="block text-sm font-medium text-gray-700">
                Registration Number *
              </label>
              <input
                id="registration_no"
                name="registration_no"
                type="text"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  fieldErrors.registration_no ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VSL12345 or RICS123456"
                value={formData.registration_no}
                onChange={handleChange}
              />
              {fieldErrors.registration_no && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.registration_no}</div>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Company/Firm Name *
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  fieldErrors.company_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ABC Valuation Services"
                value={formData.company_name}
                onChange={handleChange}
              />
              {fieldErrors.company_name && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.company_name}</div>
              )}
            </div>

            {/* Contact Phone Numbers */}
            <div>
              <label htmlFor="contact_phones" className="block text-sm font-medium text-gray-700">
                Contact Phone Numbers *
              </label>
              <input
                id="contact_phones"
                name="contact_phones"
                type="text"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  fieldErrors.contact_phones ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+94 11 123 4567, +94 77 123 4567"
                value={formData.contact_phones}
                onChange={handleChange}
              />
              {fieldErrors.contact_phones && (
                <div className="text-red-500 text-xs mt-1">{fieldErrors.contact_phones}</div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple numbers with commas
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Complete Profile'
              )}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Skip for Now
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can update your profile anytime from the{' '}
            <button
              onClick={() => router.push('/profile')}
              className="text-indigo-600 hover:text-indigo-500"
            >
              profile page
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}