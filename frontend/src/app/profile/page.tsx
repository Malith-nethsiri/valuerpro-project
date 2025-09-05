'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { validateRequired, validateEmail } from '@/lib/error-handler';
import type { ProfileCompletionStatus } from '@/types/api';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  valuer_profile?: {
    id: string;
    titles?: string;
    full_name?: string;
    designation?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    membership_status?: string;
    company_name?: string;
    firm_address?: string;
    address?: string;
    phones?: string[];
    contact_phones?: string[];
    email?: string;
    contact_email?: string;
    default_standards?: string;
    indemnity_status?: string;
    default_disclaimers?: string;
    default_certificate?: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileCompletionStatus | null>(null);
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
    professional_name: '',
    designation: '',
    qualifications: '',
    panels: '',
    registration_no: '',
    membership_status: '',
    company_name: '',
    firm_address: '',
    address: '',
    phones: '',
    contact_phones: '',
    contact_email: '',
    default_standards: '',
    indemnity_status: '',
    default_disclaimers: '',
    default_certificate: '',
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

      // Load both user profile and completion status
      const [userData, statusData] = await Promise.all([
        authAPI.getCurrentUser(),
        authAPI.getProfileStatus()
      ]);
      
      setProfile(userData);
      setProfileStatus(statusData);
      
      // Populate form with current data
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        titles: userData.valuer_profile?.titles || '',
        professional_name: userData.valuer_profile?.full_name || '',
        designation: userData.valuer_profile?.designation || '',
        qualifications: userData.valuer_profile?.qualifications?.join(', ') || '',
        panels: userData.valuer_profile?.panels?.join(', ') || '',
        registration_no: userData.valuer_profile?.registration_no || '',
        membership_status: userData.valuer_profile?.membership_status || '',
        company_name: userData.valuer_profile?.company_name || '',
        firm_address: userData.valuer_profile?.firm_address || '',
        address: userData.valuer_profile?.address || '',
        phones: userData.valuer_profile?.phones?.join(', ') || '',
        contact_phones: userData.valuer_profile?.contact_phones?.join(', ') || '',
        contact_email: userData.valuer_profile?.contact_email || userData.valuer_profile?.email || '',
        default_standards: userData.valuer_profile?.default_standards || '',
        indemnity_status: userData.valuer_profile?.indemnity_status || '',
        default_disclaimers: userData.valuer_profile?.default_disclaimers || '',
        default_certificate: userData.valuer_profile?.default_certificate || '',
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
        full_name: formData.professional_name || null,
        designation: formData.designation || null,
        qualifications: formData.qualifications ? 
          formData.qualifications.split(',').map(q => q.trim()).filter(q => q) : [],
        panels: formData.panels ? 
          formData.panels.split(',').map(p => p.trim()).filter(p => p) : [],
        registration_no: formData.registration_no || null,
        membership_status: formData.membership_status || null,
        company_name: formData.company_name || null,
        firm_address: formData.firm_address || null,
        address: formData.address || null,
        phones: formData.phones ? 
          formData.phones.split(',').map(p => p.trim()).filter(p => p) : [],
        contact_phones: formData.contact_phones ? 
          formData.contact_phones.split(',').map(p => p.trim()).filter(p => p) : [],
        email: formData.contact_email || null,
        contact_email: formData.contact_email || null,
        default_standards: formData.default_standards || null,
        indemnity_status: formData.indemnity_status || null,
        default_disclaimers: formData.default_disclaimers || null,
        default_certificate: formData.default_certificate || null,
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
        professional_name: profile.valuer_profile?.full_name || '',
        designation: profile.valuer_profile?.designation || '',
        qualifications: profile.valuer_profile?.qualifications?.join(', ') || '',
        panels: profile.valuer_profile?.panels?.join(', ') || '',
        registration_no: profile.valuer_profile?.registration_no || '',
        membership_status: profile.valuer_profile?.membership_status || '',
        company_name: profile.valuer_profile?.company_name || '',
        firm_address: profile.valuer_profile?.firm_address || '',
        address: profile.valuer_profile?.address || '',
        phones: profile.valuer_profile?.phones?.join(', ') || '',
        contact_phones: profile.valuer_profile?.contact_phones?.join(', ') || '',
        contact_email: profile.valuer_profile?.contact_email || profile.valuer_profile?.email || '',
        default_standards: profile.valuer_profile?.default_standards || '',
        indemnity_status: profile.valuer_profile?.indemnity_status || '',
        default_disclaimers: profile.valuer_profile?.default_disclaimers || '',
        default_certificate: profile.valuer_profile?.default_certificate || '',
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
                
                {/* Profile Completion Status */}
                {profileStatus && (
                  <div className="mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-indigo-100 mb-1">
                          <span>Profile Completion</span>
                          <span>{Math.round(profileStatus.completion_percentage)}%</span>
                        </div>
                        <div className="w-full bg-indigo-400 bg-opacity-30 rounded-full h-2">
                          <div
                            className="bg-white h-2 rounded-full transition-all duration-300"
                            style={{ width: `${profileStatus.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                      {!profileStatus.can_create_reports && (
                        <button
                          onClick={() => router.push('/profile/complete')}
                          className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        >
                          Complete Profile
                        </button>
                      )}
                    </div>
                    {!profileStatus.can_create_reports && profileStatus.missing_fields.length > 0 && (
                      <div className="mt-2">
                        <p className="text-indigo-100 text-xs mb-1">Missing required fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {profileStatus.missing_fields.slice(0, 3).map((field, index) => (
                            <span
                              key={index}
                              className="bg-indigo-400 bg-opacity-30 text-indigo-100 px-2 py-0.5 rounded text-xs"
                            >
                              {field}
                            </span>
                          ))}
                          {profileStatus.missing_fields.length > 3 && (
                            <span className="text-indigo-200 text-xs">+{profileStatus.missing_fields.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

            {/* Profile Status Alert */}
            {profileStatus && !profileStatus.can_create_reports && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">
                      Profile Incomplete
                    </h3>
                    <p className="mt-1 text-sm text-orange-700">
                      To create professional valuation reports, please complete the required profile information.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => router.push('/profile/complete')}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                      >
                        Complete Profile Now
                      </button>
                    </div>
                  </div>
                </div>
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
                      Professional Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="professional_name"
                        value={formData.professional_name}
                        onChange={handleChange}
                        placeholder="Full professional name for reports"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.full_name || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Professional Designation
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="Chartered Valuer, FIVSL, etc."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.designation || 'Not specified'}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      IVSL Membership Status
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="membership_status"
                        value={formData.membership_status}
                        onChange={handleChange}
                        placeholder="Full Member, Associate Member, etc."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.membership_status || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company/Firm Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        placeholder="ABC Valuations (Pvt) Ltd"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.company_name || 'Not specified'}
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
                      Firm Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="firm_address"
                        value={formData.firm_address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Complete business/firm address"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.firm_address || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Personal Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Personal address"
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
                      Business Phone Numbers
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="contact_phones"
                          value={formData.contact_phones}
                          onChange={handleChange}
                          placeholder="+94 11 123 4567, +94 77 123 4567"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Business contact numbers (separate with commas)</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.contact_phones?.join(', ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Personal Phone Numbers
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="phones"
                          value={formData.phones}
                          onChange={handleChange}
                          placeholder="+94 77 123 4567"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Personal contact numbers (separate with commas)</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.phones?.join(', ') || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Contact Email
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          type="email"
                          name="contact_email"
                          value={formData.contact_email}
                          onChange={handleChange}
                          placeholder="contact@company.com"
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                            fieldErrors.contact_email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {fieldErrors.contact_email && (
                          <div className="text-red-500 text-xs mt-1">{fieldErrors.contact_email}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Professional business email</p>
                      </>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.contact_email || profile.valuer_profile?.email || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Standards & Legal Templates */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Professional Standards & Legal Templates
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Valuation Standards
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="default_standards"
                        value={formData.default_standards}
                        onChange={handleChange}
                        placeholder="IVSL Standards, IVS, etc."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.default_standards || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Professional Indemnity Status
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="indemnity_status"
                        value={formData.indemnity_status}
                        onChange={handleChange}
                        placeholder="Covered up to LKR X million"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.valuer_profile?.indemnity_status || 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Disclaimers
                    </label>
                    {isEditing ? (
                      <textarea
                        name="default_disclaimers"
                        value={formData.default_disclaimers}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Standard disclaimer text to use in all reports..."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-1">
                        {profile.valuer_profile?.default_disclaimers ? (
                          <div className="text-gray-900 whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md">
                            {profile.valuer_profile.default_disclaimers}
                          </div>
                        ) : (
                          <p className="text-gray-900">Not specified</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Certificate Text
                    </label>
                    {isEditing ? (
                      <textarea
                        name="default_certificate"
                        value={formData.default_certificate}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Standard professional certificate text..."
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <div className="mt-1">
                        {profile.valuer_profile?.default_certificate ? (
                          <div className="text-gray-900 whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md">
                            {profile.valuer_profile.default_certificate}
                          </div>
                        ) : (
                          <p className="text-gray-900">Not specified</p>
                        )}
                      </div>
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