"""
Test configuration and fixtures for ValuerPro backend tests.
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator
import tempfile
import os

from app.main import app
from app.db import get_db, Base
from app.models import User, Report
from app.deps import get_current_active_user
from app.core.config import settings

# Test database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "isolation_level": None
    },
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create database session for each test."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session) -> TestClient:
    """Create test client with database override."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session) -> User:
    """Create test user."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=pwd_context.hash("testpassword123"),
        title="Chartered Valuer",
        qualifications="AIVSL, FRICS",
        panel_memberships="Valuation Panel, Supreme Court",
        business_address="123 Test Street, Colombo 01",
        contact_numbers="+94 11 123 4567",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client: TestClient, test_user: User) -> TestClient:
    """Create authenticated test client."""
    # Login and get token
    response = client.post("/api/v1/auth/login", data={
        "username": test_user.email,
        "password": "testpassword123"
    })
    token = response.json()["access_token"]
    
    # Override authentication
    def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_current_active_user] = override_get_current_user
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture
def test_report(db_session, test_user: User) -> Report:
    """Create test report."""
    report = Report(
        title="Test Property Valuation",
        reference_number="TST-2024-001",
        status="draft",
        property_address="123 Test Property, Test City",
        data={
            "property_type": "residential",
            "land_area": 1000.0,
            "building_area": 500.0,
            "valuation_amount": 25000000.0
        },
        author_id=test_user.id
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    return report


@pytest.fixture
def sample_image_file():
    """Create sample image file for testing."""
    import io
    from PIL import Image
    
    # Create a simple test image
    image = Image.new('RGB', (100, 100), color='red')
    img_buffer = io.BytesIO()
    image.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    return ("test_image.png", img_buffer, "image/png")


@pytest.fixture
def sample_pdf_file():
    """Create sample PDF file for testing."""
    import io
    from reportlab.pdfgen import canvas
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 750, "This is a test PDF document")
    p.showPage()
    p.save()
    buffer.seek(0)
    
    return ("test_document.pdf", buffer, "application/pdf")


@pytest.fixture
def temp_storage_dir():
    """Create temporary storage directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Override storage settings
        original_storage_dir = getattr(settings, 'STORAGE_DIR', './storage')
        settings.STORAGE_DIR = temp_dir
        yield temp_dir
        settings.STORAGE_DIR = original_storage_dir


# Async fixtures for async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Performance testing utilities
@pytest.fixture
def performance_timer():
    """Timer fixture for performance testing."""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.perf_counter()
        
        def stop(self):
            self.end_time = time.perf_counter()
        
        @property
        def elapsed(self):
            if self.start_time is None or self.end_time is None:
                return 0
            return self.end_time - self.start_time
    
    return Timer()


# Mock external services
@pytest.fixture
def mock_openai_client(monkeypatch):
    """Mock OpenAI client for testing."""
    class MockOpenAIResponse:
        def __init__(self, content):
            self.content = content
        
        @property
        def choices(self):
            return [type('Choice', (), {'message': type('Message', (), {'content': self.content})()})]
    
    class MockOpenAI:
        def __init__(self):
            pass
        
        def chat_completions_create(self, **kwargs):
            return MockOpenAIResponse("Mock AI response")
    
    monkeypatch.setattr("app.services.ai_extraction.openai_client", MockOpenAI())


@pytest.fixture
def mock_google_vision_client(monkeypatch):
    """Mock Google Vision client for testing."""
    class MockVisionResponse:
        def __init__(self):
            self.text_annotations = [
                type('TextAnnotation', (), {'description': 'Mock OCR text extraction result'})()
            ]
    
    class MockVisionClient:
        def text_detection(self, **kwargs):
            return MockVisionResponse()
    
    monkeypatch.setattr("app.api.api_v1.endpoints.ocr.vision", MockVisionClient())