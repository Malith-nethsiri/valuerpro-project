import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { mapsAPI } from '@/lib/api';
import { MapIcon, EyeIcon, MapPinIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

export const LocationStep = () => {
  console.log('🔄 LocationStep: Component rendering at', new Date().toISOString());
  if (typeof window !== 'undefined') {
    window.alert('ALERT: LocationStep component is rendering at ' + new Date().toISOString());
  }
  const { state, updateStepData } = useWizard();
  const location = state.data.location;
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  
  // Removed refs since we're using controlled inputs
  const [mapsAvailable, setMapsAvailable] = useState<boolean | null>(null);
  
  // Removed ref sync useEffect since we're using controlled inputs
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [generatedRouteData, setGeneratedRouteData] = useState<any>(null);
  const [routeOriginCity, setRouteOriginCity] = useState<string>('Colombo');
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [calculatedDistances, setCalculatedDistances] = useState<any>(null);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [staticMapUrl, setStaticMapUrl] = useState<string>('');
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

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

  const handleInputChange = (field: string, value: any) => {
    updateStepData('location', { [field]: value });
  };

  const handleAddressChange = (field: string, value: string) => {
    console.log('📝 LocationStep: handleAddressChange called ->', field, value, 'at', new Date().toISOString());
    if (typeof window !== 'undefined') {
      window.alert('ALERT: handleAddressChange called for field: ' + field + ' with value: ' + value);
    }
    const address = location.address || {};
    updateStepData('location', { 
      address: { ...address, [field]: value }
    });
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
      
      // Update basic address
      updateStepData('location', {
        address: {
          ...location.address,
          city: components.city || location.address?.city || '',
          postal_code: components.postal_code || location.address?.postal_code || '',
          street: components.area || location.address?.street || '',
        },
        // Administrative divisions
        district: components.district || location.district || '',
        province: components.province || location.province || '',
        // Store formatted address for reference
        formatted_address: addressData.formatted_address
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
    const nearestCity = routeOriginCity || location.address?.city || 'Colombo'; // Use selected origin city
    
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

      updateStepData('location', updateData);

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
            updateStepData('location', {
              distance_to_colombo: distanceKm
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

  // Property location analysis
  const analyzePropertyLocation = async () => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    
    if (!lat || !lng || !mapsAvailable) {
      alert('Please enter valid coordinates first and ensure Maps API is available.');
      return;
    }

    try {
      const analysisData = await mapsAPI.analyzePropertyLocation(lat, lng);
      
      if (analysisData.error) {
        alert(`Location analysis failed: ${analysisData.error}`);
        return;
      }

      // Display analysis results
      let analysisMessage = 'Location Analysis:\n\n';
      
      if (analysisData.address) {
        analysisMessage += `Address: ${analysisData.address.formatted_address}\n`;
      }
      
      if (analysisData.access_route) {
        analysisMessage += `Route Info: ${analysisData.access_route.distance} (${analysisData.access_route.duration})\n`;
      }
      
      if (analysisData.static_map_url) {
        setStaticMapUrl(analysisData.static_map_url);
      }
      
      alert(analysisMessage || 'Location analysis completed successfully!');
      
    } catch (error: any) {
      console.error('Location analysis error:', error);
      alert(`Failed to analyze location: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Location & Access
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide complete location details including address, administrative divisions, and GPS coordinates.
        </p>
      </div>

      {/* Property Address */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Property Address</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="house-no" className="block text-sm font-medium text-gray-700 mb-2">
              House/Building Number & Name
            </label>
            <input
              type="text"
              id="house-no"
              value={location.address?.house_number || ''}
              onChange={(e) => handleAddressChange('house_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., No. 123, Lotus Villa"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
              Street/Road Name
            </label>
            <input
              type="text"
              id="street"
              value={location.address?.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Galle Road"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City/Town *
            </label>
            <input
              type="text"
              id="city"
              value={location.address?.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Colombo"
            />
          </div>

          <div>
            <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              id="postal-code"
              value={location.address?.postal_code || ''}
              onChange={(e) => handleAddressChange('postal_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 00300"
            />
          </div>
        </div>
      </div>

      {/* Administrative Divisions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Administrative Divisions</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gn-division" className="block text-sm font-medium text-gray-700 mb-2">
              Grama Niladhari Division
            </label>
            <input
              type="text"
              id="gn-division"
              value={location.gn_division || ''}
              onChange={(e) => handleInputChange('gn_division', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Bambalapitiya"
            />
          </div>

          <div>
            <label htmlFor="ds-division" className="block text-sm font-medium text-gray-700 mb-2">
              Divisional Secretariat
            </label>
            <input
              type="text"
              id="ds-division"
              value={location.ds_division || ''}
              onChange={(e) => handleInputChange('ds_division', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Colombo"
            />
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
              District *
            </label>
            <select
              id="district"
              value={location.district || ''}
              onChange={(e) => handleInputChange('district', e.target.value)}
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
              value={location.province || ''}
              onChange={(e) => handleInputChange('province', e.target.value)}
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
      </div>

      {/* GPS Coordinates */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">GPS Coordinates</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
              Latitude
            </label>
            <input
              type="text"
              id="latitude"
              value={location.latitude || ''}
              onChange={(e) => handleInputChange('latitude', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 6.9271"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
              Longitude
            </label>
            <input
              type="text"
              id="longitude"
              value={location.longitude || ''}
              onChange={(e) => handleInputChange('longitude', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 79.8612"
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
                {isReverseGeocoding ? 'Getting Address...' : '📍 Get Address from Coordinates'}
              </button>
            )}
            
            {mapsAvailable === false && (
              <p className="text-xs text-gray-500">
                Maps API not available - address lookup disabled
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> GPS coordinates help with accurate mapping and location verification. Enter coordinates manually from your survey data, or use "Get Address from Coordinates" to auto-populate address fields from existing coordinates.
          </p>
          {location.formatted_address && (
            <p className="text-xs text-yellow-700 mt-2">
              <strong>Last geocoded address:</strong> {location.formatted_address}
            </p>
          )}
        </div>
      </div>

      {/* Access & Directions */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Access & Directions</h4>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="road-access" className="block text-sm font-medium text-gray-700 mb-2">
              Road Access
            </label>
            <select
              id="road-access"
              value={location.road_access || ''}
              onChange={(e) => handleInputChange('road_access', e.target.value)}
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
              step="0.1"
              value={location.road_width || ''}
              onChange={(e) => handleInputChange('road_width', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 4.5"
            />
          </div>

          <div>
            <label htmlFor="nearest-landmark" className="block text-sm font-medium text-gray-700 mb-2">
              Nearest Landmark
            </label>
            <input
              type="text"
              id="nearest-landmark"
              value={location.nearest_landmark || ''}
              onChange={(e) => handleInputChange('nearest_landmark', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Next to Galle Face Green"
            />
          </div>

          {/* Route Generation Section */}
          {mapsAvailable && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
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
                  title="Generate route description from coordinates using Google Maps"
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
              value={location.directions || ''}
              onChange={(e) => handleInputChange('directions', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide detailed directions from the nearest main road or landmark, or generate automatically using coordinates..."
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
      </div>

      {/* Transportation & Connectivity */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Transportation & Connectivity</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="public-transport" className="block text-sm font-medium text-gray-700 mb-2">
              Public Transport Access
            </label>
            <select
              id="public-transport"
              value={location.public_transport || ''}
              onChange={(e) => handleInputChange('public_transport', e.target.value)}
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
              step="0.1"
              value={location.distance_to_town || ''}
              onChange={(e) => handleInputChange('distance_to_town', parseFloat(e.target.value) || '')}
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
              step="0.1"
              value={location.distance_to_colombo || ''}
              onChange={(e) => handleInputChange('distance_to_colombo', parseFloat(e.target.value) || '')}
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
              value={location.nearest_railway_station || ''}
              onChange={(e) => handleInputChange('nearest_railway_station', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Bambalapitiya Railway Station"
            />
          </div>
        </div>
      </div>

      {/* Distance Matrix Calculation */}
      {mapsAvailable && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-orange-900">
              📏 Distance Calculator
            </h4>
            <button
              type="button"
              onClick={calculateDistances}
              disabled={isCalculatingDistances || !location.latitude || !location.longitude}
              className={`px-4 py-2 text-sm font-medium rounded-md border ${
                isCalculatingDistances || !location.latitude || !location.longitude
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-white text-orange-700 hover:bg-orange-50 border-orange-300 hover:border-orange-400'
              }`}
              title="Calculate distances to major Sri Lankan cities using Google Distance Matrix"
            >
              {isCalculatingDistances ? 'Calculating...' : 'Calculate Distances'}
            </button>
          </div>
          
          <p className="text-sm text-orange-700 mb-4">
            Calculate driving distances and travel times to major cities in Sri Lanka using Google Maps data.
          </p>

          {/* Display calculated distances */}
          {calculatedDistances && calculatedDistances.distances && calculatedDistances.distances[0] && (
            <div className="mt-4 space-y-2">
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
        </div>
      )}

      {/* Interactive Map Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-medium text-blue-900">
            🗺️ Interactive Location Map
          </h4>
          {mapsAvailable && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>

        {!mapsAvailable ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <MapIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Google Maps API is not available. Map features are disabled.
              </p>
            </div>
          </div>
        ) : !location.latitude || !location.longitude ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <MapPinIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Enter valid GPS coordinates above to view the interactive map.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Map Type Selector */}
            <div className="flex gap-2 mb-3">
              <label className="text-sm font-medium text-blue-700 mr-2">Map View:</label>
              <div className="flex gap-1">
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
            </div>

            {/* Static Map Display */}
            {staticMapUrl ? (
              <div className="relative">
                <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
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
                
                {/* Map Action Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openGoogleMaps}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Full Map
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowsPointingOutIcon className="h-4 w-4 mr-2" />
                    Enlarge Map
                  </button>
                  
                  <button
                    type="button"
                    onClick={analyzePropertyLocation}
                    className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    Analyze Location
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 text-center">
                <MapPinIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-700 mb-3">
                  Click "Generate Map" to view the property location
                </p>
                <div className="text-xs text-blue-600">
                  Coordinates: {location.latitude}, {location.longitude}
                </div>
              </div>
            )}

            {/* Map Information Panel */}
            <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
              <div className="text-sm text-blue-800">
                <strong>Map Features:</strong>
                <ul className="list-disc list-inside mt-1 text-xs space-y-1">
                  <li>Interactive map with property pin marker</li>
                  <li>Multiple view types: Road, Satellite, Hybrid, Terrain</li>
                  <li>Click "View Full Map" to open in Google Maps</li>
                  <li>Use "Analyze Location" for comprehensive area analysis</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

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