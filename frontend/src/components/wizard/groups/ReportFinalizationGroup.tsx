import React, { useState, useEffect } from 'react';
import { useGroup } from '../GroupProvider';
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { reportsAPI } from '@/lib/api';

interface Client {
  id: string;
  name: string;
  company?: string;
  address: string;
  contact_numbers: string[];
  email?: string;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  category: 'documents' | 'photos';
  description: string;
  file_url?: string;
  processing_status: 'completed' | 'processing' | 'failed';
  backend_file_id?: string;
}

export const ReportFinalizationGroup = () => {
  const { groupData, updateGroupData, groupValidations, reportId } = useGroup();
  
  // Extract data for each section
  const reportInfo = groupData.report_finalization?.report_info || {};
  const legal = groupData.report_finalization?.legal || {};
  const appendices = groupData.report_finalization?.appendices || {};
  const review = groupData.report_finalization?.review || {};

  // Local state for UI
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['metadata', 'review'])
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isValidatingRef, setIsValidatingRef] = useState(false);
  const [refValidationResult, setRefValidationResult] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Report info handlers
  const handleReportInfoChange = (field: string, value: any) => {
    updateGroupData('report_finalization', {
      report_info: { ...reportInfo, [field]: value }
    });
  };

  // Legal handlers
  const handleLegalChange = (field: string, value: any) => {
    updateGroupData('report_finalization', {
      legal: { ...legal, [field]: value }
    });
  };

  const handleAssumptionToggle = (assumption: string) => {
    const assumptions = legal.assumptions || [];
    const updatedAssumptions = assumptions.includes(assumption)
      ? assumptions.filter((a: string) => a !== assumption)
      : [...assumptions, assumption];
    updateGroupData('report_finalization', {
      legal: { ...legal, assumptions: updatedAssumptions }
    });
  };

  // Appendices handlers
  const handleAppendicesChange = (field: string, value: any) => {
    updateGroupData('report_finalization', {
      appendices: { ...appendices, [field]: value }
    });
  };

  // Review handlers
  const handleReviewChange = (field: string, value: any) => {
    updateGroupData('report_finalization', {
      review: { ...review, [field]: value }
    });
  };

  // Load clients on component mount
  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);
      try {
        const response = await reportsAPI.getClients();
        if (response.success && response.data) {
          setClients(response.data);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };
    
    loadClients();
  }, []);

  // Reference validation with debounce
  useEffect(() => {
    if (!reportInfo.ref) return;
    
    const validateRef = async (ref: string) => {
      setIsValidatingRef(true);
      try {
        const response = await reportsAPI.validateReportRef(ref);
        setRefValidationResult(response.valid ? 'valid' : 'duplicate');
      } catch (error) {
        setRefValidationResult('error');
      } finally {
        setIsValidatingRef(false);
      }
    };

    const timeoutId = setTimeout(() => validateRef(reportInfo.ref), 500);
    return () => clearTimeout(timeoutId);
  }, [reportInfo.ref]);

  // File upload handling
  const handleFileUpload = async (files: FileList, category: 'documents' | 'photos') => {
    if (!files || !reportId) return;

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const fileId = Date.now().toString() + Math.random().toString(36);
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('description', '');

        const response = await reportsAPI.uploadFile(reportId, formData, (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        });

        if (response.success && response.data) {
          const newFile: UploadedFile = {
            id: fileId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            upload_date: new Date().toISOString(),
            category,
            description: '',
            file_url: response.data.file_url,
            processing_status: 'completed',
            backend_file_id: response.data.id
          };

          const currentFiles = appendices.files || [];
          handleAppendicesChange('files', [...currentFiles, newFile]);
        }
      } catch (error) {
        console.error('File upload error:', error);
      } finally {
        setUploadProgress(prev => {
          const { [fileId]: removed, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  // Report generation
  const generateReport = async (format: 'pdf' | 'docx', options: any = {}) => {
    if (!reportId) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const response = await reportsAPI.generateReport(reportId, format, options);
      
      if (response.success) {
        handleReviewChange('last_generated', new Date().toISOString());
        handleReviewChange('last_format', format);
        
        // Trigger download
        if (response.data?.download_url) {
          window.open(response.data.download_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Calculate overall completion percentage
  const calculateCompletionPercentage = () => {
    const allValidations = Object.values(groupValidations);
    const completed = allValidations.filter(v => v.isValid).length;
    return Math.round((completed / allValidations.length) * 100);
  };

  const CollapsibleSection = ({ 
    id, 
    title, 
    children, 
    bgColor = 'bg-blue-50', 
    borderColor = 'border-blue-200',
    titleColor = 'text-blue-900'
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
    bgColor?: string;
    borderColor?: string;
    titleColor?: string;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className={`${bgColor} border ${borderColor} rounded-lg`}>
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-opacity-80"
        >
          <h4 className={`text-md font-medium ${titleColor}`}>{title}</h4>
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  const standardAssumptions = [
    'The property is free from any latent defects',
    'No allowance has been made for any charges, mortgages or amounts owing',
    'The property is sold with vacant possession',
    'Good title can be shown and the property is free from onerous restrictions',
    'The property has been valued on the assumption of willing seller and willing buyer',
    'No investigations have been made of any mining, archaeological or other subsurface conditions'
  ];

  const validationResults = Object.entries(groupValidations).map(([groupId, validation]) => ({
    group: groupId,
    isValid: validation.isValid,
    errors: validation.errors,
    completionPercentage: validation.completionPercentage
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Report Setup & Finalization
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Complete report metadata, legal compliance, supporting documents, and final review before generating the professional valuation report.
        </p>
      </div>

      {/* Report Metadata Section */}
      <CollapsibleSection 
        id="metadata" 
        title="Report Information & Client Details"
        bgColor="bg-blue-50" 
        borderColor="border-blue-200"
        titleColor="text-blue-900"
      >
        <div className="space-y-4">
          {/* Basic Report Info */}
          <div className="bg-white border border-blue-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-800 mb-4">Report Basic Information</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Reference Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={reportInfo.ref || ''}
                    onChange={(e) => handleReportInfoChange('ref', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      refValidationResult === 'valid' ? 'border-green-300' :
                      refValidationResult === 'duplicate' ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., VR2024001"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {isValidatingRef && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                    {refValidationResult === 'valid' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                    {refValidationResult === 'duplicate' && <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {refValidationResult === 'duplicate' && (
                  <p className="text-xs text-red-600 mt-1">Reference number already exists</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Purpose *</label>
                <select
                  value={reportInfo.purpose || ''}
                  onChange={(e) => handleReportInfoChange('purpose', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select purpose...</option>
                  <option value="Mortgage security">Mortgage Security</option>
                  <option value="Sale purposes">Sale Purposes</option>
                  <option value="Insurance purposes">Insurance Purposes</option>
                  <option value="Legal proceedings">Legal Proceedings</option>
                  <option value="Investment analysis">Investment Analysis</option>
                  <option value="Tax assessment">Tax Assessment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
                <input
                  type="date"
                  value={reportInfo.report_date || ''}
                  onChange={(e) => handleReportInfoChange('report_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Date *</label>
                <input
                  type="date"
                  value={reportInfo.inspection_date || ''}
                  onChange={(e) => handleReportInfoChange('inspection_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Basis of Value</label>
                <select
                  value={reportInfo.basis_of_value || 'Market Value'}
                  onChange={(e) => handleReportInfoChange('basis_of_value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Market Value">Market Value</option>
                  <option value="Forced Sale Value">Forced Sale Value</option>
                  <option value="Investment Value">Investment Value</option>
                  <option value="Insurance Value">Insurance Value</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={reportInfo.currency || 'LKR'}
                  onChange={(e) => handleReportInfoChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LKR">Sri Lankan Rupees (LKR)</option>
                  <option value="USD">US Dollars (USD)</option>
                  <option value="EUR">Euros (EUR)</option>
                  <option value="GBP">British Pounds (GBP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Client Information</h5>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Client *</label>
              <select
                value={reportInfo.client_id || ''}
                onChange={(e) => handleReportInfoChange('client_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoadingClients}
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `- ${client.company}`}
                  </option>
                ))}
              </select>
              {isLoadingClients && (
                <p className="text-xs text-gray-500 mt-1">Loading clients...</p>
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Review & Validation Section */}
      <CollapsibleSection 
        id="review" 
        title="Review & Validation"
        bgColor="bg-green-50" 
        borderColor="border-green-200"
        titleColor="text-green-900"
      >
        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Report Completion Status</h5>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{calculateCompletionPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${calculateCompletionPercentage()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Section Validation</h5>
            <div className="space-y-3">
              {validationResults.map((result) => (
                <div key={result.group} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {result.isValid ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {result.group.replace('_', ' ')}
                      </p>
                      {result.errors.length > 0 && (
                        <p className="text-xs text-red-600">{result.errors.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {result.completionPercentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Generation */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-orange-800 mb-4">Generate Final Report</h5>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => generateReport('pdf')}
                  disabled={isGenerating || calculateCompletionPercentage() < 80}
                  className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium ${
                    isGenerating || calculateCompletionPercentage() < 80
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-orange-700 hover:bg-orange-50 border-orange-300'
                  }`}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate PDF Report'}
                </button>

                <button
                  type="button"
                  onClick={() => generateReport('docx')}
                  disabled={isGenerating || calculateCompletionPercentage() < 80}
                  className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium ${
                    isGenerating || calculateCompletionPercentage() < 80
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-orange-700 hover:bg-orange-50 border-orange-300'
                  }`}
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Word Report'}
                </button>
              </div>

              {isGenerating && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Generating Report...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {calculateCompletionPercentage() < 80 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Report must be at least 80% complete before generation. Current: {calculateCompletionPercentage()}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Legal & Compliance Section */}
      <CollapsibleSection 
        id="legal" 
        title="Legal Compliance & Disclaimers"
        bgColor="bg-purple-50" 
        borderColor="border-purple-200"
        titleColor="text-purple-900"
      >
        <div className="space-y-4">
          {/* Valuation Assumptions */}
          <div className="bg-white border border-purple-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-purple-800 mb-4">Valuation Assumptions</h5>
            <div className="space-y-2 mb-4">
              {standardAssumptions.map((assumption, index) => (
                <label key={index} className="flex items-start">
                  <input
                    type="checkbox"
                    checked={(legal.assumptions || []).includes(assumption)}
                    onChange={() => handleAssumptionToggle(assumption)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mt-1"
                  />
                  <span className="ml-2 text-sm text-gray-700">{assumption}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Assumptions</label>
              <textarea
                value={legal.additional_assumptions || ''}
                onChange={(e) => handleLegalChange('additional_assumptions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional assumptions specific to this valuation..."
              />
            </div>
          </div>

          {/* Professional Certificate */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-800 mb-4">Professional Certificate</h5>
            <textarea
              value={legal.certificate || ''}
              onChange={(e) => handleLegalChange('certificate', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Professional certification statement..."
            />
          </div>

          {/* Legal Disclaimers */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-red-800 mb-4">Legal Disclaimers</h5>
            <textarea
              value={legal.disclaimers || ''}
              onChange={(e) => handleLegalChange('disclaimers', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Legal disclaimers and limitations..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Supporting Documents Section */}
      <CollapsibleSection 
        id="appendices" 
        title="Supporting Documents & Appendices"
        bgColor="bg-yellow-50" 
        borderColor="border-yellow-200"
        titleColor="text-yellow-900"
      >
        <div className="space-y-4">
          {/* File Upload */}
          <div className="bg-white border border-yellow-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-4">Document Upload</h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'documents')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos</label>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'photos')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId}>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File List */}
          <div className="bg-white border border-yellow-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-4">Uploaded Files</h5>
            {(!appendices.files || appendices.files.length === 0) ? (
              <p className="text-sm text-gray-500 text-center py-8">No files uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {appendices.files.map((file: UploadedFile) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CloudArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.file_size / 1024).toFixed(1)} KB • {file.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        file.processing_status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : file.processing_status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {file.processing_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Organization Options */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-800 mb-4">Report Organization</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numbering Style</label>
                <select
                  value={appendices.numbering_style || 'letters'}
                  onChange={(e) => handleAppendicesChange('numbering_style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="letters">Letters (A, B, C...)</option>
                  <option value="numbers">Numbers (1, 2, 3...)</option>
                  <option value="roman">Roman (I, II, III...)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Layout</label>
                <select
                  value={appendices.page_layout || 'best_fit'}
                  onChange={(e) => handleAppendicesChange('page_layout', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="one_per_page">One per Page</option>
                  <option value="multiple_per_page">Multiple per Page</option>
                  <option value="best_fit">Best Fit</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};