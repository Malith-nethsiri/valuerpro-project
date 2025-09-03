"""
Comprehensive endpoint tests for all API routes.
Tests all endpoints with various scenarios including edge cases and error conditions.
"""
import pytest
import json
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
from PIL import Image

from app.models import User, Report, Client, Property, File as FileModel


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    def test_register_success(self, client: TestClient):
        """Test successful user registration."""
        register_data = {
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "full_name": "New User",
            "role": "valuer",
            "registration_no": "REG123",
            "qualifications": "AIVSL, FRICS",
            "experience_years": 5,
            "specialization": "Residential Properties",
            "firm_name": "Test Valuation Firm",
            "designation": "Senior Valuer",
            "contact_phone": "+94 11 234 5678"
        }
        
        response = client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == register_data["email"]
        assert data["full_name"] == register_data["full_name"]
        assert "id" in data
        assert "hashed_password" not in data  # Password should not be returned
    
    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """Test registration with duplicate email."""
        register_data = {
            "email": test_user.email,  # Already exists
            "password": "password123",
            "full_name": "Duplicate User"
        }
        
        response = client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 409
        data = response.json()
        assert "already exists" in data["error"].lower()
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email."""
        register_data = {
            "email": "invalid-email",
            "password": "password123",
            "full_name": "Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 422
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password."""
        register_data = {
            "email": "test@example.com",
            "password": "123",  # Too weak
            "full_name": "Test User"
        }
        
        response = client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 422
    
    def test_login_success(self, client: TestClient, test_user: User):
        """Test successful login."""
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == test_user.email
    
    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client: TestClient, db_session):
        """Test login with inactive user."""
        # Create inactive user
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        inactive_user = User(
            email="inactive@example.com",
            full_name="Inactive User",
            hashed_password=pwd_context.hash("password123"),
            is_active=False
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        login_data = {
            "username": "inactive@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 401


class TestReportEndpoints:
    """Test report management endpoints."""
    
    def test_create_report_success(self, authenticated_client: TestClient):
        """Test successful report creation."""
        report_data = {
            "title": "New Test Report",
            "reference_number": "NEW-2024-001",
            "property_address": "New Test Property",
            "status": "draft",
            "data": {
                "property_type": "commercial",
                "land_area": 2000.0
            }
        }
        
        response = authenticated_client.post("/api/v1/reports/", json=report_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == report_data["title"]
        assert data["reference_number"] == report_data["reference_number"]
        assert "id" in data
        assert "created_at" in data
    
    def test_create_report_invalid_data(self, authenticated_client: TestClient):
        """Test report creation with invalid data."""
        invalid_data = {
            "title": "",  # Empty title
            "reference_number": "A" * 101,  # Too long
            "status": "invalid_status"  # Invalid status
        }
        
        response = authenticated_client.post("/api/v1/reports/", json=invalid_data)
        
        assert response.status_code == 422
    
    def test_get_reports_list(self, authenticated_client: TestClient, test_report: Report):
        """Test getting reports list."""
        response = authenticated_client.get("/api/v1/reports/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check if test report is in the list
        report_ids = [report["id"] for report in data]
        assert test_report.id in report_ids
    
    def test_get_reports_with_filters(self, authenticated_client: TestClient):
        """Test getting reports with filters."""
        # Test status filter
        response = authenticated_client.get("/api/v1/reports/?status=draft")
        assert response.status_code == 200
        
        # Test pagination
        response = authenticated_client.get("/api/v1/reports/?page=1&page_size=10")
        assert response.status_code == 200
        
        # Test search
        response = authenticated_client.get("/api/v1/reports/?search=test")
        assert response.status_code == 200
    
    def test_get_report_by_id(self, authenticated_client: TestClient, test_report: Report):
        """Test getting specific report by ID."""
        response = authenticated_client.get(f"/api/v1/reports/{test_report.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_report.id
        assert data["title"] == test_report.title
    
    def test_get_nonexistent_report(self, authenticated_client: TestClient):
        """Test getting non-existent report."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = authenticated_client.get(f"/api/v1/reports/{fake_id}")
        
        assert response.status_code == 404
    
    def test_update_report(self, authenticated_client: TestClient, test_report: Report):
        """Test updating report."""
        update_data = {
            "title": "Updated Test Report",
            "status": "in_progress"
        }
        
        response = authenticated_client.put(
            f"/api/v1/reports/{test_report.id}", 
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["status"] == update_data["status"]
    
    def test_delete_report(self, authenticated_client: TestClient, db_session, test_user: User):
        """Test deleting report."""
        # Create report to delete
        report = Report(
            title="Report to Delete",
            reference_number="DEL-2024-001",
            status="draft",
            property_address="Delete Test Property",
            author_id=test_user.id
        )
        db_session.add(report)
        db_session.commit()
        
        response = authenticated_client.delete(f"/api/v1/reports/{report.id}")
        
        assert response.status_code == 204
        
        # Verify deletion
        deleted_report = db_session.query(Report).filter_by(id=report.id).first()
        assert deleted_report is None
    
    def test_unauthorized_access(self, client: TestClient):
        """Test accessing reports without authentication."""
        response = client.get("/api/v1/reports/")
        
        assert response.status_code == 401


class TestClientEndpoints:
    """Test client management endpoints."""
    
    def test_create_client_success(self, authenticated_client: TestClient):
        """Test successful client creation."""
        client_data = {
            "name": "New Test Client",
            "address": "123 Client Street",
            "contact_numbers": ["+94 11 234 5678"],
            "email": "client@example.com"
        }
        
        response = authenticated_client.post("/api/v1/reports/clients/", json=client_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == client_data["name"]
        assert data["email"] == client_data["email"]
    
    def test_create_client_duplicate_email(self, authenticated_client: TestClient, db_session, test_user: User):
        """Test creating client with duplicate email."""
        # Create first client
        existing_client = Client(
            name="Existing Client",
            email="existing@example.com",
            author_id=test_user.id
        )
        db_session.add(existing_client)
        db_session.commit()
        
        # Try to create client with same email
        duplicate_data = {
            "name": "Duplicate Client",
            "email": "existing@example.com"
        }
        
        response = authenticated_client.post("/api/v1/reports/clients/", json=duplicate_data)
        
        assert response.status_code == 409
    
    def test_get_clients_list(self, authenticated_client: TestClient):
        """Test getting clients list."""
        response = authenticated_client.get("/api/v1/reports/clients/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_client(self, authenticated_client: TestClient, db_session, test_user: User):
        """Test updating client."""
        # Create client to update
        client = Client(
            name="Client to Update",
            address="Original Address",
            author_id=test_user.id
        )
        db_session.add(client)
        db_session.commit()
        
        update_data = {
            "name": "Updated Client Name",
            "address": "Updated Address"
        }
        
        response = authenticated_client.put(
            f"/api/v1/reports/clients/{client.id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["address"] == update_data["address"]


class TestFileUploadEndpoints:
    """Test file upload endpoints."""
    
    def test_upload_image_file(self, authenticated_client: TestClient, test_report: Report):
        """Test uploading image file."""
        # Create test image
        image = Image.new('RGB', (100, 100), color='red')
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        files = {
            "file": ("test_image.png", img_buffer, "image/png")
        }
        data = {
            "report_id": test_report.id,
            "description": "Test image upload"
        }
        
        response = authenticated_client.post(
            "/api/v1/uploads/",
            files=files,
            data=data
        )
        
        assert response.status_code == 201
        result = response.json()
        assert result["filename"] == "test_image.png"
        assert result["file_type"] == "image/png"
        assert result["report_id"] == test_report.id
    
    def test_upload_pdf_file(self, authenticated_client: TestClient, test_report: Report):
        """Test uploading PDF file."""
        # Create test PDF
        from reportlab.pdfgen import canvas
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)
        p.drawString(100, 750, "Test PDF content")
        p.showPage()
        p.save()
        buffer.seek(0)
        
        files = {
            "file": ("test_document.pdf", buffer, "application/pdf")
        }
        data = {
            "report_id": test_report.id,
            "description": "Test PDF upload"
        }
        
        response = authenticated_client.post(
            "/api/v1/uploads/",
            files=files,
            data=data
        )
        
        assert response.status_code == 201
        result = response.json()
        assert result["filename"] == "test_document.pdf"
        assert result["file_type"] == "application/pdf"
    
    def test_upload_invalid_file_type(self, authenticated_client: TestClient, test_report: Report):
        """Test uploading invalid file type."""
        # Create test file with invalid type
        content = b"This is not a valid image or PDF file"
        
        files = {
            "file": ("test.txt", io.BytesIO(content), "text/plain")
        }
        data = {
            "report_id": test_report.id
        }
        
        response = authenticated_client.post(
            "/api/v1/uploads/",
            files=files,
            data=data
        )
        
        assert response.status_code == 400
    
    def test_upload_file_too_large(self, authenticated_client: TestClient, test_report: Report):
        """Test uploading file that's too large."""
        # Create large file (simulate)
        large_content = b"x" * (15 * 1024 * 1024)  # 15MB
        
        files = {
            "file": ("large_image.png", io.BytesIO(large_content), "image/png")
        }
        data = {
            "report_id": test_report.id
        }
        
        response = authenticated_client.post(
            "/api/v1/uploads/",
            files=files,
            data=data
        )
        
        assert response.status_code == 400
        result = response.json()
        assert "size" in result["error"].lower()
    
    def test_get_uploaded_files(self, authenticated_client: TestClient, test_report: Report):
        """Test getting uploaded files for a report."""
        response = authenticated_client.get(f"/api/v1/uploads/?report_id={test_report.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_uploaded_file(self, authenticated_client: TestClient, db_session, test_user: User, test_report: Report):
        """Test deleting uploaded file."""
        # Create file to delete
        file_record = FileModel(
            filename="file_to_delete.png",
            original_filename="file_to_delete.png",
            file_type="image/png",
            file_size=1024,
            report_id=test_report.id,
            uploaded_by=test_user.id
        )
        db_session.add(file_record)
        db_session.commit()
        
        response = authenticated_client.delete(f"/api/v1/uploads/{file_record.id}")
        
        assert response.status_code == 204
        
        # Verify deletion
        deleted_file = db_session.query(FileModel).filter_by(id=file_record.id).first()
        assert deleted_file is None


class TestOCREndpoints:
    """Test OCR processing endpoints."""
    
    @patch('app.services.ocr_service.process_image')
    def test_process_ocr_success(self, mock_ocr, authenticated_client: TestClient, db_session, test_user: User, test_report: Report):
        """Test successful OCR processing."""
        # Create file for OCR
        file_record = FileModel(
            filename="ocr_test.png",
            original_filename="ocr_test.png",
            file_type="image/png",
            file_size=1024,
            report_id=test_report.id,
            uploaded_by=test_user.id
        )
        db_session.add(file_record)
        db_session.commit()
        
        # Mock OCR response
        mock_ocr.return_value = {
            "extracted_text": "Test OCR extracted text",
            "confidence": 0.95,
            "processing_time": 2.5
        }
        
        response = authenticated_client.post(f"/api/v1/ocr/process/{file_record.id}")
        
        assert response.status_code == 201
        data = response.json()
        assert data["extracted_text"] == "Test OCR extracted text"
        assert data["confidence_score"] == 0.95
    
    def test_process_ocr_nonexistent_file(self, authenticated_client: TestClient):
        """Test OCR processing with non-existent file."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = authenticated_client.post(f"/api/v1/ocr/process/{fake_id}")
        
        assert response.status_code == 404
    
    @patch('app.services.ocr_service.process_image')
    def test_batch_ocr_processing(self, mock_ocr, authenticated_client: TestClient, db_session, test_user: User, test_report: Report):
        """Test batch OCR processing."""
        # Create multiple files
        file_ids = []
        for i in range(3):
            file_record = FileModel(
                filename=f"batch_ocr_{i}.png",
                original_filename=f"batch_ocr_{i}.png",
                file_type="image/png",
                file_size=1024,
                report_id=test_report.id,
                uploaded_by=test_user.id
            )
            db_session.add(file_record)
            db_session.flush()
            file_ids.append(file_record.id)
        
        db_session.commit()
        
        # Mock OCR responses
        mock_ocr.return_value = {
            "extracted_text": "Batch OCR text",
            "confidence": 0.9
        }
        
        batch_data = {"file_ids": file_ids}
        response = authenticated_client.post("/api/v1/ocr/batch-process", json=batch_data)
        
        assert response.status_code == 202
        data = response.json()
        assert "batch_id" in data
        assert data["total_files"] == 3


class TestErrorHandling:
    """Test error handling across endpoints."""
    
    def test_404_error_handling(self, authenticated_client: TestClient):
        """Test 404 error handling."""
        response = authenticated_client.get("/api/v1/nonexistent-endpoint")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
    
    def test_validation_error_handling(self, authenticated_client: TestClient):
        """Test validation error handling."""
        invalid_data = {
            "email": "not-an-email",
            "password": "",
            "full_name": ""
        }
        
        response = authenticated_client.post("/api/v1/auth/register", json=invalid_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "field_errors" in data or "detail" in data
    
    def test_database_constraint_error(self, authenticated_client: TestClient, test_user: User):
        """Test database constraint error handling."""
        # Try to create duplicate user
        duplicate_data = {
            "email": test_user.email,
            "password": "password123",
            "full_name": "Duplicate User"
        }
        
        response = authenticated_client.post("/api/v1/auth/register", json=duplicate_data)
        
        assert response.status_code == 409
        data = response.json()
        assert data["error_type"] == "DuplicateError"
    
    def test_permission_error_handling(self, client: TestClient, db_session, test_user: User):
        """Test permission error handling."""
        # Create report by another user
        other_user = User(
            email="other@example.com",
            full_name="Other User",
            hashed_password="hashed",
            is_active=True
        )
        db_session.add(other_user)
        db_session.flush()
        
        other_report = Report(
            title="Other User's Report",
            reference_number="OTHER-2024-001",
            status="draft",
            property_address="Other Property",
            author_id=other_user.id
        )
        db_session.add(other_report)
        db_session.commit()
        
        # Try to access other user's report
        # (This would need proper authentication setup)
        response = client.get(f"/api/v1/reports/{other_report.id}")
        
        assert response.status_code == 401  # Unauthorized without token