"""
Test script to check what the batch OCR API returns
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Change to backend directory for proper .env loading
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.ai_extraction import process_document_with_ai

# Same test text as comprehensive extraction test
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

def test_batch_api():
    print("=== TESTING BATCH OCR API DATA FORMAT ===")
    print(f"Text length: {len(test_text)} characters")
    
    try:
        # This simulates what the batch OCR API does
        result = process_document_with_ai(test_text)
        
        print(f"\nBATCH API RESULT STRUCTURE:")
        print(f"Type: {type(result)}")
        print(f"Keys: {list(result.keys())}")
        
        # Check each section
        for key in result.keys():
            value = result[key]
            if isinstance(value, dict) and value:
                print(f"\n{key.upper()}:")
                if key == 'comprehensive_data':
                    # Check if comprehensive data has all wizard sections
                    comp_keys = list(value.keys())
                    print(f"  Comprehensive keys: {comp_keys}")
                    
                    # Check specific wizard sections
                    wizard_sections = ['identification', 'location', 'site', 'buildings', 'utilities', 'locality', 'planning', 'legal']
                    for section in wizard_sections:
                        if section in value:
                            section_data = value[section]
                            if isinstance(section_data, dict):
                                count = len([k for k, v in section_data.items() if v is not None and v != '' and v != []])
                                print(f"    {section}: {count} fields with data")
                            elif isinstance(section_data, list) and section_data:
                                print(f"    {section}: {len(section_data)} items")
                            else:
                                print(f"    {section}: Empty or null")
                        else:
                            print(f"    {section}: MISSING")
                            
                elif key == 'extracted_data':
                    print(f"  Extracted data keys: {list(value.keys()) if isinstance(value, dict) else 'Not a dict'}")
                elif key == 'general_data':  
                    print(f"  General data keys: {list(value.keys()) if isinstance(value, dict) else 'Not a dict'}")
                else:
                    print(f"  {key}: {value}")
            else:
                print(f"\n{key.upper()}: {value}")
                
        # Show what data would be available for the wizard
        if 'comprehensive_data' in result and isinstance(result['comprehensive_data'], dict):
            comp_data = result['comprehensive_data']
            print(f"\n=== DATA AVAILABLE FOR WIZARD ===")
            
            # Count total fields with actual data
            total_fields = 0
            for section, data in comp_data.items():
                if isinstance(data, dict):
                    field_count = len([k for k, v in data.items() if v is not None and v != '' and v != []])
                    total_fields += field_count
                elif isinstance(data, list) and data:
                    total_fields += len(data)
            
            print(f"Total fields with data: {total_fields}")
            
            if total_fields > 0:
                print("SUCCESS: Comprehensive data available for all wizard steps!")
            else:
                print("PROBLEM: No comprehensive data available!")
        else:
            print("ERROR: No comprehensive_data in result!")
            
        return result
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    test_batch_api()