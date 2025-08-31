"""
Test script to verify comprehensive AI extraction is working
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

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

def test_comprehensive_extraction():
    print("Testing Comprehensive AI Extraction...")
    print("=" * 60)
    
    try:
        result = extract_comprehensive_property_data(test_text)
        
        print("SUCCESS: Extraction completed successfully!")
        print(f"Model used: {result.get('model_used', 'Unknown')}")
        print(f"Text length processed: {result.get('text_length', 'Unknown')} characters")
        print(f"Data validated: {result.get('data_validated', 'Unknown')}")
        
        if 'validation_errors_count' in result:
            print(f"Validation errors: {result['validation_errors_count']}")
        
        # Check each section
        sections = ['identification', 'location', 'site', 'buildings', 'utilities', 'locality', 'planning', 'legal']
        
        print("\nSECTIONS EXTRACTED:")
        print("-" * 40)
        
        for section in sections:
            if section in result and result[section]:
                data_count = len(result[section]) if isinstance(result[section], dict) else 1
                print(f"OK {section.title()}: {data_count} fields extracted")
                
                # Show first few fields as sample
                if isinstance(result[section], dict):
                    sample_fields = list(result[section].keys())[:3]
                    if sample_fields:
                        print(f"   Sample fields: {', '.join(sample_fields)}")
            else:
                print(f"EMPTY {section.title()}: No data extracted")
        
        print("\nDETAILED EXTRACTION RESULTS:")
        print("-" * 40)
        
        # Show identification data
        if 'identification' in result and result['identification']:
            id_data = result['identification']
            print("\nIDENTIFICATION:")
            for key, value in id_data.items():
                if value:
                    print(f"  - {key}: {value}")
        
        # Show location data  
        if 'location' in result and result['location']:
            loc_data = result['location']
            print("\nLOCATION:")
            for key, value in loc_data.items():
                if value:
                    print(f"  - {key}: {value}")
        
        # Show buildings data
        if 'buildings' in result and result['buildings']:
            print(f"\nBUILDINGS: {len(result['buildings'])} found")
            for i, building in enumerate(result['buildings'][:2]):  # Show first 2
                print(f"  Building {i+1}:")
                for key, value in building.items():
                    if value:
                        print(f"    - {key}: {value}")
        
        return result
        
    except Exception as e:
        print(f"ERROR: Extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = test_comprehensive_extraction()
    
    if result:
        print("\nSUCCESS: Comprehensive extraction is working!")
        print("Your system should extract data for all wizard steps.")
    else:
        print("\nFAILED: Comprehensive extraction not working properly.")
        print("This might explain why you're only seeing limited data.")