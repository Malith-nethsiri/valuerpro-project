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

export default function ReportViewPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);

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

  const handleDownload = async (format: 'pdf' | 'docx') => {
    setDownloading(format);
    
    try {
      let blob: Blob;
      
      if (format === 'pdf') {
        blob = await reportsAPI.generatePDF(reportId);
      } else {
        blob = await reportsAPI.generateDOCX(reportId);
      }
      
      // Create filename - use report title or fallback
      const reportTitle = report?.title || 'report';
      const safeTitle = reportTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').substring(0, 50);
      const filename = `${safeTitle}_${reportId.substring(0, 8)}.${format}`;
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error(`${format.toUpperCase()} download failed:`, err);
      alert(`Failed to download ${format.toUpperCase()}: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading report...</div>
      </div>
    );
  }

  if (error) {
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
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{report?.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                report?.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : report?.status === 'in_review'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {report?.status}
              </span>
              
              {/* Download Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading === 'pdf'}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  {downloading === 'pdf' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>PDF</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleDownload('docx')}
                  disabled={downloading === 'docx'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  {downloading === 'docx' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>DOCX</span>
                    </>
                  )}
                </button>
              </div>
              
              <button
                onClick={() => router.push(`/reports/${reportId}/edit`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Edit Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Report Information
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Report Title
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{report?.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reference Number
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{report?.reference_number || 'Not specified'}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Property Address
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{report?.property_address || 'Not specified'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {report?.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Updated
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {report?.updated_at ? new Date(report.updated_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Files */}
          {report?.data?.uploaded_files && report.data.uploaded_files.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Uploaded Documents
                </h3>
                
                <div className="space-y-3">
                  {report.data.uploaded_files.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {file.mime_type === 'application/pdf' ? (
                            <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.original_filename}
                          </p>
                          <p className="text-sm text-gray-500">
                            {file.mime_type} • {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Results */}
          {report?.data?.ai_analysis && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  AI Analysis Results
                </h3>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(report.data.ai_analysis, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Location Data */}
          {report?.data?.location_data && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Location Information
                </h3>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(report.data.location_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}