import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { reportsAPI } from '@/lib/api';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  DocumentArrowDownIcon,
  EyeIcon,
  PencilSquareIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export const ReviewStep = () => {
  const { state, updateStepData } = useWizard();
  const { data } = state;
  const review = data.review;
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    validateReport();
  }, [data]);

  const validateReport = () => {
    const errors: string[] = [];
    const completion: Record<string, boolean> = {};

    // Step 1: Report Info validation
    completion['reportInfo'] = !!(data.reportInfo?.purpose && data.reportInfo?.inspection_date);
    if (!data.reportInfo?.purpose) errors.push('Report purpose is required');
    if (!data.reportInfo?.inspection_date) errors.push('Inspection date is required');

    // Step 2: Identification validation
    completion['identification'] = !!(data.identification?.lot_number && 
                                      data.identification?.plan_number && 
                                      data.identification?.extent_perches);
    if (!data.identification?.lot_number) errors.push('Lot number is required');
    if (!data.identification?.plan_number) errors.push('Plan number is required');
    if (!data.identification?.extent_perches) errors.push('Land extent is required');

    // Step 3: Location validation
    completion['location'] = !!(data.location?.district && data.location?.province);
    if (!data.location?.district) errors.push('District is required');
    if (!data.location?.province) errors.push('Province is required');

    // Step 4: Site validation
    completion['site'] = !!(data.site?.topography || data.site?.soil_type);
    
    // Step 5: Buildings validation
    completion['buildings'] = Array.isArray(data.buildings) && data.buildings.length > 0;
    if (!completion['buildings']) errors.push('At least one building must be documented');

    // Step 6: Utilities validation
    completion['utilities'] = !!(data.utilities?.overall_rating);

    // Step 7: Planning validation
    completion['planning'] = !!(data.planning?.zoning_classification);

    // Step 8: Locality validation
    completion['locality'] = !!(data.locality?.area_type);

    // Step 9: Valuation validation
    completion['valuation'] = !!(data.valuation?.summary?.market_value && 
                                 data.valuation?.summary?.market_value > 0);
    if (!data.valuation?.summary?.market_value || data.valuation?.summary?.market_value <= 0) {
      errors.push('Market value must be calculated and greater than zero');
    }

    // Step 10: Legal validation
    completion['legal'] = !!(data.legal?.disclaimers && data.legal?.certificate);
    if (!data.legal?.disclaimers) errors.push('Legal disclaimers are required');
    if (!data.legal?.certificate) errors.push('Professional certificate is required');

    // Step 11: Appendices validation
    completion['appendices'] = !!(data.appendices?.files?.length || data.appendices?.photos?.length);

    setValidationErrors(errors);
    setCompletionStatus(completion);
    updateStepData('review', { validation_errors: errors, completion_status: completion });
  };

  const getCompletionPercentage = () => {
    const totalSteps = Object.keys(completionStatus).length;
    const completedSteps = Object.values(completionStatus).filter(Boolean).length;
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  };

  const canGenerateReport = () => {
    return validationErrors.length === 0 && data.valuation?.summary?.market_value > 0;
  };

  const handleGenerateReport = async (format: 'pdf' | 'docx') => {
    if (!state.reportId) {
      console.error('No report ID available');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Actual API call to generate the report
      let blob: Blob;
      if (format === 'pdf') {
        blob = await reportsAPI.generatePDF(state.reportId);
      } else {
        blob = await reportsAPI.generateDOCX(state.reportId);
      }
      
      // Complete progress
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const reportRef = data.reportInfo?.ref || state.reportId.substring(0, 8);
      const filename = `Report_${reportRef}.${format}`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Reset UI after brief delay
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        
        // Update review data with generation info
        updateStepData('review', {
          ...review,
          last_generated: new Date().toISOString(),
          last_format: format
        });
      }, 1000);

    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} report:`, error);
      setIsGenerating(false);
      setGenerationProgress(0);
      
      // Show error message to user
      alert(`Failed to generate ${format.toUpperCase()} report. Please try again or contact support if the problem persists.`);
    }
  };

  const handlePreviewReport = async () => {
    if (!state.reportId) {
      console.error('No report ID available');
      return;
    }

    try {
      // Generate PDF for preview
      const blob = await reportsAPI.generatePDF(state.reportId);
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for preview
      const previewWindow = window.open(url, '_blank');
      if (!previewWindow) {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report_Preview_${state.reportId.substring(0, 8)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up URL after some time
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate report preview. Please try again.');
    }
  };

  const handleFinalizeReport = async () => {
    if (!state.reportId) {
      console.error('No report ID available');
      return;
    }

    if (!canGenerateReport()) {
      alert('Please complete all required fields before finalizing the report.');
      return;
    }

    try {
      await reportsAPI.finalize(state.reportId);
      
      // Update review data
      updateStepData('review', {
        ...review,
        finalized_at: new Date().toISOString(),
        status: 'finalized'
      });
      
      alert('Report has been finalized successfully!');
    } catch (error) {
      console.error('Error finalizing report:', error);
      alert('Failed to finalize report. Please try again.');
    }
  };

  const stepNames = {
    reportInfo: 'Report Information',
    identification: 'Property Identification',
    location: 'Location & Access',
    site: 'Site Description',
    buildings: 'Buildings',
    utilities: 'Utilities',
    planning: 'Planning & Zoning',
    locality: 'Locality',
    valuation: 'Valuation',
    legal: 'Legal & Disclaimers',
    appendices: 'Appendices'
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Review & Generate Report
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Review all entered information, validate completeness, and generate the final valuation report in your preferred format.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Report Completion Status</h4>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-blue-600">{getCompletionPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(stepNames).map(([stepKey, stepName]) => (
            <div key={stepKey} className="flex items-center space-x-2">
              {completionStatus[stepKey] ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              )}
              <span className={`text-sm ${completionStatus[stepKey] ? 'text-green-700' : 'text-gray-600'}`}>
                {stepName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-red-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            Validation Issues ({validationErrors.length})
          </h4>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start text-sm text-red-700">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {error}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <p className="text-sm text-red-600">
              Please complete the required fields above before generating the report.
            </p>
          </div>
        </div>
      )}

      {/* Report Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Report Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Property Reference:</span>
              <span className="text-sm font-medium">{data.reportInfo?.ref || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Purpose:</span>
              <span className="text-sm font-medium">{data.reportInfo?.purpose || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Property Type:</span>
              <span className="text-sm font-medium">
                {data.buildings?.length > 0 ? `${data.buildings.length} building(s)` : 'Vacant land'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Land Extent:</span>
              <span className="text-sm font-medium">
                {data.identification?.extent_perches ? 
                  `${data.identification.extent_perches} perches` : 
                  'Not specified'
                }
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Location:</span>
              <span className="text-sm font-medium">
                {data.location?.district ? 
                  `${data.location.district}, ${data.location.province}` : 
                  'Not specified'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Inspection Date:</span>
              <span className="text-sm font-medium">
                {data.reportInfo?.inspection_date ? 
                  new Date(data.reportInfo.inspection_date).toLocaleDateString() : 
                  'Not specified'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Supporting Documents:</span>
              <span className="text-sm font-medium">
                {(data.appendices?.files?.length || 0) + (data.appendices?.photos?.length || 0)} files
              </span>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-3">
              <span className="text-sm font-semibold text-green-900">Market Value:</span>
              <span className="text-sm font-bold text-green-700">
                Rs. {data.valuation?.summary?.market_value ? 
                  data.valuation.summary.market_value.toLocaleString() : 
                  '0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Status */}
      {(review?.last_generated || review?.status) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-indigo-900 mb-3">Report Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {review?.status && (
              <div>
                <span className="font-medium text-indigo-700">Current Status: </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  review.status === 'finalized' 
                    ? 'bg-green-100 text-green-800'
                    : review.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {review.status === 'finalized' ? 'Finalized' : review.status === 'draft' ? 'Draft' : 'In Progress'}
                </span>
              </div>
            )}
            {review?.last_generated && (
              <div>
                <span className="font-medium text-indigo-700">Last Generated: </span>
                <span className="text-indigo-600">
                  {new Date(review.last_generated).toLocaleDateString()} 
                  {review.last_format && ` (${review.last_format.toUpperCase()})`}
                </span>
              </div>
            )}
            {review?.finalized_at && (
              <div>
                <span className="font-medium text-indigo-700">Finalized: </span>
                <span className="text-indigo-600">{new Date(review.finalized_at).toLocaleDateString()}</span>
              </div>
            )}
            {review?.saved_at && (
              <div>
                <span className="font-medium text-indigo-700">Last Saved: </span>
                <span className="text-indigo-600">{new Date(review.saved_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Generate Final Report</h4>
        
        {!canGenerateReport() ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
            <p className="text-sm text-gray-600 mb-2">Report cannot be generated yet</p>
            <p className="text-xs text-gray-500">Please complete all required fields and fix validation issues above.</p>
          </div>
        ) : (
          <div>
            {isGenerating ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <ClockIcon className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                </div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Generating Report...</h5>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">{generationProgress}% complete</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGenerateReport('pdf')}
                    className="flex items-center justify-center px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Generate PDF Report
                  </button>
                  <button
                    onClick={() => handleGenerateReport('docx')}
                    className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Generate Word Document
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Additional Options</h5>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                      <span className="ml-2 text-sm text-gray-600">Include draft watermark</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                      <span className="ml-2 text-sm text-gray-600">Include all uploaded photos</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                      <span className="ml-2 text-sm text-gray-600">Include location maps</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                      <span className="ml-2 text-sm text-gray-600">Email copy to client</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Report Management</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button 
            onClick={handlePreviewReport}
            disabled={!canGenerateReport() || isGenerating}
            className={`flex items-center justify-center px-4 py-2 text-sm rounded transition-colors ${
              canGenerateReport() && !isGenerating
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview Report
          </button>
          <button 
            onClick={() => updateStepData('review', { ...review, status: 'draft', saved_at: new Date().toISOString() })}
            className="flex items-center justify-center px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            <PencilSquareIcon className="w-4 h-4 mr-2" />
            Save as Draft
          </button>
          <button 
            onClick={handleFinalizeReport}
            disabled={!canGenerateReport() || isGenerating || review?.status === 'finalized'}
            className={`flex items-center justify-center px-4 py-2 text-sm rounded transition-colors ${
              canGenerateReport() && !isGenerating && review?.status !== 'finalized'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            {review?.status === 'finalized' ? 'Report Finalized' : 'Finalize Report'}
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Final Report Notes
          </label>
          <textarea
            value={review.final_notes || ''}
            onChange={(e) => updateStepData('review', { final_notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any final notes or comments about this valuation report..."
          />
        </div>
      </div>

      {/* Success Message */}
      {canGenerateReport() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Report is ready for generation! All required information has been completed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};