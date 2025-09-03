'use client';

import { useState, useEffect } from 'react';
import { mapsAPI } from '@/lib/api';

interface PropertyLocationMapProps {
  aiAnalysis?: any;
  onLocationUpdate?: (locationData: any) => void;
}

interface LocationData {
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  address?: string;
  routeDescription?: string;
  loading?: boolean;
  error?: string;
}

export default function PropertyLocationMap({ 
  aiAnalysis, 
  onLocationUpdate 
}: PropertyLocationMapProps) {
  const [locationData, setLocationData] = useState<LocationData>({});
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [mapsAvailable, setMapsAvailable] = useState(false);

  // Check if coordinates exist in AI analysis
  const extractedCoords = aiAnalysis?.extracted_data?.coordinates || 
                         aiAnalysis?.general_data?.coordinates;

  useEffect(() => {
    // Check Maps API availability
    checkMapsStatus();
    
    // If we have extracted coordinates, use them
    if (extractedCoords?.latitude && extractedCoords?.longitude) {
      handleLocationAnalysis(extractedCoords.latitude, extractedCoords.longitude);
    }
  }, [extractedCoords]);

  const checkMapsStatus = async () => {
    try {
      const status = await mapsAPI.getStatus();
      setMapsAvailable(status.available);
    } catch (error) {
      console.error('Maps status check failed:', error);
      setMapsAvailable(false);
    }
  };

  const handleLocationAnalysis = async (lat: number, lng: number) => {
    setLocationData(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      const analysis = await mapsAPI.analyzePropertyLocation(lat, lng);
      
      const newLocationData: LocationData = {
        latitude: lat,
        longitude: lng,
        loading: false
      };

      if (analysis.static_map_url) {
        newLocationData.mapUrl = analysis.static_map_url;
      }

      if (analysis.address?.formatted_address) {
        newLocationData.address = analysis.address.formatted_address;
      }

      if (analysis.access_route?.description) {
        newLocationData.routeDescription = analysis.access_route.description;
      }

      setLocationData(newLocationData);
      onLocationUpdate?.(analysis);
      
    } catch (error: any) {
      setLocationData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.detail || error.message
      }));
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Coordinates out of valid range');
      return;
    }
    
    handleLocationAnalysis(lat, lng);
  };

  const getSampleCoordinates = () => {
    // Colombo area sample coordinates
    setManualCoords({ lat: '6.9271', lng: '79.8612' });
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Property Location</h3>
        {!mapsAvailable && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Maps API Limited
          </span>
        )}
      </div>

      {/* AI Extracted Coordinates */}
      {extractedCoords?.latitude && extractedCoords?.longitude && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            📍 AI Extracted Coordinates
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <span className="font-medium ml-2">{extractedCoords.latitude}</span>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <span className="font-medium ml-2">{extractedCoords.longitude}</span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Coordinate Entry */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Enter Property Coordinates</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="6.9271"
              value={manualCoords.lat}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lat: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="79.8612"
              value={manualCoords.lng}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lng: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex space-x-2 mt-3">
          <button
            onClick={handleManualLocation}
            disabled={locationData.loading || !manualCoords.lat || !manualCoords.lng}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium py-2 px-4 rounded-md disabled:cursor-not-allowed"
          >
            {locationData.loading ? 'Analyzing...' : 'Analyze Location'}
          </button>
          <button
            onClick={getSampleCoordinates}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-md"
          >
            Use Sample (Colombo)
          </button>
        </div>
      </div>

      {/* Loading State */}
      {locationData.loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Analyzing location...</span>
        </div>
      )}

      {/* Error State */}
      {locationData.error && (
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-800">
            <strong>Error:</strong> {locationData.error}
          </div>
        </div>
      )}

      {/* Location Results */}
      {locationData.latitude && locationData.longitude && !locationData.loading && (
        <div className="space-y-4">
          {/* Map Display */}
          {locationData.mapUrl && mapsAvailable ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Property Map</h4>
              <div className="relative">
                <img
                  src={locationData.mapUrl}
                  alt="Property Location Map"
                  className="w-full h-64 object-cover rounded-lg border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600">
                  📍 {locationData.latitude?.toFixed(4)}, {locationData.longitude?.toFixed(4)}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-gray-500 text-sm">
                🗺️ Map preview unavailable
                {!mapsAvailable && ' (Google Maps API not configured)'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Coordinates: {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}
              </div>
            </div>
          )}

          {/* Address Information */}
          {locationData.address && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">📍 Address</h4>
              <p className="text-sm text-green-800">{locationData.address}</p>
            </div>
          )}

          {/* Route Description */}
          {locationData.routeDescription && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">🚗 Access Route</h4>
              <p className="text-sm text-blue-800">{locationData.routeDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!locationData.latitude && !locationData.loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">
            📍 Enter property coordinates to view location analysis
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Coordinates may be automatically extracted from AI document analysis
          </div>
        </div>
      )}
    </div>
  );
}