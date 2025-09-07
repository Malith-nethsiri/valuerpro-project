'use client';

import { useState } from 'react';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  analysis: any;
  documentType?: string;
}

export default function AIAnalysisModal({ 
  isOpen, 
  onClose, 
  title, 
  analysis,
  documentType 
}: AIAnalysisModalProps) {
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');

  if (!isOpen || !analysis) return null;

  const renderStructuredData = (data: any, depth: number = 0) => {
    if (!data || typeof data !== 'object') {
      return <span className="text-gray-700">{String(data || 'N/A')}</span>;
    }

    return (
      <div className={`${depth > 0 ? 'ml-4' : ''} space-y-2`}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="border-l-2 border-gray-200 pl-3">
            <div className="text-sm font-medium text-gray-900 capitalize">
              {key.replace(/_/g, ' ')}:
            </div>
            <div className="text-sm text-gray-600">
              {Array.isArray(value) ? (
                <ul className="list-disc list-inside">
                  {value.map((item, index) => (
                    <li key={index}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                  ))}
                </ul>
              ) : typeof value === 'object' && value !== null ? (
                renderStructuredData(value, depth + 1)
              ) : (
                <span>{String(value || 'N/A')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'survey_plan': return 'bg-blue-100 text-blue-800';
      case 'deed': return 'bg-green-100 text-green-800';
      case 'prior_valuation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              AI Document Analysis: {title}
            </h3>
            {documentType && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getDocumentTypeColor(documentType)}`}>
                {documentType.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-4 mb-4 border-b">
          <button
            onClick={() => setViewMode('structured')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'structured'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Structured View
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'raw'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Raw Data
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {viewMode === 'structured' && (
            <div className="space-y-6">
              {/* Comprehensive data from document analysis */}
              {analysis.document_analysis?.comprehensive_data && !analysis.document_analysis.comprehensive_data.error && (
                <div className="space-y-4">
                  {/* Property Identification */}
                  {analysis.document_analysis.comprehensive_data.property_identification && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-900 mb-3 flex items-center">
                        📍 Property Identification
                        <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.property_identification).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.property_identification)}
                    </div>
                  )}

                  {/* Location Details */}
                  {analysis.document_analysis.comprehensive_data.location_details && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-green-900 mb-3 flex items-center">
                        🗺️ Location Details
                        <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.location_details).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.location_details)}
                    </div>
                  )}

                  {/* Site Characteristics */}
                  {analysis.document_analysis.comprehensive_data.site_characteristics && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-yellow-900 mb-3 flex items-center">
                        🏗️ Site Characteristics
                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.site_characteristics).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.site_characteristics)}
                    </div>
                  )}

                  {/* Buildings & Improvements */}
                  {analysis.document_analysis.comprehensive_data.buildings_improvements && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-purple-900 mb-3 flex items-center">
                        🏠 Buildings & Improvements
                        <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                          {Array.isArray(analysis.document_analysis.comprehensive_data.buildings_improvements) ? 
                           analysis.document_analysis.comprehensive_data.buildings_improvements.length + ' items' :
                           Object.keys(analysis.document_analysis.comprehensive_data.buildings_improvements).length + ' fields'}
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.buildings_improvements)}
                    </div>
                  )}

                  {/* Legal Information */}
                  {analysis.document_analysis.comprehensive_data.legal_information && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
                        ⚖️ Legal Information
                        <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.legal_information).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.legal_information)}
                    </div>
                  )}

                  {/* Market Analysis */}
                  {analysis.document_analysis.comprehensive_data.market_analysis && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-indigo-900 mb-3 flex items-center">
                        💰 Market Analysis
                        <span className="ml-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.market_analysis).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.market_analysis)}
                    </div>
                  )}

                  {/* Report Information */}
                  {analysis.document_analysis.comprehensive_data.report_information && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        📋 Report Information
                        <span className="ml-2 text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                          {Object.keys(analysis.document_analysis.comprehensive_data.report_information).length} fields
                        </span>
                      </h4>
                      {renderStructuredData(analysis.document_analysis.comprehensive_data.report_information)}
                    </div>
                  )}
                </div>
              )}

              {/* Fallback for legacy data structure */}
              {!analysis.document_analysis?.comprehensive_data && (
                <>
                  {/* Document-specific extracted data */}
                  {analysis.extracted_data && Object.keys(analysis.extracted_data).length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-blue-900 mb-3">
                        Document-Specific Information (Legacy)
                      </h4>
                      {renderStructuredData(analysis.extracted_data)}
                    </div>
                  )}

                  {/* General property data */}
                  {analysis.general_data && Object.keys(analysis.general_data).length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-green-900 mb-3">
                        General Property Information (Legacy)
                      </h4>
                      {renderStructuredData(analysis.general_data)}
                    </div>
                  )}
                </>
              )}

              {/* Error handling */}
              {(analysis.error || analysis.document_analysis?.comprehensive_data?.error) && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-red-900 mb-3">
                    Processing Error
                  </h4>
                  <p className="text-red-700">
                    {analysis.error || analysis.document_analysis?.comprehensive_data?.error}
                  </p>
                </div>
              )}

              {/* Show extraction summary */}
              <div className="bg-gray-50 rounded-lg p-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  📊 Extraction Summary
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Total sections found: {analysis.document_analysis?.comprehensive_data ? 
                    Object.keys(analysis.document_analysis.comprehensive_data).filter(k => 
                      k !== 'error' && analysis.document_analysis.comprehensive_data[k] && 
                      Object.keys(analysis.document_analysis.comprehensive_data[k]).length > 0
                    ).length : 'Unknown'}</div>
                  <div>Document type: {documentType || 'Not specified'}</div>
                  <div>Processing status: {analysis.document_analysis?.comprehensive_data?.error ? 
                    'Failed' : 'Success'}</div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'raw' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-gray-500">
            AI-powered document analysis using GPT-4
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
                alert('Analysis data copied to clipboard');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-md"
            >
              Copy JSON
            </button>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}