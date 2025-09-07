import React, { useState, useEffect } from 'react';
import { useGroup } from '../GroupProvider';
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ComparableSale {
  id: string;
  address: string;
  distance_km: number;
  sale_date: string;
  sale_price: number;
  price_per_perch: number;
  land_extent: number;
  building_area: number;
  property_type: 'residential' | 'commercial' | 'industrial' | 'mixed_use' | 'vacant_land';
  condition: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
  adjustments: {
    location: number;
    time: number;
    size: number;
    condition: number;
    other: number;
    total: number;
  };
  adjusted_price_per_perch: number;
  notes: string;
}

interface ValuationLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  depreciation_pct: number;
  value: number;
  line_type: 'land' | 'building' | 'improvement';
}

export const MarketValuationGroup = () => {
  const { groupData, updateGroupData } = useGroup();
  
  // Extract data for each section
  const market = groupData.market_valuation?.market || {};
  const valuation = groupData.market_valuation?.valuation || {};
  const comparable_sales: ComparableSale[] = Array.isArray(market.comparable_sales) ? market.comparable_sales : [];
  const valuation_lines: ValuationLine[] = Array.isArray(valuation.lines) ? valuation.lines : [];

  // Local state for UI
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['comparables', 'market-trends'])
  );
  const [selectedComparable, setSelectedComparable] = useState<number | null>(null);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Market data handlers
  const handleMarketChange = (field: string, value: any) => {
    updateGroupData('market_valuation', {
      market: { ...market, [field]: value }
    });
  };

  const handleMarketTrendsChange = (field: string, value: any) => {
    const trends = market.market_trends || {};
    updateGroupData('market_valuation', {
      market: {
        ...market,
        market_trends: { ...trends, [field]: value }
      }
    });
  };

  const handlePriceAnalysisChange = (field: string, value: any) => {
    const priceAnalysis = market.price_analysis || {};
    updateGroupData('market_valuation', {
      market: {
        ...market,
        price_analysis: { ...priceAnalysis, [field]: value }
      }
    });
  };

  // Comparable sales handlers
  const addComparable = () => {
    const newComparable: ComparableSale = {
      id: Date.now().toString(),
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
    
    const updatedComparables = [...comparable_sales, newComparable];
    updateGroupData('market_valuation', {
      market: { ...market, comparable_sales: updatedComparables }
    });
    setSelectedComparable(comparable_sales.length);
  };

  const updateComparable = (index: number, field: string, value: any) => {
    const updatedComparables = comparable_sales.map((comp, i) => {
      if (i !== index) return comp;
      
      const updated = { ...comp, [field]: value };
      
      // Auto-calculate price per perch when sale_price or land_extent changes
      if (field === 'sale_price' || field === 'land_extent') {
        if (updated.land_extent > 0) {
          updated.price_per_perch = updated.sale_price / updated.land_extent;
        }
      }
      
      // Auto-calculate adjusted price when adjustments change
      if (field === 'adjustments' || field.startsWith('adjustments.')) {
        const adjustments = field === 'adjustments' ? value : { ...comp.adjustments, [field.split('.')[1]]: value };
        updated.adjustments = {
          ...adjustments,
          total: adjustments.location + adjustments.time + adjustments.size + adjustments.condition + adjustments.other
        };
        updated.adjusted_price_per_perch = updated.price_per_perch * (1 + updated.adjustments.total / 100);
      }
      
      return updated;
    });
    
    updateGroupData('market_valuation', {
      market: { ...market, comparable_sales: updatedComparables }
    });
  };

  const removeComparable = (index: number) => {
    const updatedComparables = comparable_sales.filter((_, i) => i !== index);
    updateGroupData('market_valuation', {
      market: { ...market, comparable_sales: updatedComparables }
    });
    if (selectedComparable === index) {
      setSelectedComparable(null);
    } else if (selectedComparable !== null && selectedComparable > index) {
      setSelectedComparable(selectedComparable - 1);
    }
  };

  // Valuation data handlers
  const handleValuationChange = (field: string, value: any) => {
    updateGroupData('market_valuation', {
      valuation: { ...valuation, [field]: value }
    });
  };

  const addValuationLine = (lineType: 'land' | 'building' | 'improvement') => {
    const newLine: ValuationLine = {
      id: Date.now().toString(),
      description: '',
      quantity: 0,
      unit: lineType === 'land' ? 'perches' : 'sqft',
      rate: 0,
      depreciation_pct: 0,
      value: 0,
      line_type: lineType
    };
    
    const updatedLines = [...valuation_lines, newLine];
    updateGroupData('market_valuation', {
      valuation: { ...valuation, lines: updatedLines }
    });
  };

  const updateValuationLine = (index: number, field: string, value: any) => {
    const updatedLines = valuation_lines.map((line, i) => {
      if (i !== index) return line;
      
      const updated = { ...line, [field]: value };
      
      // Auto-calculate value when quantity, rate, or depreciation changes
      if (['quantity', 'rate', 'depreciation_pct'].includes(field)) {
        const grossValue = updated.quantity * updated.rate;
        const depreciationAmount = grossValue * (updated.depreciation_pct / 100);
        updated.value = grossValue - depreciationAmount;
      }
      
      return updated;
    });
    
    updateGroupData('market_valuation', {
      valuation: { ...valuation, lines: updatedLines }
    });
  };

  const removeValuationLine = (index: number) => {
    const updatedLines = valuation_lines.filter((_, i) => i !== index);
    updateGroupData('market_valuation', {
      valuation: { ...valuation, lines: updatedLines }
    });
  };

  // Calculate valuation summary
  const calculateValuationSummary = () => {
    const land_value = valuation_lines.filter(l => l.line_type === 'land').reduce((sum, l) => sum + l.value, 0);
    const building_value = valuation_lines.filter(l => l.line_type === 'building').reduce((sum, l) => sum + l.value, 0);
    const improvement_value = valuation_lines.filter(l => l.line_type === 'improvement').reduce((sum, l) => sum + l.value, 0);
    const market_value = land_value + building_value + improvement_value;
    const fsv_percentage = valuation.summary?.fsv_percentage || 80;
    const forced_sale_value = market_value * (fsv_percentage / 100);
    
    return {
      land_value,
      building_value,
      improvement_value,
      market_value,
      forced_sale_value,
      fsv_percentage
    };
  };

  const valuationSummary = calculateValuationSummary();

  // Array input component for market influences
  const ArrayInput = ({ 
    label, 
    value = [], 
    onChange, 
    placeholder 
  }: {
    label: string;
    value: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
  }) => {
    const [newItem, setNewItem] = useState('');

    const addItem = () => {
      if (newItem.trim() && !value.includes(newItem.trim())) {
        onChange([...value, newItem.trim()]);
        setNewItem('');
      }
    };

    const removeItem = (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    };

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Market Analysis & Valuation
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Comprehensive market research, comparable analysis, and property valuation calculations. Data from AI analysis will be automatically populated where available.
        </p>
      </div>

      {/* Comparable Sales Section */}
      <CollapsibleSection 
        id="comparables" 
        title="Comparable Sales Analysis"
        bgColor="bg-blue-50" 
        borderColor="border-blue-200"
        titleColor="text-blue-900"
      >
        <div className="space-y-4">
          <div className="bg-white border border-blue-300 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-sm font-medium text-blue-800">Comparable Properties</h5>
              <button
                type="button"
                onClick={addComparable}
                className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Comparable
              </button>
            </div>

            {comparable_sales.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No comparable sales added yet. Click "Add Comparable" to start.</p>
            ) : (
              <div className="space-y-4">
                {/* Comparables List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparable_sales.map((comp, index) => (
                    <div
                      key={comp.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedComparable === index
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                      }`}
                      onClick={() => setSelectedComparable(index)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="text-sm font-medium text-gray-900">
                            {comp.address || `Comparable ${index + 1}`}
                          </h6>
                          <p className="text-xs text-gray-500 mt-1">
                            Rs. {comp.sale_price?.toLocaleString() || '0'} | {comp.distance_km || 0}km away
                          </p>
                          <p className="text-xs text-gray-500">
                            Rs. {comp.adjusted_price_per_perch?.toLocaleString() || '0'} per perch (adjusted)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeComparable(index);
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparable Details Form */}
                {selectedComparable !== null && comparable_sales[selectedComparable] && (
                  <div className="border-t border-blue-200 pt-4">
                    <h6 className="text-sm font-medium text-blue-800 mb-4">
                      Comparable Details - {comparable_sales[selectedComparable].address || `Comparable ${selectedComparable + 1}`}
                    </h6>
                    
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                          <input
                            type="text"
                            value={comparable_sales[selectedComparable].address}
                            onChange={(e) => updateComparable(selectedComparable, 'address', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Property address"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={comparable_sales[selectedComparable].distance_km}
                            onChange={(e) => updateComparable(selectedComparable, 'distance_km', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Distance from subject"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sale Date</label>
                          <input
                            type="date"
                            value={comparable_sales[selectedComparable].sale_date}
                            onChange={(e) => updateComparable(selectedComparable, 'sale_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (Rs.)</label>
                          <input
                            type="number"
                            value={comparable_sales[selectedComparable].sale_price}
                            onChange={(e) => updateComparable(selectedComparable, 'sale_price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Sale price"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Land Extent (perches)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={comparable_sales[selectedComparable].land_extent}
                            onChange={(e) => updateComparable(selectedComparable, 'land_extent', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Land extent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                          <select
                            value={comparable_sales[selectedComparable].property_type}
                            onChange={(e) => updateComparable(selectedComparable, 'property_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="industrial">Industrial</option>
                            <option value="mixed_use">Mixed Use</option>
                            <option value="vacant_land">Vacant Land</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            value={comparable_sales[selectedComparable].condition}
                            onChange={(e) => updateComparable(selectedComparable, 'condition', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="excellent">Excellent</option>
                            <option value="very_good">Very Good</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                          </select>
                        </div>
                      </div>

                      {/* Calculated Fields */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Perch (Rs.)</label>
                            <div className="text-lg font-semibold text-green-600">
                              Rs. {comparable_sales[selectedComparable].price_per_perch?.toLocaleString() || '0'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Adjusted Price per Perch (Rs.)</label>
                            <div className="text-lg font-semibold text-blue-600">
                              Rs. {comparable_sales[selectedComparable].adjusted_price_per_perch?.toLocaleString() || '0'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={comparable_sales[selectedComparable].notes}
                          onChange={(e) => updateComparable(selectedComparable, 'notes', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Additional notes about this comparable..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Market Trends Section */}
      <CollapsibleSection 
        id="market-trends" 
        title="Market Trends & Analysis"
        bgColor="bg-green-50" 
        borderColor="border-green-200"
        titleColor="text-green-900"
      >
        <div className="space-y-4">
          {/* Market Trends */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Market Trends</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Area Growth Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={market.market_trends?.area_growth_rate || ''}
                  onChange={(e) => handleMarketTrendsChange('area_growth_rate', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 5.2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Trend Direction</label>
                <select
                  value={market.market_trends?.price_trend_direction || ''}
                  onChange={(e) => handleMarketTrendsChange('price_trend_direction', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select trend...</option>
                  <option value="Strongly increasing">Strongly Increasing</option>
                  <option value="Increasing">Increasing</option>
                  <option value="Stable">Stable</option>
                  <option value="Declining">Declining</option>
                  <option value="Strongly declining">Strongly Declining</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Market Activity</label>
                <select
                  value={market.market_trends?.market_activity || ''}
                  onChange={(e) => handleMarketTrendsChange('market_activity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select activity level...</option>
                  <option value="Very active">Very Active</option>
                  <option value="Active">Active</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Slow">Slow</option>
                  <option value="Very slow">Very Slow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Average Selling Period (months)</label>
                <input
                  type="number"
                  value={market.market_trends?.average_selling_period || ''}
                  onChange={(e) => handleMarketTrendsChange('average_selling_period', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 3"
                />
              </div>
            </div>
          </div>

          {/* Price Analysis */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-4">Price Analysis</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comparable Range Low (Rs./perch)</label>
                <input
                  type="number"
                  value={market.price_analysis?.comparable_range_low || ''}
                  onChange={(e) => handlePriceAnalysisChange('comparable_range_low', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Low range"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comparable Range High (Rs./perch)</label>
                <input
                  type="number"
                  value={market.price_analysis?.comparable_range_high || ''}
                  onChange={(e) => handlePriceAnalysisChange('comparable_range_high', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="High range"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Average Price per Perch (Rs.)</label>
                <input
                  type="number"
                  value={market.price_analysis?.average_price_per_perch || ''}
                  onChange={(e) => handlePriceAnalysisChange('average_price_per_perch', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Average price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Property Position</label>
                <select
                  value={market.price_analysis?.subject_property_position || ''}
                  onChange={(e) => handlePriceAnalysisChange('subject_property_position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select position...</option>
                  <option value="Above market">Above Market</option>
                  <option value="At market">At Market</option>
                  <option value="Below market">Below Market</option>
                </select>
              </div>
            </div>
          </div>

          {/* Market Influences */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-purple-800 mb-4">Market Influences</h5>
            <div className="space-y-4">
              <ArrayInput
                label="Economic Factors"
                value={market.market_influences?.economic_factors || []}
                onChange={(values) => handleMarketChange('market_influences', { ...market.market_influences, economic_factors: values })}
                placeholder="e.g., Interest rates, Inflation, Economic growth"
              />
              
              <ArrayInput
                label="Infrastructure Developments"
                value={market.market_influences?.infrastructure_developments || []}
                onChange={(values) => handleMarketChange('market_influences', { ...market.market_influences, infrastructure_developments: values })}
                placeholder="e.g., New highways, Schools, Shopping centers"
              />

              <ArrayInput
                label="Zoning Changes"
                value={market.market_influences?.zoning_changes || []}
                onChange={(values) => handleMarketChange('market_influences', { ...market.market_influences, zoning_changes: values })}
                placeholder="e.g., Residential to commercial, Height restrictions"
              />
            </div>
          </div>

          {/* Market Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-800 mb-4">Market Analysis Summary</h5>
            <textarea
              value={market.market_summary || ''}
              onChange={(e) => handleMarketChange('market_summary', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Comprehensive market analysis summary including trends, comparables, and market position..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Valuation Section */}
      <CollapsibleSection 
        id="valuation" 
        title="Property Valuation Calculations"
        bgColor="bg-orange-50" 
        borderColor="border-orange-200"
        titleColor="text-orange-900"
      >
        <div className="space-y-4">
          {/* Valuation Approach */}
          <div className="bg-white border border-orange-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-orange-800 mb-4">Valuation Approach & Date</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valuation Method</label>
                <select
                  value={valuation.method || ''}
                  onChange={(e) => handleValuationChange('method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select method...</option>
                  <option value="cost_approach">Cost Approach</option>
                  <option value="market_approach">Market Approach</option>
                  <option value="income_approach">Income Approach</option>
                  <option value="combined_approach">Combined Approach</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valuation Date</label>
                <input
                  type="date"
                  value={valuation.valuation_date || ''}
                  onChange={(e) => handleValuationChange('valuation_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Valuation Lines */}
          <div className="space-y-4">
            {/* Land Valuation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-sm font-medium text-green-800">Land Valuation</h5>
                <button
                  type="button"
                  onClick={() => addValuationLine('land')}
                  className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Land Item
                </button>
              </div>
              
              {valuation_lines.filter(l => l.line_type === 'land').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No land valuation items. Click "Add Land Item" to start.</p>
              ) : (
                <div className="space-y-3">
                  {valuation_lines.map((line, index) => {
                    if (line.line_type !== 'land') return null;
                    return (
                      <div key={line.id} className="bg-white border border-green-300 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateValuationLine(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Land extent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateValuationLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                            <input
                              type="text"
                              value={line.unit}
                              onChange={(e) => updateValuationLine(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="perches"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rate (Rs.)</label>
                            <input
                              type="number"
                              value={line.rate}
                              onChange={(e) => updateValuationLine(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Value (Rs.)</label>
                              <div className="px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md">
                                {line.value?.toLocaleString() || '0'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeValuationLine(index)}
                              className="text-red-400 hover:text-red-600 mt-4"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Building Valuation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-sm font-medium text-blue-800">Building Valuation</h5>
                <button
                  type="button"
                  onClick={() => addValuationLine('building')}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Building Item
                </button>
              </div>
              
              {valuation_lines.filter(l => l.line_type === 'building').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No building valuation items. Click "Add Building Item" to start.</p>
              ) : (
                <div className="space-y-3">
                  {valuation_lines.map((line, index) => {
                    if (line.line_type !== 'building') return null;
                    return (
                      <div key={line.id} className="bg-white border border-blue-300 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateValuationLine(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Main building"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateValuationLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                            <input
                              type="text"
                              value={line.unit}
                              onChange={(e) => updateValuationLine(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="sqft"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rate (Rs.)</label>
                            <input
                              type="number"
                              value={line.rate}
                              onChange={(e) => updateValuationLine(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Depreciation (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={line.depreciation_pct}
                              onChange={(e) => updateValuationLine(index, 'depreciation_pct', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Value (Rs.)</label>
                              <div className="px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md">
                                {line.value?.toLocaleString() || '0'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeValuationLine(index)}
                              className="text-red-400 hover:text-red-600 mt-4"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Improvement Valuation */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-sm font-medium text-purple-800">Improvements Valuation</h5>
                <button
                  type="button"
                  onClick={() => addValuationLine('improvement')}
                  className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Improvement
                </button>
              </div>
              
              {valuation_lines.filter(l => l.line_type === 'improvement').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No improvement items. Click "Add Improvement" to start.</p>
              ) : (
                <div className="space-y-3">
                  {valuation_lines.map((line, index) => {
                    if (line.line_type !== 'improvement') return null;
                    return (
                      <div key={line.id} className="bg-white border border-purple-300 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateValuationLine(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Boundary wall"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => updateValuationLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                            <input
                              type="text"
                              value={line.unit}
                              onChange={(e) => updateValuationLine(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="running feet"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rate (Rs.)</label>
                            <input
                              type="number"
                              value={line.rate}
                              onChange={(e) => updateValuationLine(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Value (Rs.)</label>
                              <div className="px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md">
                                {line.value?.toLocaleString() || '0'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeValuationLine(index)}
                              className="text-red-400 hover:text-red-600 mt-4"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Valuation Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-800 mb-4">Valuation Summary</h5>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Land Value</div>
                  <div className="text-lg font-semibold text-green-600">
                    Rs. {valuationSummary.land_value.toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-blue-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Building Value</div>
                  <div className="text-lg font-semibold text-blue-600">
                    Rs. {valuationSummary.building_value.toLocaleString()}
                  </div>
                </div>

                <div className="bg-purple-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Improvement Value</div>
                  <div className="text-lg font-semibold text-purple-600">
                    Rs. {valuationSummary.improvement_value.toLocaleString()}
                  </div>
                </div>

                <div className="bg-orange-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Total Market Value</div>
                  <div className="text-xl font-bold text-orange-600">
                    Rs. {valuationSummary.market_value.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">FSV Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={valuationSummary.fsv_percentage}
                    onChange={(e) => handleValuationChange('summary', { ...valuation.summary, fsv_percentage: parseFloat(e.target.value) || 80 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-red-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Forced Sale Value</div>
                  <div className="text-lg font-semibold text-red-600">
                    Rs. {valuationSummary.forced_sale_value.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Justifications */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Land Rate Justification</label>
              <textarea
                value={valuation.land_rate_justification || ''}
                onChange={(e) => handleValuationChange('land_rate_justification', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Justify the land rate based on comparable sales and market analysis..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Building Rate Justification</label>
              <textarea
                value={valuation.building_rate_justification || ''}
                onChange={(e) => handleValuationChange('building_rate_justification', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Justify the building rates and depreciation applied..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valuation Comments</label>
              <textarea
                value={valuation.valuation_comments || ''}
                onChange={(e) => handleValuationChange('valuation_comments', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional comments on the valuation methodology and conclusions..."
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};