'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { reportsAPI } from '@/lib/api';

interface Report {
  id: string;
  title: string;
  status: string;
  property_address?: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
  data?: any;
}

export default function EditReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    property_address: '',
    reference_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    loadReport();
  }, [reportId, router]);

  const loadReport = async () => {
    try {
      const reportData = await reportsAPI.get(reportId);
      setReport(reportData);
      setFormData({
        title: reportData.title || '',
        property_address: reportData.property_address || '',
        reference_number: reportData.reference_number || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load report');
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updatedData = {
        ...formData,
        data: report?.data, // Preserve existing data
      };

      await reportsAPI.update(reportId, updatedData);
      router.push(`/reports/${reportId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading report...</div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Report Not Found</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href={`/reports/${reportId}`} className="text-indigo-600 hover:text-indigo-500">
                ← Back to Report
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Report</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Report Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Valuation Report"
                  />
                </div>

                <div>
                  <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="VR-2024-001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="property_address" className="block text-sm font-medium text-gray-700">
                    Property Address
                  </label>
                  <textarea
                    name="property_address"
                    id="property_address"
                    rows={3}
                    value={formData.property_address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter the complete property address..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/reports/${reportId}`}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.title}
              className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Update Report'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}