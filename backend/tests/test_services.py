"""
Comprehensive tests for backend services.
Tests all major service modules with edge cases and error scenarios.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session
from fastapi import HTTPException
import json
import tempfile
import os
from datetime import datetime, timedelta

from app.models import User, Report, Client, Property, File as FileModel, OCRResult
from app.services.document_generation import document_service
from app.services.validation_engine import create_validation_engine
from app.services.ai_extraction import AIExtractionService
from app.utils.database import database_transaction, transactional
from app.middleware.error_handling import (
    BusinessLogicError, 
    NotFoundError, 
    PermissionDeniedError,
    DuplicateResourceError
)


class TestDocumentGeneration:
    """Test document generation service."""
    
    @pytest.fixture
    def mock_report_data(self):
        return {
            "title": "Test Property Valuation Report",
            "reference": "TEST-2024-001",
            "client": {"name": "Test Client", "address": "Test Address"},
            "property": {
                "address": "123 Test Street",
                "type": "Residential",
                "land_area": 1000.0,
                "building_area": 500.0
            },
            "valuation": {
                "land_value": 15000000.0,
                "building_value": 10000000.0,
                "total_value": 25000000.0
            }
        }
    
    def test_generate_pdf_report(self, mock_report_data, temp_storage_dir):
        """Test PDF report generation."""
        # Test successful PDF generation
        pdf_path = document_service.generate_pdf_report(mock_report_data, temp_storage_dir)
        
        assert pdf_path is not None
        assert os.path.exists(pdf_path)
        assert pdf_path.endswith('.pdf')
        
        # Verify file size is reasonable (not empty)
        assert os.path.getsize(pdf_path) > 1000  # At least 1KB
    
    def test_generate_docx_report(self, mock_report_data, temp_storage_dir):
        """Test DOCX report generation."""
        docx_path = document_service.generate_docx_report(mock_report_data, temp_storage_dir)
        
        assert docx_path is not None
        assert os.path.exists(docx_path)
        assert docx_path.endswith('.docx')
        assert os.path.getsize(docx_path) > 1000
    
    def test_generate_report_with_missing_data(self, temp_storage_dir):
        """Test report generation with incomplete data."""
        incomplete_data = {"title": "Test Report"}  # Missing required fields
        
        # Should handle missing data gracefully
        pdf_path = document_service.generate_pdf_report(incomplete_data, temp_storage_dir)
        assert pdf_path is not None
        assert os.path.exists(pdf_path)
    
    def test_generate_report_with_invalid_output_dir(self, mock_report_data):
        """Test report generation with invalid output directory."""
        invalid_dir = "/non/existent/directory"
        
        with pytest.raises(OSError):
            document_service.generate_pdf_report(mock_report_data, invalid_dir)
    
    @patch('app.services.document_generation.canvas')
    def test_pdf_generation_error_handling(self, mock_canvas, mock_report_data, temp_storage_dir):
        """Test PDF generation error handling."""
        mock_canvas.Canvas.side_effect = Exception("PDF generation failed")
        
        with pytest.raises(Exception):
            document_service.generate_pdf_report(mock_report_data, temp_storage_dir)


class TestValidationEngine:
    """Test validation engine service."""
    
    @pytest.fixture
    def validation_engine(self, db_session):
        return create_validation_engine(db_session)
    
    def test_validate_property_data_valid(self, validation_engine):
        """Test validation of valid property data."""
        valid_data = {
            "lot_number": "LOT123",
            "plan_number": "PLAN456",
            "extent": "10.5 perches",
            "address": "123 Test Street, Colombo"
        }
        
        result = validation_engine.validate_property_data(valid_data)
        assert result.is_valid is True
        assert len(result.errors) == 0
    
    def test_validate_property_data_invalid(self, validation_engine):
        """Test validation of invalid property data."""
        invalid_data = {
            "lot_number": "",  # Empty required field
            "plan_number": "INVALID_FORMAT_123456789",  # Too long
            "extent": "invalid extent",  # Invalid format
        }
        
        result = validation_engine.validate_property_data(invalid_data)
        assert result.is_valid is False
        assert len(result.errors) > 0
    
    def test_validate_coordinates(self, validation_engine):
        """Test coordinate validation."""
        # Valid Sri Lankan coordinates
        valid_coords = {"latitude": 6.9271, "longitude": 79.8612}
        result = validation_engine.validate_coordinates(valid_coords)
        assert result.is_valid is True
        
        # Invalid coordinates (outside Sri Lanka)
        invalid_coords = {"latitude": 90.0, "longitude": 180.0}
        result = validation_engine.validate_coordinates(invalid_coords)
        assert result.is_valid is False
    
    def test_validate_valuation_amount(self, validation_engine):
        """Test valuation amount validation."""
        # Valid amount
        valid_amount = 25000000.0
        result = validation_engine.validate_valuation_amount(valid_amount)
        assert result.is_valid is True
        
        # Invalid amount (negative)
        invalid_amount = -1000000.0
        result = validation_engine.validate_valuation_amount(invalid_amount)
        assert result.is_valid is False
        
        # Invalid amount (too large)
        too_large = 1000000000000.0  # 1 trillion
        result = validation_engine.validate_valuation_amount(too_large)
        assert result.is_valid is False
    
    def test_cross_field_validation(self, validation_engine):
        """Test cross-field validation rules."""
        data = {
            "land_value": 20000000.0,
            "building_value": 10000000.0,
            "total_value": 25000000.0  # Should be sum of land + building
        }
        
        result = validation_engine.validate_cross_fields(data)
        assert result.is_valid is False  # Total doesn't match sum


class TestAIExtractionService:
    """Test AI extraction service."""
    
    @pytest.fixture
    def ai_service(self):
        return AIExtractionService()
    
    @patch('app.services.ai_extraction.openai_client')
    def test_extract_property_details_success(self, mock_openai, ai_service):
        """Test successful property details extraction."""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "lot_number": "LOT123",
            "plan_number": "PLAN456",
            "extent": "10.5 perches",
            "confidence": 0.95
        })
        mock_openai.chat.completions.create.return_value = mock_response
        
        text = "Lot Number: LOT123, Plan Number: PLAN456, Extent: 10.5 perches"
        result = ai_service.extract_property_details(text)
        
        assert result["lot_number"] == "LOT123"
        assert result["plan_number"] == "PLAN456"
        assert result["extent"] == "10.5 perches"
        assert result["confidence"] == 0.95
    
    @patch('app.services.ai_extraction.openai_client')
    def test_extract_property_details_api_error(self, mock_openai, ai_service):
        """Test AI extraction with API error."""
        mock_openai.chat.completions.create.side_effect = Exception("API Error")
        
        text = "Some property text"
        
        with pytest.raises(Exception):
            ai_service.extract_property_details(text)
    
    @patch('app.services.ai_extraction.openai_client')
    def test_extract_invalid_json_response(self, mock_openai, ai_service):
        """Test handling of invalid JSON response from AI."""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Invalid JSON response"
        mock_openai.chat.completions.create.return_value = mock_response
        
        text = "Property details text"
        result = ai_service.extract_property_details(text)
        
        # Should return empty result with low confidence
        assert result.get("confidence", 0) < 0.5
    
    def test_confidence_scoring(self, ai_service):
        """Test confidence scoring algorithm."""
        high_confidence_data = {
            "lot_number": "LOT123",
            "plan_number": "PLAN456",
            "extent": "10.5 perches",
            "address": "123 Main Street"
        }
        
        low_confidence_data = {
            "lot_number": "",
            "plan_number": "UNKNOWN"
        }
        
        high_score = ai_service.calculate_confidence_score(high_confidence_data)
        low_score = ai_service.calculate_confidence_score(low_confidence_data)
        
        assert high_score > 0.8
        assert low_score < 0.5
        assert high_score > low_score


class TestDatabaseTransactions:
    """Test database transaction utilities."""
    
    def test_successful_transaction(self, db_session, test_user):
        """Test successful transaction commit."""
        with database_transaction(db_session) as session:
            client = Client(
                name="Test Client",
                address="Test Address",
                author_id=test_user.id
            )
            session.add(client)
        
        # Verify client was saved
        saved_client = db_session.query(Client).filter_by(name="Test Client").first()
        assert saved_client is not None
        assert saved_client.author_id == test_user.id
    
    def test_transaction_rollback_on_error(self, db_session, test_user):
        """Test transaction rollback on error."""
        initial_count = db_session.query(Client).count()
        
        with pytest.raises(Exception):
            with database_transaction(db_session) as session:
                # Add valid client
                client = Client(
                    name="Test Client",
                    address="Test Address", 
                    author_id=test_user.id
                )
                session.add(client)
                
                # Force an error
                raise Exception("Simulated error")
        
        # Verify rollback - no new clients should exist
        final_count = db_session.query(Client).count()
        assert final_count == initial_count
    
    @transactional()
    def _test_transactional_function(self, db: Session, user_id: str, should_fail: bool = False):
        """Helper function for testing transactional decorator."""
        client = Client(
            name="Transactional Test Client",
            address="Test Address",
            author_id=user_id
        )
        db.add(client)
        
        if should_fail:
            raise Exception("Intentional failure")
        
        return client
    
    def test_transactional_decorator_success(self, db_session, test_user):
        """Test successful transactional decorator."""
        client = self._test_transactional_function(db_session, test_user.id)
        
        # Verify client was saved
        saved_client = db_session.query(Client).filter_by(
            name="Transactional Test Client"
        ).first()
        assert saved_client is not None
    
    def test_transactional_decorator_rollback(self, db_session, test_user):
        """Test transactional decorator rollback on error."""
        initial_count = db_session.query(Client).count()
        
        with pytest.raises(Exception):
            self._test_transactional_function(db_session, test_user.id, should_fail=True)
        
        # Verify rollback
        final_count = db_session.query(Client).count()
        assert final_count == initial_count


class TestBusinessLogicErrors:
    """Test custom business logic errors."""
    
    def test_not_found_error(self):
        """Test NotFoundError creation."""
        error = NotFoundError("Report", "123")
        
        assert error.status_code == 404
        assert error.error_type == "NotFoundError"
        assert "Report not found (ID: 123)" in error.message
    
    def test_permission_denied_error(self):
        """Test PermissionDeniedError creation."""
        error = PermissionDeniedError("delete", "report")
        
        assert error.status_code == 403
        assert error.error_type == "PermissionDeniedError"
        assert "delete" in error.message
        assert "report" in error.message
    
    def test_duplicate_resource_error(self):
        """Test DuplicateResourceError creation."""
        error = DuplicateResourceError("Client", "email")
        
        assert error.status_code == 409
        assert error.error_type == "DuplicateResourceError"
        assert "Client already exists with this email" in error.message


class TestServiceIntegration:
    """Test integration between services."""
    
    def test_report_creation_workflow(self, db_session, test_user):
        """Test complete report creation workflow."""
        # Step 1: Create client
        with database_transaction(db_session) as session:
            client = Client(
                name="Integration Test Client",
                address="Test Address",
                email="test@example.com",
                author_id=test_user.id
            )
            session.add(client)
            session.flush()
            client_id = client.id
        
        # Step 2: Create report
        with database_transaction(db_session) as session:
            report = Report(
                title="Integration Test Report",
                reference_number="INT-2024-001", 
                status="draft",
                property_address="Integration Test Property",
                author_id=test_user.id,
                client_id=client_id,
                data={"property_type": "residential"}
            )
            session.add(report)
            session.flush()
            report_id = report.id
        
        # Step 3: Verify complete workflow
        saved_report = db_session.query(Report).filter_by(id=report_id).first()
        saved_client = db_session.query(Client).filter_by(id=client_id).first()
        
        assert saved_report is not None
        assert saved_client is not None
        assert saved_report.client_id == saved_client.id
        assert saved_report.author_id == test_user.id
    
    def test_validation_engine_with_ai_extraction(self, db_session):
        """Test validation engine working with AI extraction results."""
        validation_engine = create_validation_engine(db_session)
        ai_service = AIExtractionService()
        
        # Simulate AI extraction result
        ai_result = {
            "lot_number": "LOT123",
            "plan_number": "PLAN456", 
            "extent": "10.5 perches",
            "confidence": 0.95
        }
        
        # Validate AI results
        validation_result = validation_engine.validate_property_data(ai_result)
        
        if validation_result.is_valid:
            assert ai_result["confidence"] > 0.9
        else:
            # Low confidence results should trigger manual review
            assert len(validation_result.errors) > 0


class TestPerformanceAndEdgeCases:
    """Test performance scenarios and edge cases."""
    
    def test_large_batch_processing(self, db_session, test_user):
        """Test processing large batches of data."""
        batch_size = 100
        clients = []
        
        # Create large batch
        with database_transaction(db_session) as session:
            for i in range(batch_size):
                client = Client(
                    name=f"Batch Client {i}",
                    address=f"Address {i}",
                    email=f"client{i}@example.com",
                    author_id=test_user.id
                )
                clients.append(client)
                session.add(client)
        
        # Verify all were created
        saved_clients = db_session.query(Client).filter(
            Client.name.like("Batch Client %")
        ).all()
        
        assert len(saved_clients) == batch_size
    
    def test_concurrent_access_simulation(self, db_session, test_user):
        """Test concurrent access patterns."""
        import threading
        import time
        
        results = []
        errors = []
        
        def create_client(client_id):
            try:
                with database_transaction(db_session) as session:
                    client = Client(
                        name=f"Concurrent Client {client_id}",
                        address=f"Address {client_id}",
                        author_id=test_user.id
                    )
                    session.add(client)
                    time.sleep(0.1)  # Simulate processing time
                results.append(client_id)
            except Exception as e:
                errors.append(str(e))
        
        # Simulate concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_client, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Verify results
        assert len(errors) == 0  # No errors should occur
        assert len(results) == 5  # All operations should succeed
    
    @pytest.mark.performance
    def test_query_performance(self, db_session, test_user, performance_timer):
        """Test query performance with indexes."""
        # Create test data
        for i in range(50):
            client = Client(
                name=f"Performance Client {i}",
                address=f"Address {i}",
                author_id=test_user.id
            )
            db_session.add(client)
        db_session.commit()
        
        # Test query performance
        performance_timer.start()
        
        # This should be fast with proper indexing
        results = db_session.query(Client).filter(
            Client.author_id == test_user.id
        ).all()
        
        performance_timer.stop()
        
        assert len(results) == 50
        assert performance_timer.elapsed < 0.1  # Should complete in under 100ms