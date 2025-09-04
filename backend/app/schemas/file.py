"""
File-related Pydantic schemas for request/response models.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class FileCategory(str, Enum):
    """Predefined file categories."""
    DOCUMENT = "document"
    IMAGE = "image"
    REPORT = "report"
    TITLE_DEED = "title_deed"
    SURVEY_PLAN = "survey_plan"
    VALUATION_REPORT = "valuation_report"
    PHOTOGRAPH = "photograph"
    OTHER = "other"


class RiskLevel(str, Enum):
    """File risk levels from security scanning."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ValidationStatus(str, Enum):
    """File validation status."""
    PASSED = "passed"
    FAILED = "failed"
    PENDING = "pending"


class FileCreate(BaseModel):
    """Schema for creating a file record."""
    model_config = ConfigDict(from_attributes=True)
    
    filename: str = Field(..., description="Original filename")
    description: Optional[str] = Field(None, description="File description")
    category: Optional[FileCategory] = Field(FileCategory.DOCUMENT, description="File category")


class FileResponse(BaseModel):
    """Schema for file response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Unique file ID")
    filename: str = Field(..., description="Current filename")
    original_filename: str = Field(..., description="Original uploaded filename")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")
    storage_provider: str = Field(..., description="Storage provider (s3, local)")
    file_url: Optional[str] = Field(None, description="File access URL")
    description: Optional[str] = Field(None, description="File description")
    category: Optional[str] = Field(None, description="File category")
    validation_status: ValidationStatus = Field(..., description="Validation status")
    risk_level: RiskLevel = Field(..., description="Security risk level")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    uploaded_by: str = Field(..., description="User ID who uploaded the file")


class FileListResponse(BaseModel):
    """Schema for paginated file list response."""
    files: List[FileResponse] = Field(..., description="List of files")
    total: int = Field(..., description="Total number of files")
    skip: int = Field(..., description="Number of files skipped")
    limit: int = Field(..., description="Maximum files returned")


class FileValidationResult(BaseModel):
    """Schema for file validation results."""
    valid: bool = Field(..., description="Whether file passed validation")
    filename: str = Field(..., description="Filename that was validated")
    file_info: Dict[str, Any] = Field(default_factory=dict, description="File metadata")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    risk_level: RiskLevel = Field(RiskLevel.LOW, description="Security risk level")
    security_scan: Dict[str, Any] = Field(default_factory=dict, description="Security scan results")
    content_validation: Dict[str, Any] = Field(default_factory=dict, description="Content validation results")


class FileUploadRequest(BaseModel):
    """Schema for file upload request metadata."""
    description: Optional[str] = Field(None, description="File description")
    category: Optional[FileCategory] = Field(FileCategory.DOCUMENT, description="File category")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class FileStatsResponse(BaseModel):
    """Schema for file statistics response."""
    total_files: int = Field(..., description="Total number of files")
    total_storage_bytes: int = Field(..., description="Total storage used in bytes")
    total_storage_mb: float = Field(..., description="Total storage used in MB")
    storage_limit_mb: float = Field(..., description="Storage limit in MB")
    category_breakdown: Dict[str, Dict[str, int]] = Field(
        default_factory=dict, 
        description="File count and size by category"
    )
    risk_level_breakdown: Dict[str, int] = Field(
        default_factory=dict,
        description="File count by risk level"
    )
    cloud_storage_enabled: bool = Field(..., description="Whether cloud storage is enabled")


class FileCategoriesResponse(BaseModel):
    """Schema for file categories response."""
    categories: List[str] = Field(..., description="User's file categories")
    default_categories: List[str] = Field(..., description="Default available categories")


class FileUrlResponse(BaseModel):
    """Schema for file URL response."""
    url: str = Field(..., description="File access URL")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    filename: str = Field(..., description="Original filename")


class FileDeleteResponse(BaseModel):
    """Schema for file deletion response."""
    message: str = Field(..., description="Deletion status message")
    filename: str = Field(..., description="Name of deleted file")
    storage_deleted: bool = Field(..., description="Whether file was deleted from storage")


class FileSearchRequest(BaseModel):
    """Schema for file search request."""
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[FileCategory] = Field(None, description="Filter by category")
    risk_level: Optional[RiskLevel] = Field(None, description="Filter by risk level")
    date_from: Optional[datetime] = Field(None, description="Filter files from this date")
    date_to: Optional[datetime] = Field(None, description="Filter files to this date")
    min_size: Optional[int] = Field(None, description="Minimum file size in bytes")
    max_size: Optional[int] = Field(None, description="Maximum file size in bytes")