'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reportsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentIcon,
  PlusIcon,
  UserCircleIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

interface Report {
  id: string;
  title: string;
  status: string;
  property_address?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [generatingDocx, setGeneratingDocx] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const loadData = async () => {
    try {
      const reportsResponse = await reportsAPI.list();
      setReports(reportsResponse);
    } catch (err: any) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleCreateReport = () => {
    router.push('/reports/create');
  };

  const handleViewReport = (reportId: string, format: 'pdf' | 'docx' = 'pdf') => {
    if (format === 'pdf') {
      handleGeneratePdf(reportId);
    } else {
      handleGenerateDocx(reportId);
    }
  };

  const handleGeneratePdf = async (reportId: string) => {
    try {
      setGeneratingPdf(reportId);
      const blob = await reportsAPI.generatePDF(reportId);
      
      // Create download URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError('Failed to generate PDF report. Please try again.');
      console.error('PDF generation error:', error);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleGenerateDocx = async (reportId: string) => {
    try {
      setGeneratingDocx(reportId);
      const blob = await reportsAPI.generateDOCX(reportId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${reportId.slice(0, 8)}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError('Failed to generate DOCX report. Please try again.');
      console.error('DOCX generation error:', error);
    } finally {
      setGeneratingDocx(null);
    }
  };

  const handleEditReport = (reportId: string) => {
    router.push(`/reports/${reportId}/edit`);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        await reportsAPI.delete(reportId);
        // Reload the reports list
        await loadData();
      } catch (err: any) {
        setError('Failed to delete report');
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ValuerPro</h1>
              <p className="text-gray-600">AI-Powered Property Valuation Reports</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.full_name}
              </span>
              <button
                onClick={() => router.push('/profile')}
                className="text-indigo-600 hover:text-indigo-500 border border-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-50 flex items-center space-x-1 transition-colors duration-200"
              >
                <UserCircleIcon className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* User Profile Summary */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Profile Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">{user?.title} {user?.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              {user?.qualifications && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Qualifications</p>
                  <p className="text-gray-900">{user.qualifications}</p>
                </div>
              )}
              {user?.panel_memberships && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Panel Memberships</p>
                  <p className="text-gray-900">{user.panel_memberships}</p>
                </div>
              )}
              {user?.business_address && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Business Address</p>
                  <p className="text-gray-900">{user.business_address}</p>
                </div>
              )}
              {user?.contact_numbers && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact Numbers</p>
                  <p className="text-gray-900">{user.contact_numbers}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Valuation Reports
              </h3>
              <button
                onClick={handleCreateReport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create New Report</span>
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No reports yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Create your first valuation report to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900 text-left"
                          >
                            {report.title}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.property_address || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            report.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : report.status === 'in_review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            {/* View Dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === report.id ? null : report.id);
                                }}
                                disabled={generatingPdf === report.id || generatingDocx === report.id}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                title="View Report"
                              >
                                <EyeIcon className="h-3.5 w-3.5 mr-1" />
                                {generatingPdf === report.id ? 'PDF...' : generatingDocx === report.id ? 'DOCX...' : 'View'}
                                <ChevronDownIcon className="h-3 w-3 ml-1" />
                              </button>
                              
                              {openDropdown === report.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                >
                                  <button
                                    onClick={() => {
                                      handleViewReport(report.id, 'pdf');
                                      setOpenDropdown(null);
                                    }}
                                    disabled={generatingPdf === report.id}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <DocumentIcon className="h-4 w-4 mr-3 text-red-600" />
                                    View as PDF
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleViewReport(report.id, 'docx');
                                      setOpenDropdown(null);
                                    }}
                                    disabled={generatingDocx === report.id}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <DocumentIcon className="h-4 w-4 mr-3 text-blue-600" />
                                    Download DOCX
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleEditReport(report.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 hover:text-indigo-800 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Edit Report"
                            >
                              <PencilIcon className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 hover:text-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Delete Report"
                            >
                              <TrashIcon className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}