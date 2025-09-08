import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from '@/components/ui/ValidatedInput';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { useStepValidation } from '@/hooks/useFieldValidation';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export const MarketAnalysisStep = () => {
  const { state, updateStepData } = useWizard();
  const market = state.data.market || {};
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any, isFieldValid: boolean) => {
    updateStepData('market', { [field]: value });
    
    // Clear field error if field becomes valid
    if (isFieldValid && localErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedChange = (parentField: string, field: string, value: any) => {
    const currentData = market[parentField as keyof typeof market] || {};
    updateStepData('market', {
      [parentField]: {
        ...currentData,
        [field]: value
      }
    });
  };

  // Comparable Sales Management
  const addComparableSale = () => {
    const currentComparables = market.comparable_sales || [];
    const newComparable = {
      id: `comp_${Date.now()}`,
      address: '',
      distance_km: 0,
      sale_date: '',
      sale_price: 0,
      price_per_perch: 0,
      land_extent: 0,
      building_area: 0,
      property_type: 'residential',
      condition: 'good',
      adjustments: {
        location: 0,
        time: 0,
        size: 0,
        condition: 0,
        other: 0,
        total: 0
      },
      adjusted_price_per_perch: 0,
      notes: ''
    };
    
    handleInputChange('comparable_sales', [...currentComparables, newComparable], true);
  };

  const updateComparable = (index: number, field: string, value: any) => {
    const comparables = [...(market.comparable_sales || [])];
    
    if (field.includes('adjustments.')) {
      const adjustmentField = field.split('.')[1];
      comparables[index] = {
        ...comparables[index],
        adjustments: {
          ...comparables[index].adjustments,
          [adjustmentField]: value
        }
      };
      
      // Recalculate total adjustment
      const adjustments = comparables[index].adjustments;
      const total = adjustments.location + adjustments.time + adjustments.size + 
                   adjustments.condition + adjustments.other;
      comparables[index].adjustments.total = total;
      
      // Recalculate adjusted price per perch
      comparables[index].adjusted_price_per_perch = 
        comparables[index].price_per_perch * (1 + total / 100);
    } else {
      comparables[index] = {
        ...comparables[index],
        [field]: value
      };
      
      // Auto-calculate price per perch when sale price or land extent changes
      if ((field === 'sale_price' || field === 'land_extent') && 
          comparables[index].sale_price > 0 && comparables[index].land_extent > 0) {
        comparables[index].price_per_perch = 
          comparables[index].sale_price / comparables[index].land_extent;
      }
    }
    
    handleInputChange('comparable_sales', comparables, true);
  };

  const removeComparable = (index: number) => {
    const comparables = [...(market.comparable_sales || [])];
    comparables.splice(index, 1);
    handleInputChange('comparable_sales', comparables, true);
  };

  // Rental Comparables Management
  const addRentalComparable = () => {
    const currentRentals = market.rental_comparables || [];
    const newRental = {
      id: `rental_${Date.now()}`,
      address: '',
      monthly_rent: 0,
      property_type: 'residential',
      building_area: 0,
      rental_yield: 0
    };
    
    handleInputChange('rental_comparables', [...currentRentals, newRental], true);
  };

  const updateRentalComparable = (index: number, field: string, value: any) => {
    const rentals = [...(market.rental_comparables || [])];
    rentals[index] = {
      ...rentals[index],
      [field]: value
    };
    
    handleInputChange('rental_comparables', rentals, true);
  };

  const removeRentalComparable = (index: number) => {
    const rentals = [...(market.rental_comparables || [])];
    rentals.splice(index, 1);
    handleInputChange('rental_comparables', rentals, true);
  };

  const ArrayInput = ({ 
    field, 
    parentField,
    label, 
    placeholder 
  }: { 
    field: string;
    parentField: string; 
    label: string; 
    placeholder: string; 
  }) => {
    const [inputValue, setInputValue] = useState('');
    const currentArray = ((market[parentField as keyof typeof market] as any)?.[field] || []) as string[];

    const addItem = () => {
      if (inputValue.trim() && !currentArray.includes(inputValue.trim())) {
        const updatedArray = [...currentArray, inputValue.trim()];
        handleNestedChange(parentField, field, updatedArray);
        setInputValue('');
      }
    };

    const removeItem = (index: number) => {
      const updatedArray = currentArray.filter((_, i) => i !== index);
      handleNestedChange(parentField, field, updatedArray);
    };

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
            onClick={addItem}
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
                  onClick={() => removeItem(index)}
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Analysis</h2>
        <p className="text-gray-600 mb-6">
          Analyze comparable sales, market trends, and pricing factors to support the property valuation.
        </p>
      </div>

      {/* Comparable Sales */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Comparable Sales</h3>
          <button
            type="button"
            onClick={addComparableSale}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Comparable
          </button>
        </div>

        <div className="space-y-6">
          {(market.comparable_sales || []).map((comparable, index) => (
            <div key={comparable.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">Comparable Sale #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeComparable(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <ValidatedInput
                    label="Property Address"
                    name={`comparable_${index}_address`}
                    value={comparable.address}
                    onChange={(value) => updateComparable(index, 'address', value)}
                    placeholder="Full property address"
                    required
                  />
                </div>
                
                <ValidatedInput
                  label="Distance (km)"
                  name={`comparable_${index}_distance`}
                  type="number"
                  value={comparable.distance_km || ''}
                  onChange={(value) => updateComparable(index, 'distance_km', parseFloat(value) || 0)}
                  placeholder="0.5"
                  step="0.1"
                />

                <ValidatedInput
                  label="Sale Date"
                  name={`comparable_${index}_sale_date`}
                  type="date"
                  value={comparable.sale_date}
                  onChange={(value) => updateComparable(index, 'sale_date', value)}
                  required
                />

                <ValidatedInput
                  label="Sale Price (LKR)"
                  name={`comparable_${index}_sale_price`}
                  type="number"
                  value={comparable.sale_price || ''}
                  onChange={(value) => updateComparable(index, 'sale_price', parseFloat(value) || 0)}
                  placeholder="10000000"
                  required
                />

                <ValidatedInput
                  label="Land Extent (Perches)"
                  name={`comparable_${index}_land_extent`}
                  type="number"
                  value={comparable.land_extent || ''}
                  onChange={(value) => updateComparable(index, 'land_extent', parseFloat(value) || 0)}
                  placeholder="20"
                  step="0.01"
                  required
                />

                <ValidatedInput
                  label="Building Area (sq ft)"
                  name={`comparable_${index}_building_area`}
                  type="number"
                  value={comparable.building_area || ''}
                  onChange={(value) => updateComparable(index, 'building_area', parseFloat(value) || 0)}
                  placeholder="2000"
                />

                <ValidatedSelect
                  label="Property Type"
                  name={`comparable_${index}_property_type`}
                  value={comparable.property_type}
                  onChange={(value) => updateComparable(index, 'property_type', value)}
                  options={[
                    { value: 'residential', label: 'Residential' },
                    { value: 'commercial', label: 'Commercial' },
                    { value: 'industrial', label: 'Industrial' },
                    { value: 'mixed_use', label: 'Mixed Use' },
                    { value: 'vacant_land', label: 'Vacant Land' }
                  ]}
                />

                <ValidatedSelect
                  label="Property Condition"
                  name={`comparable_${index}_condition`}
                  value={comparable.condition}
                  onChange={(value) => updateComparable(index, 'condition', value)}
                  options={[
                    { value: 'excellent', label: 'Excellent' },
                    { value: 'very_good', label: 'Very Good' },
                    { value: 'good', label: 'Good' },
                    { value: 'fair', label: 'Fair' },
                    { value: 'poor', label: 'Poor' }
                  ]}
                />
              </div>

              {/* Adjustments */}
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Market Adjustments (%)</h5>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <ValidatedInput
                    label="Location"
                    name={`comparable_${index}_adj_location`}
                    type="number"
                    value={comparable.adjustments.location || ''}
                    onChange={(value) => updateComparable(index, 'adjustments.location', parseFloat(value) || 0)}
                    placeholder="0"
                    step="0.1"
                  />
                  <ValidatedInput
                    label="Time"
                    name={`comparable_${index}_adj_time`}
                    type="number"
                    value={comparable.adjustments.time || ''}
                    onChange={(value) => updateComparable(index, 'adjustments.time', parseFloat(value) || 0)}
                    placeholder="0"
                    step="0.1"
                  />
                  <ValidatedInput
                    label="Size"
                    name={`comparable_${index}_adj_size`}
                    type="number"
                    value={comparable.adjustments.size || ''}
                    onChange={(value) => updateComparable(index, 'adjustments.size', parseFloat(value) || 0)}
                    placeholder="0"
                    step="0.1"
                  />
                  <ValidatedInput
                    label="Condition"
                    name={`comparable_${index}_adj_condition`}
                    type="number"
                    value={comparable.adjustments.condition || ''}
                    onChange={(value) => updateComparable(index, 'adjustments.condition', parseFloat(value) || 0)}
                    placeholder="0"
                    step="0.1"
                  />
                  <ValidatedInput
                    label="Other"
                    name={`comparable_${index}_adj_other`}
                    type="number"
                    value={comparable.adjustments.other || ''}
                    onChange={(value) => updateComparable(index, 'adjustments.other', parseFloat(value) || 0)}
                    placeholder="0"
                    step="0.1"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Adj (%)</label>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                      {comparable.adjustments.total.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price per Perch (LKR)</label>
                    <div className="mt-1 p-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                      {comparable.price_per_perch.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Adjusted Price per Perch (LKR)</label>
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-300 rounded-md text-sm font-medium">
                      {comparable.adjusted_price_per_perch.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ValidatedTextarea
                  label="Comparable Notes"
                  name={`comparable_${index}_notes`}
                  value={comparable.notes || ''}
                  onChange={(value) => updateComparable(index, 'notes', value)}
                  rows={2}
                  placeholder="Additional notes about this comparable sale..."
                />
              </div>
            </div>
          ))}

          {(!market.comparable_sales || market.comparable_sales.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No comparable sales added yet. Click "Add Comparable" to start building your market analysis.
            </div>
          )}
        </div>
      </div>

      {/* Market Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Market Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Area Growth Rate (%/year)"
            name="area_growth_rate"
            type="number"
            value={(market.market_trends?.area_growth_rate) || ''}
            onChange={(value) => handleNestedChange('market_trends', 'area_growth_rate', parseFloat(value) || 0)}
            placeholder="5.2"
            step="0.1"
          />

          <ValidatedSelect
            label="Price Trend Direction"
            name="price_trend_direction"
            value={(market.market_trends?.price_trend_direction) || ''}
            onChange={(value) => handleNestedChange('market_trends', 'price_trend_direction', value)}
            options={[
              { value: '', label: 'Select trend' },
              { value: 'strongly_increasing', label: 'Strongly Increasing' },
              { value: 'increasing', label: 'Increasing' },
              { value: 'stable', label: 'Stable' },
              { value: 'declining', label: 'Declining' },
              { value: 'strongly_declining', label: 'Strongly Declining' }
            ]}
          />

          <ValidatedSelect
            label="Market Activity Level"
            name="market_activity"
            value={(market.market_trends?.market_activity) || ''}
            onChange={(value) => handleNestedChange('market_trends', 'market_activity', value)}
            options={[
              { value: '', label: 'Select activity level' },
              { value: 'very_high', label: 'Very High' },
              { value: 'high', label: 'High' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'low', label: 'Low' },
              { value: 'very_low', label: 'Very Low' }
            ]}
          />

          <ValidatedInput
            label="Average Selling Period (months)"
            name="average_selling_period"
            type="number"
            value={(market.market_trends?.average_selling_period) || ''}
            onChange={(value) => handleNestedChange('market_trends', 'average_selling_period', parseFloat(value) || 0)}
            placeholder="6"
            step="0.1"
          />
        </div>
      </div>

      {/* Price Analysis */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Price Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedInput
            label="Comparable Range - Low (LKR/perch)"
            name="comparable_range_low"
            type="number"
            value={(market.price_analysis?.comparable_range_low) || ''}
            onChange={(value) => handleNestedChange('price_analysis', 'comparable_range_low', parseFloat(value) || 0)}
            placeholder="450000"
          />

          <ValidatedInput
            label="Comparable Range - High (LKR/perch)"
            name="comparable_range_high"
            type="number"
            value={(market.price_analysis?.comparable_range_high) || ''}
            onChange={(value) => handleNestedChange('price_analysis', 'comparable_range_high', parseFloat(value) || 0)}
            placeholder="650000"
          />

          <ValidatedInput
            label="Average Price per Perch (LKR)"
            name="average_price_per_perch"
            type="number"
            value={(market.price_analysis?.average_price_per_perch) || ''}
            onChange={(value) => handleNestedChange('price_analysis', 'average_price_per_perch', parseFloat(value) || 0)}
            placeholder="550000"
          />

          <ValidatedInput
            label="Median Price per Perch (LKR)"
            name="median_price_per_perch"
            type="number"
            value={(market.price_analysis?.median_price_per_perch) || ''}
            onChange={(value) => handleNestedChange('price_analysis', 'median_price_per_perch', parseFloat(value) || 0)}
            placeholder="525000"
          />

          <ValidatedSelect
            label="Subject Property Position"
            name="subject_property_position"
            value={(market.price_analysis?.subject_property_position) || ''}
            onChange={(value) => handleNestedChange('price_analysis', 'subject_property_position', value)}
            options={[
              { value: '', label: 'Select position' },
              { value: 'well_above_average', label: 'Well Above Average' },
              { value: 'above_average', label: 'Above Average' },
              { value: 'average', label: 'Average' },
              { value: 'below_average', label: 'Below Average' },
              { value: 'well_below_average', label: 'Well Below Average' }
            ]}
          />

          <div className="md:col-span-2">
            <ValidatedTextarea
              label="Pricing Rationale"
              name="pricing_rationale"
              value={(market.price_analysis?.pricing_rationale) || ''}
              onChange={(value) => handleNestedChange('price_analysis', 'pricing_rationale', value)}
              rows={3}
              placeholder="Explain the reasoning behind the pricing analysis..."
            />
          </div>
        </div>
      </div>

      {/* Market Influences */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Market Influences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ArrayInput
            field="economic_factors"
            parentField="market_influences"
            label="Economic Factors"
            placeholder="e.g., Interest rate changes"
          />

          <ArrayInput
            field="infrastructure_developments"
            parentField="market_influences"
            label="Infrastructure Developments"
            placeholder="e.g., New highway construction"
          />

          <ArrayInput
            field="zoning_changes"
            parentField="market_influences"
            label="Zoning Changes"
            placeholder="e.g., Residential to mixed use"
          />

          <ArrayInput
            field="demographic_changes"
            parentField="market_influences"
            label="Demographic Changes"
            placeholder="e.g., Young professional influx"
          />
        </div>
      </div>

      {/* Market Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Market Analysis Summary</h3>
        <ValidatedTextarea
          label="Market Analysis Summary"
          name="market_summary"
          value={market.market_summary || ''}
          onChange={(value, isValid) => handleInputChange('market_summary', value, isValid)}
          rows={6}
          placeholder="Provide a comprehensive summary of the market analysis, including key findings, comparable sales analysis, market trends, and value conclusions..."
          required
        />
      </div>

      <ErrorDisplay errors={Object.values(localErrors).filter(Boolean)} />
    </div>
  );
};