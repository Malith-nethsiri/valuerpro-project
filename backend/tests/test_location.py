"""
Test cases for location services endpoints.
Covers reverse geocoding, administrative division lookup, and Sri Lanka-specific location services.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from app.api.api_v1.endpoints.location import LocationRequest as ReverseGeocodeRequest


class TestLocationEndpoints:
    """Test location API endpoints"""
    
    @patch('app.services.google_maps_service.reverse_geocode')
    @patch('app.services.sri_lanka_admin_divisions.get_admin_division_by_coordinates')
    def test_reverse_geocode_success_with_google_maps(self, mock_admin_lookup, mock_google_maps, 
                                                    authenticated_client: TestClient):
        """Test successful reverse geocoding with Google Maps integration"""
        # Mock Google Maps response
        mock_google_maps.return_value = {
            "formatted_address": "123 Main Street, Colombo 00700, Sri Lanka",
            "address_components": [
                {"long_name": "Colombo", "types": ["locality", "political"]},
                {"long_name": "Western Province", "types": ["administrative_area_level_1"]}
            ],
            "geometry": {
                "location": {"lat": 6.9271, "lng": 79.8612}
            }
        }
        
        # Mock admin division lookup
        mock_admin_lookup.return_value = {
            "district": "Colombo",
            "ds_division": "Colombo",
            "gn_division": "Colombo 01",
            "province": "Western"
        }
        
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612
        }
        
        response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "google_result" in data
        assert "sri_lanka_admin" in data
        assert data["google_result"]["formatted_address"] == "123 Main Street, Colombo 00700, Sri Lanka"
        assert data["sri_lanka_admin"]["district"] == "Colombo"
        assert data["sri_lanka_admin"]["ds_division"] == "Colombo"
    
    @patch('app.services.google_maps_service.reverse_geocode')
    @patch('app.services.sri_lanka_admin_divisions.get_admin_division_by_coordinates')
    def test_reverse_geocode_google_maps_unavailable(self, mock_admin_lookup, mock_google_maps,
                                                   authenticated_client: TestClient):
        """Test reverse geocoding when Google Maps is unavailable"""
        # Mock Google Maps failure
        mock_google_maps.return_value = None
        
        # Mock successful admin lookup
        mock_admin_lookup.return_value = {
            "district": "Kandy",
            "ds_division": "Kandy",
            "gn_division": "Kandy 01",
            "province": "Central"
        }
        
        request_data = {
            "latitude": 7.2906,
            "longitude": 80.6337
        }
        
        response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["google_result"] is None
        assert data["sri_lanka_admin"]["district"] == "Kandy"
        
    def test_reverse_geocode_invalid_coordinates(self, authenticated_client: TestClient):
        """Test reverse geocoding with invalid coordinates"""
        # Test coordinates outside Sri Lanka bounds
        request_data = {
            "latitude": 40.7128,  # New York coordinates
            "longitude": -74.0060
        }
        
        response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
        assert response.status_code == 400
        assert "outside Sri Lanka" in response.json()["detail"]
    
    def test_reverse_geocode_coordinates_validation(self, authenticated_client: TestClient):
        """Test validation of coordinates in reverse geocoding"""
        # Invalid latitude (> 90)
        request_data = {
            "latitude": 91.0,
            "longitude": 79.8612
        }
        
        response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
        assert response.status_code == 422  # Validation error
        
        # Invalid longitude (> 180)
        request_data = {
            "latitude": 6.9271,
            "longitude": 181.0
        }
        
        response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
        assert response.status_code == 422
    
    def test_get_all_districts_success(self, authenticated_client: TestClient):
        """Test retrieving all districts"""
        response = authenticated_client.get("/api/v1/location/districts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check that major districts are included
        district_names = [district["name"] for district in data]
        assert "Colombo" in district_names
        assert "Kandy" in district_names
        assert "Galle" in district_names
        
        # Verify structure of district objects
        first_district = data[0]
        assert "name" in first_district
        assert "code" in first_district
        assert "province" in first_district
    
    def test_get_ds_divisions_for_district_success(self, authenticated_client: TestClient):
        """Test retrieving DS divisions for a specific district"""
        response = authenticated_client.get("/api/v1/location/districts/Colombo/ds-divisions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify DS division structure
        first_ds = data[0]
        assert "name" in first_ds
        assert "code" in first_ds
        assert "district" in first_ds
        assert first_ds["district"] == "Colombo"
    
    def test_get_ds_divisions_invalid_district(self, authenticated_client: TestClient):
        """Test retrieving DS divisions for non-existent district"""
        response = authenticated_client.get("/api/v1/location/districts/NonExistentDistrict/ds-divisions")
        assert response.status_code == 404
        assert "District not found" in response.json()["detail"]
    
    def test_get_sample_gn_divisions_success(self, authenticated_client: TestClient):
        """Test retrieving sample GN divisions for a DS division"""
        # First get a valid DS division
        districts_response = authenticated_client.get("/api/v1/location/districts")
        districts = districts_response.json()
        
        if districts:
            district_name = districts[0]["name"]
            ds_response = authenticated_client.get(f"/api/v1/location/districts/{district_name}/ds-divisions")
            ds_divisions = ds_response.json()
            
            if ds_divisions:
                ds_name = ds_divisions[0]["name"]
                
                response = authenticated_client.get(f"/api/v1/location/ds-divisions/{ds_name}/gn-divisions/sample")
                assert response.status_code == 200
                
                data = response.json()
                assert isinstance(data, list)
                
                if data:  # If there are GN divisions
                    first_gn = data[0]
                    assert "name" in first_gn
                    assert "code" in first_gn
                    assert "ds_division" in first_gn
    
    def test_get_sample_gn_divisions_invalid_ds(self, authenticated_client: TestClient):
        """Test retrieving GN divisions for non-existent DS division"""
        response = authenticated_client.get("/api/v1/location/ds-divisions/NonExistentDS/gn-divisions/sample")
        assert response.status_code == 404
        assert "DS Division not found" in response.json()["detail"]
    
    @patch('app.services.sri_lanka_admin_divisions.estimate_admin_divisions')
    def test_estimate_admin_divisions_success(self, mock_estimate, authenticated_client: TestClient):
        """Test estimating administrative divisions from coordinates"""
        mock_estimate.return_value = {
            "district": "Colombo",
            "ds_division": "Colombo",
            "confidence": 0.8,
            "method": "coordinate_bounds"
        }
        
        response = authenticated_client.get("/api/v1/location/estimate-admin-divisions?lat=6.9271&lon=79.8612")
        assert response.status_code == 200
        
        data = response.json()
        assert data["district"] == "Colombo"
        assert data["ds_division"] == "Colombo"
        assert data["confidence"] == 0.8
    
    def test_estimate_admin_divisions_missing_params(self, authenticated_client: TestClient):
        """Test estimating admin divisions with missing parameters"""
        # Missing longitude
        response = authenticated_client.get("/api/v1/location/estimate-admin-divisions?lat=6.9271")
        assert response.status_code == 422
        
        # Missing latitude
        response = authenticated_client.get("/api/v1/location/estimate-admin-divisions?lon=79.8612")
        assert response.status_code == 422
    
    def test_unauthenticated_access_blocked(self, client: TestClient):
        """Test that unauthenticated requests are blocked"""
        response = client.post("/api/v1/location/reverse-geocode", json={
            "latitude": 6.9271,
            "longitude": 79.8612
        })
        assert response.status_code == 401
        
        response = client.get("/api/v1/location/districts")
        assert response.status_code == 401


class TestLocationServices:
    """Test location service functions"""
    
    def test_sri_lanka_coordinate_bounds_validation(self):
        """Test Sri Lanka coordinate bounds validation"""
        from app.services.location_service import is_within_sri_lanka_bounds
        
        # Valid Sri Lankan coordinates
        assert is_within_sri_lanka_bounds(6.9271, 79.8612) is True  # Colombo
        assert is_within_sri_lanka_bounds(7.2906, 80.6337) is True  # Kandy
        assert is_within_sri_lanka_bounds(6.0329, 80.2168) is True  # Galle
        
        # Invalid coordinates (outside Sri Lanka)
        assert is_within_sri_lanka_bounds(40.7128, -74.0060) is False  # New York
        assert is_within_sri_lanka_bounds(51.5074, -0.1278) is False   # London
        assert is_within_sri_lanka_bounds(12.9716, 77.5946) is False  # Bangalore
    
    @patch('googlemaps.Client')
    def test_google_maps_service_success(self, mock_client_class):
        """Test Google Maps service integration"""
        from app.services.google_maps_service import reverse_geocode
        
        # Mock Google Maps client and response
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        mock_client.reverse_geocode.return_value = [{
            "formatted_address": "Test Address, Colombo, Sri Lanka",
            "address_components": [
                {"long_name": "Colombo", "types": ["locality"]},
                {"long_name": "Western Province", "types": ["administrative_area_level_1"]}
            ],
            "geometry": {
                "location": {"lat": 6.9271, "lng": 79.8612}
            }
        }]
        
        result = reverse_geocode(6.9271, 79.8612)
        
        assert result is not None
        assert result["formatted_address"] == "Test Address, Colombo, Sri Lanka"
        mock_client.reverse_geocode.assert_called_once_with((6.9271, 79.8612))
    
    @patch('googlemaps.Client')
    def test_google_maps_service_api_error(self, mock_client_class):
        """Test Google Maps service handling API errors"""
        from app.services.google_maps_service import reverse_geocode
        
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.reverse_geocode.side_effect = Exception("API quota exceeded")
        
        result = reverse_geocode(6.9271, 79.8612)
        assert result is None
    
    def test_sri_lanka_admin_divisions_data_integrity(self):
        """Test integrity of Sri Lanka administrative divisions data"""
        from app.services.sri_lanka_admin_divisions import get_all_districts, get_ds_divisions_by_district
        
        districts = get_all_districts()
        assert len(districts) > 0
        
        # Test major districts exist
        district_names = [d["name"] for d in districts]
        assert "Colombo" in district_names
        assert "Kandy" in district_names
        assert "Galle" in district_names
        assert "Jaffna" in district_names
        
        # Test DS divisions for Colombo
        colombo_ds = get_ds_divisions_by_district("Colombo")
        assert len(colombo_ds) > 0
        
        for ds in colombo_ds:
            assert ds["district"] == "Colombo"
            assert "name" in ds
            assert "code" in ds
    
    def test_admin_division_coordinate_lookup(self):
        """Test coordinate-based administrative division lookup"""
        from app.services.sri_lanka_admin_divisions import get_admin_division_by_coordinates
        
        # Test Colombo coordinates
        result = get_admin_division_by_coordinates(6.9271, 79.8612)
        assert result is not None
        assert result["district"] == "Colombo"
        
        # Test coordinates outside known areas (should return None or best guess)
        result = get_admin_division_by_coordinates(5.0, 80.0)  # Southern ocean
        # This should either return None or a best-effort guess
        assert result is None or isinstance(result, dict)
    
    def test_coordinate_bounds_estimation(self):
        """Test estimation of administrative divisions using coordinate bounds"""
        from app.services.sri_lanka_admin_divisions import estimate_admin_divisions
        
        # Test with known coordinates
        result = estimate_admin_divisions(6.9271, 79.8612)  # Colombo area
        
        assert isinstance(result, dict)
        assert "district" in result
        assert "confidence" in result
        assert 0.0 <= result["confidence"] <= 1.0
        
        if result["district"]:
            assert isinstance(result["district"], str)


class TestLocationValidation:
    """Test validation of location-related data"""
    
    def test_reverse_geocode_request_validation_success(self):
        """Test successful validation of reverse geocode request"""
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612
        }
        
        schema = ReverseGeocodeRequest(**request_data)
        assert schema.latitude == 6.9271
        assert schema.longitude == 79.8612
    
    def test_reverse_geocode_request_validation_invalid_latitude(self):
        """Test validation failure for invalid latitude"""
        with pytest.raises(ValueError):
            ReverseGeocodeRequest(latitude=91.0, longitude=79.8612)  # > 90
        
        with pytest.raises(ValueError):
            ReverseGeocodeRequest(latitude=-91.0, longitude=79.8612)  # < -90
    
    def test_reverse_geocode_request_validation_invalid_longitude(self):
        """Test validation failure for invalid longitude"""
        with pytest.raises(ValueError):
            ReverseGeocodeRequest(latitude=6.9271, longitude=181.0)  # > 180
        
        with pytest.raises(ValueError):
            ReverseGeocodeRequest(latitude=6.9271, longitude=-181.0)  # < -180
    
    def test_reverse_geocode_request_validation_edge_cases(self):
        """Test validation with edge case coordinates"""
        # Test boundary values (should be valid)
        schema1 = ReverseGeocodeRequest(latitude=90.0, longitude=180.0)
        assert schema1.latitude == 90.0
        assert schema1.longitude == 180.0
        
        schema2 = ReverseGeocodeRequest(latitude=-90.0, longitude=-180.0)
        assert schema2.latitude == -90.0
        assert schema2.longitude == -180.0
        
        schema3 = ReverseGeocodeRequest(latitude=0.0, longitude=0.0)
        assert schema3.latitude == 0.0
        assert schema3.longitude == 0.0


@pytest.fixture
def mock_google_maps_unavailable():
    """Mock Google Maps being unavailable for testing fallback behavior"""
    with patch('app.core.config.settings.GOOGLE_MAPS_API_KEY', None):
        yield


class TestLocationServiceFallbacks:
    """Test fallback behavior when external services are unavailable"""
    
    def test_reverse_geocode_google_maps_unavailable_fallback(self, mock_google_maps_unavailable,
                                                            authenticated_client: TestClient):
        """Test that reverse geocoding works when Google Maps is unavailable"""
        with patch('app.services.sri_lanka_admin_divisions.get_admin_division_by_coordinates') as mock_admin:
            mock_admin.return_value = {
                "district": "Colombo",
                "ds_division": "Colombo",
                "gn_division": "Colombo 01",
                "province": "Western"
            }
            
            request_data = {
                "latitude": 6.9271,
                "longitude": 79.8612
            }
            
            response = authenticated_client.post("/api/v1/location/reverse-geocode", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["google_result"] is None
            assert data["sri_lanka_admin"]["district"] == "Colombo"