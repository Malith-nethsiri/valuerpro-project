import { useWizard } from '../WizardProvider';

export const PlanningStep = () => {
  const { state, updateStepData } = useWizard();
  const planning = state.data.planning;

  const handleInputChange = (field: string, value: any) => {
    updateStepData('planning', { [field]: value });
  };

  const handleRestrictionToggle = (restriction: string) => {
    const restrictions = planning.restrictions || [];
    const updatedRestrictions = restrictions.includes(restriction)
      ? restrictions.filter((r: string) => r !== restriction)
      : [...restrictions, restriction];
    updateStepData('planning', { restrictions: updatedRestrictions });
  };

  const restrictionOptions = [
    'Building height restriction',
    'Setback requirements',
    'FAR/Plot ratio limitations',
    'Coverage ratio limits',
    'Parking requirements',
    'Landscape requirements',
    'Architectural style controls',
    'Environmental restrictions',
    'Heritage/Archaeological restrictions',
    'Flood plain restrictions',
    'Slope protection requirements',
    'Road reservation',
    'Utility easements',
    'Right of way',
    'Coastal reservation'
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Planning & Zoning Information
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Document the planning and zoning regulations that affect the property, including permitted uses, building restrictions, and development potential.
        </p>
      </div>

      {/* Zoning Classification */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Zoning & Land Use Classification</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zoning Classification
            </label>
            <select
              value={planning.zoning_classification || ''}
              onChange={(e) => handleInputChange('zoning_classification', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select zoning...</option>
              <option value="residential_low">Residential - Low Density</option>
              <option value="residential_medium">Residential - Medium Density</option>
              <option value="residential_high">Residential - High Density</option>
              <option value="commercial">Commercial</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="industrial_light">Industrial - Light</option>
              <option value="industrial_heavy">Industrial - Heavy</option>
              <option value="agricultural">Agricultural</option>
              <option value="institutional">Institutional</option>
              <option value="recreational">Recreational/Open Space</option>
              <option value="special_economic_zone">Special Economic Zone</option>
              <option value="tourism_zone">Tourism Zone</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Authority
            </label>
            <select
              value={planning.planning_authority || ''}
              onChange={(e) => handleInputChange('planning_authority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select authority...</option>
              <option value="upa">Urban Planning Authority (UPA)</option>
              <option value="municipal_council">Municipal Council</option>
              <option value="urban_council">Urban Council</option>
              <option value="pradeshiya_sabha">Pradeshiya Sabha</option>
              <option value="surdec">SURDEC</option>
              <option value="boi">Board of Investment (BOI)</option>
              <option value="cea">Central Environmental Authority</option>
              <option value="other">Other Authority</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Plan Reference
            </label>
            <input
              type="text"
              value={planning.development_plan || ''}
              onChange={(e) => handleInputChange('development_plan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Colombo Metropolitan Regional Structure Plan, Local Development Plan"
            />
          </div>
        </div>
      </div>

      {/* Permitted Uses */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Permitted Uses & Development Rights</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Permitted Use
            </label>
            <select
              value={planning.current_use || ''}
              onChange={(e) => handleInputChange('current_use', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select current use...</option>
              <option value="single_dwelling">Single Dwelling</option>
              <option value="multi_dwelling">Multi-dwelling/Apartments</option>
              <option value="commercial">Commercial</option>
              <option value="office">Office</option>
              <option value="retail">Retail</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
              <option value="institutional">Institutional</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="vacant_land">Vacant Land</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Potential
            </label>
            <select
              value={planning.development_potential || ''}
              onChange={(e) => handleInputChange('development_potential', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select potential...</option>
              <option value="high">High (Significant development possible)</option>
              <option value="moderate">Moderate (Some development possible)</option>
              <option value="limited">Limited (Minor improvements only)</option>
              <option value="restricted">Restricted (Minimal development)</option>
              <option value="none">No Development Potential</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Permitted Uses
            </label>
            <textarea
              value={planning.additional_uses || ''}
              onChange={(e) => handleInputChange('additional_uses', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List other uses that may be permitted under current zoning (e.g., home office, bed & breakfast, etc.)"
            />
          </div>
        </div>
      </div>

      {/* Building Regulations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Building Regulations & Controls</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Building Height (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.max_height || ''}
              onChange={(e) => handleInputChange('max_height', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 12.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Floors
            </label>
            <input
              type="number"
              min="1"
              value={planning.max_floors || ''}
              onChange={(e) => handleInputChange('max_floors', parseInt(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor Area Ratio (FAR)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.floor_area_ratio || ''}
              onChange={(e) => handleInputChange('floor_area_ratio', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Coverage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={planning.building_coverage || ''}
              onChange={(e) => handleInputChange('building_coverage', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Front Setback (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.front_setback || ''}
              onChange={(e) => handleInputChange('front_setback', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 3.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Side Setbacks (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.side_setbacks || ''}
              onChange={(e) => handleInputChange('side_setbacks', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rear Setback (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.rear_setback || ''}
              onChange={(e) => handleInputChange('rear_setback', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parking Requirements
            </label>
            <input
              type="text"
              value={planning.parking_requirements || ''}
              onChange={(e) => handleInputChange('parking_requirements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1 space per dwelling unit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landscaping Requirements (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={planning.landscaping_percentage || ''}
              onChange={(e) => handleInputChange('landscaping_percentage', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 20"
            />
          </div>
        </div>
      </div>

      {/* Restrictions & Easements */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Planning Restrictions & Easements</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Applicable Restrictions:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {restrictionOptions.map((restriction) => (
              <label key={restriction} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={(planning.restrictions || []).includes(restriction)}
                  onChange={() => handleRestrictionToggle(restriction)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{restriction}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Road Reservation (if applicable)
            </label>
            <input
              type="text"
              value={planning.road_reservation || ''}
              onChange={(e) => handleInputChange('road_reservation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2m road reservation on north boundary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utility Easements
            </label>
            <input
              type="text"
              value={planning.utility_easements || ''}
              onChange={(e) => handleInputChange('utility_easements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Power line easement along east boundary"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Other Restrictions & Easements
          </label>
          <textarea
            value={planning.other_restrictions || ''}
            onChange={(e) => handleInputChange('other_restrictions', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detail any other planning restrictions, easements, or encumbrances that affect the property's development potential or use..."
          />
        </div>
      </div>

      {/* Approvals & Compliance */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Approvals & Compliance Status</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Approval Status
            </label>
            <select
              value={planning.planning_approval || ''}
              onChange={(e) => handleInputChange('planning_approval', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="approved">Planning Permission Approved</option>
              <option value="pending">Planning Application Pending</option>
              <option value="required">Planning Permission Required</option>
              <option value="not_required">Planning Permission Not Required</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Approval Status
            </label>
            <select
              value={planning.building_approval || ''}
              onChange={(e) => handleInputChange('building_approval', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="approved">Building Plan Approved</option>
              <option value="pending">Building Application Pending</option>
              <option value="required">Building Approval Required</option>
              <option value="unauthorized">Unauthorized Construction</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environmental Clearance
            </label>
            <select
              value={planning.environmental_clearance || ''}
              onChange={(e) => handleInputChange('environmental_clearance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="not_required">Not Required</option>
              <option value="obtained">Environmental Clearance Obtained</option>
              <option value="required">Environmental Clearance Required</option>
              <option value="pending">Environmental Assessment Pending</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Rating
            </label>
            <select
              value={planning.compliance_rating || ''}
              onChange={(e) => handleInputChange('compliance_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rating...</option>
              <option value="fully_compliant">Fully Compliant</option>
              <option value="mostly_compliant">Mostly Compliant</option>
              <option value="minor_violations">Minor Violations</option>
              <option value="major_violations">Major Violations</option>
              <option value="non_compliant">Non-Compliant</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compliance Notes & Issues
          </label>
          <textarea
            value={planning.compliance_notes || ''}
            onChange={(e) => handleInputChange('compliance_notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Note any compliance issues, violations, or requirements for obtaining necessary approvals..."
          />
        </div>
      </div>

      {/* Impact Assessment */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          📋 Planning Impact on Value
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Feasibility
            </label>
            <select
              value={planning.development_feasibility || ''}
              onChange={(e) => handleInputChange('development_feasibility', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select feasibility...</option>
              <option value="highly_feasible">Highly Feasible</option>
              <option value="feasible">Feasible</option>
              <option value="moderately_feasible">Moderately Feasible</option>
              <option value="limited_feasibility">Limited Feasibility</option>
              <option value="not_feasible">Not Feasible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Impact on Value
            </label>
            <select
              value={planning.value_impact || ''}
              onChange={(e) => handleInputChange('value_impact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select impact...</option>
              <option value="significant_positive">Significant Positive (+20% to +50%)</option>
              <option value="positive">Positive (+10% to +20%)</option>
              <option value="neutral">Neutral (0%)</option>
              <option value="negative">Negative (-10% to -20%)</option>
              <option value="significant_negative">Significant Negative (-20% or more)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Planning Assessment Summary
          </label>
          <textarea
            value={planning.planning_summary || ''}
            onChange={(e) => handleInputChange('planning_summary', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Summarize how planning and zoning factors affect the property's current use, development potential, and market value..."
          />
        </div>
      </div>
    </div>
  );
};