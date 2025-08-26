import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';

export const LocationStep = () => {
  const { state, updateStepData } = useWizard();
  const location = state.data.location;
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    updateStepData('location', { [field]: value });
  };

  const handleAddressChange = (field: string, value: string) => {
    const address = location.address || {};
    updateStepData('location', { 
      address: { ...address, [field]: value }
    });
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoadingCoordinates(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateStepData('location', { 
          latitude: latitude.toString(),
          longitude: longitude.toString()
        });
        setIsLoadingCoordinates(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please enter coordinates manually.');
        setIsLoadingCoordinates(false);
      }
    );
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

          <div className="flex items-end">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingCoordinates}
              className={`w-full px-4 py-2 text-sm font-medium rounded-md ${
                isLoadingCoordinates
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoadingCoordinates ? 'Getting Location...' : 'Get Current Location'}
            </button>
          </div>
        </div>

        <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> GPS coordinates help with accurate mapping and location verification. Click "Get Current Location" if you're at the property site.
          </p>
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
              placeholder="Provide detailed directions from the nearest main road or landmark..."
            />
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

      {/* Map Integration Placeholder */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">
          🗺️ Location Mapping
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Interactive map integration will be available here to visualize and verify the property location.
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            View on Map
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Get Satellite View
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            Verify Address
          </button>
        </div>
      </div>
    </div>
  );
};