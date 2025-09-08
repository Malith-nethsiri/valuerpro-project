import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from '@/components/ui/ValidatedInput';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useStepValidation } from '@/hooks/useFieldValidation';

export const EnvironmentalStep = () => {
  const { state, updateStepData } = useWizard();
  const environmental = state.data.environmental || {};
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any, isFieldValid: boolean) => {
    updateStepData('environmental', { [field]: value });
    
    // Clear field error if field becomes valid
    if (isFieldValid && localErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayChange = (field: string, values: string[]) => {
    updateStepData('environmental', { [field]: values });
  };

  const addArrayItem = (field: string, value: string) => {
    const currentArray = environmental[field as keyof typeof environmental] as string[] || [];
    if (value.trim() && !currentArray.includes(value.trim())) {
      handleArrayChange(field, [...currentArray, value.trim()]);
    }
  };

  const removeArrayItem = (field: string, index: number) => {
    const currentArray = environmental[field as keyof typeof environmental] as string[] || [];
    handleArrayChange(field, currentArray.filter((_, i) => i !== index));
  };

  const ArrayInput = ({ 
    field, 
    label, 
    placeholder 
  }: { 
    field: string; 
    label: string; 
    placeholder: string; 
  }) => {
    const [inputValue, setInputValue] = useState('');
    const currentArray = environmental[field as keyof typeof environmental] as string[] || [];

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => {
              addArrayItem(field, inputValue);
              setInputValue('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        {currentArray.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {currentArray.map((item, index) => (
              <div key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, index)}
                  className="text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Environmental Factors</h2>
        <p className="text-gray-600 mb-6">
          Assess environmental conditions, hazards, and regulatory clearances affecting the property.
        </p>
      </div>

      {/* NBRO & Risk Assessment */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">NBRO & Risk Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedSelect
            label="NBRO Clearance Status"
            name="nbro_clearance"
            value={environmental.nbro_clearance || ''}
            onChange={(value, isValid) => handleInputChange('nbro_clearance', value, isValid)}
            required
            options={[
              { value: '', label: 'Select status' },
              { value: 'obtained', label: 'Clearance Obtained' },
              { value: 'not_required', label: 'Not Required' },
              { value: 'pending', label: 'Pending Application' },
              { value: 'rejected', label: 'Application Rejected' },
              { value: 'unknown', label: 'Status Unknown' }
            ]}
          />

          <ValidatedSelect
            label="Landslide Risk Level"
            name="landslide_risk"
            value={environmental.landslide_risk || ''}
            onChange={(value, isValid) => handleInputChange('landslide_risk', value, isValid)}
            options={[
              { value: '', label: 'Select risk level' },
              { value: 'low', label: 'Low Risk' },
              { value: 'moderate', label: 'Moderate Risk' },
              { value: 'high', label: 'High Risk' },
              { value: 'very_high', label: 'Very High Risk' },
              { value: 'not_applicable', label: 'Not Applicable' }
            ]}
          />

          <ValidatedSelect
            label="Flood Risk Level"
            name="flood_risk"
            value={environmental.flood_risk || ''}
            onChange={(value, isValid) => handleInputChange('flood_risk', value, isValid)}
            options={[
              { value: '', label: 'Select risk level' },
              { value: 'low', label: 'Low Risk' },
              { value: 'moderate', label: 'Moderate Risk' },
              { value: 'high', label: 'High Risk' },
              { value: 'very_high', label: 'Very High Risk' },
              { value: 'not_applicable', label: 'Not Applicable' }
            ]}
          />

          <ValidatedSelect
            label="Erosion Risk Level"
            name="erosion_risk"
            value={environmental.erosion_risk || ''}
            onChange={(value, isValid) => handleInputChange('erosion_risk', value, isValid)}
            options={[
              { value: '', label: 'Select risk level' },
              { value: 'low', label: 'Low Risk' },
              { value: 'moderate', label: 'Moderate Risk' },
              { value: 'high', label: 'High Risk' },
              { value: 'very_high', label: 'Very High Risk' },
              { value: 'not_applicable', label: 'Not Applicable' }
            ]}
          />
        </div>
      </div>

      {/* Climate & Location */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Climate & Geographic Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedSelect
            label="Climate Zone"
            name="climate_zone"
            value={environmental.climate_zone || ''}
            onChange={(value, isValid) => handleInputChange('climate_zone', value, isValid)}
            options={[
              { value: '', label: 'Select climate zone' },
              { value: 'wet_zone', label: 'Wet Zone' },
              { value: 'intermediate_zone', label: 'Intermediate Zone' },
              { value: 'dry_zone', label: 'Dry Zone' },
              { value: 'coastal', label: 'Coastal' },
              { value: 'mountainous', label: 'Mountainous' }
            ]}
          />

          <ValidatedInput
            label="Average Annual Rainfall (mm)"
            name="average_rainfall"
            type="number"
            value={environmental.average_rainfall || ''}
            onChange={(value, isValid) => handleInputChange('average_rainfall', parseFloat(value) || 0, isValid)}
            placeholder="e.g., 1500"
          />

          <ValidatedInput
            label="Temperature Range"
            name="temperature_range"
            value={environmental.temperature_range || ''}
            onChange={(value, isValid) => handleInputChange('temperature_range', value, isValid)}
            placeholder="e.g., 20-30°C"
          />

          <ValidatedSelect
            label="Earthquake Zone"
            name="earthquake_zone"
            value={environmental.earthquake_zone || ''}
            onChange={(value, isValid) => handleInputChange('earthquake_zone', value, isValid)}
            options={[
              { value: '', label: 'Select earthquake zone' },
              { value: 'zone_1', label: 'Zone 1 (Low Risk)' },
              { value: 'zone_2', label: 'Zone 2 (Moderate Risk)' },
              { value: 'zone_3', label: 'Zone 3 (High Risk)' },
              { value: 'unknown', label: 'Unknown' }
            ]}
          />
        </div>
      </div>

      {/* Environmental Quality */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Environmental Quality</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedSelect
            label="Air Quality"
            name="air_quality"
            value={environmental.air_quality || ''}
            onChange={(value, isValid) => handleInputChange('air_quality', value, isValid)}
            options={[
              { value: '', label: 'Select air quality' },
              { value: 'excellent', label: 'Excellent' },
              { value: 'good', label: 'Good' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'poor', label: 'Poor' },
              { value: 'very_poor', label: 'Very Poor' }
            ]}
          />

          <ValidatedSelect
            label="Noise Levels"
            name="noise_levels"
            value={environmental.noise_levels || ''}
            onChange={(value, isValid) => handleInputChange('noise_levels', value, isValid)}
            options={[
              { value: '', label: 'Select noise level' },
              { value: 'very_quiet', label: 'Very Quiet' },
              { value: 'quiet', label: 'Quiet' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'noisy', label: 'Noisy' },
              { value: 'very_noisy', label: 'Very Noisy' }
            ]}
          />

          <ValidatedSelect
            label="Water Quality"
            name="water_quality"
            value={environmental.water_quality || ''}
            onChange={(value, isValid) => handleInputChange('water_quality', value, isValid)}
            options={[
              { value: '', label: 'Select water quality' },
              { value: 'excellent', label: 'Excellent' },
              { value: 'good', label: 'Good' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'poor', label: 'Poor' },
              { value: 'contaminated', label: 'Contaminated' }
            ]}
          />

          <ValidatedSelect
            label="Soil Contamination"
            name="soil_contamination"
            value={environmental.soil_contamination || ''}
            onChange={(value, isValid) => handleInputChange('soil_contamination', value, isValid)}
            options={[
              { value: '', label: 'Select contamination level' },
              { value: 'none', label: 'None Detected' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'significant', label: 'Significant' },
              { value: 'severe', label: 'Severe' }
            ]}
          />
        </div>
      </div>

      {/* Proximity & Conservation */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Proximity & Conservation Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              id="conservation_area"
              type="checkbox"
              checked={environmental.conservation_area || false}
              onChange={(e) => handleInputChange('conservation_area', e.target.checked, true)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="conservation_area" className="text-sm font-medium text-gray-700">
              Located in Conservation Area
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="protected_species"
              type="checkbox"
              checked={environmental.protected_species || false}
              onChange={(e) => handleInputChange('protected_species', e.target.checked, true)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="protected_species" className="text-sm font-medium text-gray-700">
              Protected Species Present
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="archaeological_significance"
              type="checkbox"
              checked={environmental.archaeological_significance || false}
              onChange={(e) => handleInputChange('archaeological_significance', e.target.checked, true)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="archaeological_significance" className="text-sm font-medium text-gray-700">
              Archaeological Significance
            </label>
          </div>

          <ValidatedInput
            label="Coastal Proximity"
            name="coastal_proximity"
            value={environmental.coastal_proximity || ''}
            onChange={(value, isValid) => handleInputChange('coastal_proximity', value, isValid)}
            placeholder="e.g., 2 km from coast"
          />

          <ValidatedInput
            label="River Proximity"
            name="river_proximity"
            value={environmental.river_proximity || ''}
            onChange={(value, isValid) => handleInputChange('river_proximity', value, isValid)}
            placeholder="e.g., Adjacent to Mahaweli River"
          />

          <ValidatedInput
            label="Forest Reserve Proximity"
            name="forest_reserve_proximity"
            value={environmental.forest_reserve_proximity || ''}
            onChange={(value, isValid) => handleInputChange('forest_reserve_proximity', value, isValid)}
            placeholder="e.g., 500m from Sinharaja Reserve"
          />
        </div>
      </div>

      {/* Dynamic Lists */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lists & Classifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ArrayInput
            field="natural_hazards"
            label="Natural Hazards"
            placeholder="e.g., Cyclones, Droughts"
          />
          
          <ArrayInput
            field="environmental_restrictions"
            label="Environmental Restrictions"
            placeholder="e.g., Building height limits"
          />

          <ArrayInput
            field="pollution_sources"
            label="Pollution Sources"
            placeholder="e.g., Industrial plant 1km north"
          />

          <ArrayInput
            field="environmental_clearances"
            label="Environmental Clearances"
            placeholder="e.g., EIA approval obtained"
          />

          <ArrayInput
            field="sustainability_features"
            label="Sustainability Features"
            placeholder="e.g., Solar panels, rainwater harvesting"
          />
        </div>
      </div>

      {/* Summary & Impact */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Summary</h3>
        <div className="space-y-4">
          <ValidatedSelect
            label="Overall Environmental Impact on Value"
            name="environmental_impact"
            value={environmental.environmental_impact || ''}
            onChange={(value, isValid) => handleInputChange('environmental_impact', value, isValid)}
            options={[
              { value: '', label: 'Select impact level' },
              { value: 'very_positive', label: 'Very Positive Impact' },
              { value: 'positive', label: 'Positive Impact' },
              { value: 'neutral', label: 'Neutral/No Impact' },
              { value: 'negative', label: 'Negative Impact' },
              { value: 'very_negative', label: 'Very Negative Impact' }
            ]}
          />

          <ValidatedTextarea
            label="Environmental Notes & Comments"
            name="environmental_notes"
            value={environmental.environmental_notes || ''}
            onChange={(value, isValid) => handleInputChange('environmental_notes', value, isValid)}
            rows={4}
            placeholder="Additional comments about environmental factors affecting this property..."
          />
        </div>
      </div>

      <ErrorDisplay errors={Object.values(localErrors).filter(Boolean)} />
    </div>
  );
};