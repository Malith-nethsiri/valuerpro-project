'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileCompletionStatus } from '@/types/api';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileStatus: ProfileCompletionStatus;
}

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  profileStatus,
}: ProfileCompletionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCompleteProfile = async () => {
    setLoading(true);
    try {
      // Navigate to profile completion page
      router.push('/profile/complete');
      onClose();
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const progressPercentage = Math.round(profileStatus.completion_percentage);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4 text-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto transform transition-all">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Complete Your Professional Profile
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                To create professional valuation reports, please complete your valuer profile with the required professional information.
              </p>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
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

            {/* Missing Fields */}
            <div className="px-6 pb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Required Information:</h4>
              <div className="text-left">
                {profileStatus.missing_fields.map((field, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600 mb-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 flex-shrink-0" />
                    {field}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCompleteProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Complete Profile Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}