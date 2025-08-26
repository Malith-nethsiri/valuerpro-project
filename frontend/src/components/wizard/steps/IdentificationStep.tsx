import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useStepValidation } from '@/hooks/useFieldValidation';
import { validationSchemas } from '@/hooks/useFieldValidation';

export const IdentificationStep = () => {
  const { state, updateStepData, validateStep } = useWizard();
  const identification = state.data.identification;
  const { errors, isValid, validate } = useStepValidation(1);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any, isFieldValid: boolean) => {
    updateStepData('identification', { [field]: value });
    
    // Clear field error if field becomes valid
    if (isFieldValid && localErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate step when data changes
  useEffect(() => {
    validate();
  }, [identification, validate]);

  const handleBoundaryChange = (direction: string, value: string, isFieldValid: boolean) => {
    const boundaries = identification.boundaries || {};
    updateStepData('identification', { 
      boundaries: { ...boundaries, [direction]: value }
    });
  };

  const calculateExtentSqm = (perches: number) => {
    // 1 perch = 25.29285264 square meters
    return perches * 25.29285264;
  };

  const handleExtentPerchesChange = (value: string | number, isFieldValid: boolean) => {
    const perches = typeof value === 'string' ? parseFloat(value) : value;
    const sqm = calculateExtentSqm(perches || 0);
    
    updateStepData('identification', { 
      extent_perches: perches || 0,
      extent_sqm: sqm
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Identification & Title
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Enter the property identification details from the survey plan and title documents.
        </p>
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Survey Plan Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ValidatedInput
            label="Lot Number"
            fieldName="lot_number"
            validation={validationSchemas.lotNumber}
            value={identification.lot_number || ''}
            onChange={(value, isValid) => handleInputChange('lot_number', value, isValid)}
            placeholder="e.g., 15"
            helpText="As shown on the survey plan"
            required
          />

          <ValidatedInput
            label="Plan Number"
            fieldName="plan_number"
            validation={validationSchemas.planNumber}
            value={identification.plan_number || ''}
            onChange={(value, isValid) => handleInputChange('plan_number', value, isValid)}
            placeholder="e.g., 1035"
            helpText="Survey plan reference number"
            required
          />

          <div>
            <label htmlFor="plan-date" className="block text-sm font-medium text-gray-700 mb-2">
              Plan Date
            </label>
            <input
              type="date"
              id="plan-date"
              value={identification.plan_date ? identification.plan_date.split('T')[0] : ''}
              onChange={(e) => handleInputChange('plan_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="surveyor-name" className="block text-sm font-medium text-gray-700 mb-2">
              Licensed Surveyor
            </label>
            <input
              type="text"
              id="surveyor-name"
              value={identification.surveyor_name || ''}
              onChange={(e) => handleInputChange('surveyor_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., W.K. Perera, Licensed Surveyor"
            />
          </div>

          <div>
            <label htmlFor="land-name" className="block text-sm font-medium text-gray-700 mb-2">
              Land Name
            </label>
            <input
              type="text"
              id="land-name"
              value={identification.land_name || ''}
              onChange={(e) => handleInputChange('land_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Name of the land (if applicable)"
            />
          </div>
        </div>
      </div>

      {/* Extent */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Land Extent</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 13.8"
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
              onChange={(e) => handleInputChange('extent_sqm', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated from perches</p>
          </div>

          <div>
            <label htmlFor="extent-local" className="block text-sm font-medium text-gray-700 mb-2">
              Local Format
            </label>
            <input
              type="text"
              id="extent-local"
              value={identification.extent_local || ''}
              onChange={(e) => handleInputChange('extent_local', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2A-3R-15.5P"
            />
            <p className="text-xs text-gray-500 mt-1">Acres-Roods-Perches format</p>
          </div>
        </div>
      </div>

      {/* Boundaries */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Property Boundaries</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="boundary-north" className="block text-sm font-medium text-gray-700 mb-2">
              North Boundary
            </label>
            <input
              type="text"
              id="boundary-north"
              value={identification.boundaries?.north || ''}
              onChange={(e) => handleBoundaryChange('north', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Lot 7 (6m road)"
            />
          </div>

          <div>
            <label htmlFor="boundary-south" className="block text-sm font-medium text-gray-700 mb-2">
              South Boundary
            </label>
            <input
              type="text"
              id="boundary-south"
              value={identification.boundaries?.south || ''}
              onChange={(e) => handleBoundaryChange('south', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Lot 12"
            />
          </div>

          <div>
            <label htmlFor="boundary-east" className="block text-sm font-medium text-gray-700 mb-2">
              East Boundary
            </label>
            <input
              type="text"
              id="boundary-east"
              value={identification.boundaries?.east || ''}
              onChange={(e) => handleBoundaryChange('east', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Lot 108 (1m drain)"
            />
          </div>

          <div>
            <label htmlFor="boundary-west" className="block text-sm font-medium text-gray-700 mb-2">
              West Boundary
            </label>
            <input
              type="text"
              id="boundary-west"
              value={identification.boundaries?.west || ''}
              onChange={(e) => handleBoundaryChange('west', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Lot 10"
            />
          </div>
        </div>
      </div>

      {/* Title Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Title Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="title-owner" className="block text-sm font-medium text-gray-700 mb-2">
              Title Owner
            </label>
            <input
              type="text"
              id="title-owner"
              value={identification.title_owner || ''}
              onChange={(e) => handleInputChange('title_owner', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Owner name"
            />
          </div>

          <div>
            <label htmlFor="deed-no" className="block text-sm font-medium text-gray-700 mb-2">
              Deed Number
            </label>
            <input
              type="text"
              id="deed-no"
              value={identification.deed_no || ''}
              onChange={(e) => handleInputChange('deed_no', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Deed number"
            />
          </div>

          <div>
            <label htmlFor="deed-date" className="block text-sm font-medium text-gray-700 mb-2">
              Deed Date
            </label>
            <input
              type="date"
              id="deed-date"
              value={identification.deed_date ? identification.deed_date.split('T')[0] : ''}
              onChange={(e) => handleInputChange('deed_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="notary" className="block text-sm font-medium text-gray-700 mb-2">
              Notary Public
            </label>
            <input
              type="text"
              id="notary"
              value={identification.notary || ''}
              onChange={(e) => handleInputChange('notary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notary name"
            />
          </div>

          <div>
            <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-2">
              Interest Type
            </label>
            <select
              id="interest"
              value={identification.interest || 'freehold'}
              onChange={(e) => handleInputChange('interest', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="freehold">Freehold</option>
              <option value="leasehold">Leasehold</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-100 rounded border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>Note:</strong> If title documents are not available, the report will state "Title documents not provided; valuation assumes clear, marketable title."
          </p>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">
          🤖 AI Document Analysis
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Upload your survey plan or deed to automatically extract property identification details.
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Upload Survey Plan
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Upload Deed
          </button>
        </div>
      </div>
    </div>
  );
};