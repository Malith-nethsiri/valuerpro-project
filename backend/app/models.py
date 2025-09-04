from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float, Enum, Index
from sqlalchemy.sql import text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from datetime import datetime
import uuid
import enum

Base = declarative_base()


class ReportStatus(enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FINALIZED = "finalized"


class PropertyType(enum.Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    VACANT_LAND = "vacant_land"
    AGRICULTURAL = "agricultural"


class FileKind(enum.Enum):
    SURVEY_PLAN = "survey_plan"
    PHOTO = "photo"
    DEED = "deed"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="valuer")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    valuer_profile = relationship("ValuerProfile", back_populates="user", uselist=False)
    reports = relationship("Report", back_populates="author")
    clients = relationship("Client", back_populates="author")


class ValuerProfile(Base):
    __tablename__ = "valuer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Basic professional details
    titles = Column(String)  # Mr./Mrs./Dr./Prof.
    full_name = Column(String)  # Complete professional name
    designation = Column(String)  # Professional designation (e.g., Chartered Valuer, FIVSL)
    qualifications = Column(ARRAY(String))  # Professional qualifications
    panels = Column(ARRAY(String))  # Panel memberships
    
    # Registration & Membership
    registration_no = Column(String)  # Membership/Registration number
    membership_status = Column(String)  # IVSL membership status
    
    # Company Information
    company_name = Column(String)  # Valuation firm or company name
    firm_address = Column(Text)  # Complete firm address
    
    # Contact information
    address = Column(Text)  # Personal address
    phones = Column(ARRAY(String))  # Personal phones
    contact_phones = Column(ARRAY(String))  # Business/firm contact numbers
    email = Column(String)  # Personal email
    contact_email = Column(String)  # Business/professional email
    
    # Professional Standards & Insurance
    default_standards = Column(String)  # Default valuation standards applied
    indemnity_status = Column(String)  # Professional indemnity insurance status
    
    # Default Legal Content (to reuse across reports)
    default_disclaimers = Column(Text)  # Standard disclaimers text
    default_certificate = Column(Text)  # Standard professional certificate text
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="valuer_profile")


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    address = Column(Text)
    contact_numbers = Column(ARRAY(String))
    email = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign keys
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    author = relationship("User", back_populates="clients")
    reports = relationship("Report", back_populates="client")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index('ix_reports_author_ref', 'author_id', 'ref', unique=True, postgresql_where=text("ref IS NOT NULL AND ref <> ''")),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ref = Column(String, index=True, nullable=True)  # Report reference number - unique per author
    purpose = Column(String, nullable=True)  # Valuation purpose
    basis_of_value = Column(String, default="Market Value")  # Basis of valuation
    report_type = Column(String, default="standard")  # Report template type
    status = Column(String, default="draft")
    
    # Dates
    report_date = Column(DateTime, nullable=True)
    inspection_date = Column(DateTime, nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    
    # Financial settings
    currency = Column(String, default="LKR")
    fsv_percentage = Column(Float, default=80.0)  # Forced Sale Value percentage
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign keys
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    
    # Relationships
    author = relationship("User", back_populates="reports")
    client = relationship("Client", back_populates="reports")
    properties = relationship("Property", back_populates="report")
    files = relationship("File", back_populates="report")
    appendices = relationship("Appendix", back_populates="report")
    ai_suggestions = relationship("AISuggestion", back_populates="report")
    revisions = relationship("Revision", back_populates="report")
    disclaimers = relationship("Disclaimer", back_populates="report", uselist=False)
    certificate = relationship("Certificate", back_populates="report", uselist=False)
    valuation_summary = relationship("ValuationSummary", back_populates="report", uselist=False)


class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    property_index = Column(Integer, default=1)  # For multi-property reports
    property_type = Column(String, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="properties")
    identification = relationship("Identification", back_populates="property", uselist=False)
    location = relationship("Location", back_populates="property", uselist=False)
    access = relationship("Access", back_populates="property", uselist=False)
    site = relationship("Site", back_populates="property", uselist=False)
    buildings = relationship("Building", back_populates="property")
    utilities = relationship("Utilities", back_populates="property", uselist=False)
    planning = relationship("Planning", back_populates="property", uselist=False)
    locality = relationship("Locality", back_populates="property", uselist=False)
    valuation_lines = relationship("ValuationLine", back_populates="property")


class Identification(Base):
    __tablename__ = "identification"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    # Plan details
    lot_number = Column(String, nullable=False)
    plan_number = Column(String, nullable=False)
    plan_date = Column(DateTime, nullable=False)
    surveyor_name = Column(String, nullable=False)
    land_name = Column(String)
    
    # Extent
    extent_perches = Column(Float, nullable=False)
    extent_sqm = Column(Float, nullable=False)
    extent_local = Column(String)  # Local format (e.g., "2A-3R-15.5P")
    
    # Boundaries
    boundaries = Column(JSON)  # {north, east, south, west}
    
    # Title information
    title_owner = Column(String)
    deed_no = Column(String)
    deed_date = Column(DateTime)
    notary = Column(String)
    interest = Column(String, default="freehold")  # freehold, leasehold
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="identification")


