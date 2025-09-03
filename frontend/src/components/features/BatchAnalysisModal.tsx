'use client';

import { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, DocumentTextIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface BatchAnalysisFile {
  file_id: string;
  filename: string;
  success: boolean;
  document_type?: string;
  processing_time?: number;
  error?: string;
}

interface ConsolidatedAnalysis {
  document_types_found: string[];
  property_details: Record<string, any>;
  cross_document_validation: Record<string, any>;
  completeness_score: number;
  recommendations: string[];
  confidence_scores: Record<string, number>;
}

interface BatchAnalysisResult {
  batch_id: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  files: BatchAnalysisFile[];
  consolidated_analysis?: ConsolidatedAnalysis;
  total_processing_time: number;
  auto_population_data?: Record<string, any>;
}

interface BatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BatchAnalysisResult | null;
  onApplyAutoPopulation?: (data: Record<string, any>) => void;
  isProcessing?: boolean;
  processingProgress?: {
    current: number;
    total: number;
    currentFile?: string;
    stage?: string;
  };
}

export default function BatchAnalysisModal({ 
  isOpen, 
  onClose, 
  result,
  onApplyAutoPopulation,
  isProcessing = false,
  processingProgress
}: BatchAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'analysis' | 'recommendations'>('files');

  if (!isOpen) return null;

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'survey_plan': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deed': return 'bg-green-100 text-green-800 border-green-200';
      case 'prior_valuation': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'certificate_of_sale': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompletenessColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 text-indigo-600 mr-2" />
              {isProcessing ? 'Multi-Document AI Analysis In Progress' : 'Multi-Document AI Analysis Results'}
            </h3>
            {result && (
              <div className="flex items-center mt-2 space-x-4">
                <div className="text-sm text-gray-600">
                  Batch ID: <span className="font-mono">{result.batch_id}</span>
                </div>
                {!isProcessing && (
                  <div className="text-sm text-gray-600">
                    Processing Time: <span className="font-semibold">{formatProcessingTime(result.total_processing_time)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Real-time Progress Indicator */}
        {isProcessing && processingProgress && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Processing Documents</h4>
                <p className="text-sm text-gray-600">
                  {processingProgress.stage || 'Analyzing documents with AI'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">
                  {processingProgress.current} / {processingProgress.total}
                </div>
                <div className="text-sm text-gray-500">Files processed</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-blue-600 transition-all duration-500 ease-out"
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>0%</span>
                <span className="font-medium">
                  {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                </span>
                <span>100%</span>
              </div>
            </div>
            
            {/* Current File */}
            {processingProgress.currentFile && (
              <div className="flex items-center text-sm text-gray-700 mt-4 p-3 bg-white rounded-md border">
                <DocumentTextIcon className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
                <span className="font-medium">Currently processing:</span>
                <span className="ml-2 truncate">{processingProgress.currentFile}</span>
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        {result && !isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{result.total_files}</div>
              <div className="text-sm text-blue-600">Total Files</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{result.successful_files}</div>
              <div className="text-sm text-green-600">Successfully Processed</div>
            </div>
            {result.failed_files > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{result.failed_files}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            )}
            {result.consolidated_analysis && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className={`text-2xl font-bold ${getCompletenessColor(result.consolidated_analysis.completeness_score)}`}>
                  {Math.round(result.consolidated_analysis.completeness_score)}%
                </div>
                <div className="text-sm text-purple-600">Completeness Score</div>
              </div>
            )}
          </div>
        )}

        {/* Auto-Population Action */}
        {result && result.auto_population_data && onApplyAutoPopulation && !isProcessing && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-indigo-900">
                  Smart Auto-Population Ready
                </h4>
                <p className="text-sm text-indigo-700 mt-1">
                  We've extracted comprehensive property data from your documents. 
                  Apply this to automatically populate your report wizard.
                </p>
              </div>
              <button
                onClick={() => onApplyAutoPopulation(result.auto_population_data!)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium transition-colors duration-200 shadow-sm hover:shadow-md flex items-center"
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                Apply Auto-Population
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {result && !isProcessing && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('files')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                File Processing Results
              </button>
              {result.consolidated_analysis && (
              <>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analysis'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Consolidated Analysis
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'recommendations'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Recommendations ({result.consolidated_analysis.recommendations.length})
                </button>
              </>
            )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6 max-h-96 overflow-y-auto">
          {activeTab === 'files' && (
            <div className="space-y-4">
              {result.files.map((file) => (
                <div
                  key={file.file_id}
                  className={`border rounded-lg p-4 ${
                    file.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {file.success ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{file.filename}</h4>
                        {file.document_type && (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 border ${getDocumentTypeColor(file.document_type)}`}>
                            {file.document_type.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                        {file.error && (
                          <p className="text-sm text-red-700 mt-1">{file.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {file.processing_time && `${formatProcessingTime(file.processing_time)}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'analysis' && result.consolidated_analysis && (
            <div className="space-y-6">
              {/* Property Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-blue-900 mb-3">
                  Consolidated Property Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(result.consolidated_analysis.property_details).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-blue-300 pl-3">
                      <div className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </div>
                      <div className="text-sm text-gray-900">
                        {Array.isArray(value) 
                          ? value.join(', ') || 'N/A'
                          : value || 'N/A'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Document Validation */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-yellow-900 mb-3">
                  Cross-Document Validation
                </h4>
                <div className="space-y-2">
                  {Object.entries(result.consolidated_analysis.cross_document_validation).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className={`text-sm font-semibold ${
                        value === true ? 'text-green-600' : 
                        value === false ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {value === true ? '✓ Consistent' : 
                         value === false ? '✗ Inconsistent' : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Scores */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-purple-900 mb-3">
                  Analysis Confidence Scores
                </h4>
                <div className="space-y-3">
                  {Object.entries(result.consolidated_analysis.confidence_scores).map(([docType, score]) => (
                    <div key={docType} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {docType.replace('_', ' ')}:
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 80 ? 'bg-green-500' :
                              score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.round(score)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && result.consolidated_analysis && (
            <div className="space-y-4">
              {result.consolidated_analysis.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`border-l-4 pl-4 py-3 ${
                    recommendation.startsWith('⚠️') 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : recommendation.startsWith('✅')
                      ? 'border-green-400 bg-green-50'
                      : 'border-blue-400 bg-blue-50'
                  }`}
                >
                  <p className="text-sm text-gray-800">{recommendation}</p>
                </div>
              ))}
              
              {result.consolidated_analysis.recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No specific recommendations at this time.</p>
                  <p className="text-sm">Your document set appears comprehensive.</p>
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-gray-500">
            Multi-Document AI Analysis powered by GPT-4 • Cross-document validation
            {isProcessing && (
              <div className="mt-1 text-indigo-600">
                ⚡ Processing in real-time...
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            {result && !isProcessing && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                  alert('Analysis results copied to clipboard');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Copy Results
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className={`text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200 ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}