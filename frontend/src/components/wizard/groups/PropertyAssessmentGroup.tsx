import React, { useState } from 'react';
import { useGroup } from '../GroupProvider';
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ocrAPI } from '@/lib/api';

interface Building {
  id: string;
  type: string;
  use: string;
  floor_area: number;
  construction_year: number;
  construction_type: string;
  roof_type: string;
  wall_type: string;
  floor_type: string;
  condition: string;
  stories: number;
  description: string;
  replacement_cost_per_sqft?: number;
  depreciation_rate?: number;
  current_value?: number;
}

export const PropertyAssessmentGroup = () => {
  const { groupData, updateGroupData } = useGroup();
  
  // Extract data for each section
  const site = groupData.property_assessment?.site || {};
  const buildings = Array.isArray(groupData.property_assessment?.buildings) ? groupData.property_assessment.buildings : [];
  const utilities = groupData.property_assessment?.utilities || {};
  const environmental = groupData.property_assessment?.environmental || {};

  // Local state for UI
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['site', 'buildings'])
  );
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [isExtractingUtilities, setIsExtractingUtilities] = useState(false);
  const [utilityExtractionResults, setUtilityExtractionResults] = useState<any>(null);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Site data handlers
  const handleSiteInputChange = (field: string, value: any) => {
    updateGroupData('property_assessment', {
      site: { ...site, [field]: value }
    });
  };

  const handleSiteFeatureToggle = (feature: string) => {
    const features = site.site_features || [];
    const updatedFeatures = features.includes(feature)
      ? features.filter((f: string) => f !== feature)
      : [...features, feature];
    updateGroupData('property_assessment', {
      site: { ...site, site_features: updatedFeatures }
    });
  };

  // Building data handlers
  const addBuilding = () => {
    const newBuilding: Building = {
      id: Date.now().toString(),
      type: '',
      use: '',
      floor_area: 0,
      construction_year: new Date().getFullYear(),
      construction_type: '',
      roof_type: '',
      wall_type: '',
      floor_type: '',
      condition: '',
      stories: 1,
      description: ''
    };
    
    updateGroupData('property_assessment', {
      buildings: [...buildings, newBuilding]
    });
    setSelectedBuilding(buildings.length);
  };

  const updateBuilding = (index: number, field: string, value: any) => {
    const updatedBuildings = buildings.map((building: Building, i: number) => 
      i === index ? { ...building, [field]: value } : building
    );
    updateGroupData('property_assessment', { buildings: updatedBuildings });
  };

  const removeBuilding = (index: number) => {
    const updatedBuildings = buildings.filter((_, i: number) => i !== index);
    updateGroupData('property_assessment', { buildings: updatedBuildings });
    if (selectedBuilding === index) {
      setSelectedBuilding(null);
    } else if (selectedBuilding !== null && selectedBuilding > index) {
      setSelectedBuilding(selectedBuilding - 1);
    }
  };

  // Utilities data handlers
  const handleUtilityChange = (category: string, field: string, value: any) => {
    const categoryData = utilities[category] || {};
    updateGroupData('property_assessment', {
      utilities: {
        ...utilities,
        [category]: { ...categoryData, [field]: value }
      }
    });
  };

  const handleUtilityArrayChange = (category: string, field: string, values: string[]) => {
    const categoryData = utilities[category] || {};
    updateGroupData('property_assessment', {
      utilities: {
        ...utilities,
        [category]: { ...categoryData, [field]: values }
      }
    });
  };

  // Environmental data handlers
  const handleEnvironmentalChange = (field: string, value: any) => {
    updateGroupData('property_assessment', {
      environmental: { ...environmental, [field]: value }
    });
  };

  const handleEnvironmentalArrayChange = (field: string, values: string[]) => {
    updateGroupData('property_assessment', {
      environmental: { ...environmental, [field]: values }
    });
  };

  // AI Utilities Extraction
  const extractUtilities = async () => {
    setIsExtractingUtilities(true);
    try {
      const results = await ocrAPI.extractUtilities();
      setUtilityExtractionResults(results);
      
      if (results.success && results.data) {
        // Apply extracted utilities data
        const extractedUtilities = results.data;
        updateGroupData('property_assessment', {
          utilities: { ...utilities, ...extractedUtilities }
        });
      }
    } catch (error) {
      console.error('Error extracting utilities:', error);
    } finally {
      setIsExtractingUtilities(false);
    }
  };

  // Array input component for environmental factors
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

  const siteFeatureOptions = [
    'Level ground', 'Sloping ground', 'Corner property', 'Through road', 'Cul-de-sac',
    'Garden/Landscaping', 'Mature trees', 'Boundary wall', 'Gate/Entrance', 'Parking area',
    'Driveway', 'Security features', 'Scenic view', 'Waterfront', 'Agricultural potential'
  ];

  const telecomServices = ['Fixed line telephone', 'Internet/Broadband', 'Cable TV', 'Satellite TV', 'Mobile coverage'];
  const otherServices = ['Gas supply', 'Waste collection', 'Street lighting', 'Security services', 'Fire protection'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Assessment
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Complete assessment of site characteristics, buildings, utilities, and environmental factors. Data from AI analysis will be automatically populated where available.
        </p>
      </div>

      {/* Site Description Section */}
      <CollapsibleSection 
        id="site" 
        title="Site Characteristics & Description"
        bgColor="bg-blue-50" 
        borderColor="border-blue-200"
        titleColor="text-blue-900"
      >
        <div className="space-y-6">
          {/* Shape & Dimensions */}
          <div className="bg-white border border-blue-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-800 mb-4">Shape & Dimensions</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Shape</label>
                <select
                  value={site.shape || ''}
                  onChange={(e) => handleSiteInputChange('shape', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select shape...</option>
                  <option value="Regular rectangular">Regular Rectangular</option>
                  <option value="Irregular rectangular">Irregular Rectangular</option>
                  <option value="Square">Square</option>
                  <option value="Triangular">Triangular</option>
                  <option value="L-shaped">L-Shaped</option>
                  <option value="Circular">Circular</option>
                  <option value="Irregular">Irregular</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frontage (meters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={site.frontage || ''}
                  onChange={(e) => handleSiteInputChange('frontage', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 15.24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Depth (meters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={site.depth || ''}
                  onChange={(e) => handleSiteInputChange('depth', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 22.86"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aspect/Orientation</label>
                <select
                  value={site.aspect || ''}
                  onChange={(e) => handleSiteInputChange('aspect', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select orientation...</option>
                  <option value="North">North</option>
                  <option value="Northeast">Northeast</option>
                  <option value="East">East</option>
                  <option value="Southeast">Southeast</option>
                  <option value="South">South</option>
                  <option value="Southwest">Southwest</option>
                  <option value="West">West</option>
                  <option value="Northwest">Northwest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Topography */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Topography & Ground Levels</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topography</label>
                <select
                  value={site.topography || ''}
                  onChange={(e) => handleSiteInputChange('topography', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select topography...</option>
                  <option value="Level">Level</option>
                  <option value="Gently sloping">Gently Sloping</option>
                  <option value="Moderately sloping">Moderately Sloping</option>
                  <option value="Steeply sloping">Steeply Sloping</option>
                  <option value="Undulating">Undulating</option>
                  <option value="Terraced">Terraced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Level Relative to Road</label>
                <select
                  value={site.road_level || ''}
                  onChange={(e) => handleSiteInputChange('road_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select level...</option>
                  <option value="Same level">Same Level</option>
                  <option value="Above road">Above Road Level</option>
                  <option value="Below road">Below Road Level</option>
                </select>
              </div>
            </div>
          </div>

          {/* Soil Conditions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-4">Soil & Ground Conditions</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Soil Type</label>
                <select
                  value={site.soil_type || ''}
                  onChange={(e) => handleSiteInputChange('soil_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select soil type...</option>
                  <option value="Clay">Clay</option>
                  <option value="Sandy clay">Sandy Clay</option>
                  <option value="Loam">Loam</option>
                  <option value="Sandy loam">Sandy Loam</option>
                  <option value="Sand">Sand</option>
                  <option value="Rock">Rock/Laterite</option>
                  <option value="Fill">Fill/Made ground</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Drainage</label>
                <select
                  value={site.drainage || ''}
                  onChange={(e) => handleSiteInputChange('drainage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select drainage...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Very poor">Very Poor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Site Features */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-purple-800 mb-4">Site Features & Characteristics</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {siteFeatureOptions.map((feature) => (
                <label key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(site.site_features || []).includes(feature)}
                    onChange={() => handleSiteFeatureToggle(feature)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{feature}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Other Features</label>
              <input
                type="text"
                value={site.other_features || ''}
                onChange={(e) => handleSiteInputChange('other_features', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe any other notable site features..."
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Buildings Section */}
      <CollapsibleSection 
        id="buildings" 
        title="Buildings & Structures"
        bgColor="bg-green-50" 
        borderColor="border-green-200"
        titleColor="text-green-900"
      >
        <div className="space-y-4">
          {/* Buildings List */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-sm font-medium text-green-800">Property Buildings</h5>
              <button
                type="button"
                onClick={addBuilding}
                className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Building
              </button>
            </div>

            {buildings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No buildings added yet. Click "Add Building" to start.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {buildings.map((building: Building, index: number) => (
                  <div
                    key={building.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedBuilding === index
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                    }`}
                    onClick={() => setSelectedBuilding(index)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h6 className="text-sm font-medium text-gray-900">
                          {building.type || 'Untitled Building'} #{index + 1}
                        </h6>
                        <p className="text-xs text-gray-500 mt-1">
                          {building.floor_area ? `${building.floor_area} sqft` : 'No area specified'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {building.condition || 'Condition not specified'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBuilding(index);
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Building Details Form */}
            {selectedBuilding !== null && buildings[selectedBuilding] && (
              <div className="border-t border-green-200 pt-4">
                <h6 className="text-sm font-medium text-green-800 mb-4">
                  Building Details - {buildings[selectedBuilding].type || 'Building'} #{selectedBuilding + 1}
                </h6>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Building Type</label>
                    <select
                      value={buildings[selectedBuilding].type}
                      onChange={(e) => updateBuilding(selectedBuilding, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type...</option>
                      <option value="Residential house">Residential House</option>
                      <option value="Apartment building">Apartment Building</option>
                      <option value="Commercial building">Commercial Building</option>
                      <option value="Industrial building">Industrial Building</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Office building">Office Building</option>
                      <option value="Mixed use">Mixed Use</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Use</label>
                    <input
                      type="text"
                      value={buildings[selectedBuilding].use}
                      onChange={(e) => updateBuilding(selectedBuilding, 'use', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Single family residence"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor Area (sqft)</label>
                    <input
                      type="number"
                      value={buildings[selectedBuilding].floor_area}
                      onChange={(e) => updateBuilding(selectedBuilding, 'floor_area', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stories</label>
                    <input
                      type="number"
                      value={buildings[selectedBuilding].stories}
                      onChange={(e) => updateBuilding(selectedBuilding, 'stories', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      placeholder="e.g., 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Construction Year</label>
                    <input
                      type="number"
                      value={buildings[selectedBuilding].construction_year}
                      onChange={(e) => updateBuilding(selectedBuilding, 'construction_year', parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1800"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <select
                      value={buildings[selectedBuilding].condition}
                      onChange={(e) => updateBuilding(selectedBuilding, 'condition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select condition...</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Dilapidated">Dilapidated</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={buildings[selectedBuilding].description}
                      onChange={(e) => updateBuilding(selectedBuilding, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detailed description of the building..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Utilities Section */}
      <CollapsibleSection 
        id="utilities" 
        title="Utilities & Services"
        bgColor="bg-yellow-50" 
        borderColor="border-yellow-200"
        titleColor="text-yellow-900"
      >
        <div className="space-y-4">
          {/* AI Utilities Extraction */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h5 className="text-sm font-medium text-purple-800">🤖 AI-Powered Utilities Detection</h5>
              <button
                type="button"
                onClick={extractUtilities}
                disabled={isExtractingUtilities}
                className={`px-4 py-2 text-sm font-medium rounded-md border ${
                  isExtractingUtilities
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-300'
                }`}
              >
                {isExtractingUtilities ? 'Analyzing...' : 'Extract Utilities from Documents'}
              </button>
            </div>
            
            {utilityExtractionResults && (
              <div className="mt-3 p-3 bg-purple-100 rounded border border-purple-300">
                <p className="text-sm text-purple-800">
                  {utilityExtractionResults.success 
                    ? '✅ Utilities data extracted and applied successfully!'
                    : '❌ Failed to extract utilities data. Please fill manually.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Electricity */}
          <div className="bg-white border border-yellow-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-4">Electricity Supply</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                <select
                  value={utilities.electricity?.available || ''}
                  onChange={(e) => handleUtilityChange('electricity', 'available', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select availability...</option>
                  <option value="Available">Available</option>
                  <option value="Not available">Not Available</option>
                  <option value="Nearby">Nearby (can be connected)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Connection Type</label>
                <select
                  value={utilities.electricity?.type || ''}
                  onChange={(e) => handleUtilityChange('electricity', 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="Single phase">Single Phase</option>
                  <option value="Three phase">Three Phase</option>
                </select>
              </div>
            </div>
          </div>

          {/* Water Supply */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-800 mb-4">Water Supply</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Source</label>
                <select
                  value={utilities.water?.main_source || ''}
                  onChange={(e) => handleUtilityChange('water', 'main_source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select source...</option>
                  <option value="Piped water">Piped Water (NWSDB)</option>
                  <option value="Well water">Well Water</option>
                  <option value="Tube well">Tube Well</option>
                  <option value="Spring water">Spring Water</option>
                  <option value="Rainwater harvesting">Rainwater Harvesting</option>
                  <option value="No water source">No Water Source</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                <select
                  value={utilities.water?.quality || ''}
                  onChange={(e) => handleUtilityChange('water', 'quality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select quality...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Needs treatment">Needs Treatment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Telecommunications */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Telecommunications</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {telecomServices.map((service) => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(utilities.telecom?.services || []).includes(service)}
                    onChange={(e) => {
                      const services = utilities.telecom?.services || [];
                      const newServices = e.target.checked 
                        ? [...services, service]
                        : services.filter(s => s !== service);
                      handleUtilityArrayChange('telecom', 'services', newServices);
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{service}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Services */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-red-800 mb-4">Other Utilities & Services</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {otherServices.map((service) => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(utilities.other?.services || []).includes(service)}
                    onChange={(e) => {
                      const services = utilities.other?.services || [];
                      const newServices = e.target.checked 
                        ? [...services, service]
                        : services.filter(s => s !== service);
                      handleUtilityArrayChange('other', 'services', newServices);
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{service}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Environmental Section */}
      <CollapsibleSection 
        id="environmental" 
        title="Environmental Factors & Risks"
        bgColor="bg-red-50" 
        borderColor="border-red-200"
        titleColor="text-red-900"
      >
        <div className="space-y-4">
          {/* NBRO & Risk Assessment */}
          <div className="bg-white border border-red-300 rounded-lg p-4">
            <h5 className="text-sm font-medium text-red-800 mb-4">NBRO & Risk Assessment</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NBRO Clearance</label>
                <select
                  value={environmental.nbro_clearance || ''}
                  onChange={(e) => handleEnvironmentalChange('nbro_clearance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select status...</option>
                  <option value="Required and obtained">Required and Obtained</option>
                  <option value="Required but not obtained">Required but Not Obtained</option>
                  <option value="Not required">Not Required</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Landslide Risk</label>
                <select
                  value={environmental.landslide_risk || ''}
                  onChange={(e) => handleEnvironmentalChange('landslide_risk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select risk level...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very high">Very High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Flood Risk</label>
                <select
                  value={environmental.flood_risk || ''}
                  onChange={(e) => handleEnvironmentalChange('flood_risk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select risk level...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very high">Very High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Erosion Risk</label>
                <select
                  value={environmental.erosion_risk || ''}
                  onChange={(e) => handleEnvironmentalChange('erosion_risk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select risk level...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very high">Very High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Environmental Quality */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-800 mb-4">Environmental Quality</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Air Quality</label>
                <select
                  value={environmental.air_quality || ''}
                  onChange={(e) => handleEnvironmentalChange('air_quality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select quality...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Poor">Poor</option>
                  <option value="Very poor">Very Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Noise Level</label>
                <select
                  value={environmental.noise_level || ''}
                  onChange={(e) => handleEnvironmentalChange('noise_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select level...</option>
                  <option value="Very quiet">Very Quiet</option>
                  <option value="Quiet">Quiet</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Noisy">Noisy</option>
                  <option value="Very noisy">Very Noisy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Lists */}
          <div className="space-y-4">
            <ArrayInput
              label="Natural Hazards"
              value={environmental.natural_hazards || []}
              onChange={(values) => handleEnvironmentalArrayChange('natural_hazards', values)}
              placeholder="e.g., Landslides, Flooding, Cyclones"
            />
            
            <ArrayInput
              label="Environmental Restrictions"
              value={environmental.environmental_restrictions || []}
              onChange={(values) => handleEnvironmentalArrayChange('environmental_restrictions', values)}
              placeholder="e.g., Protected area, Buffer zone"
            />

            <ArrayInput
              label="Pollution Sources"
              value={environmental.pollution_sources || []}
              onChange={(values) => handleEnvironmentalArrayChange('pollution_sources', values)}
              placeholder="e.g., Traffic, Industrial, Construction"
            />
          </div>

          {/* Assessment Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-800 mb-4">Environmental Assessment Summary</h5>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overall Environmental Impact</label>
              <select
                value={environmental.overall_impact || ''}
                onChange={(e) => handleEnvironmentalChange('overall_impact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-4"
              >
                <option value="">Select impact level...</option>
                <option value="Very positive">Very Positive</option>
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
                <option value="Very negative">Very Negative</option>
              </select>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Notes</label>
              <textarea
                value={environmental.assessment_notes || ''}
                onChange={(e) => handleEnvironmentalChange('assessment_notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detailed environmental assessment notes and recommendations..."
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};