class Location(Base):
    __tablename__ = "location"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    # Address details
    address_full = Column(Text)
    village = Column(String)
    gn_division = Column(String)  # Grama Niladhari Division
    ds_division = Column(String)  # Divisional Secretariat
    district = Column(String, nullable=False)
    province = Column(String, nullable=False)
    
    # Coordinates
    lat = Column(Float)
    lng = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="location")


class Access(Base):
    __tablename__ = "access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    landmark = Column(String)
    directions_text = Column(Text)
    road_names = Column(String)
    road_width = Column(String)
    road_surface = Column(String)
    maintainer = Column(String)  # Local Authority, Private, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="access")


class Site(Base):
    __tablename__ = "site"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    shape = Column(String)
    topography = Column(String)
    level_vs_road = Column(String)
    soil = Column(String)
    water_table_depth_ft = Column(Float)
    frontage_ft = Column(Float)
    features = Column(ARRAY(String))  # boundary wall, gate, drainage, etc.
    flood_risk = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="site")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    building_index = Column(Integer, default=1)
    
    # Building details
    type = Column(String, nullable=False)  # House, Shop, Warehouse, etc.
    storeys = Column(Integer, default=1)
    structure = Column(String)  # Masonry, Timber, RCC, etc.
    roof_type = Column(String)  # Tile, Sheet, Concrete, etc.
    roof_structure = Column(String)  # Timber, RCC, Steel, etc.
    walls = Column(String)
    floors = Column(String)
    doors = Column(String)
    windows = Column(String)
    layout_text = Column(Text)
    
    # Area
    area_sqft = Column(Float, nullable=False)
    area_sqm = Column(Float, nullable=False)
    
    # Condition
    age_years = Column(Integer)
    condition = Column(String)  # Excellent, Good, Fair, Poor
    occupancy = Column(String)  # Owner-occupied, Tenanted, Vacant
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="buildings")


class Utilities(Base):
    __tablename__ = "utilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    electricity = Column(Boolean, default=False)
    water = Column(Boolean, default=False)
    telecom = Column(Boolean, default=False)
    sewerage = Column(String)
    drainage = Column(String)
    other = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="utilities")


class Planning(Base):
    __tablename__ = "planning"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    zoning = Column(String)
    street_line = Column(String)
    easements = Column(Text)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="planning")


class Locality(Base):
    __tablename__ = "locality"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False, unique=True)
    
    narrative = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="locality")


class ValuationLine(Base):
    __tablename__ = "valuation_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    
    line_type = Column(String, nullable=False)  # land, building, other
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # perch, sqft, lump sum
    rate = Column(Float, nullable=False)
    depreciation_pct = Column(Float, default=0.0)
    value = Column(Float, nullable=False)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="valuation_lines")


class ValuationSummary(Base):
    __tablename__ = "valuation_summary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, unique=True)
    
    market_value = Column(Float, nullable=False)
    market_value_words = Column(String, nullable=False)
    forced_sale_value = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="valuation_summary")


class Disclaimer(Base):
    __tablename__ = "disclaimers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, unique=True)
    
    text = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="disclaimers")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False, unique=True)
    
    text = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="certificate")


class Appendix(Base):
    __tablename__ = "appendices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    
    type = Column(String, nullable=False)  # map, plan, photo, comparable, other
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    caption = Column(String)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="appendices")
    file = relationship("File")


class File(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_url = Column(String)  # Cloud storage URL
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    checksum = Column(String)
    sha256_hash = Column(String)  # SHA256 hash for integrity checking
    kind = Column(String, default="other")
    
    # Cloud storage fields
    storage_provider = Column(String, default="local")  # local, s3, etc.
    storage_key = Column(String)  # Key/path in cloud storage
    
    # Validation and security fields
    validation_status = Column(String, default="pending")  # passed, failed, pending
    risk_level = Column(String, default="low")  # low, medium, high
    description = Column(Text)
    category = Column(String, default="document")
    metadata_ = Column("metadata", JSON)  # Additional metadata as JSON
    
    # Foreign keys
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="files")
    uploader = relationship("User")
    ocr_results = relationship("OCRResult", back_populates="file")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # OCR data
    language = Column(String)
    raw_text = Column(Text)
    blocks_json = Column(JSON)  # Structured OCR data
    confidence_score = Column(Integer)  # 0-100
    
    # Processing metadata
    processing_time = Column(Integer)  # milliseconds
    ocr_engine = Column(String, default="google_vision")
    
    # User editing
    edited_text = Column(Text)  # User-corrected version
    is_edited = Column(Boolean, default=False)
    
    # Foreign key
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    file = relationship("File", back_populates="ocr_results")
    processor = relationship("User")


