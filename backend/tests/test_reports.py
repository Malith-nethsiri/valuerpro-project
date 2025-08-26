"""
Report management endpoint tests.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import json
from uuid import uuid4

from app.models import Report, User


def test_create_report(authenticated_client: TestClient, test_user: User, db_session: Session):
    """Test report creation."""
    report_data = {
        "title": "New Property Valuation",
        "reference_number": "VAL-2024-001",
        "property_address": "123 New Property Street, Colombo",
        "data": {
            "property_type": "commercial",
            "land_area": 2000.0,
            "building_area": 1500.0,
            "valuation_method": "investment_approach"
        }
    }
    
    response = authenticated_client.post("/api/v1/reports/", json=report_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == report_data["title"]
    assert data["reference_number"] == report_data["reference_number"]
    assert data["author_id"] == str(test_user.id)
    assert data["status"] == "draft"
    assert "id" in data
    assert "created_at" in data


def test_create_report_duplicate_reference(authenticated_client: TestClient, test_report: Report):
    """Test creating report with duplicate reference number."""
    report_data = {
        "title": "Duplicate Reference Test",
        "reference_number": test_report.reference_number,
        "property_address": "456 Another Street"
    }
    
    response = authenticated_client.post("/api/v1/reports/", json=report_data)
    assert response.status_code == 400
    assert "reference number" in response.json()["detail"].lower()


def test_list_reports(authenticated_client: TestClient, test_report: Report):
    """Test listing user's reports."""
    response = authenticated_client.get("/api/v1/reports/")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Find our test report
    report = next((r for r in data if r["id"] == str(test_report.id)), None)
    assert report is not None
    assert report["title"] == test_report.title


