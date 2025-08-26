"""
Comprehensive validation utilities and custom validators for the ValuerPro application.
"""

from pydantic import field_validator, BaseModel
from typing import Any, Optional, Union, List
from datetime import datetime, date
from decimal import Decimal
import re
from uuid import UUID


class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(message)


class ValidationMixin(BaseModel):
    """Base mixin for common validation patterns"""
    
    @field_validator('*', mode='before')
    @classmethod
    def clean_strings(cls, v):
        """Clean and trim string values"""
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v


# Validation helpers
def validate_positive_number(value: Union[int, float, Decimal], field_name: str = "Value") -> Union[int, float, Decimal]:
    """Validate that a number is positive"""
    if value is None:
        return value
    if value <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return value


def validate_percentage(value: Union[int, float], field_name: str = "Percentage") -> Union[int, float]:
    """Validate that a value is a valid percentage (0-100)"""
    if value is None:
        return value
    if not 0 <= value <= 100:
        raise ValueError(f"{field_name} must be between 0 and 100")
    return value


def validate_coordinates(latitude: Optional[float], longitude: Optional[float]) -> tuple:
    """Validate GPS coordinates"""
    if latitude is None or longitude is None:
        return latitude, longitude
    
    if not -90 <= latitude <= 90:
        raise ValueError("Latitude must be between -90 and 90 degrees")
    
    if not -180 <= longitude <= 180:
        raise ValueError("Longitude must be between -180 and 180 degrees")
    
    return latitude, longitude


def validate_phone_number(phone: str) -> str:
    """Validate phone number format"""
    if not phone:
        return phone
    
    # Remove spaces, hyphens, and parentheses
    cleaned = re.sub(r'[\s\-\(\)]+', '', phone)
    
    # Allow + for international numbers
    if not re.match(r'^\+?[\d]{10,15}$', cleaned):
        raise ValueError("Phone number must contain 10-15 digits and may start with +")
    
    return phone


def validate_sri_lanka_postal_code(postal_code: str) -> str:
    """Validate Sri Lankan postal code format (5 digits)"""
    if not postal_code:
        return postal_code
    
    if not re.match(r'^\d{5}$', postal_code):
        raise ValueError("Sri Lankan postal code must be exactly 5 digits")
    
    return postal_code


def validate_lot_plan_number(value: str, field_name: str) -> str:
    """Validate lot or plan number format"""
    if not value:
        return value
    
    # Allow letters, numbers, hyphens, and forward slashes
    if not re.match(r'^[A-Za-z0-9\-\/]+$', value):
        raise ValueError(f"{field_name} must contain only letters, numbers, hyphens, and forward slashes")
    
    if len(value) > 30:
        raise ValueError(f"{field_name} must be less than 30 characters")
    
    return value.upper()


def validate_extent_perches(extent: Union[int, float]) -> Union[int, float]:
    """Validate land extent in perches"""
    if extent is None:
        return extent
    
    if extent <= 0:
        raise ValueError("Land extent must be greater than 0 perches")
    
    if extent > 10000:
        raise ValueError("Land extent cannot exceed 10,000 perches (unusually large)")
    
    return extent


def validate_currency_amount(amount: Union[int, float, Decimal], currency: str = "LKR") -> Union[int, float, Decimal]:
    """Validate currency amount"""
    if amount is None:
        return amount
    
    if amount < 0:
        raise ValueError("Currency amount cannot be negative")
    
    # Set reasonable maximum based on currency
    max_amounts = {
        'LKR': 999999999999,  # 999 billion LKR
        'USD': 99999999,      # 99 million USD
        'EUR': 99999999,      # 99 million EUR
        'GBP': 99999999,      # 99 million GBP
    }
    
    max_amount = max_amounts.get(currency, 999999999999)
    if amount > max_amount:
        raise ValueError(f"Amount exceeds maximum allowed for {currency}")
    
    return amount


def validate_future_date(date_value: Union[datetime, date], field_name: str = "Date") -> Union[datetime, date]:
    """Validate that a date is not in the future"""
    if date_value is None:
        return date_value
    
    today = datetime.now().date()
    check_date = date_value.date() if isinstance(date_value, datetime) else date_value
    
    if check_date > today:
        raise ValueError(f"{field_name} cannot be in the future")
    
    return date_value


