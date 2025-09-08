import { useWizard } from '../WizardProvider';

export const SiteStep = () => {
  const { state, updateStepData } = useWizard();
  const site = state.data.site;

  const handleInputChange = (field: string, value: any) => {
    updateStepData('site', { [field]: value });
  };

  const handleFeatureToggle = (feature: string) => {
    const features = site.site_features || [];
    const updatedFeatures = features.includes(feature)
      ? features.filter((f: string) => f !== feature)
      : [...features, feature];
    updateStepData('site', { site_features: updatedFeatures });
  };

  const siteFeatureOptions = [
    'Level ground',
    'Sloping ground',
    'Corner property',
    'Through road',
    'Cul-de-sac',
    'Garden/Landscaping',
    'Mature trees',
    'Boundary wall',
    'Gate/Entrance',
    'Parking area',
    'Driveway',
    'Security features',
    'Scenic view',
    'Waterfront',
    'Agricultural potential'
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Site Description
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Describe the physical characteristics of the land including shape, topography, soil conditions, and notable features.
        </p>
      </div>

      {/* Site Shape & Dimensions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Shape & Dimensions</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="site-shape" className="block text-sm font-medium text-gray-700 mb-2">
              Site Shape
            </label>
            <select
              id="site-shape"
              value={site.shape || ''}
              onChange={(e) => handleInputChange('shape', e.target.value)}
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
            <label htmlFor="frontage" className="block text-sm font-medium text-gray-700 mb-2">
              Frontage (meters)
            </label>
            <input
              type="number"
              id="frontage"
              step="0.01"
              value={site.frontage || ''}
              onChange={(e) => handleInputChange('frontage', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 15.24"
            />
          </div>

          <div>
            <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-2">
              Depth (meters)
            </label>
            <input
              type="number"
              id="depth"
              step="0.01"
              value={site.depth || ''}
              onChange={(e) => handleInputChange('depth', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 22.86"
            />
          </div>

          <div>
            <label htmlFor="aspect" className="block text-sm font-medium text-gray-700 mb-2">
              Aspect/Orientation
            </label>
            <select
              id="aspect"
              value={site.aspect || ''}
              onChange={(e) => handleInputChange('aspect', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select orientation...</option>
              <option value="North facing">North Facing</option>
              <option value="South facing">South Facing</option>
              <option value="East facing">East Facing</option>
              <option value="West facing">West Facing</option>
              <option value="Northeast facing">Northeast Facing</option>
              <option value="Northwest facing">Northwest Facing</option>
              <option value="Southeast facing">Southeast Facing</option>
              <option value="Southwest facing">Southwest Facing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Topography & Levels */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Topography & Ground Levels</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="topography" className="block text-sm font-medium text-gray-700 mb-2">
              Site Topography
            </label>
            <select
              id="topography"
              value={site.topography || ''}
              onChange={(e) => handleInputChange('topography', e.target.value)}
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
            <label htmlFor="gradient" className="block text-sm font-medium text-gray-700 mb-2">
              Gradient (%)
            </label>
            <input
              type="number"
              id="gradient"
              step="0.1"
              value={site.gradient || ''}
              onChange={(e) => handleInputChange('gradient', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5.0"
            />
          </div>

          <div>
            <label htmlFor="level-road" className="block text-sm font-medium text-gray-700 mb-2">
              Level Relative to Road
            </label>
            <select
              id="level-road"
              value={site.level_relative_to_road || ''}
              onChange={(e) => handleInputChange('level_relative_to_road', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select level...</option>
              <option value="Same level">Same Level</option>
              <option value="Above road level">Above Road Level</option>
              <option value="Below road level">Below Road Level</option>
              <option value="Significantly above">Significantly Above Road Level</option>
              <option value="Significantly below">Significantly Below Road Level</option>
            </select>
          </div>

          <div>
            <label htmlFor="elevation-difference" className="block text-sm font-medium text-gray-700 mb-2">
              Elevation Difference (meters)
            </label>
            <input
              type="number"
              id="elevation-difference"
              step="0.1"
              value={site.elevation_difference || ''}
              onChange={(e) => handleInputChange('elevation_difference', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.5 (+ for above, - for below)"
            />
          </div>
        </div>
      </div>

      {/* Soil & Ground Conditions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Soil & Ground Conditions</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="soil-type" className="block text-sm font-medium text-gray-700 mb-2">
              Soil Type
            </label>
            <select
              id="soil-type"
              value={site.soil_type || ''}
              onChange={(e) => handleInputChange('soil_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select soil type...</option>
              <option value="Clay">Clay</option>
              <option value="Sandy clay">Sandy Clay</option>
              <option value="Clay loam">Clay Loam</option>
              <option value="Loam">Loam</option>
              <option value="Sandy loam">Sandy Loam</option>
              <option value="Sand">Sand</option>
              <option value="Rock/Rocky">Rock/Rocky</option>
              <option value="Fill/Made ground">Fill/Made Ground</option>
              <option value="Marshy/Swampy">Marshy/Swampy</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label htmlFor="drainage" className="block text-sm font-medium text-gray-700 mb-2">
              Natural Drainage
            </label>
            <select
              id="drainage"
              value={site.drainage || ''}
              onChange={(e) => handleInputChange('drainage', e.target.value)}
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

          <div>
            <label htmlFor="flood-risk" className="block text-sm font-medium text-gray-700 mb-2">
              Flood Risk
            </label>
            <select
              id="flood-risk"
              value={site.flood_risk || ''}
              onChange={(e) => handleInputChange('flood_risk', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select flood risk...</option>
              <option value="None">No Flood Risk</option>
              <option value="Low">Low Risk</option>
              <option value="Moderate">Moderate Risk</option>
              <option value="High">High Risk</option>
              <option value="Severe">Severe Risk</option>
            </select>
          </div>

          <div>
            <label htmlFor="bearing-capacity" className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Bearing Capacity
            </label>
            <select
              id="bearing-capacity"
              value={site.bearing_capacity || ''}
              onChange={(e) => handleInputChange('bearing_capacity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select capacity...</option>
              <option value="Excellent">Excellent (Hard rock/firm clay)</option>
              <option value="Good">Good (Compact soil)</option>
              <option value="Fair">Fair (Medium dense soil)</option>
              <option value="Poor">Poor (Soft clay/loose sand)</option>
              <option value="Very poor">Very Poor (Requires special foundations)</option>
              <option value="Unknown">Unknown (Soil test required)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="soil-notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Soil/Ground Notes
          </label>
          <textarea
            id="soil-notes"
            value={site.soil_notes || ''}
            onChange={(e) => handleInputChange('soil_notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional observations about soil conditions, previous site investigations, etc."
          />
        </div>
      </div>

      {/* Site Features & Characteristics */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Site Features & Characteristics</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {siteFeatureOptions.map((feature) => (
            <label key={feature} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={(site.site_features || []).includes(feature)}
                onChange={() => handleFeatureToggle(feature)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">{feature}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="other-features" className="block text-sm font-medium text-gray-700 mb-2">
            Other Notable Features
          </label>
          <input
            type="text"
            id="other-features"
            value={site.other_features || ''}
            onChange={(e) => handleInputChange('other_features', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any other significant site features or characteristics..."
          />
        </div>
      </div>

      {/* Environmental Factors */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Environmental Factors</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="noise-level" className="block text-sm font-medium text-gray-700 mb-2">
              Noise Level
            </label>
            <select
              id="noise-level"
              value={site.noise_level || ''}
              onChange={(e) => handleInputChange('noise_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select noise level...</option>
              <option value="Very quiet">Very Quiet</option>
              <option value="Quiet">Quiet</option>
              <option value="Moderate">Moderate</option>
              <option value="Noisy">Noisy</option>
              <option value="Very noisy">Very Noisy</option>
            </select>
          </div>

          <div>
            <label htmlFor="air-quality" className="block text-sm font-medium text-gray-700 mb-2">
              Air Quality
            </label>
            <select
              id="air-quality"
              value={site.air_quality || ''}
              onChange={(e) => handleInputChange('air_quality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select air quality...</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor (Near industrial/heavy traffic)</option>
              <option value="Very poor">Very Poor</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="environmental-issues" className="block text-sm font-medium text-gray-700 mb-2">
              Environmental Concerns/Issues
            </label>
            <textarea
              id="environmental-issues"
              value={site.environmental_issues || ''}
              onChange={(e) => handleInputChange('environmental_issues', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any environmental concerns such as contamination, hazardous materials, protected species, etc."
            />
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Site Accessibility</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pedestrian-access" className="block text-sm font-medium text-gray-700 mb-2">
              Pedestrian Access
            </label>
            <select
              id="pedestrian-access"
              value={site.pedestrian_access || ''}
              onChange={(e) => handleInputChange('pedestrian_access', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select access...</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Difficult">Difficult</option>
              <option value="Very difficult">Very Difficult</option>
            </select>
          </div>

          <div>
            <label htmlFor="vehicle-access" className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Access
            </label>
            <select
              id="vehicle-access"
              value={site.vehicle_access || ''}
              onChange={(e) => handleInputChange('vehicle_access', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select access...</option>
              <option value="Direct access">Direct Access from Road</option>
              <option value="Shared access">Shared Access/Right of Way</option>
              <option value="Via private road">Via Private Road</option>
              <option value="Limited access">Limited Vehicle Access</option>
              <option value="No vehicle access">No Vehicle Access</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="access-notes" className="block text-sm font-medium text-gray-700 mb-2">
            Accessibility Notes
          </label>
          <textarea
            id="access-notes"
            value={site.access_notes || ''}
            onChange={(e) => handleInputChange('access_notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional details about site accessibility, restrictions, or special requirements..."
          />
        </div>
      </div>
    </div>
  );
};