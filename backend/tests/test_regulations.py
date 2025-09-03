"""
Test cases for regulations endpoints and services.
Covers regulatory compliance analysis, document management, and location-based regulation lookup.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import uuid4

from app.models import RegulationDocument, ComplianceAssessment, User
from app.api.api_v1.endpoints.regulations import RegulationDocumentUploadRequest, ComplianceAnalysisRequest


class TestRegulationEndpoints:
    """Test regulation API endpoints"""
    
    def test_get_regulation_documents_success(self, authenticated_client: TestClient, test_user: User, db: Session):
        """Test retrieving regulation documents with filters"""
        # Create test regulation document
        regulation_doc = RegulationDocument(
            id=uuid4(),
            title="Urban Development Authority Guidelines 2024",
            authority="UDA",
            category="zoning",
            applicable_areas=["Colombo", "Gampaha"],
            effective_date=datetime(2024, 1, 1),
            uploaded_by=test_user.id,
            is_active=True
        )
        db.add(regulation_doc)
        db.commit()
        
        # Test basic retrieval
        response = authenticated_client.get("/api/v1/regulations/documents")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(doc["title"] == "Urban Development Authority Guidelines 2024" for doc in data)
        
        # Test filtering by authority
        response = authenticated_client.get("/api/v1/regulations/documents?authority=UDA")
        assert response.status_code == 200
        data = response.json()
        assert all(doc["authority"] == "UDA" for doc in data)
        
        # Test filtering by category
        response = authenticated_client.get("/api/v1/regulations/documents?category=zoning")
        assert response.status_code == 200
        data = response.json()
        assert all(doc["category"] == "zoning" for doc in data)
    
    def test_get_regulation_documents_with_area_filter(self, authenticated_client: TestClient, test_user: User, db: Session):
        """Test filtering regulations by applicable area"""
        # Create regulations for different areas
        colombo_reg = RegulationDocument(
            id=uuid4(),
            title="Colombo Municipal Guidelines",
            authority="CMC",
            category="building",
            applicable_areas=["Colombo"],
            effective_date=datetime(2024, 1, 1),
            uploaded_by=test_user.id,
            is_active=True
        )
        
        national_reg = RegulationDocument(
            id=uuid4(),
            title="National Building Code",
            authority="ICTAD",
            category="building", 
            applicable_areas=["National"],
            effective_date=datetime(2023, 1, 1),
            uploaded_by=test_user.id,
            is_active=True
        )
        
        db.add_all([colombo_reg, national_reg])
        db.commit()
        
        # Filter by area
        response = authenticated_client.get("/api/v1/regulations/documents?area=Colombo")
        assert response.status_code == 200
        data = response.json()
        
        # Should include both Colombo-specific and national regulations
        titles = [doc["title"] for doc in data]
        assert "Colombo Municipal Guidelines" in titles
        assert "National Building Code" in titles
    
    def test_get_regulation_documents_inactive_excluded(self, authenticated_client: TestClient, test_user: User, db: Session):
        """Test that inactive regulations are excluded by default"""
        inactive_reg = RegulationDocument(
            id=uuid4(),
            title="Superseded Regulation",
            authority="Old Authority",
            category="outdated",
            applicable_areas=["Colombo"],
            effective_date=datetime(2020, 1, 1),
            uploaded_by=test_user.id,
            is_active=False
        )
        db.add(inactive_reg)
        db.commit()
        
        response = authenticated_client.get("/api/v1/regulations/documents")
        assert response.status_code == 200
        data = response.json()
        
        # Should not include inactive regulation
        titles = [doc["title"] for doc in data]
        assert "Superseded Regulation" not in titles
    
    @patch('app.services.regulation_service.get_applicable_regulations')
    @patch('app.services.regulation_service.generate_compliance_report')
    def test_analyze_compliance_success(self, mock_generate_report, mock_get_regulations, 
                                      authenticated_client: TestClient, test_user: User, db: Session):
        """Test successful compliance analysis"""
        # Mock service responses
        mock_regulations = [
            {
                "id": str(uuid4()),
                "title": "Zoning Regulation",
                "authority": "UDA",
                "category": "zoning",
                "requirements": ["Set back compliance", "Height restrictions"]
            }
        ]
        mock_get_regulations.return_value = mock_regulations
        
        mock_report = {
            "summary": "Compliance analysis completed",
            "complexity_level": "medium",
            "required_documents": ["Survey plan", "Building approval"],
            "estimated_timeline": "4-6 weeks"
        }
        mock_generate_report.return_value = mock_report
        
        # Test compliance analysis
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "residential",
            "include_documents": True,
            "generate_report": True
        }
        
        response = authenticated_client.post("/api/v1/regulations/analyze-compliance", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "assessment_id" in data
        assert data["analysis"]["applicable_regulations"] == mock_regulations
        assert data["analysis"]["compliance_report"] == mock_report
        
        # Verify assessment was saved to database
        assessment = db.query(ComplianceAssessment).filter(
            ComplianceAssessment.id == data["assessment_id"]
        ).first()
        assert assessment is not None
        assert assessment.latitude == 6.9271
        assert assessment.longitude == 79.8612
        assert assessment.property_type == "residential"
    
    def test_analyze_compliance_minimal_request(self, authenticated_client: TestClient):
        """Test compliance analysis with minimal required data"""
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "commercial"
        }
        
        with patch('app.services.regulation_service.get_applicable_regulations') as mock_get_regs:
            mock_get_regs.return_value = []
            
            response = authenticated_client.post("/api/v1/regulations/analyze-compliance", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            assert "assessment_id" in data
            assert data["analysis"]["applicable_regulations"] == []
            assert "compliance_report" not in data["analysis"]
    
    def test_analyze_compliance_invalid_coordinates(self, authenticated_client: TestClient):
        """Test compliance analysis with invalid coordinates"""
        request_data = {
            "latitude": 91.0,  # Invalid latitude (> 90)
            "longitude": 79.8612,
            "property_type": "residential"
        }
        
        response = authenticated_client.post("/api/v1/regulations/analyze-compliance", json=request_data)
        assert response.status_code == 422  # Validation error
    
    @patch('app.services.regulation_service.get_applicable_regulations')
    def test_analyze_compliance_service_error(self, mock_get_regulations, authenticated_client: TestClient):
        """Test handling of service errors during compliance analysis"""
        mock_get_regulations.side_effect = Exception("Service unavailable")
        
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "residential"
        }
        
        response = authenticated_client.post("/api/v1/regulations/analyze-compliance", json=request_data)
        assert response.status_code == 500
        assert "Compliance analysis failed" in response.json()["detail"]
    
    def test_unauthenticated_access_blocked(self, client: TestClient):
        """Test that unauthenticated requests are blocked"""
        response = client.get("/api/v1/regulations/documents")
        assert response.status_code == 401
        
        response = client.post("/api/v1/regulations/analyze-compliance", json={
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "residential"
        })
        assert response.status_code == 401


class TestRegulationServices:
    """Test regulation service functions"""
    
    @patch('app.services.sri_lanka_admin_divisions.get_admin_division_by_coordinates')
    def test_get_applicable_regulations_by_location(self, mock_get_admin, db: Session):
        """Test retrieving regulations applicable to a location"""
        from app.services.regulation_service import get_applicable_regulations
        
        # Mock admin division lookup
        mock_get_admin.return_value = {
            "district": "Colombo",
            "ds_division": "Colombo",
            "gn_division": "Colombo 01"
        }
        
        # Create test regulations
        national_reg = RegulationDocument(
            id=uuid4(),
            title="National Building Code",
            authority="ICTAD",
            category="building",
            applicable_areas=["National"],
            effective_date=datetime(2023, 1, 1),
            uploaded_by=uuid4(),
            is_active=True
        )
        
        district_reg = RegulationDocument(
            id=uuid4(),
            title="Colombo District Guidelines",
            authority="District Secretariat",
            category="planning",
            applicable_areas=["Colombo"],
            effective_date=datetime(2024, 1, 1),
            uploaded_by=uuid4(),
            is_active=True
        )
        
        db.add_all([national_reg, district_reg])
        db.commit()
        
        # Test getting applicable regulations
        regulations = get_applicable_regulations(db, 6.9271, 79.8612, "residential")
        
        assert len(regulations) == 2
        regulation_titles = [reg["title"] for reg in regulations]
        assert "National Building Code" in regulation_titles
        assert "Colombo District Guidelines" in regulation_titles
    
    def test_generate_compliance_report(self):
        """Test compliance report generation"""
        from app.services.regulation_service import generate_compliance_report
        
        mock_regulations = [
            {
                "id": str(uuid4()),
                "title": "Zoning Regulation",
                "authority": "UDA", 
                "category": "zoning",
                "requirements": ["Setback compliance", "Height restrictions"]
            },
            {
                "id": str(uuid4()),
                "title": "Environmental Guidelines",
                "authority": "CEA",
                "category": "environment",
                "requirements": ["EIA approval", "Waste management plan"]
            }
        ]
        
        report = generate_compliance_report(mock_regulations, "residential", "Colombo")
        
        assert isinstance(report, dict)
        assert "summary" in report
        assert "complexity_level" in report
        assert "required_documents" in report
        assert "estimated_timeline" in report
        
        # Complexity should be based on number of regulations
        assert report["complexity_level"] in ["low", "medium", "high"]
        
        # Should include relevant documents
        assert len(report["required_documents"]) > 0


@pytest.fixture
def sample_regulation_document():
    """Create a sample regulation document for testing"""
    return {
        "title": "Test Building Guidelines",
        "authority": "Test Authority",
        "category": "building",
        "document_type": "guideline",
        "applicable_areas": ["Colombo", "Gampaha"],
        "effective_date": "2024-01-01T00:00:00Z",
        "description": "Test building guidelines for validation"
    }


class TestRegulationValidation:
    """Test validation of regulation-related data"""
    
    def test_regulation_document_validation_success(self, sample_regulation_document):
        """Test successful validation of regulation document data"""
        # Test creating schema from valid data
        schema = RegulationDocumentUploadRequest(**sample_regulation_document)
        assert schema.title == "Test Building Guidelines"
        assert schema.authority == "Test Authority"
        assert schema.category == "building"
        assert len(schema.applicable_areas) == 2
    
    def test_regulation_document_validation_missing_required_fields(self):
        """Test validation fails with missing required fields"""
        invalid_data = {
            "title": "Test Guidelines",
            # Missing required fields: authority, category, document_type, applicable_areas
        }
        
        with pytest.raises(ValueError):
            RegulationDocumentUploadRequest(**invalid_data)
    
    def test_compliance_analysis_request_validation(self):
        """Test validation of compliance analysis requests"""
        # Valid request
        valid_request = {
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "residential"
        }
        
        schema = ComplianceAnalysisRequest(**valid_request)
        assert schema.latitude == 6.9271
        assert schema.longitude == 79.8612
        assert schema.property_type == "residential"
        assert schema.include_documents is True   # Default value
        assert schema.generate_report is True     # Default value
    
    def test_compliance_analysis_edge_case_coordinates(self):
        """Test compliance analysis with edge case coordinates"""
        # Test boundary coordinates (these should work fine since no validation constraints exist)
        schema1 = ComplianceAnalysisRequest(
            latitude=90.0,
            longitude=180.0,
            property_type="residential"
        )
        assert schema1.latitude == 90.0
        assert schema1.longitude == 180.0
        
        schema2 = ComplianceAnalysisRequest(
            latitude=-90.0,
            longitude=-180.0,
            property_type="commercial"
        )
        assert schema2.latitude == -90.0
        assert schema2.longitude == -180.0
    
    def test_compliance_analysis_optional_fields(self):
        """Test compliance analysis request with optional fields"""
        request_data = {
            "latitude": 6.9271,
            "longitude": 79.8612,
            "property_type": "industrial",
            "include_documents": False,
            "generate_report": False
        }
        
        schema = ComplianceAnalysisRequest(**request_data)
        assert schema.include_documents is False
        assert schema.generate_report is False