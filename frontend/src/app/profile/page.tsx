'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { validateRequired, validateEmail } from '@/lib/error-handler';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  valuer_profile?: {
    id: string;
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // Form data for editing
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    titles: '',
    qualifications: '',
    panels: '',
    registration_no: '',
    address: '',
    phones: '',
    contact_email: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const userData = await authAPI.getCurrentUser();
      setProfile(userData);
      
      // Populate form with current data
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        titles: userData.valuer_profile?.titles || '',
        qualifications: userData.valuer_profile?.qualifications?.join(', ') || '',
        panels: userData.valuer_profile?.panels?.join(', ') || '',
        registration_no: userData.valuer_profile?.registration_no || '',
        address: userData.valuer_profile?.address || '',
        phones: userData.valuer_profile?.phones?.join(', ') || '',
        contact_email: userData.valuer_profile?.email || '',
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/auth/login');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    // Validate required fields
    const fullNameError = validateRequired(formData.full_name, 'Full name');
    if (fullNameError) errors.full_name = fullNameError;

    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    // Validate contact email if provided
    if (formData.contact_email) {
      const contactEmailError = validateEmail(formData.contact_email);
      if (contactEmailError) errors.contact_email = contactEmailError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      // Update basic user information
      await authAPI.updateProfile({
        full_name: formData.full_name,
        email: formData.email,
      });

      // Update or create valuer profile
      const valuerProfileData = {
        titles: formData.titles || null,
        qualifications: formData.qualifications ? 
          formData.qualifications.split(',').map(q => q.trim()).filter(q => q) : [],
        panels: formData.panels ? 
          formData.panels.split(',').map(p => p.trim()).filter(p => p) : [],
        registration_no: formData.registration_no || null,
        address: formData.address || null,
        phones: formData.phones ? 
          formData.phones.split(',').map(p => p.trim()).filter(p => p) : [],
        email: formData.contact_email || null,
      };

      if (profile?.valuer_profile) {
        // Update existing profile
        await authAPI.updateValuerProfile(valuerProfileData);
      } else {
        // Create new profile
        await authAPI.createValuerProfile(valuerProfileData);
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Reload profile to get updated data
      await loadProfile();

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFieldErrors({});
    setError('');
    setSuccess('');
    
    // Reset form data to current profile values
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        titles: profile.valuer_profile?.titles || '',
        qualifications: profile.valuer_profile?.qualifications?.join(', ') || '',
        panels: profile.valuer_profile?.panels?.join(', ') || '',
        registration_no: profile.valuer_profile?.registration_no || '',
        address: profile.valuer_profile?.address || '',
        phones: profile.valuer_profile?.phones?.join(', ') || '',
        contact_email: profile.valuer_profile?.email || '',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full border-indigo-600 border-r-transparent" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile</p>
          <button 
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {profile.full_name}
                </h1>
                <p className="text-indigo-100 mt-1">
                  {profile.role === 'valuer' ? 'Valuation Officer' : profile.role}
                </p>
                <p className="text-indigo-200 text-sm mt-1">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-indigo-600 px-6 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-700">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="text-green-700">{success}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                            fieldErrors.full_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.full_name && (
                          <div className="text-red-500 text-xs mt-1">{fieldErrors.full_name}</div>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">{profile.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                            fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.email && (
                          <div className="text-red-500 text-xs mt-1">{fieldErrors.email}</div>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">{profile.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <p className="mt-1 text-gray-900 capitalize">{profile.role}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Professional Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="titles"
                        value={formData.titles}
                        onChange={handleChange}
                        placeholder="Mr./Mrs./Dr./Prof."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.titles || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Qualifications
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="qualifications"
                          value={formData.qualifications}
                          onChange={handleChange}
                          placeholder="BSc (Hons) Estate Management, ARICS"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple qualifications with commas</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.qualifications?.join(', ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Panel Memberships
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="panels"
                          value={formData.panels}
                          onChange={handleChange}
                          placeholder="Approved Valuer Panel"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple panels with commas</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.panels?.join(', ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="registration_no"
                        value={formData.registration_no}
                        onChange={handleChange}
                        placeholder="VAL/2024/001"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.registration_no || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="123 Main Street, City, Country"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.address || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Numbers
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="phones"
                          value={formData.phones}
                          onChange={handleChange}
                          placeholder="+94 11 123 4567"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple numbers with commas</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.phones?.join(', ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="email"
                          name="contact_email"
                          value={formData.contact_email}
                          onChange={handleChange}
                          placeholder="contact@example.com"
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                            fieldErrors.contact_email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.contact_email && (
                          <div className="text-red-500 text-xs mt-1">{fieldErrors.contact_email}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Optional business contact email</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.email || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Dashboard */}
            <div className="mt-8 pt-6 border-t">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}