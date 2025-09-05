from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, model_validator
from typing import Optional, Any, List, Dict
from datetime import datetime
from uuid import UUID
from decimal import Decimal

from app.core.validation import (
    ValidationMixin,
    validate_positive_number,
    validate_coordinates,
    validate_phone_number,
    validate_lot_plan_number,
    validate_extent_perches,
    validate_currency_amount,
    validate_future_date,
    validate_choice,
    validate_text_length,
    VALIDATION_CHOICES
)


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "valuer"


class ValuerProfileBase(BaseModel):
    titles: Optional[str] = None
    full_name: Optional[str] = None
    designation: Optional[str] = None
    qualifications: Optional[List[str]] = None
    panels: Optional[List[str]] = None
    registration_no: Optional[str] = None
    membership_status: Optional[str] = None
    company_name: Optional[str] = None
    firm_address: Optional[str] = None
    address: Optional[str] = None
    phones: Optional[List[str]] = None
    contact_phones: Optional[List[str]] = None
    email: Optional[str] = None
    contact_email: Optional[str] = None
    default_standards: Optional[str] = None
    indemnity_status: Optional[str] = None
    default_disclaimers: Optional[str] = None
    default_certificate: Optional[str] = None


class ValuerProfileCreate(ValuerProfileBase):
    pass  # user_id will be set from authenticated user


class ValuerProfileUpdate(ValuerProfileBase):
    pass