def validate_date_range(start_date: Union[datetime, date], end_date: Union[datetime, date]) -> tuple:
    """Validate that start date is before end date"""
    if start_date is None or end_date is None:
        return start_date, end_date
    
    start_check = start_date.date() if isinstance(start_date, datetime) else start_date
    end_check = end_date.date() if isinstance(end_date, datetime) else end_date
    
    if start_check > end_check:
        raise ValueError("Start date must be before end date")
    
    return start_date, end_date


def validate_building_area(area: Union[int, float], field_name: str = "Building area") -> Union[int, float]:
    """Validate building area"""
    if area is None:
        return area
    
    if area <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    
    if area > 100000:  # 100,000 sq ft is very large
        raise ValueError(f"{field_name} seems unusually large (over 100,000 sq ft)")
    
    return area


def validate_year(year: int, field_name: str = "Year") -> int:
    """Validate year within reasonable range"""
    if year is None:
        return year
    
    current_year = datetime.now().year
    if year < 1800:
        raise ValueError(f"{field_name} cannot be before 1800")
    
    if year > current_year + 5:  # Allow some future years for planning
        raise ValueError(f"{field_name} cannot be more than 5 years in the future")
    
    return year


def validate_text_length(text: str, min_length: int = 0, max_length: int = 1000, field_name: str = "Text") -> str:
    """Validate text length"""
    if not text:
        if min_length > 0:
            raise ValueError(f"{field_name} is required")
        return text
    
    if len(text) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters")
    
    if len(text) > max_length:
        raise ValueError(f"{field_name} must be no more than {max_length} characters")
    
    return text


def validate_choice(value: str, choices: List[str], field_name: str = "Value") -> str:
    """Validate that value is in allowed choices"""
    if not value:
        return value
    
    if value not in choices:
        choices_str = "', '".join(choices)
        raise ValueError(f"{field_name} must be one of: '{choices_str}'")
    
    return value


def validate_email_list(emails: List[str]) -> List[str]:
    """Validate a list of email addresses"""
    if not emails:
        return emails
    
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    for email in emails:
        if not email_pattern.match(email):
            raise ValueError(f"Invalid email format: {email}")
    
    return emails


# Common validation patterns
VALIDATION_PATTERNS = {
    'lot_number': r'^[A-Za-z0-9\-\/]+$',
    'plan_number': r'^[A-Za-z0-9\-\/]+$',
    'phone_number': r'^\+?[\d\s\-\(\)]{10,20}$',
    'postal_code_lk': r'^\d{5}$',
    'year': r'^\d{4}$',
    'reference_number': r'^[A-Za-z0-9\-_]+$',
}

# Common validation choices
VALIDATION_CHOICES = {
    'report_status': ['draft', 'in_review', 'approved', 'finalized', 'archived'],
    'report_purpose': [
        'Bank valuation', 'Insurance valuation', 'Investment decision', 
        'Sale/Purchase', 'Rental assessment', 'Tax assessment', 
        'Legal proceedings', 'Asset management', 'Other'
    ],
    'basis_of_value': ['Market Value', 'Fair Value', 'Investment Value', 'Liquidation Value'],
    'currency': ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'],
    'property_type': [
        'residential_land', 'commercial_land', 'industrial_land', 'agricultural_land',
        'residential_building', 'commercial_building', 'industrial_building', 'mixed_use'
    ],
    'building_condition': ['excellent', 'good', 'average', 'poor', 'dilapidated'],
    'utility_availability': ['available', 'partially_available', 'not_available', 'planned'],
    'zoning_classification': [
        'residential', 'commercial', 'industrial', 'mixed', 'agricultural', 
        'special_economic_zone', 'urban_development_area'
    ],
    'sri_lanka_districts': [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Moneragala', 'Ratnapura', 'Kegalle'
    ],
    'sri_lanka_provinces': [
        'Western', 'Central', 'Southern', 'Northern', 'Eastern',
        'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
    ]
}