class AISuggestion(Base):
    """
    AI Suggestion model for storing AI-powered report suggestions.
    
    This model is designed to store suggestions generated by AI systems
    for improving report content, identifying missing information, or
    suggesting better descriptions based on similar properties.
    
    Status: Placeholder for future AI suggestion feature
    TODO: Implement AI suggestion generation and management endpoints
    """
    __tablename__ = "ai_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    
    section = Column(String, nullable=False)  # identification, location, etc.
    content = Column(Text, nullable=False)
    confidence = Column(Float)  # 0.0-1.0
    
    # User actions
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="ai_suggestions")
    property = relationship("Property")
    acceptor = relationship("User")


class Revision(Base):
    """
    Revision model for tracking report changes and version history.
    
    This model is designed to store a complete history of changes made
    to reports, enabling version control, change tracking, and the ability
    to revert to previous versions if needed.
    
    Status: Placeholder for future revision tracking feature
    TODO: Implement version control system with diff generation and restore functionality
    """
    __tablename__ = "revisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    version = Column(Integer, nullable=False)
    diff = Column(JSON)  # Change details
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="revisions")
    author = relationship("User")


class Template(Base):
    """
    Template model for storing report generation templates.
    
    This model is designed to store customizable report templates
    that can be used to generate different types of valuation reports
    with consistent formatting and structure.
    
    Status: Placeholder for future template management feature
    TODO: Implement template CRUD operations, template selection, and custom field mapping
    """
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    docx_template_blob = Column(Text)  # Base64 or file reference
    fields_map = Column(JSON)  # Field mapping configuration
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RegulationCategory(enum.Enum):
    UDA = "uda"
    MUNICIPAL = "municipal"
    URBAN_COUNCIL = "urban_council"
    PRADESHIYA_SABHA = "pradeshiya_sabha"
    CEA = "cea"
    NBRO = "nbro"
    RDA = "rda"
    OTHER = "other"


class RegulationDocument(Base):
    __tablename__ = "regulation_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Document details
    title = Column(String, nullable=False)
    description = Column(Text)
    authority = Column(String, nullable=False)
    category = Column(Enum(RegulationCategory), nullable=False)
    document_type = Column(String, nullable=False)  # Development Plan, Building Regulations, etc.
    
    # File information
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String)
    
    # Applicability
    applicable_areas = Column(ARRAY(String))  # List of cities/districts
    province = Column(String)
    district = Column(String)
    
    # Geographic bounds (optional - for precise location matching)
    north_bound = Column(Float)
    south_bound = Column(Float)
    east_bound = Column(Float)  
    west_bound = Column(Float)
    
    # Regulatory details
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    superseded_by_id = Column(UUID(as_uuid=True), ForeignKey("regulation_documents.id"), nullable=True)
    version = Column(String)
    gazette_number = Column(String)
    
    # Metadata
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    download_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    file = relationship("File")
    uploader = relationship("User")
    superseded_by = relationship("RegulationDocument", remote_side=[id])
    location_associations = relationship("RegulationLocationAssociation", back_populates="document")


class RegulationLocationAssociation(Base):
    __tablename__ = "regulation_location_associations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Association details
    document_id = Column(UUID(as_uuid=True), ForeignKey("regulation_documents.id"), nullable=False)
    location_identifier = Column(String, nullable=False)  # city, district, or coordinate bounds
    priority = Column(Integer, default=1)  # 1=primary, 2=secondary, etc.
    
    # Location specifics
    latitude = Column(Float)
    longitude = Column(Float)
    radius_km = Column(Float)  # Applicable radius in kilometers
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("RegulationDocument", back_populates="location_associations")


class ComplianceChecklistTemplate(Base):
    __tablename__ = "compliance_checklist_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Template details
    name = Column(String, nullable=False)
    category = Column(Enum(RegulationCategory), nullable=False)
    property_types = Column(ARRAY(String))  # applicable property types
    
    # Checklist content
    mandatory_documents = Column(ARRAY(String))
    recommended_documents = Column(ARRAY(String))
    conditional_documents = Column(JSON)  # conditions and required documents
    approval_stages = Column(ARRAY(String))
    
    # Process information
    estimated_timeline_weeks = Column(Integer)
    estimated_cost_range = Column(String)
    complexity_level = Column(String)  # low, moderate, high
    
    # Template metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")


class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Assessment details
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    property_type = Column(String, nullable=False)
    
    # Assessment results
    applicable_regulations = Column(JSON)
    compliance_requirements = Column(JSON)  
    regulation_summary = Column(JSON)
    complexity_level = Column(String)
    
    # Document associations
    applicable_documents = Column(ARRAY(UUID(as_uuid=True)))  # References to RegulationDocument IDs
    
    # Assessment metadata
    assessed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assessment_version = Column(String, default="1.0")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report")
    assessor = relationship("User")