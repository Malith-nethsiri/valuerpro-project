import { useWizard } from '../WizardProvider';

export const UtilitiesStep = () => {
  const { state, updateStepData } = useWizard();
  const utilities = state.data.utilities;

  const handleInputChange = (field: string, value: any) => {
    updateStepData('utilities', { [field]: value });
  };

  const handleUtilityChange = (utility: string, field: string, value: any) => {
    const utilityData = utilities[utility] || {};
    updateStepData('utilities', { 
      [utility]: { ...utilityData, [field]: value }
    });
  };

  const getUtilityData = (utility: string) => {
    return utilities[utility] || {};
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Utilities & Services
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Document all utility services available to the property including electricity, water, telecommunications, and drainage systems.
        </p>
      </div>

      {/* Electricity */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Electricity Supply</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Electricity Available
            </label>
            <select
              value={getUtilityData('electricity').available || ''}
              onChange={(e) => handleUtilityChange('electricity', 'available', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              <option value="yes">Yes - Connected</option>
              <option value="nearby">Yes - Nearby (Can be connected)</option>
              <option value="no">No - Not Available</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supply Type
            </label>
            <select
              value={getUtilityData('electricity').type || ''}
              onChange={(e) => handleUtilityChange('electricity', 'type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select type...</option>
              <option value="single_phase">Single Phase</option>
              <option value="three_phase">Three Phase</option>
              <option value="industrial">Industrial Supply</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Status
            </label>
            <select
              value={getUtilityData('electricity').connection_status || ''}
              onChange={(e) => handleUtilityChange('electricity', 'connection_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="connected">Connected & Active</option>
              <option value="meter_installed">Meter Installed (Inactive)</option>
              <option value="wiring_ready">Wiring Ready</option>
              <option value="not_connected">Not Connected</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Electricity Provider & Notes
            </label>
            <input
              type="text"
              value={getUtilityData('electricity').notes || ''}
              onChange={(e) => handleUtilityChange('electricity', 'notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CEB, LECO - Account No: 123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Average Bill (Rs.)
            </label>
            <input
              type="number"
              value={getUtilityData('electricity').monthly_cost || ''}
              onChange={(e) => handleUtilityChange('electricity', 'monthly_cost', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5000"
            />
          </div>
        </div>
      </div>

      {/* Water Supply */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Water Supply</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Water Source
            </label>
            <select
              value={getUtilityData('water').main_source || ''}
              onChange={(e) => handleUtilityChange('water', 'main_source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select source...</option>
              <option value="mains">Mains Water (NWSDB/Local Authority)</option>
              <option value="community_well">Community Well</option>
              <option value="private_well">Private Well/Tube Well</option>
              <option value="borehole">Borehole/Deep Well</option>
              <option value="spring">Natural Spring</option>
              <option value="rainwater">Rainwater Harvesting</option>
              <option value="none">No Water Source</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Water Quality
            </label>
            <select
              value={getUtilityData('water').quality || ''}
              onChange={(e) => handleUtilityChange('water', 'quality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select quality...</option>
              <option value="excellent">Excellent (Treated/Filtered)</option>
              <option value="good">Good (Direct consumption)</option>
              <option value="fair">Fair (Minor treatment needed)</option>
              <option value="poor">Poor (Requires filtration/boiling)</option>
              <option value="not_potable">Not Suitable for Drinking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supply Reliability
            </label>
            <select
              value={getUtilityData('water').reliability || ''}
              onChange={(e) => handleUtilityChange('water', 'reliability', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select reliability...</option>
              <option value="continuous">Continuous (24/7)</option>
              <option value="frequent">Frequent (Daily supply)</option>
              <option value="intermittent">Intermittent (Few days per week)</option>
              <option value="seasonal">Seasonal variations</option>
              <option value="unreliable">Unreliable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Capacity (Liters)
            </label>
            <input
              type="number"
              value={getUtilityData('water').storage_capacity || ''}
              onChange={(e) => handleUtilityChange('water', 'storage_capacity', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Water Supply Notes
            </label>
            <input
              type="text"
              value={getUtilityData('water').notes || ''}
              onChange={(e) => handleUtilityChange('water', 'notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional details about water supply, storage tanks, pumps, etc."
            />
          </div>
        </div>
      </div>

      {/* Telecommunications */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Telecommunications</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={getUtilityData('telecom').fixed_line || false}
                onChange={(e) => handleUtilityChange('telecom', 'fixed_line', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Fixed Line Telephone</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={getUtilityData('telecom').mobile_coverage || false}
                onChange={(e) => handleUtilityChange('telecom', 'mobile_coverage', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Mobile Coverage</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={getUtilityData('telecom').broadband || false}
                onChange={(e) => handleUtilityChange('telecom', 'broadband', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Broadband Internet</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={getUtilityData('telecom').fiber_optic || false}
                onChange={(e) => handleUtilityChange('telecom', 'fiber_optic', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Fiber Optic</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={getUtilityData('telecom').cable_tv || false}
                onChange={(e) => handleUtilityChange('telecom', 'cable_tv', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Cable TV</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internet Speed (Mbps)
            </label>
            <input
              type="number"
              value={getUtilityData('telecom').internet_speed || ''}
              onChange={(e) => handleUtilityChange('telecom', 'internet_speed', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Providers
            </label>
            <input
              type="text"
              value={getUtilityData('telecom').providers || ''}
              onChange={(e) => handleUtilityChange('telecom', 'providers', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., SLT, Dialog, Mobitel"
            />
          </div>
        </div>
      </div>

      {/* Sewerage & Drainage */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Sewerage & Drainage</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sewerage System
            </label>
            <select
              value={getUtilityData('sewerage').type || ''}
              onChange={(e) => handleUtilityChange('sewerage', 'type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select system...</option>
              <option value="mains_sewer">Mains Sewerage</option>
              <option value="septic_tank">Septic Tank</option>
              <option value="soakage_pit">Soakage Pit</option>
              <option value="biogas_plant">Biogas Plant</option>
              <option value="composting_toilet">Composting Toilet</option>
              <option value="none">No Sewerage System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={getUtilityData('sewerage').condition || ''}
              onChange={(e) => handleUtilityChange('sewerage', 'condition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select condition...</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor (Needs maintenance)</option>
              <option value="failing">Failing (Needs replacement)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surface Water Drainage
            </label>
            <select
              value={getUtilityData('drainage').surface || ''}
              onChange={(e) => handleUtilityChange('drainage', 'surface', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select drainage...</option>
              <option value="excellent">Excellent (No water logging)</option>
              <option value="good">Good (Minor pooling after heavy rain)</option>
              <option value="fair">Fair (Some water retention)</option>
              <option value="poor">Poor (Regular flooding/pooling)</option>
              <option value="very_poor">Very Poor (Severe drainage issues)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storm Water Management
            </label>
            <select
              value={getUtilityData('drainage').storm_water || ''}
              onChange={(e) => handleUtilityChange('drainage', 'storm_water', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select management...</option>
              <option value="municipal_drains">Municipal Storm Drains</option>
              <option value="natural_drainage">Natural Drainage</option>
              <option value="retention_ponds">Retention Ponds/Systems</option>
              <option value="inadequate">Inadequate</option>
              <option value="none">No Storm Water Management</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drainage Notes
            </label>
            <textarea
              value={getUtilityData('drainage').notes || ''}
              onChange={(e) => handleUtilityChange('drainage', 'notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional details about drainage systems, issues, or improvements..."
            />
          </div>
        </div>
      </div>

      {/* Other Utilities */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Other Utilities & Services</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').gas_connection || false}
                onChange={(e) => handleUtilityChange('other', 'gas_connection', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Gas Connection (LP Gas)</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').garbage_collection || false}
                onChange={(e) => handleUtilityChange('other', 'garbage_collection', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Municipal Garbage Collection</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').street_lighting || false}
                onChange={(e) => handleUtilityChange('other', 'street_lighting', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Street Lighting</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').security_services || false}
                onChange={(e) => handleUtilityChange('other', 'security_services', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Security Services</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').postal_service || false}
                onChange={(e) => handleUtilityChange('other', 'postal_service', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Postal Service</span>
            </label>
          </div>

          <div>
            <label className="inline-flex items-center mb-3">
              <input
                type="checkbox"
                checked={getUtilityData('other').fire_hydrant || false}
                onChange={(e) => handleUtilityChange('other', 'fire_hydrant', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Fire Hydrant/Fire Services</span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Utilities & Services
          </label>
          <textarea
            value={getUtilityData('other').additional_notes || ''}
            onChange={(e) => handleUtilityChange('other', 'additional_notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any other utilities, services, or infrastructure available to the property..."
          />
        </div>
      </div>

      {/* Utility Impact on Value */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          💡 Utility Impact Assessment
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Utility Rating
            </label>
            <select
              value={utilities.overall_rating || ''}
              onChange={(e) => handleInputChange('overall_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rating...</option>
              <option value="excellent">Excellent (All major utilities available)</option>
              <option value="very_good">Very Good (Most utilities available)</option>
              <option value="good">Good (Basic utilities available)</option>
              <option value="fair">Fair (Limited utilities)</option>
              <option value="poor">Poor (Few utilities available)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Impact on Property Value
            </label>
            <select
              value={utilities.value_impact || ''}
              onChange={(e) => handleInputChange('value_impact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select impact...</option>
              <option value="significant_positive">Significant Positive Impact (+15% to +25%)</option>
              <option value="positive">Positive Impact (+5% to +15%)</option>
              <option value="neutral">Neutral Impact (0%)</option>
              <option value="negative">Negative Impact (-5% to -15%)</option>
              <option value="significant_negative">Significant Negative Impact (-15% to -30%)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Utility Assessment Summary
          </label>
          <textarea
            value={utilities.assessment_summary || ''}
            onChange={(e) => handleInputChange('assessment_summary', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Summarize the impact of available utilities on the property's marketability and value..."
          />
        </div>
      </div>
    </div>
  );
};