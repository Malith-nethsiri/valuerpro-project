import { useWizard } from '../WizardProvider';
import { useState } from 'react';
import { mapsAPI } from '@/lib/api';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const LocalityStep = () => {
  const { state, updateStepData } = useWizard();
  const locality = state.data.locality;
  const location = state.data.location;
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesData, setAmenitiesData] = useState<any>(null);

  const handleInputChange = (field: string, value: any) => {
    updateStepData('locality', { [field]: value });
  };

  const handleAmenityToggle = (amenity: string) => {
    const amenities = locality.nearby_amenities || [];
    const updatedAmenities = amenities.includes(amenity)
      ? amenities.filter((a: string) => a !== amenity)
      : [...amenities, amenity];
    updateStepData('locality', { nearby_amenities: updatedAmenities });
  };

  const detectNearbyAmenities = async () => {
    if (!location?.latitude || !location?.longitude) {
      alert('Property coordinates are required. Please complete the Location step first.');
      return;
    }

    setAmenitiesLoading(true);
    try {
      const response = await mapsAPI.findNearbyAmenities(
        location.latitude,
        location.longitude,
        5000 // 5km radius
      );

      setAmenitiesData(response);

      // Auto-populate distance fields based on API results
      const amenities = response.amenities || {};
      
      // Find nearest school
      if (amenities.schools?.places?.length > 0) {
        const nearestSchool = amenities.schools.places[0];
        handleInputChange('distance_to_school', nearestSchool.distance_km);
      }

      // Find nearest hospital
      if (amenities.hospitals?.places?.length > 0) {
        const nearestHospital = amenities.hospitals.places[0];
        handleInputChange('distance_to_hospital', nearestHospital.distance_km);
      }

      // Find nearest shopping center/supermarket
      const shoppingPlaces = [
        ...(amenities.supermarkets?.places || []),
      ];
      if (shoppingPlaces.length > 0) {
        const nearestShopping = shoppingPlaces.sort((a, b) => a.distance_km - b.distance_km)[0];
        handleInputChange('distance_to_shopping', nearestShopping.distance_km);
      }

      // Auto-select amenities in checklist based on findings
      const foundAmenities: string[] = [];
      
      if (amenities.schools?.places?.length > 0) {
        foundAmenities.push('Schools (Primary)', 'Schools (Secondary)');
      }
      if (amenities.hospitals?.places?.length > 0) {
        foundAmenities.push('Hospitals/Medical Centers');
      }
      if (amenities.banks?.places?.length > 0) {
        foundAmenities.push('Banks/Financial Services');
      }
      if (amenities.supermarkets?.places?.length > 0) {
        foundAmenities.push('Markets/Supermarkets');
      }
      if (amenities.pharmacies?.places?.length > 0) {
        foundAmenities.push('Markets/Supermarkets'); // Pharmacies often found in shopping areas
      }
      if (amenities.restaurants?.places?.length > 0) {
        foundAmenities.push('Restaurants/Hotels');
      }
      if (amenities.places_of_worship?.places?.length > 0) {
        foundAmenities.push('Religious Places');
      }
      if (amenities.train_stations?.places?.length > 0) {
        foundAmenities.push('Railway Station');
      }
      if (amenities.bus_stations?.places?.length > 0) {
        foundAmenities.push('Public Transport Hub');
      }

      // Merge with existing amenities
      const existingAmenities = locality.nearby_amenities || [];
      const updatedAmenities = [...new Set([...existingAmenities, ...foundAmenities])];
      updateStepData('locality', { nearby_amenities: updatedAmenities });

      // Set overall amenity rating based on findings
      const totalAmenityTypes = Object.keys(amenities).length;
      const amenitiesWithPlaces = Object.values(amenities).filter((category: any) => 
        category.places && category.places.length > 0
      ).length;

      let rating = 'fair';
      if (amenitiesWithPlaces >= 8) rating = 'excellent';
      else if (amenitiesWithPlaces >= 6) rating = 'very_good';
      else if (amenitiesWithPlaces >= 4) rating = 'good';
      
      handleInputChange('amenity_rating', rating);

    } catch (error) {
      console.error('Failed to detect nearby amenities:', error);
      alert('Failed to detect nearby amenities. Please check your internet connection and try again.');
    } finally {
      setAmenitiesLoading(false);
    }
  };

  const nearbyAmenityOptions = [
    'Schools (Primary)',
    'Schools (Secondary)',
    'Universities/Colleges',
    'Hospitals/Medical Centers',
    'Banks/Financial Services',
    'Shopping Centers/Malls',
    'Markets/Supermarkets',
    'Religious Places',
    'Government Offices',
    'Post Office',
    'Police Station',
    'Fire Station',
    'Public Parks',
    'Sports Facilities',
    'Restaurants/Hotels',
    'Public Transport Hub',
    'Railway Station',
    'Airport',
    'Industrial Areas',
    'Commercial Districts'
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Locality & Neighborhood Analysis
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide a comprehensive analysis of the locality, neighborhood characteristics, market trends, and factors affecting property values in the area.
        </p>
      </div>

      {/* Neighborhood Character */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Neighborhood Character & Demographics</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area Type
            </label>
            <select
              value={locality.area_type || ''}
              onChange={(e) => handleInputChange('area_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select area type...</option>
              <option value="urban_core">Urban Core/City Center</option>
              <option value="urban_residential">Urban Residential</option>
              <option value="suburban">Suburban</option>
              <option value="semi_urban">Semi-Urban</option>
              <option value="rural">Rural</option>
              <option value="industrial">Industrial Area</option>
              <option value="commercial">Commercial District</option>
              <option value="mixed_development">Mixed Development</option>
              <option value="planned_community">Planned Community/Estate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Stage
            </label>
            <select
              value={locality.development_stage || ''}
              onChange={(e) => handleInputChange('development_stage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select stage...</option>
              <option value="well_established">Well Established</option>
              <option value="developing">Developing</option>
              <option value="emerging">Emerging Area</option>
              <option value="declining">Declining</option>
              <option value="regenerating">Regenerating/Revitalizing</option>
              <option value="new_development">New Development</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Socioeconomic Level
            </label>
            <select
              value={locality.socioeconomic_level || ''}
              onChange={(e) => handleInputChange('socioeconomic_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select level...</option>
              <option value="high_income">High Income/Premium</option>
              <option value="upper_middle">Upper Middle Class</option>
              <option value="middle_class">Middle Class</option>
              <option value="lower_middle">Lower Middle Class</option>
              <option value="low_income">Low Income</option>
              <option value="mixed_income">Mixed Income Levels</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Mix
            </label>
            <select
              value={locality.property_mix || ''}
              onChange={(e) => handleInputChange('property_mix', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select mix...</option>
              <option value="predominantly_residential">Predominantly Residential</option>
              <option value="mixed_residential_commercial">Mixed Residential & Commercial</option>
              <option value="commercial_dominant">Commercial Dominant</option>
              <option value="industrial_mixed">Industrial & Mixed Use</option>
              <option value="luxury_residential">Luxury Residential</option>
              <option value="affordable_housing">Affordable Housing Focus</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neighborhood Description
          </label>
          <textarea
            value={locality.neighborhood_description || ''}
            onChange={(e) => handleInputChange('neighborhood_description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the general character of the neighborhood, housing types, street layout, overall condition, and notable features..."
          />
        </div>
      </div>

      {/* Nearby Amenities */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-green-900">Nearby Amenities & Services</h4>
          <button
            type="button"
            onClick={detectNearbyAmenities}
            disabled={amenitiesLoading || !location?.latitude || !location?.longitude}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {amenitiesLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            )}
            {amenitiesLoading ? 'Detecting...' : 'Auto-Detect Amenities'}
          </button>
        </div>

        {!location?.latitude || !location?.longitude ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex">
              <MapPinIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Complete the Location step first to enable automatic amenity detection.
              </p>
            </div>
          </div>
        ) : null}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Available Amenities (within 5km):
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {nearbyAmenityOptions.map((amenity) => (
              <label key={amenity} className="inline-flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={(locality.nearby_amenities || []).includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities Detection Results */}
        {amenitiesData && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">🏢 Detected Amenities (5km radius)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {Object.entries(amenitiesData.amenities || {}).map(([category, data]: [string, any]) => (
                data.places && data.places.length > 0 && (
                  <div key={category} className="bg-gray-50 rounded p-3">
                    <div className="font-medium text-gray-900 mb-2 capitalize">
                      {category.replace('_', ' ')} ({data.count})
                    </div>
                    <div className="space-y-1">
                      {data.places.slice(0, 3).map((place: any, idx: number) => (
                        <div key={idx} className="text-gray-600">
                          <div className="font-medium truncate" title={place.name}>
                            {place.name}
                          </div>
                          <div className="text-gray-500">
                            {place.distance_km}km • {place.vicinity}
                          </div>
                        </div>
                      ))}
                      {data.places.length > 3 && (
                        <div className="text-gray-500 text-xs">
                          +{data.places.length - 3} more places
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              📍 Searched within {amenitiesData.radius}m radius of property location
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance to Nearest School (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={locality.distance_to_school || ''}
              onChange={(e) => handleInputChange('distance_to_school', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 0.8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance to Nearest Hospital (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={locality.distance_to_hospital || ''}
              onChange={(e) => handleInputChange('distance_to_hospital', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance to Shopping Center (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={locality.distance_to_shopping || ''}
              onChange={(e) => handleInputChange('distance_to_shopping', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Amenity Rating
            </label>
            <select
              value={locality.amenity_rating || ''}
              onChange={(e) => handleInputChange('amenity_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rating...</option>
              <option value="excellent">Excellent (All major amenities within 2km)</option>
              <option value="very_good">Very Good (Most amenities easily accessible)</option>
              <option value="good">Good (Basic amenities available)</option>
              <option value="fair">Fair (Limited amenities)</option>
              <option value="poor">Poor (Few amenities, long distances)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Market Trends */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Local Market Trends & Conditions</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Activity Level
            </label>
            <select
              value={locality.market_activity || ''}
              onChange={(e) => handleInputChange('market_activity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select activity level...</option>
              <option value="very_active">Very Active (High turnover, quick sales)</option>
              <option value="active">Active (Regular transactions)</option>
              <option value="moderate">Moderate (Steady but slow)</option>
              <option value="slow">Slow (Limited transactions)</option>
              <option value="very_slow">Very Slow (Rare transactions)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Trend (Last 2 Years)
            </label>
            <select
              value={locality.price_trend || ''}
              onChange={(e) => handleInputChange('price_trend', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select trend...</option>
              <option value="rapidly_increasing">Rapidly Increasing (15%+ per year)</option>
              <option value="increasing">Increasing (5-15% per year)</option>
              <option value="stable">Stable (0-5% per year)</option>
              <option value="declining">Declining (-5% to -15% per year)</option>
              <option value="rapidly_declining">Rapidly Declining (-15%+ per year)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typical Selling Period
            </label>
            <select
              value={locality.selling_period || ''}
              onChange={(e) => handleInputChange('selling_period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select period...</option>
              <option value="under_3_months">Under 3 months</option>
              <option value="3_to_6_months">3-6 months</option>
              <option value="6_to_12_months">6-12 months</option>
              <option value="12_to_24_months">1-2 years</option>
              <option value="over_24_months">Over 2 years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rental Market Activity
            </label>
            <select
              value={locality.rental_market || ''}
              onChange={(e) => handleInputChange('rental_market', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select activity...</option>
              <option value="very_strong">Very Strong (High demand, low vacancy)</option>
              <option value="strong">Strong (Good demand)</option>
              <option value="moderate">Moderate (Balanced market)</option>
              <option value="weak">Weak (High vacancy, low demand)</option>
              <option value="very_weak">Very Weak (Oversupplied)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Typical Price Range (Per Perch) Rs.
            </label>
            <input
              type="text"
              value={locality.price_range_per_perch || ''}
              onChange={(e) => handleInputChange('price_range_per_perch', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 800,000 - 1,200,000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rental Yield Range (%)
            </label>
            <input
              type="text"
              value={locality.rental_yield_range || ''}
              onChange={(e) => handleInputChange('rental_yield_range', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 4-6%"
            />
          </div>
        </div>
      </div>

      {/* Growth & Development */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Future Growth & Development</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Future Growth Potential
            </label>
            <select
              value={locality.growth_potential || ''}
              onChange={(e) => handleInputChange('growth_potential', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select potential...</option>
              <option value="very_high">Very High (Major developments planned)</option>
              <option value="high">High (Good growth prospects)</option>
              <option value="moderate">Moderate (Steady development)</option>
              <option value="limited">Limited (Slow growth expected)</option>
              <option value="declining">Declining (Area in decline)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Infrastructure Development
            </label>
            <select
              value={locality.infrastructure_development || ''}
              onChange={(e) => handleInputChange('infrastructure_development', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="major_planned">Major Infrastructure Planned</option>
              <option value="improvements_underway">Improvements Underway</option>
              <option value="well_developed">Well Developed</option>
              <option value="adequate">Adequate Infrastructure</option>
              <option value="needs_improvement">Needs Improvement</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Planned Developments & Projects
          </label>
          <textarea
            value={locality.planned_developments || ''}
            onChange={(e) => handleInputChange('planned_developments', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe any major planned developments, infrastructure projects, or initiatives that may affect property values (e.g., new roads, shopping centers, transport links)..."
          />
        </div>
      </div>

      {/* Issues & Concerns */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Area Issues & Concerns</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Safety & Security Level
            </label>
            <select
              value={locality.safety_level || ''}
              onChange={(e) => handleInputChange('safety_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select level...</option>
              <option value="very_safe">Very Safe (Low crime, good security)</option>
              <option value="safe">Safe (Generally secure area)</option>
              <option value="moderately_safe">Moderately Safe (Some concerns)</option>
              <option value="safety_concerns">Safety Concerns (Crime issues)</option>
              <option value="high_risk">High Risk (Significant safety issues)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traffic Congestion
            </label>
            <select
              value={locality.traffic_level || ''}
              onChange={(e) => handleInputChange('traffic_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select level...</option>
              <option value="minimal">Minimal (Free flowing traffic)</option>
              <option value="light">Light (Occasional delays)</option>
              <option value="moderate">Moderate (Regular congestion)</option>
              <option value="heavy">Heavy (Frequent congestion)</option>
              <option value="severe">Severe (Chronic traffic problems)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Environmental & Social Issues
          </label>
          <textarea
            value={locality.environmental_issues || ''}
            onChange={(e) => handleInputChange('environmental_issues', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Note any environmental issues (noise, pollution, flooding), social problems, or other factors that negatively impact the area..."
          />
        </div>
      </div>

      {/* Market Analysis Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          📊 Locality Impact Assessment
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Locality Rating
            </label>
            <select
              value={locality.overall_rating || ''}
              onChange={(e) => handleInputChange('overall_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rating...</option>
              <option value="premium">Premium Location (Top 10%)</option>
              <option value="excellent">Excellent (Top 25%)</option>
              <option value="very_good">Very Good (Above average)</option>
              <option value="good">Good (Average)</option>
              <option value="fair">Fair (Below average)</option>
              <option value="poor">Poor (Bottom 25%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact on Property Value
            </label>
            <select
              value={locality.value_impact || ''}
              onChange={(e) => handleInputChange('value_impact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select impact...</option>
              <option value="very_positive">Very Positive (+20% to +50%)</option>
              <option value="positive">Positive (+10% to +20%)</option>
              <option value="neutral">Neutral (0%)</option>
              <option value="negative">Negative (-10% to -20%)</option>
              <option value="very_negative">Very Negative (-20% or more)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Locality Analysis Summary
          </label>
          <textarea
            value={locality.market_analysis_summary || ''}
            onChange={(e) => handleInputChange('market_analysis_summary', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide a comprehensive summary of how the locality characteristics, market conditions, amenities, and growth prospects affect the property's marketability and value. Include key factors that support or detract from the property's value..."
          />
        </div>
      </div>
    </div>
  );
};