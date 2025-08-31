"""
Debug script to check comprehensive AI extraction with detailed output
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Change to backend directory for proper .env loading
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.ai_extraction import extract_comprehensive_property_data

# Sample text that would be extracted from your property documents
test_text = """
Survey Plan No. 12345
Lot No. 5
Plan Date: 2021-12-14
Licensed Surveyor: John Silva (LS/2023/001)
Land situated at Mangedara
Village: Mangedara
Grama Niladhari Division: Mangedara
Divisional Secretariat: Warakapola
District: Kegalle
Province: Sabaragamuwa

Extent: 1A-2R-15.5P (125.5 perches)

Boundaries:
North: Lot 1 in this Plan
South: Lot 3 in this Plan  
East: Road (Highway) from Ambepussa to Kurunegala
West: Nangalle Ela

Encumbrances:
Mortgage Bond No. 5944 dated 12.06.2017
Bond No. 800 dated 28.03.2018

Owner: W.M. Silva
Deed No. 12345 dated 2021-12-14

Building Details:
Single storey house
Floor area: 1200 sq ft
Construction: Brick and cement block
Roof: Clay tiles
Built in 2018
Condition: Good

Utilities:
Electricity: Available (CEB connection)
Water: Well water, good quality
Telephone: Available
"""

def debug_extraction():
    print("=== DEBUG COMPREHENSIVE AI EXTRACTION ===")
    print(f"Working directory: {os.getcwd()}")
    print(f"Text length: {len(test_text)} characters")
    print(f"Sample text: {test_text[:200]}...")
    print("\nCalling extract_comprehensive_property_data...")
    
    try:
        result = extract_comprehensive_property_data(test_text)
        
        print(f"\nFULL RESULT:")
        print(f"Type: {type(result)}")
        print(f"Keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        print(f"Full result: {result}")
        
        if 'error' in result:
            print(f"ERROR in result: {result['error']}")
            return False
            
        return True
        
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_extraction()