"""
Test script to directly call the batch OCR API and see what data is returned
"""
import requests
import json
import sys

# Test with a recent report ID and some uploaded file IDs
API_BASE = "http://localhost:8000/api/v1"
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzI1MTE3NTc4fQ.Ip5LH-Pf2FhVh4b3K8FdpVYALH7fJNHdMPPsqCqR_D8"  # You'll need to get this

def test_batch_ocr():
    # Get recent files from the uploads
    files_endpoint = f"{API_BASE}/reports/007c5527-e422-4957-9ad9-49c2294a17e1/files"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        # Get the files
        print("Fetching uploaded files...")
        response = requests.get(files_endpoint, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to get files: {response.status_code} - {response.text}")
            return
        
        files_data = response.json()
        print(f"Found {len(files_data)} files")
        
        # Get the most recent 4 file IDs
        if len(files_data) < 4:
            print("Not enough files found")
            return
            
        recent_files = sorted(files_data, key=lambda x: x.get('created_at', ''), reverse=True)[:4]
        file_ids = [f['id'] for f in recent_files]
        
        print(f"Testing with file IDs: {file_ids}")
        
        # Call batch OCR
        batch_endpoint = f"{API_BASE}/batch-ocr/batch-process"
        batch_payload = {
            "file_ids": file_ids,
            "consolidate_analysis": True,
            "auto_populate": True
        }
        
        print("Calling batch OCR API...")
        batch_response = requests.post(batch_endpoint, headers=headers, json=batch_payload)
        
        if batch_response.status_code != 200:
            print(f"Batch OCR failed: {batch_response.status_code} - {batch_response.text}")
            return
        
        result = batch_response.json()
        
        print("=== BATCH OCR RESULT ===")
        print(f"Total files: {result.get('total_files')}")
        print(f"Successful files: {result.get('successful_files')}")
        print(f"Failed files: {result.get('failed_files')}")
        
        for i, file_result in enumerate(result.get('files', [])[:2]):  # Show first 2 files
            print(f"\n--- FILE {i+1}: {file_result.get('filename')} ---")
            print(f"Success: {file_result.get('success')}")
            
            if file_result.get('ai_analysis'):
                analysis = file_result['ai_analysis']
                print(f"AI Analysis keys: {list(analysis.keys())}")
                
                # Check for comprehensive data
                if 'comprehensive_data' in analysis:
                    comp_data = analysis['comprehensive_data']
                    if isinstance(comp_data, dict) and not comp_data.get('error'):
                        print("✅ Has comprehensive data!")
                        print(f"Comprehensive data keys: {list(comp_data.keys())}")
                        
                        # Count fields with actual data
                        total_fields = 0
                        for section, data in comp_data.items():
                            if isinstance(data, dict) and data:
                                field_count = len([k for k, v in data.items() if v is not None and v != ''])
                                if field_count > 0:
                                    print(f"  {section}: {field_count} fields")
                                    total_fields += field_count
                            elif isinstance(data, list) and data:
                                print(f"  {section}: {len(data)} items")
                                total_fields += len(data)
                        
                        print(f"Total fields with data: {total_fields}")
                        
                    else:
                        print(f"❌ Comprehensive data has error: {comp_data.get('error')}")
                else:
                    print("❌ No comprehensive_data in AI analysis")
                    
                # Show legacy data
                if 'extracted_data' in analysis:
                    ext_data = analysis['extracted_data']
                    print(f"Legacy extracted_data keys: {list(ext_data.keys()) if isinstance(ext_data, dict) else 'Not a dict'}")
                    
            else:
                print("❌ No AI analysis")
                if file_result.get('error'):
                    print(f"Error: {file_result['error']}")
        
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Testing live batch OCR API...")
    test_batch_ocr()