class ValuerProfile(ValuerProfileBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class UserCreate(UserBase):
    password: str
    
    # Professional information fields for registration
    registration_no: Optional[str] = None
    qualifications: Optional[str] = None  # e.g., "AIVSL, BSc Surveying"
    experience_years: Optional[int] = None
    specialization: Optional[str] = None  # e.g., "residential", "commercial", "industrial"
    firm_name: Optional[str] = None
    designation: Optional[str] = None  # e.g., "Senior Valuer", "Principal Valuer"
    contact_phone: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate basic password requirements during registration"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    valuer_profile: Optional[ValuerProfile] = None


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Profile validation schemas
class ProfileValidationResult(BaseModel):
    is_complete: bool
    missing_fields: List[str]
    completion_percentage: float
    message: str


class ProfileCompletionStatus(BaseModel):
    can_create_reports: bool
    profile_complete: bool
    required_fields: List[str]
    missing_fields: List[str]
    completion_percentage: float


# Client schemas
class ClientBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_numbers: Optional[List[str]] = None
    email: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    name: Optional[str] = None


class Client(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


# Report schemas
class ReportBase(ValidationMixin):
    ref: Optional[str] = None
    purpose: Optional[str] = None
    basis_of_value: Optional[str] = "Market Value"
    report_type: Optional[str] = "standard"
    status: Optional[str] = "draft"
    report_date: Optional[datetime] = None
    inspection_date: Optional[datetime] = None
    currency: Optional[str] = "LKR"
    fsv_percentage: Optional[float] = 80.0

    @field_validator('ref')
    @classmethod
    def validate_ref(cls, v):
        if v is not None:
            return validate_text_length(v, max_length=50, field_name="Reference number")
        return v

    @field_validator('purpose')
    @classmethod
    def validate_purpose(cls, v):
        if v is not None:
            return validate_choice(v, VALIDATION_CHOICES['report_purpose'], "Report purpose")
        return v

    @field_validator('basis_of_value')
    @classmethod
    def validate_basis_of_value(cls, v):
        if v is not None:
            return validate_choice(v, VALIDATION_CHOICES['basis_of_value'], "Basis of value")
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            return validate_choice(v, VALIDATION_CHOICES['report_status'], "Report status")
        return v

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        if v is not None:
            return validate_choice(v, VALIDATION_CHOICES['currency'], "Currency")
        return v

    @field_validator('inspection_date', 'report_date')
    @classmethod
    def validate_dates(cls, v, info):
        if v is not None:
            return validate_future_date(v, info.field_name.replace('_', ' ').title())
        return v

    @field_validator('fsv_percentage')
    @classmethod
    def validate_fsv_percentage(cls, v):
        if v is not None:
            if not 0 <= v <= 100:
                raise ValueError("Forced sale value percentage must be between 0 and 100")
        return v

    @model_validator(mode='after')
    def validate_date_order(self):
        """Ensure report date is after inspection date if both are provided"""
        if self.inspection_date and self.report_date:
            if self.inspection_date.date() > self.report_date.date():
                raise ValueError("Inspection date cannot be after report date")
        return self


class ReportCreate(ReportBase):
    client_id: Optional[UUID] = None


class ReportUpdate(BaseModel):
    ref: Optional[str] = None
    purpose: Optional[str] = None
    basis_of_value: Optional[str] = None
    report_type: Optional[str] = None
    status: Optional[str] = None
    report_date: Optional[datetime] = None
    inspection_date: Optional[datetime] = None
    currency: Optional[str] = None
    fsv_percentage: Optional[float] = None
    finalized_at: Optional[datetime] = None


class Report(ReportBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    author_id: Optional[UUID] = None
    client_id: Optional[UUID] = None


class ReportWithAuthor(Report):
    author: Optional[User] = None
    client: Optional[Client] = None


# Property schemas
class IdentificationBase(BaseModel):
    lot_number: Optional[str] = None
    plan_number: Optional[str] = None
    plan_date: Optional[datetime] = None
    surveyor_name: Optional[str] = None
    land_name: Optional[str] = None
    extent_perches: Optional[float] = None
    extent_sqm: Optional[float] = None
    extent_local: Optional[str] = None
    boundaries: Optional[Dict] = None
    title_owner: Optional[str] = None
    deed_no: Optional[str] = None
    deed_date: Optional[datetime] = None
    notary: Optional[str] = None
    interest: Optional[str] = "freehold"


class IdentificationCreate(IdentificationBase):
    property_id: UUID


class IdentificationUpdate(IdentificationBase):
    pass


class Identification(IdentificationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    property_id: UUID
    created_at: datetime
    updated_at: datetime


class LocationBase(BaseModel):
    address_full: Optional[str] = None
    village: Optional[str] = None
    gn_division: Optional[str] = None
    ds_division: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class LocationCreate(LocationBase):
    property_id: UUID


class LocationUpdate(LocationBase):
    pass


class Location(LocationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    property_id: UUID
    created_at: datetime
    updated_at: datetime


class PropertyBase(BaseModel):
    property_index: Optional[int] = 1
    property_type: Optional[str] = None


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(PropertyBase):
    pass


class Property(PropertyBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    report_id: UUID
    created_at: datetime
    updated_at: datetime
    identification: Optional[Identification] = None
    location: Optional[Location] = None


# Valuation schemas
class ValuationLineBase(ValidationMixin):
    line_type: str  # land, building, other
    description: str
    quantity: float
    unit: str  # perch, sqft, lump sum
    rate: float
    depreciation_pct: Optional[float] = 0.0
    value: float
    sort_order: Optional[int] = 0

    @field_validator('line_type')
    @classmethod
    def validate_line_type(cls, v):
        allowed_types = ['land', 'building', 'improvements', 'other']
        return validate_choice(v, allowed_types, "Line type")

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        return validate_text_length(v, min_length=3, max_length=200, field_name="Description")

    @field_validator('quantity', 'rate', 'value')
    @classmethod
    def validate_positive_values(cls, v, info):
        return validate_positive_number(v, info.field_name.replace('_', ' ').title())

    @field_validator('depreciation_pct')
    @classmethod
    def validate_depreciation(cls, v):
        if v is not None and not 0 <= v <= 100:
            raise ValueError("Depreciation percentage must be between 0 and 100")
        return v

    @field_validator('unit')
    @classmethod
    def validate_unit(cls, v):
        allowed_units = ['perch', 'sqft', 'sqm', 'acre', 'hectare', 'lump_sum', 'each']
        return validate_choice(v, allowed_units, "Unit")

    @model_validator(mode='after')
    def validate_calculated_value(self):
        """Validate that value matches quantity * rate * (1 - depreciation)"""
        if all([self.quantity, self.rate, self.depreciation_pct is not None]):
            expected_value = self.quantity * self.rate * (1 - self.depreciation_pct / 100)
            # Allow small rounding differences
            if abs(self.value - expected_value) > 0.01:
                raise ValueError(f"Value ({self.value}) doesn't match calculated value ({expected_value:.2f})")
        return self


class ValuationLineCreate(ValuationLineBase):
    pass


class ValuationLineUpdate(ValuationLineBase):
    line_type: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    rate: Optional[float] = None
    value: Optional[float] = None


class ValuationLine(ValuationLineBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    property_id: UUID
    created_at: datetime
    updated_at: datetime


class ValuationSummaryBase(ValidationMixin):
    market_value: float
    market_value_words: str
    forced_sale_value: float

    @field_validator('market_value', 'forced_sale_value')
    @classmethod
    def validate_values(cls, v, info):
        return validate_positive_number(v, info.field_name.replace('_', ' ').title())

    @field_validator('market_value_words')
    @classmethod
    def validate_value_words(cls, v):
        return validate_text_length(v, min_length=10, max_length=500, field_name="Market value in words")

    @model_validator(mode='after')
    def validate_forced_sale_logic(self):
        """Ensure forced sale value is less than or equal to market value"""
        if self.forced_sale_value > self.market_value:
            raise ValueError("Forced sale value cannot exceed market value")
        
        # Typically forced sale value should be 60-90% of market value
        if self.forced_sale_value < (self.market_value * 0.5):
            raise ValueError("Forced sale value seems unusually low (less than 50% of market value)")
        
        return self


class ValuationSummaryCreate(ValuationSummaryBase):
    pass


class ValuationSummaryUpdate(ValuationSummaryBase):
    market_value: Optional[float] = None
    market_value_words: Optional[str] = None
    forced_sale_value: Optional[float] = None


class ValuationSummary(ValuationSummaryBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    report_id: UUID
    created_at: datetime
    updated_at: datetime


# File upload schemas
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    original_filename: str
    path: str
    mime_type: str
    size: int
    report_id: Optional[str] = None
    uploaded_at: datetime
    
    
class MultipleFileUploadResponse(BaseModel):
    files: List[FileUploadResponse]
    total_files: int
    total_size: int


# File database schemas
class FileBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    mime_type: str
    file_size: int
    report_id: Optional[UUID] = None


class FileCreate(FileBase):
    uploaded_by: UUID


class File(FileBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    uploaded_by: UUID
    checksum: Optional[str] = None
    kind: Optional[str] = "other"
    created_at: datetime
    updated_at: datetime


# OCR schemas
class OCRPageData(BaseModel):
    page: int
    text: str


class OCRResultBase(BaseModel):
    language: Optional[str] = None
    raw_text: Optional[str] = None
    blocks_json: Optional[Dict] = None
    confidence_score: Optional[int] = None
    processing_time: Optional[int] = None
    ocr_engine: str = "google_vision"


class OCRResultCreate(OCRResultBase):
    file_id: UUID
    processed_by: UUID


class OCRResultUpdate(BaseModel):
    edited_text: Optional[str] = None
    is_edited: Optional[bool] = None


class OCRResult(OCRResultBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    edited_text: Optional[str] = None
    is_edited: bool = False
    file_id: UUID
    processed_by: UUID
    created_at: datetime
    updated_at: datetime


class OCRResultWithFile(OCRResult):
    file: File