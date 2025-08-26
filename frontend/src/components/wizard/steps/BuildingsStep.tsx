import { useState } from 'react';
import { useWizard } from '../WizardProvider';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

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

export const BuildingsStep = () => {
  const { state, updateStepData } = useWizard();
  const buildings = state.data.buildings || [];
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);

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
    
    updateStepData('buildings', [...buildings, newBuilding]);
    setSelectedBuilding(buildings.length);
  };

  const updateBuilding = (index: number, field: string, value: any) => {
    const updatedBuildings = buildings.map((building: Building, i: number) => 
      i === index ? { ...building, [field]: value } : building
    );
    updateStepData('buildings', updatedBuildings);
  };

  const removeBuilding = (index: number) => {
    const updatedBuildings = buildings.filter((_: Building, i: number) => i !== index);
    updateStepData('buildings', updatedBuildings);
    if (selectedBuilding === index) {
      setSelectedBuilding(null);
    } else if (selectedBuilding && selectedBuilding > index) {
      setSelectedBuilding(selectedBuilding - 1);
    }
  };

  const calculateBuildingValue = (building: Building) => {
    if (building.replacement_cost_per_sqft && building.floor_area) {
      const replacementCost = building.replacement_cost_per_sqft * building.floor_area;
      const currentAge = new Date().getFullYear() - building.construction_year;
      const depreciationRate = building.depreciation_rate || 2; // 2% per year default
      const totalDepreciation = Math.min(currentAge * depreciationRate, 80); // Max 80% depreciation
      const currentValue = replacementCost * (1 - totalDepreciation / 100);
      return Math.max(currentValue, replacementCost * 0.2); // Minimum 20% of replacement cost
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Buildings & Structures
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Document all buildings and structures on the property including their physical characteristics, condition, and estimated values.
        </p>
      </div>

      {/* Buildings List */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-blue-900">Property Buildings</h4>
          <button
            type="button"
            onClick={addBuilding}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Building
          </button>
        </div>

        {buildings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No buildings added yet.</p>
            <p className="text-sm">Click "Add Building" to document structures on the property.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buildings.map((building: Building, index: number) => (
              <div
                key={building.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedBuilding === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedBuilding(selectedBuilding === index ? null : index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">
                    {building.type || `Building ${index + 1}`}
                  </h5>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBuilding(index);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {building.floor_area ? `${building.floor_area} sq ft` : 'Area not specified'}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  {building.construction_year && `Built ${building.construction_year}`}
                </p>
                <p className="text-sm text-gray-600">
                  Condition: {building.condition || 'Not specified'}
                </p>
                {building.replacement_cost_per_sqft && (
                  <p className="text-sm font-medium text-green-600 mt-2">
                    Est. Value: Rs. {calculateBuildingValue(building).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Building Details Form */}
      {selectedBuilding !== null && buildings[selectedBuilding] && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-6">
            Building Details - {buildings[selectedBuilding].type || `Building ${selectedBuilding + 1}`}
          </h4>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Type *
                </label>
                <select
                  value={buildings[selectedBuilding].type || ''}
                  onChange={(e) => updateBuilding(selectedBuilding, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="Single family house">Single Family House</option>
                  <option value="Apartment building">Apartment Building</option>
                  <option value="Commercial building">Commercial Building</option>
                  <option value="Office building">Office Building</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Factory">Factory</option>
                  <option value="Shop/Store">Shop/Store</option>
                  <option value="Garage">Garage</option>
                  <option value="Outhouse">Outhouse</option>
                  <option value="Guard house">Guard House</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Use
                </label>
                <select
                  value={buildings[selectedBuilding].use || ''}
                  onChange={(e) => updateBuilding(selectedBuilding, 'use', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select use...</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Office">Office</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Storage">Storage</option>
                  <option value="Mixed use">Mixed Use</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Stories
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={buildings[selectedBuilding].stories || 1}
                  onChange={(e) => updateBuilding(selectedBuilding, 'stories', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Area (sq ft) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={buildings[selectedBuilding].floor_area || ''}
                  onChange={(e) => updateBuilding(selectedBuilding, 'floor_area', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Total floor area"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Construction Year
                </label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={buildings[selectedBuilding].construction_year || ''}
                  onChange={(e) => updateBuilding(selectedBuilding, 'construction_year', parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Condition *
                </label>
                <select
                  value={buildings[selectedBuilding].condition || ''}
                  onChange={(e) => updateBuilding(selectedBuilding, 'condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select condition...</option>
                  <option value="Excellent">Excellent (New/Like New)</option>
                  <option value="Very Good">Very Good (Well Maintained)</option>
                  <option value="Good">Good (Minor Wear)</option>
                  <option value="Fair">Fair (Some Deterioration)</option>
                  <option value="Poor">Poor (Needs Major Repairs)</option>
                  <option value="Very Poor">Very Poor (Structurally Unsound)</option>
                </select>
              </div>
            </div>

            {/* Construction Details */}
            <div className="border-t border-gray-200 pt-6">
              <h5 className="text-md font-medium text-gray-900 mb-4">Construction Details</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Construction Type
                  </label>
                  <select
                    value={buildings[selectedBuilding].construction_type || ''}
                    onChange={(e) => updateBuilding(selectedBuilding, 'construction_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="Reinforced concrete">Reinforced Concrete</option>
                    <option value="Brick and mortar">Brick and Mortar</option>
                    <option value="Concrete block">Concrete Block</option>
                    <option value="Steel frame">Steel Frame</option>
                    <option value="Timber frame">Timber Frame</option>
                    <option value="Cabook">Cabook (Traditional)</option>
                    <option value="Mud and wattle">Mud and Wattle</option>
                    <option value="Mixed construction">Mixed Construction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wall Type
                  </label>
                  <select
                    value={buildings[selectedBuilding].wall_type || ''}
                    onChange={(e) => updateBuilding(selectedBuilding, 'wall_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select wall type...</option>
                    <option value="Brick walls">Brick Walls</option>
                    <option value="Concrete block walls">Concrete Block Walls</option>
                    <option value="RC walls">RC Walls</option>
                    <option value="Timber walls">Timber Walls</option>
                    <option value="Cabook walls">Cabook Walls</option>
                    <option value="Mud walls">Mud Walls</option>
                    <option value="Mixed walls">Mixed Wall Types</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roof Type
                  </label>
                  <select
                    value={buildings[selectedBuilding].roof_type || ''}
                    onChange={(e) => updateBuilding(selectedBuilding, 'roof_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select roof type...</option>
                    <option value="Concrete slab">Concrete Slab</option>
                    <option value="Clay tiles">Clay Tiles</option>
                    <option value="Asbestos sheets">Asbestos Sheets</option>
                    <option value="Metal sheets">Metal Sheets</option>
                    <option value="Timber and tiles">Timber and Tiles</option>
                    <option value="Cadjan/Coconut palm">Cadjan/Coconut Palm</option>
                    <option value="Mixed roofing">Mixed Roofing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Type
                  </label>
                  <select
                    value={buildings[selectedBuilding].floor_type || ''}
                    onChange={(e) => updateBuilding(selectedBuilding, 'floor_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select floor type...</option>
                    <option value="Concrete floor">Concrete Floor</option>
                    <option value="Tiled floor">Tiled Floor</option>
                    <option value="Timber floor">Timber Floor</option>
                    <option value="Granite floor">Granite Floor</option>
                    <option value="Terrazzo floor">Terrazzo Floor</option>
                    <option value="Earth floor">Earth Floor</option>
                    <option value="Mixed flooring">Mixed Flooring</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Valuation Details */}
            <div className="border-t border-gray-200 pt-6">
              <h5 className="text-md font-medium text-gray-900 mb-4">Building Valuation</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Replacement Cost per Sq Ft (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={buildings[selectedBuilding].replacement_cost_per_sqft || ''}
                    onChange={(e) => updateBuilding(selectedBuilding, 'replacement_cost_per_sqft', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Depreciation Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={buildings[selectedBuilding].depreciation_rate || 2}
                    onChange={(e) => updateBuilding(selectedBuilding, 'depreciation_rate', parseFloat(e.target.value) || 2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Current Value (Rs.)
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                    Rs. {calculateBuildingValue(buildings[selectedBuilding]).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description
              </label>
              <textarea
                value={buildings[selectedBuilding].description || ''}
                onChange={(e) => updateBuilding(selectedBuilding, 'description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide detailed description of the building including layout, special features, fixtures, fittings, and any notable characteristics..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {buildings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-green-900 mb-3">Buildings Summary</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Buildings:</span>
              <span className="ml-2">{buildings.length}</span>
            </div>
            <div>
              <span className="font-medium">Total Floor Area:</span>
              <span className="ml-2">
                {buildings.reduce((total: number, building: Building) => total + (building.floor_area || 0), 0).toLocaleString()} sq ft
              </span>
            </div>
            <div>
              <span className="font-medium">Total Estimated Value:</span>
              <span className="ml-2 text-green-700 font-medium">
                Rs. {buildings.reduce((total: number, building: Building) => total + calculateBuildingValue(building), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">
          🤖 AI Building Analysis
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Upload building photos or floor plans for automated feature detection and condition assessment.
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Upload Building Photos
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Upload Floor Plans
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Get Cost Estimates
          </button>
        </div>
      </div>
    </div>
  );
};