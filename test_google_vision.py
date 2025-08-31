"""
Test if Google Vision API is working
"""
import os
import sys
sys.path.append('backend')
os.chdir('backend')

def test_google_vision():
    print("Testing Google Vision API...")
    
    try:
        from google.cloud import vision
        print("[OK] Google Cloud Vision imported successfully")
        
        # Check credentials
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 
                                  'credentials/project-01-468906-7e04f8ab374d.json')
        print(f"Credentials path: {cred_path}")
        print(f"Credentials file exists: {os.path.exists(cred_path)}")
        
        # Try to create client
        client = vision.ImageAnnotatorClient()
        print("[OK] Google Vision client created successfully")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Google Vision error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_google_vision()