"""
Simple tests to verify the testing infrastructure works.
"""
import pytest
from app.models import User, Report
from app.schemas import UserCreate
from pydantic import ValidationError


def test_user_model_creation():
    """Test basic User model instantiation."""
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed_password_123",
        is_active=True
    )
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True


def test_report_model_creation():
    """Test basic Report model instantiation."""
    from uuid import uuid4
    
    report = Report(
        ref="TEST-001",
        purpose="Market Valuation",
        status="draft",
        author_id=uuid4()
    )
    assert report.ref == "TEST-001"
    assert report.purpose == "Market Valuation"
    assert report.status == "draft"


def test_user_create_schema_validation():
    """Test UserCreate schema validation."""
    # Valid data
    valid_data = {
        "email": "test@example.com",
        "password": "securepassword123",
        "full_name": "Test User",
        "role": "valuer"
    }
    user_create = UserCreate(**valid_data)
    assert user_create.email == "test@example.com"
    assert user_create.password == "securepassword123"
    
    # Invalid data - password too short
    with pytest.raises(ValidationError):
        UserCreate(
            email="test@example.com",
            password="123",  # Too short
            full_name="Test User"
        )


def test_environment_imports():
    """Test that all major modules can be imported."""
    from app.main import app
    from app.db import get_db
    from app.core.config import settings
    
    assert app is not None
    assert get_db is not None
    assert settings is not None


class TestMathOperations:
    """Test basic math operations to verify pytest setup."""
    
    def test_addition(self):
        assert 2 + 2 == 4
        
    def test_subtraction(self):
        assert 5 - 3 == 2
        
    def test_multiplication(self):
        assert 3 * 4 == 12


@pytest.mark.parametrize("input,expected", [
    ("valid@email.com", True),
    ("invalid.email", False),
    ("", False),
    ("test@", False),
])
def test_email_validation_basic(input, expected):
    """Test basic email validation patterns."""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    result = bool(re.match(email_pattern, input))
    assert result == expected