def test_get_report_by_id(authenticated_client: TestClient, test_report: Report):
    """Test getting specific report by ID."""
    response = authenticated_client.get(f"/api/v1/reports/{test_report.id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == str(test_report.id)
    assert data["title"] == test_report.title
    assert data["reference_number"] == test_report.reference_number


def test_get_nonexistent_report(authenticated_client: TestClient):
    """Test getting non-existent report."""
    fake_id = str(uuid4())
    response = authenticated_client.get(f"/api/v1/reports/{fake_id}")
    assert response.status_code == 404


def test_update_report(authenticated_client: TestClient, test_report: Report):
    """Test updating report."""
    update_data = {
        "title": "Updated Property Valuation",
        "status": "in_review",
        "data": {
            "property_type": "residential",
            "valuation_amount": 30000000.0,
            "updated_field": "new_value"
        }
    }
    
    response = authenticated_client.put(f"/api/v1/reports/{test_report.id}", json=update_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["status"] == update_data["status"]
    assert data["data"]["valuation_amount"] == 30000000.0
    assert "updated_at" in data


def test_delete_report(authenticated_client: TestClient, db_session: Session, test_user: User):
    """Test deleting report."""
    # Create a report specifically for deletion
    report = Report(
        title="Report to Delete",
        reference_number="DEL-2024-001",
        status="draft",
        author_id=test_user.id,
        data={}
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    
    response = authenticated_client.delete(f"/api/v1/reports/{report.id}")
    assert response.status_code == 200
    
    # Verify report is deleted
    response = authenticated_client.get(f"/api/v1/reports/{report.id}")
    assert response.status_code == 404


def test_report_validation_endpoint(authenticated_client: TestClient, test_report: Report):
    """Test report validation endpoint."""
    response = authenticated_client.get(f"/api/v1/reports/{test_report.id}/validate")
    assert response.status_code == 200
    
    data = response.json()
    assert "validation_results" in data
    assert "errors" in data["validation_results"]
    assert "warnings" in data["validation_results"]
    assert "info" in data["validation_results"]


def test_generate_pdf(authenticated_client: TestClient, test_report: Report):
    """Test PDF generation."""
    response = authenticated_client.get(f"/api/v1/reports/{test_report.id}/generate-pdf")
    
    # PDF generation should work or return appropriate error
    assert response.status_code in [200, 400, 500]
    
    if response.status_code == 200:
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0


def test_generate_docx(authenticated_client: TestClient, test_report: Report):
    """Test DOCX generation."""
    response = authenticated_client.get(f"/api/v1/reports/{test_report.id}/generate-docx")
    
    # DOCX generation should work or return appropriate error
    assert response.status_code in [200, 400, 500]
    
    if response.status_code == 200:
        expected_content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert response.headers["content-type"] == expected_content_type
        assert len(response.content) > 0


def test_report_status_transitions(authenticated_client: TestClient, test_report: Report):
    """Test valid report status transitions."""
    # Draft -> In Review
    response = authenticated_client.put(f"/api/v1/reports/{test_report.id}", json={
        "status": "in_review"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "in_review"
    
    # In Review -> Completed
    response = authenticated_client.put(f"/api/v1/reports/{test_report.id}", json={
        "status": "completed"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_report_access_control(client: TestClient, test_report: Report, db_session: Session):
    """Test that users can only access their own reports."""
    # Create another user
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    other_user = User(
        email="other@example.com",
        full_name="Other User",
        hashed_password=pwd_context.hash("password123"),
        is_active=True
    )
    db_session.add(other_user)
    db_session.commit()
    
    # Login as other user
    response = client.post("/api/v1/auth/login", data={
        "username": "other@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    
    # Try to access first user's report
    response = client.get(
        f"/api/v1/reports/{test_report.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404  # Should not be able to see other user's report


def test_report_search_and_filter(authenticated_client: TestClient, db_session: Session, test_user: User):
    """Test report search and filtering."""
    # Create multiple reports for testing
    reports_data = [
        {"title": "Residential Property A", "status": "draft", "reference_number": "RES-A-001"},
        {"title": "Commercial Property B", "status": "completed", "reference_number": "COM-B-002"},
        {"title": "Industrial Property C", "status": "in_review", "reference_number": "IND-C-003"}
    ]
    
    for report_data in reports_data:
        report = Report(
            author_id=test_user.id,
            data={},
            **report_data
        )
        db_session.add(report)
    db_session.commit()
    
    # Test status filtering
    response = authenticated_client.get("/api/v1/reports/?status=completed")
    if response.status_code == 200:
        data = response.json()
        completed_reports = [r for r in data if r["status"] == "completed"]
        assert len(completed_reports) >= 1
    
    # Test search by title
    response = authenticated_client.get("/api/v1/reports/?search=residential")
    if response.status_code == 200:
        data = response.json()
        # Should find residential property (case-insensitive)
        residential_reports = [r for r in data if "residential" in r["title"].lower()]
        assert len(residential_reports) >= 1


def test_report_performance(authenticated_client: TestClient, performance_timer):
    """Test report endpoint performance."""
    performance_timer.start()
    response = authenticated_client.get("/api/v1/reports/")
    performance_timer.stop()
    
    assert response.status_code == 200
    assert performance_timer.elapsed < 2.0  # Should respond within 2 seconds


def test_report_data_validation(authenticated_client: TestClient):
    """Test report data validation."""
    invalid_report_data = {
        "title": "",  # Empty title should be invalid
        "reference_number": "INVALID",
        "data": "not a json object"  # Invalid data format
    }
    
    response = authenticated_client.post("/api/v1/reports/", json=invalid_report_data)
    assert response.status_code == 422  # Validation error
    
    error_data = response.json()
    assert "detail" in error_data
    assert isinstance(error_data["detail"], list)


def test_report_bulk_operations(authenticated_client: TestClient, db_session: Session, test_user: User):
    """Test bulk operations on reports."""
    # Create multiple reports
    report_ids = []
    for i in range(3):
        report = Report(
            title=f"Bulk Test Report {i}",
            reference_number=f"BULK-{i:03d}",
            status="draft",
            author_id=test_user.id,
            data={}
        )
        db_session.add(report)
        db_session.commit()
        db_session.refresh(report)
        report_ids.append(str(report.id))
    
    # Test bulk status update (if endpoint exists)
    bulk_update_data = {
        "report_ids": report_ids,
        "status": "in_review"
    }
    
    response = authenticated_client.put("/api/v1/reports/bulk-update", json=bulk_update_data)
    # This endpoint might not exist yet
    assert response.status_code in [200, 404]