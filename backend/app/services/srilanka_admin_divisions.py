"""
Sri Lankan Administrative Divisions Service

This service provides functionality to resolve Sri Lankan administrative boundaries
including Grama Niladhari (GN) divisions and Divisional Secretariat (DS) divisions
that are not available through Google Maps API.

Uses a combination of:
1. Static lookup tables for common areas
2. Coordinate-based boundary checking for major regions
3. Fallback mechanisms when precise data isn't available
"""

from typing import Dict, Optional, Tuple, List, Any
import math


class SriLankaAdminDivisions:
    """
    Service for resolving Sri Lankan administrative divisions
    """
    
    # Major districts with their approximate coordinate ranges
    DISTRICT_BOUNDARIES = {
        'Colombo': {
            'lat_range': (6.8, 7.1),
            'lng_range': (79.8, 80.1),
            'ds_divisions': [
                'Colombo', 'Thimbirigasyaya', 'Dehiwala-Mt.Lavinia', 'Moratuwa',
                'Kesbewa', 'Maharagama', 'Sri Jayawardenepura Kotte', 'Kaduwela',
                'Homagama', 'Seethawaka', 'Padukka', 'Hanwella', 'Avissawella'
            ]
        },
        'Gampaha': {
            'lat_range': (7.0, 7.3),
            'lng_range': (79.8, 80.4),
            'ds_divisions': [
                'Negombo', 'Katana', 'Divulapitiya', 'Minuwangoda', 'Wattala',
                'Ja-Ela', 'Mahara', 'Dompe', 'Gampaha', 'Kelaniya', 'Biyagama',
                'Mirigama', 'Attanagalla'
            ]
        },
        'Kalutara': {
            'lat_range': (6.4, 6.9),
            'lng_range': (79.9, 80.3),
            'ds_divisions': [
                'Panadura', 'Bandaragama', 'Horana', 'Ingiriya', 'Bulathsinhala',
                'Mathugama', 'Kalutara', 'Beruwala', 'Dodangoda', 'Madurawela',
                'Millaniya', 'Agalawatta', 'Palindanuwara', 'Walallawita'
            ]
        },
        'Kandy': {
            'lat_range': (7.1, 7.5),
            'lng_range': (80.4, 80.8),
            'ds_divisions': [
                'Kandy', 'Gampola', 'Nawalapitiya', 'Doluwa', 'Udunuwara',
                'Yatinuwara', 'Kundasale', 'Akurana', 'Pathadumbara',
                'Poojapitiya', 'Gangawata Korale', 'Pasbage Korale',
                'Udapalatha', 'Panvila', 'Delthota', 'Medadumbara',
                'Minipe', 'Harispattuwa', 'Pallegama', 'Patha Dumbara'
            ]
        },
        'Galle': {
            'lat_range': (5.9, 6.4),
            'lng_range': (80.0, 80.4),
            'ds_divisions': [
                'Galle Four Gravets', 'Akmeemana', 'Bope-Poddala', 'Hikkaduwa',
                'Bentota', 'Ambalangoda', 'Karandeniya', 'Balapitiya',
                'Elpitiya', 'Nagoda', 'Imaduwa', 'Neluwa', 'Yakkalamulla',
                'Gonapinuwala', 'Udugama', 'Baddegama', 'Ratgama'
            ]
        },
        'Matara': {
            'lat_range': (5.8, 6.2),
            'lng_range': (80.3, 80.9),
            'ds_divisions': [
                'Matara', 'Weligama', 'Mirissa', 'Kamburupitiya', 'Devinuwara',
                'Dickwella', 'Hakmana', 'Akuressa', 'Malimbada', 'Athuraliya',
                'Pasgoda', 'Pitabeddara', 'Kotapola', 'Kirinda-Puhulwella'
            ]
        },
        'Hambantota': {
            'lat_range': (6.0, 6.4),
            'lng_range': (80.8, 81.3),
            'ds_divisions': [
                'Hambantota', 'Tangalle', 'Tissamaharama', 'Ambalantota',
                'Beliatta', 'Weeraketiya', 'Okewela', 'Lunugamvehera',
                'Sooriyawewa', 'Kataragama'
            ]
        },
        'Ratnapura': {
            'lat_range': (6.5, 7.0),
            'lng_range': (80.3, 80.6),
            'ds_divisions': [
                'Ratnapura', 'Pelmadulla', 'Balangoda', 'Rakwana',
                'Nivitigala', 'Kalawana', 'Kolonne', 'Godakawela',
                'Kuruwita', 'Eheliyagoda', 'Embilipitiya', 'Imbulpe'
            ]
        },
        'Kegalle': {
            'lat_range': (7.0, 7.4),
            'lng_range': (80.1, 80.4),
            'ds_divisions': [
                'Kegalle', 'Rambukkana', 'Mawanella', 'Aranayaka',
                'Yatiyantota', 'Ruwanwella', 'Deraniyagala', 'Galigamuwa',
                'Warakapola', 'Bulathkohupitiya'
            ]
        },
        'Kurunegala': {
            'lat_range': (7.3, 7.8),
            'lng_range': (80.2, 80.6),
            'ds_divisions': [
                'Kurunegala', 'Kuliyapitiya', 'Narammala', 'Wariyapola',
                'Pannala', 'Melsiripura', 'Bingiriya', 'Kobeigane',
                'Ibbagamuwa', 'Hiripitiya', 'Polpithigama', 'Nikaweratiya',
                'Galgamuwa', 'Giribawa', 'Mawathagama', 'Polgahawela',
                'Ambanpola', 'Bamunakotuwa', 'Rideegama', 'Ehetuwewa',
                'Mahawa', 'Kotavehera', 'Rasnayakapura', 'Giriulla',
                'Mallawapitiya', 'Udubaddawa', 'Panduwasnuwara',
                'Weerambugedara', 'Maho', 'Ganewatta'
            ]
        },
        'Puttalam': {
            'lat_range': (7.8, 8.4),
            'lng_range': (79.8, 80.3),
            'ds_divisions': [
                'Puttalam', 'Wennappuwa', 'Marawila', 'Chilaw', 'Nattandiya',
                'Dankotuwa', 'Madampe', 'Pallama', 'Karuwalagaswewa',
                'Anamaduwa'
            ]
        },
        'Anuradhapura': {
            'lat_range': (8.2, 8.6),
            'lng_range': (80.3, 80.7),
            'ds_divisions': [
                'Anuradhapura East', 'Anuradhapura West', 'Kalawewa',
                'Mihintale', 'Nuwaragam Palatha Central', 'Nuwaragam Palatha East',
                'Rajanganaya', 'Thirappane', 'Kekirawa', 'Galnewa',
                'Palagala', 'Mahadivulwewa', 'Rambewa', 'Medawachchiya',
                'Horowpathana', 'Palugaswewa', 'Kahatagasdigiliya',
                'Thalawa', 'Nachchaduwa', 'Nochchimoddai'
            ]
        },
        'Polonnaruwa': {
            'lat_range': (7.8, 8.2),
            'lng_range': (80.8, 81.2),
            'ds_divisions': [
                'Polonnaruwa', 'Medirigiriya', 'Dimbulagala', 'Welikanda',
                'Hingurakgoda', 'Elahera', 'Thamankaduwa', 'Lankapura'
            ]
        },
        'Badulla': {
            'lat_range': (6.8, 7.2),
            'lng_range': (80.8, 81.3),
            'ds_divisions': [
                'Badulla', 'Bandarawela', 'Welimada', 'Haputale', 'Ella',
                'Passara', 'Mahiyanganaya', 'Soranathota', 'Hali-Ela',
                'Uva-Paranagama', 'Kandaketiya', 'Rideemaliyadda',
                'Meegahakivula', 'Lunugala'
            ]
        },
        'Monaragala': {
            'lat_range': (6.7, 7.1),
            'lng_range': (81.2, 81.6),
            'ds_divisions': [
                'Monaragala', 'Wellawaya', 'Medagama', 'Katharagama',
                'Siyambalanduwa', 'Madulla', 'Bibila', 'Buttala',
                'Sevanagala', 'Thanamalvila', 'Badalkumbura'
            ]
        },
        'Ampara': {
            'lat_range': (7.0, 7.5),
            'lng_range': (81.5, 82.0),
            'ds_divisions': [
                'Ampara', 'Akkaraipattu', 'Kalmunai', 'Sainthamaruthu',
                'Addalachchenai', 'Nintavur', 'Sammanthurai', 'Karaitivu',
                'Navithanveli', 'Pothuvil', 'Lahugala', 'Mahaoya',
                'Uhana', 'Padiyathalawa', 'Damana', 'Dehiattakandiya'
            ]
        },
        'Batticaloa': {
            'lat_range': (7.6, 8.0),
            'lng_range': (81.5, 82.0),
            'ds_divisions': [
                'Batticaloa', 'Eravur Pattu', 'Eravur Town', 'Koralaipattu',
                'Manmunai North', 'Manmunai South & Eruvilpattu',
                'Manmunai West', 'Kattankudy', 'Porativu Pattu'
            ]
        },
        'Trincomalee': {
            'lat_range': (8.4, 8.8),
            'lng_range': (80.8, 81.4),
            'ds_divisions': [
                'Trincomalee Town and Gravets', 'Kinniya', 'Muttur',
                'Kuchchaveli', 'Gomarankadawala', 'Kantale', 'Thambalagamuwa',
                'Padaviya', 'Seruvila'
            ]
        },
        'Matale': {
            'lat_range': (7.4, 7.8),
            'lng_range': (80.4, 80.8),
            'ds_divisions': [
                'Matale', 'Dambulla', 'Sigiriya', 'Naula', 'Ukuwela',
                'Rattota', 'Pallepola', 'Yatawatta', 'Galewela',
                'Wilgamuwa', 'Laggala-Pallegama'
            ]
        },
        'Nuwara Eliya': {
            'lat_range': (6.8, 7.2),
            'lng_range': (80.6, 81.0),
            'ds_divisions': [
                'Nuwara Eliya', 'Hatton', 'Kotmale', 'Hanguranketha',
                'Walapane', 'Ambagamuwa'
            ]
        },
        'Jaffna': {
            'lat_range': (9.4, 9.8),
            'lng_range': (79.9, 80.3),
            'ds_divisions': [
                'Jaffna', 'Nallur', 'Chavakachcheri', 'Point Pedro',
                'Karainagar', 'Velanai', 'Tellippalai', 'Kopay',
                'Uduvil', 'Maradanmaduvu'
            ]
        },
        'Kilinochchi': {
            'lat_range': (9.2, 9.6),
            'lng_range': (80.3, 80.6),
            'ds_divisions': [
                'Kilinochchi', 'Poonakary', 'Pallai', 'Pachchilaipalli'
            ]
        },
        'Mannar': {
            'lat_range': (8.8, 9.2),
            'lng_range': (79.8, 80.2),
            'ds_divisions': [
                'Mannar', 'Musali', 'Madhu', 'Nanaddan', 'Manthai West'
            ]
        },
        'Vavuniya': {
            'lat_range': (8.6, 9.0),
            'lng_range': (80.4, 80.8),
            'ds_divisions': [
                'Vavuniya', 'Vavuniya South', 'Vengalacheddikulam'
            ]
        },
        'Mullaitivu': {
            'lat_range': (9.0, 9.4),
            'lng_range': (80.6, 81.2),
            'ds_divisions': [
                'Mullaitivu', 'Manthai East', 'Thunukkai', 'Welioya',
                'Oddusuddan', 'Puthukudiyiruppu', 'Maritimepattu'
            ]
        }
    }
    
    # Sample GN divisions for some popular areas (this would be expanded in production)
    SAMPLE_GN_DIVISIONS = {
        'Colombo': [
            'Colombo 01', 'Colombo 02', 'Colombo 03', 'Colombo 04', 'Colombo 05',
            'Colombo 06', 'Colombo 07', 'Colombo 08', 'Colombo 09', 'Colombo 10',
            'Colombo 11', 'Colombo 12', 'Colombo 13', 'Colombo 14', 'Colombo 15'
        ],
        'Thimbirigasyaya': [
            'Narahenpita', 'Kirillapone', 'Wellawatte North', 'Wellawatte South',
            'Bambalapitiya', 'Havelock Town', 'Thimbirigasyaya'
        ],
        'Dehiwala-Mt.Lavinia': [
            'Dehiwala North', 'Dehiwala South', 'Mt. Lavinia', 'Ratmalana',
            'Kalubowila', 'Nedimala'
        ],
        'Moratuwa': [
            'Moratuwa North', 'Moratuwa South', 'Koralawella', 'Rawathawatta',
            'Katukurunda', 'Piliyandala', 'Egoda Uyana'
        ],
        'Kandy': [
            'Kandy City', 'Mahaiyawa', 'Akurana', 'Ampitiya', 'Peradeniya',
            'Gampola', 'Kadugannawa', 'Pilimatalawa'
        ],
        'Galle': [
            'Galle Fort', 'Kaluwella', 'Unawatuna', 'Habaraduwa', 'Koggala',
            'Ahangama', 'Midigama'
        ]
    }
    
    @classmethod
    def find_district_by_coordinates(cls, latitude: float, longitude: float) -> Optional[str]:
        """
        Find the district based on coordinates
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            
        Returns:
            District name if found, None otherwise
        """
        for district, bounds in cls.DISTRICT_BOUNDARIES.items():
            lat_min, lat_max = bounds['lat_range']
            lng_min, lng_max = bounds['lng_range']
            
            if lat_min <= latitude <= lat_max and lng_min <= longitude <= lng_max:
                return district
        
        return None
    
    @classmethod
    def get_ds_divisions_for_district(cls, district: str) -> List[str]:
        """
        Get DS (Divisional Secretariat) divisions for a district
        
        Args:
            district: District name
            
        Returns:
            List of DS divisions
        """
        if district in cls.DISTRICT_BOUNDARIES:
            return cls.DISTRICT_BOUNDARIES[district]['ds_divisions']
        return []
    
    @classmethod
    def estimate_ds_division(cls, latitude: float, longitude: float, district: str = None) -> Optional[str]:
        """
        Estimate the DS division based on coordinates and district
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            district: District name (if known)
            
        Returns:
            Estimated DS division name
        """
        if not district:
            district = cls.find_district_by_coordinates(latitude, longitude)
        
        if not district:
            return None
        
        ds_divisions = cls.get_ds_divisions_for_district(district)
        if not ds_divisions:
            return None
        
        # For now, return the first DS division (main town)
        # In production, this would use more sophisticated boundary checking
        return ds_divisions[0] if ds_divisions else None
    
    @classmethod
    def get_sample_gn_divisions(cls, ds_division: str) -> List[str]:
        """
        Get sample GN divisions for a DS division
        
        Args:
            ds_division: DS division name
            
        Returns:
            List of sample GN divisions
        """
        return cls.SAMPLE_GN_DIVISIONS.get(ds_division, [])
    
    @classmethod
    def estimate_gn_division(cls, latitude: float, longitude: float, ds_division: str = None) -> Optional[str]:
        """
        Estimate the GN division based on coordinates and DS division
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            ds_division: DS division name (if known)
            
        Returns:
            Estimated GN division name
        """
        if not ds_division:
            district = cls.find_district_by_coordinates(latitude, longitude)
            ds_division = cls.estimate_ds_division(latitude, longitude, district)
        
        if not ds_division:
            return None
        
        gn_divisions = cls.get_sample_gn_divisions(ds_division)
        if not gn_divisions:
            return f"{ds_division} - GN Division 1"  # Generic fallback
        
        # For now, return the first GN division
        # In production, this would use coordinate-based selection
        return gn_divisions[0]
    
    @classmethod
    def get_comprehensive_admin_info(cls, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get comprehensive administrative division information for coordinates
        
        Args:
            latitude: Property latitude
            longitude: Property longitude
            
        Returns:
            Dict containing all administrative division information
        """
        district = cls.find_district_by_coordinates(latitude, longitude)
        
        if not district:
            return {
                'district': None,
                'ds_division': None,
                'gn_division': None,
                'province': cls._get_province_for_district(None),
                'available_ds_divisions': [],
                'available_gn_divisions': [],
                'confidence': 'low',
                'method': 'coordinate_fallback'
            }
        
        ds_division = cls.estimate_ds_division(latitude, longitude, district)
        gn_division = cls.estimate_gn_division(latitude, longitude, ds_division)
        
        return {
            'district': district,
            'ds_division': ds_division,
            'gn_division': gn_division,
            'province': cls._get_province_for_district(district),
            'available_ds_divisions': cls.get_ds_divisions_for_district(district),
            'available_gn_divisions': cls.get_sample_gn_divisions(ds_division) if ds_division else [],
            'confidence': 'medium',  # Would be 'high' with precise boundary data
            'method': 'coordinate_estimation'
        }
    
    @classmethod
    def _get_province_for_district(cls, district: str) -> Optional[str]:
        """
        Get the province for a district
        
        Args:
            district: District name
            
        Returns:
            Province name
        """
        province_mapping = {
            # Western Province
            'Colombo': 'Western',
            'Gampaha': 'Western',
            'Kalutara': 'Western',
            
            # Central Province
            'Kandy': 'Central',
            'Matale': 'Central',
            'Nuwara Eliya': 'Central',
            
            # Southern Province
            'Galle': 'Southern',
            'Matara': 'Southern',
            'Hambantota': 'Southern',
            
            # Northern Province
            'Jaffna': 'Northern',
            'Kilinochchi': 'Northern',
            'Mannar': 'Northern',
            'Mullaitivu': 'Northern',
            'Vavuniya': 'Northern',
            
            # Eastern Province
            'Ampara': 'Eastern',
            'Batticaloa': 'Eastern',
            'Trincomalee': 'Eastern',
            
            # North Western Province
            'Kurunegala': 'North Western',
            'Puttalam': 'North Western',
            
            # North Central Province
            'Anuradhapura': 'North Central',
            'Polonnaruwa': 'North Central',
            
            # Uva Province
            'Badulla': 'Uva',
            'Monaragala': 'Uva',
            
            # Sabaragamuwa Province
            'Ratnapura': 'Sabaragamuwa',
            'Kegalle': 'Sabaragamuwa'
        }
        
        return province_mapping.get(district)


def enhance_location_with_admin_divisions(
    latitude: float, 
    longitude: float, 
    google_maps_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Enhance location data with Sri Lankan administrative divisions
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
        google_maps_data: Existing Google Maps reverse geocoding data
        
    Returns:
        Enhanced location data with admin divisions
    """
    admin_info = SriLankaAdminDivisions.get_comprehensive_admin_info(latitude, longitude)
    
    result = {
        'coordinates': {
            'latitude': latitude,
            'longitude': longitude
        },
        'sri_lanka_admin': admin_info,
        'google_maps_data': google_maps_data or {},
        'enhanced_location': {}
    }
    
    # Combine Google Maps data with Sri Lankan admin data
    enhanced = {}
    
    # Use Sri Lankan admin data as primary source
    if admin_info['province']:
        enhanced['province'] = admin_info['province']
    elif google_maps_data and google_maps_data.get('components', {}).get('province'):
        enhanced['province'] = google_maps_data['components']['province']
    
    if admin_info['district']:
        enhanced['district'] = admin_info['district']
    elif google_maps_data and google_maps_data.get('components', {}).get('district'):
        enhanced['district'] = google_maps_data['components']['district']
    
    # Sri Lankan-specific admin divisions
    enhanced['ds_division'] = admin_info['ds_division']
    enhanced['gn_division'] = admin_info['gn_division']
    
    # Use Google Maps data for detailed address
    if google_maps_data:
        components = google_maps_data.get('components', {})
        enhanced['city'] = components.get('city')
        enhanced['area'] = components.get('area')
        enhanced['formatted_address'] = google_maps_data.get('formatted_address')
    
    result['enhanced_location'] = enhanced
    return result