import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGroup } from '../GroupProvider';
import { mapsAPI } from '@/lib/api';
import { ValidatedInput } from '@/components/ui/ValidatedInput';
import { 
  MapIcon, 
  EyeIcon, 
  MapPinIcon, 
  ArrowsPointingOutIcon,
  ChevronUpIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

export const LocationMappingGroup = () => {
  const { groupData, updateGroupData } = useGroup();
  const locationData = groupData.location_mapping.location_details || {};
  
  // Memoize the location object to prevent recalculation on every render
  const location = useMemo(() => ({
    // Map the nested structure to flat access for compatibility
    address: locationData.components || {},
    latitude: locationData.coordinates?.latitude || '',
    longitude: locationData.coordinates?.longitude || '',
    formatted_address: locationData.formatted_address || '',
    // Add direct properties that might exist at the location_details level
    district: locationData.district || '',
    province: locationData.province || '',
    gn_division: locationData.gn_division || '',
    ds_division: locationData.ds_division || '',
    road_access: locationData.road_access || '',
    road_width: locationData.road_width || '',
    nearest_landmark: locationData.nearest_landmark || '',
    directions: locationData.directions || '',
    public_transport: locationData.public_transport || '',
    distance_to_town: locationData.distance_to_town || '',
    distance_to_colombo: locationData.distance_to_colombo || '',
    nearest_railway_station: locationData.nearest_railway_station || '',
    // Additional fields from route data
    route_distance: locationData.route_distance || '',
    route_duration: locationData.route_duration || '',
    route_start_address: locationData.route_start_address || ''
  }), [locationData]);
  
  // Local state for UI functionality
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [mapsAvailable, setMapsAvailable] = useState<boolean | null>(null);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [generatedRouteData, setGeneratedRouteData] = useState<any>(null);
  const [routeOriginCity, setRouteOriginCity] = useState<string>('Colombo');
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [calculatedDistances, setCalculatedDistances] = useState<any>(null);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [staticMapUrl, setStaticMapUrl] = useState<string>('');
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['address', 'coordinates', 'access'])
  );

  // Check Maps API availability on component mount
  useEffect(() => {
    const checkMapsAvailability = async () => {
      try {
        const status = await mapsAPI.getStatus();
        setMapsAvailable(status.available);
      } catch (error) {
        console.error('Failed to check Maps API status:', error);
        setMapsAvailable(false);
      }
    };
    
    checkMapsAvailability();
  }, []);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };


  // Reverse geocoding function to get address from coordinates
  const reverseGeocodeLocation = async () => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (!lat || !lng || !mapsAvailable) {
      alert('Please enter valid coordinates first and ensure Maps API is available.');
      return;
    }

    setIsReverseGeocoding(true);
    try {
      const addressData = await mapsAPI.reverseGeocode(lat, lng);
      
      if (addressData.error) {
        alert(`Reverse geocoding failed: ${addressData.error}`);
        return;
      }

      // Populate address fields from the reverse geocoding result
      const components = addressData.components || {};
      
      // Update location_details with proper structure
      const updatedLocationDetails = {
        ...locationData,
        components: {
          ...locationData.components,
          city: components.city || locationData.components?.city || '',
          postal_code: components.postal_code || locationData.components?.postal_code || '',
          street: components.area || locationData.components?.street || '',
          district: components.district || locationData.components?.district || '',
          province: components.province || locationData.components?.province || ''
        },
        formatted_address: addressData.formatted_address,
        // Also maintain top-level properties for compatibility
        district: components.district || locationData.district || '',
        province: components.province || locationData.province || ''
      };

      updateGroupData('location_mapping', {
        location_details: updatedLocationDetails
      });

      alert('Address populated successfully from coordinates! Please review and adjust as needed.');
      
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      alert(`Failed to get address from coordinates: ${error.message || 'Unknown error'}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Generate route description and directions
  const generateRouteDescription = async () => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    const nearestCity = routeOriginCity || location.address?.city || 'Colombo';
    
    if (!lat || !lng || !mapsAvailable) {
      alert('Please enter valid coordinates first and ensure Maps API is available.');
      return;
    }

    setIsGeneratingRoute(true);
    try {
      const routeData = await mapsAPI.getRouteDescription(lat, lng, nearestCity);
      
      if (routeData.error) {
        alert(`Route generation failed: ${routeData.error}`);
        return;
      }

      // Store the route data for display
      setGeneratedRouteData(routeData);

      // Extract numeric distance for distance fields
      let distanceKm = null;
      if (routeData.distance) {
        const distanceMatch = routeData.distance.match(/(\d+\.?\d*)\s*km/i);
        if (distanceMatch) {
          distanceKm = parseFloat(distanceMatch[1]);
        }
      }

      // Update the location data with route information
      const updateData: any = {
        directions: routeData.description || location.directions || '',
        // Store additional route information
        route_distance: routeData.distance,
        route_duration: routeData.duration,
        route_start_address: routeData.start_address,
      };

      // If the route was generated from a major city and we have distance data
      if (distanceKm && nearestCity.toLowerCase() === 'colombo') {
        updateData.distance_to_colombo = distanceKm;
      } else if (distanceKm && !location.distance_to_town) {
        // If no town distance is set, use the generated distance
        updateData.distance_to_town = distanceKm;
      }

      // Update location_details with route data
      const updatedLocationDetails = { ...locationData, ...updateData };
      updateGroupData('location_mapping', {
        location_details: updatedLocationDetails
      });

      alert('Route description generated successfully! You can edit the text if needed.');
      
    } catch (error: any) {
      console.error('Route generation error:', error);
      alert(`Failed to generate route: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  // Calculate distances to key locations using Distance Matrix API
  const calculateDistances = async () => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (!lat || !lng || !mapsAvailable) {
      alert('Please enter valid coordinates first and ensure Maps API is available.');
      return;
    }

    const propertyCoords = `${lat},${lng}`;
    const keyLocations = [
      'Colombo, Sri Lanka',
      'Kandy, Sri Lanka', 
      'Galle, Sri Lanka',
      'Jaffna, Sri Lanka',
      'Kurunegala, Sri Lanka',
      'Anuradhapura, Sri Lanka',
      'Ratnapura, Sri Lanka',
      'Negombo, Sri Lanka',
      'Matara, Sri Lanka'
    ];

    setIsCalculatingDistances(true);
    try {
      const distanceData = await mapsAPI.calculateDistanceMatrix(
        [propertyCoords], // Origin: property location
        keyLocations,     // Destinations: key cities
        'driving',        // Travel mode
        'metric'          // Units
      );
      
      if (distanceData.error) {
        alert(`Distance calculation failed: ${distanceData.error}`);
        return;
      }

      // Store the distance data
      setCalculatedDistances(distanceData);

      // Auto-populate distance fields
      if (distanceData.distances && distanceData.distances[0]) {
        const distances = distanceData.distances[0].destinations;
        
        // Find Colombo distance and auto-populate
        const colomboDistance = distances.find(d => 
          d.destination.toLowerCase().includes('colombo') && d.status === 'OK'
        );
        
        if (colomboDistance && colomboDistance.distance) {
          const distanceKm = parseFloat(colomboDistance.distance.text.replace(/[^\d.]/g, ''));
          if (!isNaN(distanceKm)) {
            const updatedLocationDetails = { 
              ...locationData, 
              distance_to_colombo: distanceKm 
            };
            updateGroupData('location_mapping', {
              location_details: updatedLocationDetails
            });
          }
        }
      }

      alert('Distances calculated successfully! Check the distance information panel below.');
      
    } catch (error: any) {
      console.error('Distance calculation error:', error);
      alert(`Failed to calculate distances: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  // Generate static map image
  const generateStaticMap = async (selectedMapType?: string) => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    const currentMapType = selectedMapType || mapType;
    
    if (!lat || !lng || !mapsAvailable) {
      alert('Please enter valid coordinates first and ensure Maps API is available.');
      return;
    }

    setIsGeneratingMap(true);
    try {
      const mapData = await mapsAPI.generateStaticMap(lat, lng, {
        zoom: 15,
        width: 600,
        height: 400,
        mapType: currentMapType
      });
      
      if (mapData.error) {
        alert(`Map generation failed: ${mapData.error}`);
        return;
      }

      setStaticMapUrl(mapData.map_url);
      
    } catch (error: any) {
      console.error('Map generation error:', error);
      alert(`Failed to generate map: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingMap(false);
    }
  };

  // Handle map type change
  const handleMapTypeChange = (newMapType: string) => {
    setMapType(newMapType);
    if (staticMapUrl) {
      generateStaticMap(newMapType);
    }
  };

  // Open external Google Maps
  const openGoogleMaps = () => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (!lat || !lng) {
      alert('Please enter valid coordinates first.');
      return;
    }

    const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},15z`;
    window.open(googleMapsUrl, '_blank');
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
          className={`w-full p-4 text-left flex items-center justify-between hover:bg-opacity-80`}
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
          Location Verification & Mapping
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Complete location verification including address details, GPS coordinates, mapping, and access information. All data from AI analysis will be automatically populated where available.
        </p>
      </div>

      {/* Property Address */}
      <CollapsibleSection 
        id="address" 
        title="Property Address"
        bgColor="bg-blue-50" 
        borderColor="border-blue-200"
        titleColor="text-blue-900"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <ValidatedInput
              fieldName="house_number"
              label="House/Building Number & Name"
              value={location.address?.house_number || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    house_number: value
                  }
                }
              })}
              placeholder="e.g., No. 123, Lotus Villa"
            />
          </div>

          <div className="md:col-span-2">
            <ValidatedInput
              fieldName="street"
              label="Street/Road Name"
              value={location.address?.street || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    street: value
                  }
                }
              })}
              placeholder="e.g., Galle Road"
            />
          </div>

          <div>
            <ValidatedInput
              fieldName="city"
              label="City/Town"
              value={location.address?.city || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    city: value
                  }
                }
              })}
              placeholder="e.g., Colombo"
              required
            />
          </div>

          <div>
            <ValidatedInput
              fieldName="postal_code"
              label="Postal Code"
              value={location.address?.postal_code || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    postal_code: value
                  }
                }
              })}
              placeholder="e.g., 00300"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Administrative Divisions */}
      <CollapsibleSection 
        id="divisions" 
        title="Administrative Divisions"
        bgColor="bg-green-50" 
        borderColor="border-green-200"
        titleColor="text-green-900"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <ValidatedInput
              fieldName="gn_division"
              label="Grama Niladhari Division"
              value={location.gn_division || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  gn_division: value
                }
              })}
              placeholder="e.g., Bambalapitiya"
            />
          </div>

          <div>
            <ValidatedInput
              fieldName="ds_division"
              label="Divisional Secretariat"
              value={location.ds_division || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  ds_division: value
                }
              })}
              placeholder="e.g., Colombo"
            />
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
              District *
            </label>
            <select
              id="district"
              name="district"
              value={location.district || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    district: e.target.value
                  },
                  // Also set at the top level for compatibility
                  district: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select District...</option>
              <option value="Colombo">Colombo</option>
              <option value="Gampaha">Gampaha</option>
              <option value="Kalutara">Kalutara</option>
              <option value="Kandy">Kandy</option>
              <option value="Matale">Matale</option>
              <option value="Nuwara Eliya">Nuwara Eliya</option>
              <option value="Galle">Galle</option>
              <option value="Matara">Matara</option>
              <option value="Hambantota">Hambantota</option>
              <option value="Jaffna">Jaffna</option>
              <option value="Kilinochchi">Kilinochchi</option>
              <option value="Mannar">Mannar</option>
              <option value="Vavuniya">Vavuniya</option>
              <option value="Mullaitivu">Mullaitivu</option>
              <option value="Batticaloa">Batticaloa</option>
              <option value="Ampara">Ampara</option>
              <option value="Trincomalee">Trincomalee</option>
              <option value="Kurunegala">Kurunegala</option>
              <option value="Puttalam">Puttalam</option>
              <option value="Anuradhapura">Anuradhapura</option>
              <option value="Polonnaruwa">Polonnaruwa</option>
              <option value="Badulla">Badulla</option>
              <option value="Moneragala">Moneragala</option>
              <option value="Ratnapura">Ratnapura</option>
              <option value="Kegalle">Kegalle</option>
            </select>
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
              Province *
            </label>
            <select
              id="province"
              name="province"
              value={location.province || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  components: {
                    ...locationData.components,
                    province: e.target.value
                  },
                  // Also set at the top level for compatibility
                  province: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Province...</option>
              <option value="Western">Western Province</option>
              <option value="Central">Central Province</option>
              <option value="Southern">Southern Province</option>
              <option value="Northern">Northern Province</option>
              <option value="Eastern">Eastern Province</option>
              <option value="North Western">North Western Province</option>
              <option value="North Central">North Central Province</option>
              <option value="Uva">Uva Province</option>
              <option value="Sabaragamuwa">Sabaragamuwa Province</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* GPS Coordinates */}
      <CollapsibleSection 
        id="coordinates" 
        title="GPS Coordinates & Mapping"
        bgColor="bg-yellow-50" 
        borderColor="border-yellow-200"
        titleColor="text-yellow-900"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <ValidatedInput
              fieldName="latitude"
              label="Latitude"
              value={location.latitude || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  coordinates: {
                    ...locationData.coordinates,
                    latitude: value
                  }
                }
              })}
              placeholder="e.g., 6.9271"
              type="number"
            />
          </div>

          <div>
            <ValidatedInput
              fieldName="longitude"
              label="Longitude"
              value={location.longitude || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  coordinates: {
                    ...locationData.coordinates,
                    longitude: value
                  }
                }
              })}
              placeholder="e.g., 79.8612"
              type="number"
            />
          </div>

          <div className="flex justify-end">
            {mapsAvailable && (
              <button
                type="button"
                onClick={reverseGeocodeLocation}
                disabled={isReverseGeocoding || !location.latitude || !location.longitude}
                className={`px-4 py-2 text-sm font-medium rounded-md border ${
                  isReverseGeocoding || !location.latitude || !location.longitude
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white text-green-700 hover:bg-green-50 border-green-300 hover:border-green-400'
                }`}
                title="Get address information from coordinates using Google Maps"
              >
                {isReverseGeocoding ? 'Getting Address...' : '📍 Get Address'}
              </button>
            )}
          </div>
        </div>

        {/* Interactive Map Display */}
        <div className="bg-white border border-yellow-300 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h5 className="text-sm font-medium text-yellow-900">
              🗺️ Interactive Location Map
            </h5>
            {mapsAvailable && (
              <button
                type="button"
                onClick={() => generateStaticMap()}
                disabled={isGeneratingMap || !location.latitude || !location.longitude}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                  isGeneratingMap || !location.latitude || !location.longitude
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isGeneratingMap ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <MapPinIcon className="h-4 w-4 mr-2" />
                )}
                {isGeneratingMap ? 'Loading...' : 'Generate Map'}
              </button>
            )}
          </div>

          {staticMapUrl ? (
            <div className="space-y-3">
              {/* Map Type Selector */}
              <div className="flex gap-2">
                <label className="text-sm font-medium text-yellow-700 mr-2">View:</label>
                {[
                  { value: 'roadmap', label: 'Road' },
                  { value: 'satellite', label: 'Satellite' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'terrain', label: 'Terrain' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleMapTypeChange(type.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-md border ${
                      mapType === type.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="bg-white border border-yellow-300 rounded-lg overflow-hidden">
                  <img
                    src={staticMapUrl}
                    alt="Property Location Map"
                    className="w-full h-auto max-w-full"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-md p-2">
                    <div className="text-xs text-gray-600">
                      📍 {location.latitude}, {location.longitude}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openGoogleMaps}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Full Map
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                  >
                    <ArrowsPointingOutIcon className="h-4 w-4 mr-2" />
                    Enlarge Map
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 text-center">
              <MapPinIcon className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-yellow-700 mb-3">
                Enter GPS coordinates above and click "Generate Map" to view location
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Access & Directions */}
      <CollapsibleSection 
        id="access" 
        title="Access & Directions"
        bgColor="bg-purple-50" 
        borderColor="border-purple-200"
        titleColor="text-purple-900"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="road-access" className="block text-sm font-medium text-gray-700 mb-2">
                Road Access
              </label>
              <select
                id="road-access"
                name="road-access"
                value={location.road_access || ''}
                onChange={(e) => updateGroupData('location_mapping', {
                  location_details: {
                    ...locationData,
                    road_access: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select road access...</option>
                <option value="Main road">Main Road (Direct access)</option>
                <option value="Side road">Side Road</option>
                <option value="Lane">Lane</option>
                <option value="Private road">Private Road</option>
                <option value="No direct access">No Direct Road Access</option>
              </select>
            </div>

            <div>
              <label htmlFor="road-width" className="block text-sm font-medium text-gray-700 mb-2">
                Road Width (meters)
              </label>
              <input
                type="number"
                id="road-width"
                name="road-width"
                step="0.1"
                value={location.road_width || ''}
                onChange={(e) => updateGroupData('location_mapping', {
                  location_details: {
                    ...locationData,
                    road_width: parseFloat(e.target.value) || ''
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 4.5"
              />
            </div>
          </div>

          <div>
            <ValidatedInput
              fieldName="nearest_landmark"
              label="Nearest Landmark"
              value={location.nearest_landmark || ''}
              onChange={(value) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  nearest_landmark: value
                }
              })}
              placeholder="e.g., Next to Galle Face Green"
            />
          </div>

          {/* Route Generation Section */}
          {mapsAvailable && (
            <div className="p-3 bg-purple-100 rounded-lg border border-purple-200">
              <h5 className="text-sm font-medium text-purple-900 mb-3">🗺️ Auto-Generate Directions</h5>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Route From
                  </label>
                  <select
                    value={routeOriginCity}
                    onChange={(e) => setRouteOriginCity(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="Colombo">Colombo</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Galle">Galle</option>
                    <option value="Jaffna">Jaffna</option>
                    <option value="Kurunegala">Kurunegala</option>
                    <option value="Anuradhapura">Anuradhapura</option>
                    <option value="Ratnapura">Ratnapura</option>
                    <option value="Batticaloa">Batticaloa</option>
                    <option value="Trincomalee">Trincomalee</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={generateRouteDescription}
                  disabled={isGeneratingRoute || !location.latitude || !location.longitude}
                  className={`px-4 py-2 text-sm font-medium rounded-md border ${
                    isGeneratingRoute || !location.latitude || !location.longitude
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-300 hover:border-purple-400'
                  }`}
                >
                  {isGeneratingRoute ? 'Generating...' : 'Generate Route'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="directions" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Directions
            </label>
            <textarea
              id="directions"
              name="directions"
              value={location.directions || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  directions: e.target.value
                }
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide detailed directions from the nearest main road or landmark..."
            />
            
            {/* Display route information if available */}
            {generatedRouteData && (generatedRouteData.distance || generatedRouteData.duration) && (
              <div className="mt-2 p-2 bg-purple-100 rounded border border-purple-200">
                <div className="flex flex-wrap gap-4 text-xs text-purple-700">
                  {generatedRouteData.distance && (
                    <span><strong>Distance:</strong> {generatedRouteData.distance}</span>
                  )}
                  {generatedRouteData.duration && (
                    <span><strong>Duration:</strong> {generatedRouteData.duration}</span>
                  )}
                  {generatedRouteData.start_address && (
                    <span><strong>From:</strong> {generatedRouteData.start_address}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Transportation & Connectivity */}
      <CollapsibleSection 
        id="transport" 
        title="Transportation & Connectivity"
        bgColor="bg-gray-50" 
        borderColor="border-gray-200"
        titleColor="text-gray-900"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="public-transport" className="block text-sm font-medium text-gray-700 mb-2">
              Public Transport Access
            </label>
            <select
              id="public-transport"
              name="public-transport"
              value={location.public_transport || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  public_transport: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select access level...</option>
              <option value="Excellent">Excellent (Multiple bus routes, rail station nearby)</option>
              <option value="Good">Good (Regular bus service)</option>
              <option value="Fair">Fair (Limited bus service)</option>
              <option value="Poor">Poor (Irregular transport)</option>
              <option value="None">No Public Transport</option>
            </select>
          </div>

          <div>
            <label htmlFor="distance-town" className="block text-sm font-medium text-gray-700 mb-2">
              Distance to Town Center (km)
            </label>
            <input
              type="number"
              id="distance-town"
              name="distance-town"
              step="0.1"
              value={location.distance_to_town || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  distance_to_town: parseFloat(e.target.value) || ''
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.5"
            />
          </div>

          <div>
            <label htmlFor="distance-colombo" className="block text-sm font-medium text-gray-700 mb-2">
              Distance to Colombo (km)
            </label>
            <input
              type="number"
              id="distance-colombo"
              name="distance-colombo"
              step="0.1"
              value={location.distance_to_colombo || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  distance_to_colombo: parseFloat(e.target.value) || ''
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 15.0"
            />
          </div>

          <div>
            <label htmlFor="nearest-station" className="block text-sm font-medium text-gray-700 mb-2">
              Nearest Railway Station
            </label>
            <input
              type="text"
              id="nearest-station"
              name="nearest-station"
              value={location.nearest_railway_station || ''}
              onChange={(e) => updateGroupData('location_mapping', {
                location_details: {
                  ...locationData,
                  nearest_railway_station: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Bambalapitiya Railway Station"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Distance Calculator */}
      {mapsAvailable && (
        <CollapsibleSection 
          id="distance-calc" 
          title="Distance Calculator"
          bgColor="bg-orange-50" 
          borderColor="border-orange-200"
          titleColor="text-orange-900"
        >
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-orange-700">
              Calculate driving distances and travel times to major cities in Sri Lanka using Google Maps data.
            </p>
            <button
              type="button"
              onClick={calculateDistances}
              disabled={isCalculatingDistances || !location.latitude || !location.longitude}
              className={`px-4 py-2 text-sm font-medium rounded-md border ${
                isCalculatingDistances || !location.latitude || !location.longitude
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-white text-orange-700 hover:bg-orange-50 border-orange-300 hover:border-orange-400'
              }`}
            >
              {isCalculatingDistances ? 'Calculating...' : 'Calculate Distances'}
            </button>
          </div>

          {/* Display calculated distances */}
          {calculatedDistances && calculatedDistances.distances && calculatedDistances.distances[0] && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-orange-900">Distance Results:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {calculatedDistances.distances[0].destinations.map((dest: any, index: number) => (
                  <div key={index} className="text-xs text-orange-800 bg-orange-100 p-2 rounded">
                    <div className="font-medium">{dest.destination.replace(', Sri Lanka', '')}</div>
                    {dest.status === 'OK' ? (
                      <>
                        <div>{dest.distance?.text || 'N/A'}</div>
                        <div>{dest.duration?.text || 'N/A'}</div>
                      </>
                    ) : (
                      <div className="text-red-600">No route available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Map Modal for Enlarged View */}
      {showMapModal && staticMapUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-screen overflow-auto m-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Property Location Map</h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img
                src={staticMapUrl}
                alt="Property Location Map - Enlarged"
                className="w-full h-auto max-w-full"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
              />
              <div className="mt-4 text-center text-sm text-gray-600">
                📍 Property Location: {location.latitude}, {location.longitude}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};