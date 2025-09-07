import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useGroup } from '../GroupProvider';
import MultiFileUpload from '@/components/forms/MultiFileUpload';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { filesAPI, ocrAPI } from '@/lib/api';
import { getPopulatedFieldPaths, debugFieldMapping } from '@/utils/aiFieldMapping';
import { useWizardAIFields } from '@/store/wizardStore';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  hasData?: boolean;
  aiPopulated?: boolean;
}

const CollapsibleSection = ({ title, children, isExpanded, onToggle, hasData, aiPopulated }: CollapsibleSectionProps) => (
  <div className="border border-gray-200 rounded-lg mb-4">
    <button
      onClick={onToggle}
      className={`w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors duration-200 ${
        isExpanded ? '' : 'rounded-b-lg'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {aiPopulated && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              AI Generated
            </span>
          )}
          {hasData && !aiPopulated && (
            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center">
          {hasData && (
            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
          )}
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
    </button>
    {isExpanded && (
      <div className="px-4 py-4 border-t border-gray-200 bg-white rounded-b-lg">
        {children}
      </div>
    )}
  </div>
);

export const DocumentProcessingGroup = () => {
  const { 
    groupData, 
    updateGroupData,
    populateFromAiAnalysis 
  } = useGroup();
  
  const documentData = groupData.document_processing;
  
  // Global AI field tracking
  const { markFieldsAsAIPopulated, clearAIPopulatedFields } = useWizardAIFields();
  
  // Local state for UI
  const [expandedSections, setExpandedSections] = useState({
    upload: true,
    ocr: false,
    ai: false,
    identification: false,
    legal: false
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [extractedAIData, setExtractedAIData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle file uploads
  const handleFilesUploaded = (files: any[]) => {
    updateGroupData('document_processing', {
      uploaded_files: files
    });
    
    // Auto-expand OCR section
    setExpandedSections(prev => ({ ...prev, ocr: true }));
  };

  // Handle OCR and AI processing (adapted from IdentificationStep)
  const handleAnalyzeDocuments = async () => {
    if (!documentData.uploaded_files || documentData.uploaded_files.length === 0) {
      alert('Please upload documents first');
      return;
    }

    setAnalyzing(true);
    try {
      // Extract all file IDs for batch processing
      const fileIds = documentData.uploaded_files.map(file => file.id);
      console.log(`🔄 Processing ${fileIds.length} files:`, documentData.uploaded_files.map(f => f.original_name));
      
      // Process all files in one batch request
      const response = await ocrAPI.batchProcess(fileIds);
      console.log('📊 OCR Batch Response:', response);
      
      // Use the actual results from backend response
      // Backend returns: { files: [...], comprehensive_data: {...} }
      const ocrResults = response.files || response.results || [];

      // Update OCR results with actual processed files
      updateGroupData('document_processing', {
        ocr_results: ocrResults
      });

      // Extract AI data from the backend response
      // The comprehensive_data contains the consolidated AI analysis
      if (response.comprehensive_data || response.ai_analysis) {
        const aiData = processAIDataForDisplay(response.comprehensive_data || response.ai_analysis);
        console.log('🎯 Processed AI data:', aiData);
        
        if (aiData && Object.keys(aiData).length > 0) {
          setExtractedAIData(aiData);
          setShowAIReview(true);
          setExpandedSections(prev => ({ ...prev, ai: true }));
        } else {
          console.warn('⚠️ No usable AI data found in response:', response.comprehensive_data || response.ai_analysis);
          alert('Documents processed but no structured data could be extracted.');
        }
      } else {
        console.warn('⚠️ No AI data in response:', response);
        alert('OCR processed successfully but no AI analysis data was found.');
      }
      
    } catch (error) {
      console.error('❌ Document processing failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Document processing failed. ';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage += 'Network connection error. Please check your connection and try again.';
        } else if (error.message.includes('401')) {
          errorMessage += 'Authentication error. Please log in again.';
        } else if (error.message.includes('404')) {
          errorMessage += 'OCR service not found. Please contact support.';
        } else if (error.message.includes('500')) {
          errorMessage += 'Server error. Please try again or contact support.';
        } else {
          errorMessage += error.message || 'Unknown error occurred.';
        }
      } else {
        errorMessage += 'Unknown error occurred. Please try again.';
      }
      
      alert(errorMessage);
      
      // Update state to show error in UI
      updateGroupData('document_processing', {
        ocr_results: [{
          files: documentData.uploaded_files || [],
          error: errorMessage,
          success: false
        }]
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Process AI data for display (adapted from IdentificationStep)
  const processAIDataForDisplay = (aiData: any) => {
    console.log('🔍 Processing AI data for display:', aiData);
    
    if (!aiData || typeof aiData !== 'object') {
      console.warn('❌ Invalid AI data - not an object:', typeof aiData);
      return null;
    }

    let processedData: any = {};
    
    // Handle different AI data formats with detailed logging
    // Now we're passing comprehensive_data directly from backend response
    if (aiData.comprehensive_data) {
      console.log('✅ Found comprehensive_data format');
      processedData = { ...aiData.comprehensive_data };
    } else if (aiData.document_analysis?.comprehensive_data) {
      console.log('✅ Found document_analysis.comprehensive_data format');
      processedData = { ...aiData.document_analysis.comprehensive_data };
    } else if (aiData.extracted_data) {
      console.log('✅ Found extracted_data format');
      processedData = { ...aiData.extracted_data };
    } else if (aiData.results && Array.isArray(aiData.results) && aiData.results.length > 0) {
      console.log('✅ Found results array format');
      // Handle array of results - take the first one or consolidate
      const firstResult = aiData.results[0];
      if (firstResult.ai_analysis || firstResult.comprehensive_data) {
        processedData = { ...(firstResult.ai_analysis || firstResult.comprehensive_data) };
      } else {
        processedData = { ...firstResult };
      }
    } else if (aiData.ai_analysis) {
      console.log('✅ Found ai_analysis format');
      processedData = { ...aiData.ai_analysis };
    } else {
      console.log('✅ Using direct AI data format (from comprehensive_data)');
      processedData = { ...aiData };
    }
    
    console.log('📊 Processed data keys:', Object.keys(processedData));
    console.log('📊 Processed data sample:', processedData);
    
    // Validate that we have some meaningful data
    const hasData = Object.keys(processedData).length > 0 && 
                   Object.values(processedData).some(value => 
                     value !== null && value !== undefined && value !== ''
                   );
    
    if (!hasData) {
      console.warn('❌ No meaningful data found in processed result');
      return null;
    }
    
    return processedData;
  };

  // Handle accepting AI data
  const handleAcceptAIData = async () => {
    if (!extractedAIData) return;

    try {
      console.log('🚀 Applying AI data to all groups...');
      
      // Use the GroupProvider's AI population function
      populateFromAiAnalysis(extractedAIData);
      
      // Apply AI field highlighting
      const populatedFieldsByStep = getPopulatedFieldPaths(extractedAIData);
      Object.keys(populatedFieldsByStep).forEach(stepKey => {
        const step = stepKey as any;
        const fieldsForStep = populatedFieldsByStep[step];
        if (fieldsForStep.length > 0) {
          markFieldsAsAIPopulated(step, fieldsForStep);
        }
      });

      // Close AI review modal
      setShowAIReview(false);
      
      // Auto-expand sections with data
      setExpandedSections(prev => ({
        ...prev,
        identification: true,
        legal: true
      }));

      // Show success message
      alert('✅ AI data successfully applied across all groups!');
      
    } catch (error) {
      console.error('❌ Error applying AI data:', error);
      alert('Error applying AI data. Please try again.');
    }
  };

  // Handle declining AI data
  const handleDeclineAIData = () => {
    setShowAIReview(false);
    setExtractedAIData(null);
  };

  const hasUploadedFiles = documentData.uploaded_files?.length > 0;
  const hasOCRResults = documentData.ocr_results?.length > 0;
  const hasIdentificationData = documentData.property_identification.lot_number || 
                               documentData.property_identification.plan_number;
  const hasLegalData = documentData.legal_information.title_owner || 
                       documentData.legal_information.deed_no;

  return (
    <div className="space-y-6">
      {/* Document Upload Section */}
      <CollapsibleSection
        title="1. Document Upload"
        isExpanded={expandedSections.upload}
        onToggle={() => toggleSection('upload')}
        hasData={hasUploadedFiles}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload property documents for OCR and AI analysis. Supported documents include:
            title deeds, survey plans, building permits, and valuation reports.
          </p>
          
          <MultiFileUpload
            onFilesUploaded={handleFilesUploaded}
            acceptedTypes={{
              'image/*': ['.jpg', '.jpeg', '.png'],
              'application/pdf': ['.pdf']
            }}
            maxFiles={10}
            maxSizePerFile={10 * 1024 * 1024} // 10MB
          />
          
          {hasUploadedFiles && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Uploaded Files</h4>
              <div className="space-y-2">
                {documentData.uploaded_files.map((file, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">{file.original_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* OCR Processing Section */}
      <CollapsibleSection
        title="2. OCR Processing"
        isExpanded={expandedSections.ocr}
        onToggle={() => toggleSection('ocr')}
        hasData={hasOCRResults}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Process uploaded documents using Optical Character Recognition (OCR) to extract text content.
          </p>
          
          <button
            onClick={handleAnalyzeDocuments}
            disabled={!hasUploadedFiles || analyzing}
            className={`
              flex items-center px-4 py-2 rounded-md font-medium transition-colors duration-200
              ${!hasUploadedFiles || analyzing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {analyzing ? 'Processing Documents...' : 'Start OCR & AI Analysis'}
          </button>
          
          {hasOCRResults && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Results</h4>
              <div className="space-y-2">
                {documentData.ocr_results.map((result, index) => (
                  <div key={index} className="flex items-center p-2 bg-green-50 rounded">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {result.filename || result.file?.original_name || `File ${index + 1}`} - Processed successfully
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* AI Analysis & Review Modal */}
      {showAIReview && extractedAIData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <SparklesIcon className="w-6 h-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">AI Extracted Data Review</h2>
                </div>
                <div className="text-sm text-gray-500">
                  Review and accept data to populate across all groups
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Identification Preview */}
                {extractedAIData.property_identification && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Property Identification</h3>
                    <div className="text-sm space-y-1">
                      {extractedAIData.property_identification.lot_number && (
                        <p><span className="font-medium">Lot:</span> {extractedAIData.property_identification.lot_number}</p>
                      )}
                      {extractedAIData.property_identification.plan_number && (
                        <p><span className="font-medium">Plan:</span> {extractedAIData.property_identification.plan_number}</p>
                      )}
                      {extractedAIData.property_identification.surveyor_name && (
                        <p><span className="font-medium">Surveyor:</span> {extractedAIData.property_identification.surveyor_name}</p>
                      )}
                      {extractedAIData.property_identification.extent_perches && (
                        <p><span className="font-medium">Extent:</span> {extractedAIData.property_identification.extent_perches} perches</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Location Details Preview */}
                {extractedAIData.location_details && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Location Details</h3>
                    <div className="text-sm space-y-1">
                      {extractedAIData.location_details.address && (
                        <p><span className="font-medium">Address:</span> {extractedAIData.location_details.address}</p>
                      )}
                      {extractedAIData.location_details.district && (
                        <p><span className="font-medium">District:</span> {extractedAIData.location_details.district}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Additional data sections... */}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeclineAIData}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptAIData}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Accept & Apply to All Groups
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Identification Section */}
      <CollapsibleSection
        title="3. Property Identification"
        isExpanded={expandedSections.identification}
        onToggle={() => toggleSection('identification')}
        hasData={hasIdentificationData}
        aiPopulated={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Lot Number"
            value={documentData.property_identification.lot_number}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                lot_number: value
              }
            })}
            required
            placeholder="Enter lot number"
          />
          
          <ValidatedInput
            label="Plan Number"
            value={documentData.property_identification.plan_number}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                plan_number: value
              }
            })}
            required
            placeholder="Enter plan number"
          />
          
          <ValidatedInput
            label="Surveyor Name"
            value={documentData.property_identification.surveyor_name}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                surveyor_name: value
              }
            })}
            required
            placeholder="Enter licensed surveyor name"
          />
          
          <ValidatedInput
            label="Land Name"
            value={documentData.property_identification.land_name || ''}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                land_name: value
              }
            })}
            placeholder="Enter land/property name"
          />
          
          <ValidatedInput
            label="Plan Date"
            type="date"
            value={documentData.property_identification.plan_date || ''}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                plan_date: value
              }
            })}
            placeholder="Plan preparation date"
          />
          
          <ValidatedInput
            label="Extent (Perches)"
            type="number"
            value={documentData.property_identification.extent_perches?.toString() || ''}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                extent_perches: parseFloat(value) || 0
              }
            })}
            required
            placeholder="Enter land extent"
          />
        </div>
        
        {/* Additional Extent Information */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Extent (Square Meters)"
            type="number"
            value={documentData.property_identification.extent_sqm?.toString() || ''}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                extent_sqm: parseFloat(value) || 0
              }
            })}
            placeholder="Area in square meters"
            disabled
          />
          
          <ValidatedInput
            label="Extent (Acres)"
            type="number"
            step="0.001"
            value={documentData.property_identification.extent_acres?.toString() || ''}
            onChange={(value) => updateGroupData('document_processing', {
              property_identification: {
                ...documentData.property_identification,
                extent_acres: parseFloat(value) || 0
              }
            })}
            placeholder="Area in acres"
            disabled
          />
        </div>
        
        {/* Boundaries */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Property Boundaries</h4>
          <div className="grid grid-cols-2 gap-4">
            <ValidatedInput
              label="North Boundary"
              value={documentData.property_identification.boundaries.north || ''}
              onChange={(value) => updateGroupData('document_processing', {
                property_identification: {
                  ...documentData.property_identification,
                  boundaries: {
                    ...documentData.property_identification.boundaries,
                    north: value
                  }
                }
              })}
              placeholder="Bounded on North by..."
            />
            
            <ValidatedInput
              label="South Boundary"
              value={documentData.property_identification.boundaries.south || ''}
              onChange={(value) => updateGroupData('document_processing', {
                property_identification: {
                  ...documentData.property_identification,
                  boundaries: {
                    ...documentData.property_identification.boundaries,
                    south: value
                  }
                }
              })}
              placeholder="Bounded on South by..."
            />
            
            <ValidatedInput
              label="East Boundary"
              value={documentData.property_identification.boundaries.east || ''}
              onChange={(value) => updateGroupData('document_processing', {
                property_identification: {
                  ...documentData.property_identification,
                  boundaries: {
                    ...documentData.property_identification.boundaries,
                    east: value
                  }
                }
              })}
              placeholder="Bounded on East by..."
            />
            
            <ValidatedInput
              label="West Boundary"
              value={documentData.property_identification.boundaries.west || ''}
              onChange={(value) => updateGroupData('document_processing', {
                property_identification: {
                  ...documentData.property_identification,
                  boundaries: {
                    ...documentData.property_identification.boundaries,
                    west: value
                  }
                }
              })}
              placeholder="Bounded on West by..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Legal Information Section */}
      <CollapsibleSection
        title="4. Legal Information"
        isExpanded={expandedSections.legal}
        onToggle={() => toggleSection('legal')}
        hasData={hasLegalData}
        aiPopulated={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Title Owner"
            value={documentData.legal_information.title_owner || ''}
            onChange={(value) => updateGroupData('document_processing', {
              legal_information: {
                ...documentData.legal_information,
                title_owner: value
              }
            })}
            placeholder="Enter title owner name"
          />
          
          <ValidatedInput
            label="Deed Number"
            value={documentData.legal_information.deed_no || ''}
            onChange={(value) => updateGroupData('document_processing', {
              legal_information: {
                ...documentData.legal_information,
                deed_no: value
              }
            })}
            placeholder="Enter deed number"
          />
          
          <ValidatedInput
            label="Deed Date"
            type="date"
            value={documentData.legal_information.deed_date || ''}
            onChange={(value) => updateGroupData('document_processing', {
              legal_information: {
                ...documentData.legal_information,
                deed_date: value
              }
            })}
          />
          
          <ValidatedInput
            label="Notary"
            value={documentData.legal_information.notary || ''}
            onChange={(value) => updateGroupData('document_processing', {
              legal_information: {
                ...documentData.legal_information,
                notary: value
              }
            })}
            placeholder="Enter notary name"
          />
        </div>
      </CollapsibleSection>

      {/* Progress Summary */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Document Processing Progress</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <CheckCircleIcon className={`w-5 h-5 mr-2 ${hasUploadedFiles ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={hasUploadedFiles ? 'text-green-700' : 'text-gray-500'}>Documents uploaded</span>
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className={`w-5 h-5 mr-2 ${hasOCRResults ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={hasOCRResults ? 'text-green-700' : 'text-gray-500'}>OCR processing completed</span>
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className={`w-5 h-5 mr-2 ${hasIdentificationData ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={hasIdentificationData ? 'text-green-700' : 'text-gray-500'}>Property identification data</span>
          </div>
          <div className="flex items-center">
            <CheckCircleIcon className={`w-5 h-5 mr-2 ${hasLegalData ? 'text-green-500' : 'text-gray-300'}`} />
            <span className={hasLegalData ? 'text-green-700' : 'text-gray-500'}>Legal information data</span>
          </div>
        </div>
      </div>
    </div>
  );
};