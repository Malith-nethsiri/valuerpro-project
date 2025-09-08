import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from '@/components/ui/ValidatedInput';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useStepValidation } from '@/hooks/useFieldValidation';

export const TransportStep = () => {
  const { state, updateStepData } = useWizard();
  const transport = state.data.transport || {};
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any, isFieldValid: boolean) => {
    updateStepData('transport', { [field]: value });
    
    // Clear field error if field becomes valid
    if (isFieldValid && localErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transport & Access</h2>
        <p className="text-gray-600 mb-6">
          Assess road access, public transport availability, and overall transportation connectivity of the property.
        </p>
      </div>

      {/* Road Access & Condition */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Road Access & Condition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedSelect
            label="Road Type"
            name="road_type"
            value={transport.road_type || ''}
            onChange={(value, isValid) => handleInputChange('road_type', value, isValid)}
            required
            options={[
              { value: '', label: 'Select road type' },
              { value: 'main_road', label: 'Main Road (A/B Grade)' },
              { value: 'secondary_road', label: 'Secondary Road' },
              { value: 'local_road', label: 'Local Road' },
              { value: 'private_road', label: 'Private Road' },
              { value: 'lane', label: 'Lane/Narrow Road' },
              { value: 'cart_track', label: 'Cart Track' },
              { value: 'footpath_only', label: 'Footpath Only' }
            ]}
          />

          <ValidatedSelect
            label="Road Condition"
            name="road_condition"
            value={transport.road_condition || ''}
            onChange={(value, isValid) => handleInputChange('road_condition', value, isValid)}
            required
            options={[
              { value: '', label: 'Select condition' },
              { value: 'excellent', label: 'Excellent' },
              { value: 'very_good', label: 'Very Good' },
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' },
              { value: 'very_poor', label: 'Very Poor' }
            ]}
          />

          <ValidatedInput
            label="Road Width (meters)"
            name="road_width"
            type="number"
            value={transport.road_width || ''}
            onChange={(value, isValid) => handleInputChange('road_width', parseFloat(value) || 0, isValid)}
            placeholder="6.5"
            step="0.1"
            required
          />

          <ValidatedInput
            label="Property Access Width (meters)"
            name="access_width"
            type="number"
            value={transport.access_width || ''}
            onChange={(value, isValid) => handleInputChange('access_width', parseFloat(value) || 0, isValid)}
            placeholder="4.0"
            step="0.1"
          />

          <ValidatedSelect
            label="Access Quality"
            name="access_quality"
            value={transport.access_quality || ''}
            onChange={(value, isValid) => handleInputChange('access_quality', value, isValid)}
            options={[
              { value: '', label: 'Select quality' },
              { value: 'excellent', label: 'Excellent - Direct main road access' },
              { value: 'very_good', label: 'Very Good - Good secondary road' },
              { value: 'good', label: 'Good - Local road access' },
              { value: 'fair', label: 'Fair - Narrow lane access' },
              { value: 'poor', label: 'Poor - Difficult access' },
              { value: 'very_poor', label: 'Very Poor - Requires improvement' }
            ]}
          />

          <ValidatedInput
            label="Distance to Main Road (meters)"
            name="distance_to_main_road"
            type="number"
            value={transport.distance_to_main_road || ''}
            onChange={(value, isValid) => handleInputChange('distance_to_main_road', parseFloat(value) || 0, isValid)}
            placeholder="250"
          />
        </div>
      </div>

      {/* Public Transport */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Public Transport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              id="public_transport_available"
              type="checkbox"
              checked={transport.public_transport_available || false}
              onChange={(e) => handleInputChange('public_transport_available', e.target.checked, true)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="public_transport_available" className="text-sm font-medium text-gray-700">
              Public Transport Available
            </label>
          </div>

          {transport.public_transport_available && (
            <>
              <ValidatedInput
                label="Nearest Bus Stop Distance (meters)"
                name="nearest_bus_stop"
                type="number"
                value={transport.nearest_bus_stop || ''}
                onChange={(value, isValid) => handleInputChange('nearest_bus_stop', parseFloat(value) || 0, isValid)}
                placeholder="200"
              />

              <ValidatedInput
                label="Nearest Railway Station"
                name="nearest_railway_station"
                value={transport.nearest_railway_station || ''}
                onChange={(value, isValid) => handleInputChange('nearest_railway_station', value, isValid)}
                placeholder="e.g., Colombo Fort Station"
              />

              <ValidatedInput
                label="Distance to Railway (km)"
                name="distance_to_railway"
                type="number"
                value={transport.distance_to_railway || ''}
                onChange={(value, isValid) => handleInputChange('distance_to_railway', parseFloat(value) || 0, isValid)}
                placeholder="2.5"
                step="0.1"
              />
            </>
          )}
        </div>
      </div>

      {/* Air Transport */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Air Transport Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Nearest Airport"
            name="nearest_airport"
            value={transport.nearest_airport || ''}
            onChange={(value, isValid) => handleInputChange('nearest_airport', value, isValid)}
            placeholder="e.g., Bandaranaike International Airport"
          />

          <ValidatedInput
            label="Distance to Airport (km)"
            name="distance_to_airport"
            type="number"
            value={transport.distance_to_airport || ''}
            onChange={(value, isValid) => handleInputChange('distance_to_airport', parseFloat(value) || 0, isValid)}
            placeholder="35"
            step="0.1"
          />
        </div>
      </div>

      {/* Parking & Traffic */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Parking & Traffic Conditions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedSelect
            label="Parking Availability"
            name="parking_availability"
            value={transport.parking_availability || ''}
            onChange={(value, isValid) => handleInputChange('parking_availability', value, isValid)}
            options={[
              { value: '', label: 'Select parking availability' },
              { value: 'excellent', label: 'Excellent - Ample on-site parking' },
              { value: 'very_good', label: 'Very Good - Good on-site parking' },
              { value: 'good', label: 'Good - Limited on-site parking' },
              { value: 'fair', label: 'Fair - Street parking available' },
              { value: 'poor', label: 'Poor - Limited street parking' },
              { value: 'very_poor', label: 'Very Poor - No parking available' }
            ]}
          />

          <ValidatedSelect
            label="Traffic Conditions"
            name="traffic_conditions"
            value={transport.traffic_conditions || ''}
            onChange={(value, isValid) => handleInputChange('traffic_conditions', value, isValid)}
            options={[
              { value: '', label: 'Select traffic conditions' },
              { value: 'very_light', label: 'Very Light Traffic' },
              { value: 'light', label: 'Light Traffic' },
              { value: 'moderate', label: 'Moderate Traffic' },
              { value: 'heavy', label: 'Heavy Traffic' },
              { value: 'very_heavy', label: 'Very Heavy Traffic' },
              { value: 'congested', label: 'Frequently Congested' }
            ]}
          />
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Transport Assessment</h3>
        <div className="space-y-4">
          <ValidatedSelect
            label="Overall Accessibility Rating"
            name="accessibility_rating"
            value={transport.accessibility_rating || ''}
            onChange={(value, isValid) => handleInputChange('accessibility_rating', value, isValid)}
            required
            options={[
              { value: '', label: 'Select rating' },
              { value: 'excellent', label: 'Excellent - Superior access & transport' },
              { value: 'very_good', label: 'Very Good - Good access & transport' },
              { value: 'good', label: 'Good - Adequate access & transport' },
              { value: 'fair', label: 'Fair - Limited access/transport options' },
              { value: 'poor', label: 'Poor - Substandard access' },
              { value: 'very_poor', label: 'Very Poor - Very limited access' }
            ]}
          />

          <ValidatedSelect
            label="Transport Impact on Property Value"
            name="transport_impact"
            value={transport.transport_impact || ''}
            onChange={(value, isValid) => handleInputChange('transport_impact', value, isValid)}
            required
            options={[
              { value: '', label: 'Select impact' },
              { value: 'very_positive', label: 'Very Positive Impact' },
              { value: 'positive', label: 'Positive Impact' },
              { value: 'neutral', label: 'Neutral Impact' },
              { value: 'negative', label: 'Negative Impact' },
              { value: 'very_negative', label: 'Very Negative Impact' }
            ]}
          />

          <ValidatedTextarea
            label="Transport & Access Notes"
            name="transport_notes"
            value={transport.transport_notes || ''}
            onChange={(value, isValid) => handleInputChange('transport_notes', value, isValid)}
            rows={4}
            placeholder="Additional comments about transport accessibility, including specific details about route conditions, public transport schedules, future transport developments, etc..."
          />
        </div>
      </div>

      {/* Key Transport Features Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Transport Features Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Road Type:</span>
            <span className="ml-2 text-blue-700">
              {transport.road_type ? transport.road_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Access Quality:</span>
            <span className="ml-2 text-blue-700">
              {transport.access_quality ? transport.access_quality.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Public Transport:</span>
            <span className="ml-2 text-blue-700">
              {transport.public_transport_available ? 'Available' : 'Not Available'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Overall Rating:</span>
            <span className="ml-2 text-blue-700">
              {transport.accessibility_rating ? transport.accessibility_rating.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not rated'}
            </span>
          </div>
        </div>
      </div>

      <ErrorDisplay errors={Object.values(localErrors).filter(Boolean)} />
    </div>
  );
};