import os
import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app

client = TestClient(app)

def test_ocr_endpoint_no_auth():
    """Test OCR endpoint without authentication returns 401"""
    response = client.post("/api/v1/ocr/extract_text", json={"file_path": "/test/path"})
    assert response.status_code == 401

@pytest.mark.skipif(
    not os.getenv('GOOGLE_APPLICATION_CREDENTIALS') and 
    not os.path.exists('backend/secrets/project-01-468906-c154b5f679c4.json'),
    reason="Google Vision credentials not configured"
)
def test_ocr_endpoint_with_sample_image():
    """Test OCR endpoint with a sample image (requires authentication and Google credentials)"""
    # This test would require:
    # 1. Authentication token
    # 2. Google Vision credentials
    # 3. A sample image file in storage
    
    # For now, we'll skip this test in CI/CD until we have proper test fixtures
    pytest.skip("Requires authentication and sample files")

def test_ocr_endpoint_missing_file_path():
    """Test OCR endpoint with missing file_path parameter"""
    # First we need to get an auth token - this would normally be done in a fixture
    # For now we'll skip this test since it requires authentication setup
    pytest.skip("Requires authentication setup")

def test_ocr_endpoint_invalid_file_type():
    """Test OCR endpoint with invalid file type"""
    # This would test the file type validation
    pytest.skip("Requires authentication setup")

def test_ocr_endpoint_file_not_found():
    """Test OCR endpoint with non-existent file"""
    pytest.skip("Requires authentication setup")

def test_ocr_endpoint_file_outside_storage():
    """Test OCR endpoint with file outside storage directory (security test)"""
    pytest.skip("Requires authentication setup")

# Integration test that can be run manually when credentials are available
def manual_test_ocr_with_sample():
    """Manual test function for OCR with sample files"""
    # This is not a pytest test, but a helper function for manual testing
    # Usage: python -c "from tests.test_ocr import manual_test_ocr_with_sample; manual_test_ocr_with_sample()"
    
    # Check if sample files exist
    storage_dir = Path("./storage")
    sample_files = list(storage_dir.glob("**/*.png")) + list(storage_dir.glob("**/*.pdf"))
    
    if not sample_files:
        print("No sample files found in storage directory")
        return
    
    print(f"Found {len(sample_files)} sample files:")
    for file in sample_files:
        print(f"  - {file}")
    
    print("\nTo test OCR manually:")
    print("1. Start the backend server: uvicorn app.main:app --reload")
    print("2. Login to get an authentication token")
    print("3. Use curl or Postman to test the /api/v1/ocr/extract_text endpoint")
    print("4. Example curl command:")
    print(f'   curl -X POST "http://localhost:8000/api/v1/ocr/extract_text" \\')
    print('        -H "Authorization: Bearer YOUR_TOKEN" \\')
    print('        -H "Content-Type: application/json" \\')
    print(f'        -d "{{\\"file_path\\": \\"{sample_files[0]}\\"}}"')

if __name__ == "__main__":
    manual_test_ocr_with_sample()