import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useStepValidation } from '@/hooks/useFieldValidation';
import { validationSchemas } from '@/hooks/useFieldValidation';
import { filesAPI, ocrAPI } from '@/lib/api';
import MultiFileUpload from '@/components/forms/MultiFileUpload';
import { useWizardAIFields } from '@/store/wizardStore';
import { getPopulatedFieldPaths, debugFieldMapping } from '@/utils/aiFieldMapping';

export const IdentificationStep = () => {
  const { state, updateStepData, validateStep, populateFromAiAnalysis } = useWizard();
  const identification = state.data.identification;
  const { errors, isValid, validate } = useStepValidation(1);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  
  // Global AI field tracking
  const { markFieldsAsAIPopulated, getAIPopulatedFields, isFieldAIPopulated, clearAIPopulatedFields } = useWizardAIFields();
  
  // OCR/AI functionality state
  const [analyzing, setAnalyzing] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [extractedAIData, setExtractedAIData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const handleInputChange = (field: string, value: any, isFieldValid: boolean) => {
    updateStepData('identification', { [field]: value });
    
    // Clear field error if field becomes valid
    if (isFieldValid && localErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Remove AI highlight once user manually edits
    if (isFieldAIPopulated('property_identification', field)) {
      // Clear the AI-populated marking for this field when user manually edits it
      const currentFields = getAIPopulatedFields('property_identification');
      const fieldsArray = Array.from(currentFields).filter(f => f !== field);
      markFieldsAsAIPopulated('property_identification', fieldsArray);
    }
  };

  // Helper function to get CSS classes for AI-populated fields
  const getFieldClasses = (fieldName: string, baseClasses: string) => {
    const isAiPopulated = isFieldAIPopulated('property_identification', fieldName);
    return isAiPopulated 
      ? `${baseClasses} ring-2 ring-green-200 bg-green-50 border-green-300` 
      : baseClasses;
  };

  // Validate step when data changes
  useEffect(() => {
    validate();
  }, [identification, validate]);

  const handleBoundaryChange = (direction: string, value: string) => {
    const boundaries = identification.boundaries || {};
    updateStepData('identification', { 
      boundaries: { ...boundaries, [direction]: value }
    });
  };

  const calculateExtentSqm = (perches: number) => {
    // 1 perch = 25.29285264 square meters
    return perches * 25.29285264;
  };

  const handleExtentPerchesChange = (value: string | number) => {
    const perches = typeof value === 'string' ? parseFloat(value) : value;
    const sqm = calculateExtentSqm(perches || 0);
    
    updateStepData('identification', { 
      extent_perches: perches || 0,
      extent_sqm: sqm
    });
  };

  // Handle multi-file upload and batch OCR processing
  const handleFilesUploaded = async (fileIds: string[]) => {
    console.log('🚀 Starting batch OCR processing for files:', fileIds);
    
    if (fileIds.length === 0) {
      console.warn('⚠️ No files provided for processing');
      return;
    }

    setAnalyzing(true);
    console.log('📊 Analysis state set to true - UI should show loading...');
    
    try {
      // Process multiple files with batch OCR (new API)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const batchURL = `${API_BASE_URL}/batch-ocr/batch-process`;
      const authToken = localStorage.getItem('access_token');
      
      console.log('📡 Making API request to:', batchURL);
      console.log('🔑 Auth token present:', !!authToken);
      console.log('📋 Request payload:', { 
        file_ids: fileIds, 
        consolidate_analysis: true, 
        auto_populate: true 
      });
      
      const batchResponse = await fetch(batchURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          file_ids: fileIds,
          consolidate_analysis: true,
          auto_populate: true,
        }),
      });

      console.log('📨 API Response status:', batchResponse.status, batchResponse.statusText);

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`Batch processing failed: ${batchResponse.status} ${batchResponse.statusText} - ${errorText}`);
      }

      const batchResult = await batchResponse.json();
      console.log('✅ Batch OCR completed successfully');
      console.log('📊 Raw batch result structure:', {
        hasFiles: !!batchResult.files,
        filesCount: batchResult.files?.length || 0,
        batchResultKeys: Object.keys(batchResult)
      });
      console.log('📊 Full batch result:', JSON.stringify(batchResult, null, 2));
      
      // Simplified AI data filtering - just check if files exist and have AI analysis
      console.log('🔍 Filtering files for AI analysis...');
      console.log('📁 All files in batch:', batchResult.files?.map((f: any, i: number) => ({
        index: i,
        success: f.success,
        hasAiAnalysis: !!f.ai_analysis,
        fileName: f.filename || 'unknown'
      })));
      
      const filesWithAI = batchResult.files?.filter((file: any) => 
        file.success && file.ai_analysis
      ) || [];
      
      console.log(`✅ Found ${filesWithAI.length} files with AI analysis`);
      if (filesWithAI.length > 0) {
        console.log('📋 Files with AI data:', filesWithAI.map((f: any, i: number) => ({
          index: i,
          filename: f.filename,
          hasAnalysis: !!f.ai_analysis,
          analysisKeys: f.ai_analysis ? Object.keys(f.ai_analysis) : []
        })));
      }
      
      if (filesWithAI.length > 0) {
        // Get the first file with AI data
        const fileWithAI = filesWithAI[0];
        const aiData = fileWithAI.ai_analysis;
        
        console.log('🤖 AI data extracted from:', fileWithAI.filename);
        console.log('📋 Raw AI Data structure:', JSON.stringify(aiData, null, 2));
        
        // Process and normalize AI data for display
        console.log('⚙️ Processing AI data for display...');
        const processedData = processAIDataForDisplay(aiData);
        
        console.log('🎯 Processing result:', {
          hasProcessedData: !!processedData,
          processedDataKeys: processedData ? Object.keys(processedData) : [],
          dataSize: processedData ? Object.keys(processedData).length : 0
        });
        
        if (processedData && Object.keys(processedData).length > 0) {
          console.log('✅ Successfully processed AI data for display');
          console.log('📊 Final processed data:', JSON.stringify(processedData, null, 2));
          setExtractedAIData(processedData);
          setShowAIReview(true);
          console.log('🎉 AI Review modal should now be visible');
        } else {
          console.warn('⚠️ No usable AI data found after processing');
          console.warn('🔍 Debug info - original AI data keys:', Object.keys(aiData));
          alert('📊 Analysis Complete - Limited Data\n\nThe AI analysis found some data but it may not contain comprehensive property information.\n\n💡 Suggestions:\n• Upload additional property documents\n• Try documents with more detailed information\n• Review what was extracted and fill missing fields manually');
        }
      } else {
        console.warn('⚠️ No files with AI analysis found');
        alert('📄 Analysis Complete - No Data Found\n\nThe documents were processed successfully, but no structured property data could be extracted.\n\n💡 Tips:\n• Ensure documents contain clear property information\n• Try uploading higher quality images or PDFs\n• Check that documents are property-related (title deeds, surveys, plans)\n\n🔄 You can upload different documents or fill forms manually.');
      }
      
    } catch (error) {
      console.error('Failed to process documents:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`❌ Document Processing Failed\n\n${errorMessage}\n\n🔧 Troubleshooting:\n• Check your internet connection\n• Ensure files are not corrupted\n• Try uploading fewer files at once\n• Contact support if the issue persists`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Process and normalize AI data for display
  const processAIDataForDisplay = (aiData: any) => {
    console.log('🔄 Processing AI data for display...');
    
    if (!aiData || typeof aiData !== 'object') {
      console.warn('❌ No valid AI data provided');
      return null;
    }

    let processedData: any = {};
    
    // Handle different AI data formats
    console.log('🔍 Detecting AI data format...');
    
    // Format 1: Direct comprehensive data
    if (aiData.comprehensive_data) {
      console.log('📋 Format 1: Direct comprehensive data');
      processedData = { ...aiData.comprehensive_data };
    }
    // Format 2: Document analysis with comprehensive data
    else if (aiData.document_analysis?.comprehensive_data) {
      console.log('📋 Format 2: Document analysis with comprehensive data');
      processedData = { ...aiData.document_analysis.comprehensive_data };
    }
    // Format 3: Legacy extracted data
    else if (aiData.property_identification || aiData.location_details) {
      console.log('📋 Format 3: Legacy extracted data');
      // Map legacy data to comprehensive format
      processedData = {
        property_identification: aiData.property_identification || {},
        location_details: aiData.location_details || {},
        site_characteristics: aiData.site_characteristics || {},
        buildings_improvements: aiData.buildings_improvements || [],
        utilities_assessment: aiData.utilities_assessment || {},
        market_analysis: aiData.market_analysis || {},
        legal_information: aiData.legal_information || {},
      };

      // Add other legacy sections if they exist
      if (aiData.transport_access) processedData.transport_access = aiData.transport_access;
      if (aiData.environmental_factors) processedData.environmental_factors = aiData.environmental_factors;
      if (aiData.planning_zoning) processedData.planning_zoning = aiData.planning_zoning;
      if (aiData.locality_analysis) processedData.locality_analysis = aiData.locality_analysis;
    }
    // Format 4: Direct flat structure
    else {
      console.log('📋 Format 4: Direct flat structure');
      if (typeof aiData === 'object' && Object.keys(aiData).length > 0) {
        // Map flat structure to comprehensive format
        processedData = {
          property_identification: aiData,
          // Add more fields as needed
        };
      }

      // Copy other sections directly
      Object.keys(aiData).forEach(key => {
        if (!processedData[key] && typeof aiData[key] === 'object') {
          processedData[key] = aiData[key];
        }
      });
    }

    console.log('🎯 Processed data sections:', Object.keys(processedData));

    // Add confidence level if available
    if (aiData.confidence) {
      processedData.confidence = aiData.confidence;
    }

    // Clean up empty or null values
    const cleanedData = cleanupDataForDisplay(processedData);
    
    console.log('✨ Final cleaned data:', cleanedData);
    return cleanedData;
  };

  // Clean up data by removing empty values
  const cleanupDataForDisplay = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    
    const cleaned: any = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (value === null || value === undefined || value === '') {
        return; // Skip empty values
      }
      
      if (Array.isArray(value)) {
        const cleanedArray = value.filter(item => 
          item !== null && item !== undefined && item !== ''
        );
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else if (typeof value === 'object') {
        const cleanedObject = cleanupDataForDisplay(value);
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
      } else {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  };

  // Apply AI data across all wizard steps using the proper WizardProvider function
  const applyAIDataToForm = async (aiData: any) => {
    console.log('Applying AI data across all wizard steps using WizardProvider...');
    console.log('AI Data structure:', aiData);
    
    try {
      // Use the existing, proper cross-step data application function from WizardProvider
      // This function properly uses SmartDataMerger and applies data to ALL wizard steps
      populateFromAiAnalysis(aiData);
      
      // Use comprehensive field mapping to track AI-populated fields across ALL wizard steps
      const populatedFieldsByStep = getPopulatedFieldPaths(aiData);
      console.log('📍 AI Field Mapping Results:', debugFieldMapping(aiData));
      console.log('🎯 Fields to be highlighted by step:', populatedFieldsByStep);
      
      // Apply field highlighting to ALL wizard steps
      Object.keys(populatedFieldsByStep).forEach(stepKey => {
        const step = stepKey as keyof typeof populatedFieldsByStep;
        const fieldsForStep = populatedFieldsByStep[step];
        if (fieldsForStep.length > 0) {
          console.log(`✨ Marking ${fieldsForStep.length} fields as AI-populated for step: ${step}`);
          markFieldsAsAIPopulated(step, fieldsForStep);
        }
      });
      
      return {
        success: true,
        message: 'AI data successfully applied across all wizard steps'
      };
      
    } catch (error) {
      console.error('Error applying AI data:', error);
      return {
        success: false,
        message: `Error applying data: ${error.message}`
      };
    }
  };
  
  // Handle user accepting AI data with enhanced feedback
  const handleAcceptAIData = async () => {
    if (extractedAIData) {
      const result = await applyAIDataToForm(extractedAIData);
      setShowAIReview(false);
      
      if (result.success) {
        // Create a more detailed and user-friendly success message
        const stepCount = result.stepsAffected || 1;
        const stepWord = stepCount === 1 ? 'step' : 'steps';
        const fieldWord = result.fieldsUpdated === 1 ? 'field' : 'fields';
        
        const message = `🎉 AI Analysis Complete!\n\n✅ Successfully applied data to ${result.fieldsUpdated} ${fieldWord} across ${stepCount} wizard ${stepWord}.\n\n💡 Look for highlighted fields (green border) throughout the wizard - these were populated by AI.\n\n📋 You can now:\n• Review the populated data in each step\n• Edit any field to override AI suggestions\n• Navigate through the wizard to see all changes`;
        
        alert(message);
      } else {
        alert(`❌ Unable to apply AI data: ${result.message}`);
      }
    }
  };

  // Handle user declining AI data
  const handleDeclineAIData = () => {
    setShowAIReview(false);
    setExtractedAIData(null);
    
    // Clear any existing AI-populated field markings since user declined
    clearAIPopulatedFields();
    
    // Provide feedback to user
    alert('📋 AI data declined.\n\nYou can:\n• Upload different documents for re-analysis\n• Fill out the forms manually\n• Try uploading again later');
  };

  // Helper function to convert field names to title case
  const toTitleCase = (str: string) => {
    return str
      .replace(new RegExp('_', 'g'), ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Identification & Title
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload your survey plan or deed to automatically extract property identification details, or enter the details manually.
        </p>
      </div>

      {/* AI Document Upload Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
          🤖 AI Document Analysis
        </h4>
        <p className="text-sm text-blue-700 mb-4">
          Upload your survey plan or deed to automatically extract property identification details using OCR and AI technology.
        </p>
        
        <div className="bg-white border border-blue-200 rounded p-4">
          <MultiFileUpload
            onFilesUploaded={handleFilesUploaded}
            maxFiles={5}
            acceptedTypes={['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff']}
          />
        </div>
        
        {analyzing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800 flex items-center">
              🔍 <span className="ml-2">Analyzing documents with AI... This may take a few moments.</span>
            </p>
          </div>
        )}
      </div>

      {/* Step-level validation errors */}
      {errors.length > 0 && (
        <ErrorDisplay 
          errors={errors}
          type="warning"
          title="Please complete the following"
          className="mb-6"
        />
      )}

      {/* Survey Plan Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Survey Plan Details</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="lot-number" className="block text-sm font-medium text-gray-700 mb-2">
              Lot Number *
            </label>
            <input
              type="text"
              id="lot-number"
              value={identification.lot_number || ''}
              onChange={(e) => handleInputChange('lot_number', e.target.value, true)}
              className={getFieldClasses('lot_number', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., 25"
            />
          </div>

          <div>
            <label htmlFor="plan-number" className="block text-sm font-medium text-gray-700 mb-2">
              Plan Number *
            </label>
            <input
              type="text"
              id="plan-number"
              value={identification.plan_number || ''}
              onChange={(e) => handleInputChange('plan_number', e.target.value, true)}
              className={getFieldClasses('plan_number', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., 1569"
            />
          </div>

          <div>
            <label htmlFor="plan-date" className="block text-sm font-medium text-gray-700 mb-2">
              Plan Date
            </label>
            <input
              type="date"
              id="plan-date"
              value={identification.plan_date ? identification.plan_date.split('T')[0] : ''}
              onChange={(e) => handleInputChange('plan_date', e.target.value ? new Date(e.target.value).toISOString() : '', true)}
              className={getFieldClasses('plan_date', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
            />
          </div>
        </div>
      </div>

      {/* Extent */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Property Extent</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="extent-perches" className="block text-sm font-medium text-gray-700 mb-2">
              Extent (Perches) *
            </label>
            <input
              type="number"
              id="extent-perches"
              step="0.01"
              value={identification.extent_perches || ''}
              onChange={(e) => handleExtentPerchesChange(e.target.value)}
              className={getFieldClasses('extent_perches', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., 15.5"
            />
          </div>

          <div>
            <label htmlFor="extent-sqm" className="block text-sm font-medium text-gray-700 mb-2">
              Extent (Square Meters)
            </label>
            <input
              type="number"
              id="extent-sqm"
              step="0.01"
              value={identification.extent_sqm ? identification.extent_sqm.toFixed(2) : ''}
              onChange={(e) => handleInputChange('extent_sqm', parseFloat(e.target.value) || 0, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Auto-calculated"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated from perches</p>
          </div>
        </div>
      </div>

      {/* Boundaries */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Property Boundaries</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="boundary-north" className="block text-sm font-medium text-gray-700 mb-2">
              North
            </label>
            <input
              type="text"
              id="boundary-north"
              value={identification.boundaries?.north || ''}
              onChange={(e) => handleBoundaryChange('north', e.target.value)}
              className={getFieldClasses('boundary_north', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., Lot 7 (6m road)"
            />
          </div>

          <div>
            <label htmlFor="boundary-south" className="block text-sm font-medium text-gray-700 mb-2">
              South
            </label>
            <input
              type="text"
              id="boundary-south"
              value={identification.boundaries?.south || ''}
              onChange={(e) => handleBoundaryChange('south', e.target.value)}
              className={getFieldClasses('boundary_south', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., Lot 12"
            />
          </div>

          <div>
            <label htmlFor="boundary-east" className="block text-sm font-medium text-gray-700 mb-2">
              East
            </label>
            <input
              type="text"
              id="boundary-east"
              value={identification.boundaries?.east || ''}
              onChange={(e) => handleBoundaryChange('east', e.target.value)}
              className={getFieldClasses('boundary_east', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., Lot 108 (1m drain)"
            />
          </div>

          <div>
            <label htmlFor="boundary-west" className="block text-sm font-medium text-gray-700 mb-2">
              West
            </label>
            <input
              type="text"
              id="boundary-west"
              value={identification.boundaries?.west || ''}
              onChange={(e) => handleBoundaryChange('west', e.target.value)}
              className={getFieldClasses('boundary_west', "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500")}
              placeholder="e.g., Lot 10"
            />
          </div>
        </div>
      </div>

      {/* AI Review Modal */}
      {showAIReview && extractedAIData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">🤖 AI Extracted Property Data</h3>
              <button
                onClick={handleDeclineAIData}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-4">
              {[
                { id: 'summary', label: '📊 Summary', icon: '🏠' },
                { id: 'identification', label: 'Property ID', icon: '🏠' },
                { id: 'location', label: 'Location', icon: '📍' },
                { id: 'site', label: 'Site Details', icon: '🌍' },
                { id: 'buildings', label: 'Buildings', icon: '🏢' },
                { id: 'utilities', label: 'Utilities', icon: '⚡' },
                { id: 'market', label: 'Market', icon: '💰' },
                { id: 'legal', label: 'Legal', icon: '⚖️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'summary' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">📊 Data Extraction Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(extractedAIData).map(([section, data]) => {
                      if (!data || typeof data !== 'object') return null;
                      const fieldCount = Array.isArray(data) ? data.length : Object.keys(data).filter(key => data[key]).length;
                      if (fieldCount === 0) return null;
                      
                      return (
                        <div key={section} className="bg-white p-2 rounded border">
                          <span className="font-medium text-gray-700 capitalize">{toTitleCase(section)}:</span>
                          <span className="ml-2 text-blue-600">{fieldCount} fields</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Confidence Level */}
                  {extractedAIData.confidence && (
                    <div className="mt-4 p-3 bg-white border rounded">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700">AI Confidence Level:</span>
                        <span className={
                          "ml-2 px-2 py-1 rounded text-xs font-semibold " +
                          (extractedAIData.confidence === 'high' ? 'bg-green-100 text-green-800' :
                           extractedAIData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                           'bg-red-100 text-red-800')
                        }>
                          {extractedAIData.confidence.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleDeclineAIData}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptAIData}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Accept & Apply to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentificationStep;