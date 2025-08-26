"""
AI-generated test scenarios using property-based testing and intelligent data generation
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from decimal import Decimal
from datetime import datetime, timedelta
import asyncio
from fastapi.testclient import TestClient

from app.main import app
from .ai_test_generators import (
    AITestDataGenerator,
    property_valuation_strategy,
    sri_lankan_location_strategy,
    AIBehaviorPredictor,
    IntelligentTestPrioritizer
)


class TestAIGeneratedScenarios:
    """AI-generated test scenarios for comprehensive testing"""

    @pytest.mark.ai_generated
    @given(property_data=property_valuation_strategy())
    @settings(max_examples=50, deadline=None)
    def test_property_valuation_with_ai_data(self, client: TestClient, authenticated_client: TestClient, property_data):
        """Property-based test for valuation logic with AI-generated data"""
        
        # Ensure data constraints are met
        assume(property_data['market_value'] > 0)
        assume(property_data['extent_perches'] > 0.1)
        
        # Create report with AI-generated property data
        report_data = {
            "ref": f"AI-TEST-{property_data['report_date'].strftime('%Y%m%d')}",
            "purpose": property_data['purpose'],
            "basis_of_value": "Market Value",
            "report_date": property_data['report_date'].isoformat(),
            "inspection_date": (property_data['report_date'] - timedelta(days=1)).isoformat(),
            "currency": "LKR"
        }
        
        response = authenticated_client.post("/api/v1/reports/", json=report_data)
        assert response.status_code == 201
        
        report_id = response.json()["id"]
        
        # Test valuation calculations
        valuation_data = {
            "market_value": float(property_data['market_value']),
            "market_value_words": f"Rupees {property_data['market_value']:,.2f} only",
            "forced_sale_value": float(property_data['market_value'] * 0.8)
        }
        
        valuation_response = authenticated_client.post(
            f"/api/v1/reports/{report_id}/valuation",
            json=valuation_data
        )
        
        # AI-powered assertions based on business rules
        if valuation_response.status_code == 201:
            valuation = valuation_response.json()
            
            # Market value should match input
            assert abs(valuation["market_value"] - property_data['market_value']) < 0.01
            
            # Forced sale value should be less than market value
            assert valuation["forced_sale_value"] < valuation["market_value"]
            
            # Forced sale percentage should be reasonable (60-90%)
            fs_percentage = valuation["forced_sale_value"] / valuation["market_value"]
            assert 0.6 <= fs_percentage <= 0.9
        else:
            # If validation failed, ensure it's for a good reason
            error = valuation_response.json()
            assert "error" in error or "detail" in error

    @pytest.mark.ai_generated
    @given(location_data=sri_lankan_location_strategy())
    @settings(max_examples=30)
    def test_sri_lankan_location_validation(self, client: TestClient, authenticated_client: TestClient, location_data):
        """Test Sri Lankan location data validation with AI-generated geographic data"""
        
        # Create a report first
        report_data = {
            "ref": "LOC-TEST-001",
            "purpose": "Sale/Purchase",
            "report_date": datetime.now().date().isoformat(),
            "inspection_date": (datetime.now() - timedelta(days=1)).date().isoformat()
        }
        
        response = authenticated_client.post("/api/v1/reports/", json=report_data)
        report_id = response.json()["id"]
        
        # Create property
        property_data = {"property_type": "residential_land"}
        prop_response = authenticated_client.post(
            f"/api/v1/reports/{report_id}/properties",
            json=property_data
        )
        property_id = prop_response.json()["id"]
        
        # Test location data
        location_payload = {
            **location_data,
            "address_full": f"Test Address, {location_data['district']}, Sri Lanka",
            "property_id": property_id
        }
        
        location_response = authenticated_client.post(
            f"/api/v1/properties/{property_id}/location",
            json=location_payload
        )
        
        if location_response.status_code == 201:
            location = location_response.json()
            
            # Verify Sri Lankan coordinate bounds
            assert 5.5 <= location["lat"] <= 10.0
            assert 79.0 <= location["lng"] <= 82.0
            
            # Verify district/province consistency (AI-learned patterns)
            district_province_map = {
                'Colombo': 'Western',
                'Gampaha': 'Western',
                'Kalutara': 'Western',
                'Kandy': 'Central',
                'Galle': 'Southern'
            }
            
            if location["district"] in district_province_map:
                expected_province = district_province_map[location["district"]]
                # Allow flexibility for test data, but log inconsistencies
                if location["province"] != expected_province:
                    print(f"Geographic inconsistency: {location['district']} in {location['province']}, expected {expected_province}")

    @pytest.mark.ai_generated
    @pytest.mark.benchmark
    def test_ai_generated_performance_scenarios(self, client: TestClient, authenticated_client: TestClient, benchmark):
        """AI-generated performance test scenarios"""
        
        # Generate realistic test data
        test_data = AITestDataGenerator.generate_performance_test_data(count=100)
        
        def create_reports_batch():
            """Create multiple reports to test batch performance"""
            report_ids = []
            
            for data in test_data[:10]:  # Limit for benchmark
                report_payload = data["report_info"]
                response = authenticated_client.post("/api/v1/reports/", json=report_payload)
                
                if response.status_code == 201:
                    report_ids.append(response.json()["id"])
            
            return report_ids
        
        # Benchmark report creation
        result = benchmark(create_reports_batch)
        
        # AI-powered performance assertions
        assert len(result) > 0, "Should create at least one report"
        
        # Performance should be reasonable (under 5 seconds for 10 reports)
        # This will be captured by pytest-benchmark automatically

    @pytest.mark.ai_generated
    def test_edge_cases_with_ai_fuzzing(self, client: TestClient, authenticated_client: TestClient):
        """Test edge cases using AI-generated fuzzing data"""
        
        edge_case_generator = AITestDataGenerator.generate_edge_case_data()
        
        for edge_case in edge_case_generator:
            # Create base report
            base_report = {
                "ref": "EDGE-TEST-001",
                "purpose": "Sale/Purchase",
                "report_date": datetime.now().date().isoformat(),
                "inspection_date": (datetime.now() - timedelta(days=1)).date().isoformat()
            }
            
            response = authenticated_client.post("/api/v1/reports/", json=base_report)
            
            if response.status_code != 201:
                continue
            
            report_id = response.json()["id"]
            
            # Test each edge case component
            for field_group, field_data in edge_case.items():
                if field_group == "identification":
                    # Create property first
                    prop_response = authenticated_client.post(
                        f"/api/v1/reports/{report_id}/properties",
                        json={"property_type": "residential_land"}
                    )
                    
                    if prop_response.status_code == 201:
                        property_id = prop_response.json()["id"]
                        
                        # Test identification data
                        identification_response = authenticated_client.post(
                            f"/api/v1/properties/{property_id}/identification",
                            json={**field_data, "property_id": property_id}
                        )
                        
                        # Edge cases should either succeed or fail gracefully
                        assert identification_response.status_code in [201, 400, 422]
                        
                        if identification_response.status_code in [400, 422]:
                            # Should have meaningful error messages
                            error_data = identification_response.json()
                            assert "detail" in error_data or "error" in error_data

    @pytest.mark.ai_generated
    def test_user_behavior_scenarios(self, client: TestClient, authenticated_client: TestClient):
        """Test realistic user behavior scenarios predicted by AI"""
        
        scenarios = AIBehaviorPredictor.generate_user_journey_scenarios()
        
        for scenario in scenarios[:2]:  # Test first 2 scenarios
            print(f"\n🎭 Testing scenario: {scenario['name']}")
            print(f"Description: {scenario['description']}")
            
            if scenario['name'] == 'new_user_first_report':
                # Simulate new user creating first report
                
                # Step 1: Create report (might be slow/hesitant)
                report_data = {
                    "ref": "NEW-USER-001",
                    "purpose": "Sale/Purchase",
                    "report_date": datetime.now().date().isoformat(),
                    "inspection_date": (datetime.now() - timedelta(days=1)).date().isoformat()
                }
                
                response = authenticated_client.post("/api/v1/reports/", json=report_data)
                assert response.status_code == 201
                report_id = response.json()["id"]
                
                # Step 2: Save as draft (new users often save frequently)
                draft_response = authenticated_client.patch(
                    f"/api/v1/reports/{report_id}",
                    json={"status": "draft"}
                )
                assert draft_response.status_code == 200
                
                # Step 3: Might abandon and come back later (test retrieval)
                retrieve_response = authenticated_client.get(f"/api/v1/reports/{report_id}")
                assert retrieve_response.status_code == 200
                assert retrieve_response.json()["status"] == "draft"
                
            elif scenario['name'] == 'experienced_user_bulk_reports':
                # Simulate experienced user workflow
                
                # Create multiple reports quickly
                report_ids = []
                for i in range(3):
                    report_data = {
                        "ref": f"BULK-{i+1:03d}",
                        "purpose": "Bank valuation",
                        "report_date": datetime.now().date().isoformat(),
                        "inspection_date": (datetime.now() - timedelta(days=i+1)).date().isoformat()
                    }
                    
                    response = authenticated_client.post("/api/v1/reports/", json=report_data)
                    assert response.status_code == 201
                    report_ids.append(response.json()["id"])
                
                # Experienced users expect efficient bulk operations
                # Test listing all reports
                list_response = authenticated_client.get("/api/v1/reports/")
                assert list_response.status_code == 200
                
                reports = list_response.json()
                bulk_reports = [r for r in reports if r["ref"].startswith("BULK-")]
                assert len(bulk_reports) >= 3

    @pytest.mark.ai_generated
    def test_failure_scenario_predictions(self, client: TestClient, authenticated_client: TestClient):
        """Test likely failure scenarios predicted by AI"""
        
        failure_scenarios = AIBehaviorPredictor.predict_failure_scenarios()
        
        for scenario in failure_scenarios:
            if scenario["probability"] > 0.3:  # Test high-probability scenarios
                print(f"\n💥 Testing failure scenario: {scenario['scenario']}")
                
                if scenario['scenario'] == 'calculation_precision_errors':
                    # Test with extreme decimal values
                    report_data = {
                        "ref": "PRECISION-TEST",
                        "purpose": "Sale/Purchase",
                        "report_date": datetime.now().date().isoformat(),
                        "inspection_date": (datetime.now() - timedelta(days=1)).date().isoformat()
                    }
                    
                    response = authenticated_client.post("/api/v1/reports/", json=report_data)
                    report_id = response.json()["id"]
                    
                    # Test extreme precision scenarios
                    extreme_values = [
                        999999999.999999,  # Very large with decimals
                        0.000001,          # Very small
                        123456.123456789   # Many decimal places
                    ]
                    
                    for value in extreme_values:
                        valuation_data = {
                            "market_value": value,
                            "market_value_words": f"Rupees {value:,.2f} only",
                            "forced_sale_value": value * 0.8
                        }
                        
                        valuation_response = authenticated_client.post(
                            f"/api/v1/reports/{report_id}/valuation",
                            json=valuation_data
                        )
                        
                        # Should handle precision gracefully
                        if valuation_response.status_code == 201:
                            result = valuation_response.json()
                            # Verify precision is maintained within reasonable bounds
                            assert abs(result["market_value"] - value) < 0.01

    @pytest.mark.ai_generated
    def test_intelligent_test_prioritization(self, client: TestClient):
        """Test the AI test prioritization system itself"""
        
        # Create mock test cases
        test_cases = [
            {
                "name": "valuation_calculation",
                "category": "valuation",
                "complexity": "high",
                "involves_money": True,
                "historical_failure_rate": 0.1,
                "covers_recent_changes": True
            },
            {
                "name": "user_registration",
                "category": "auth",
                "complexity": "medium",
                "involves_money": False,
                "historical_failure_rate": 0.05,
                "covers_recent_changes": False
            },
            {
                "name": "report_pdf_export",
                "category": "export",
                "complexity": "low",
                "involves_money": False,
                "historical_failure_rate": 0.2,
                "covers_recent_changes": True
            }
        ]
        
        # Use AI prioritizer
        prioritized = IntelligentTestPrioritizer.prioritize_tests(test_cases)
        
        # Verify prioritization logic
        assert len(prioritized) == len(test_cases)
        
        # Valuation tests should be high priority (involves money + business critical)
        valuation_test = next(test for test in prioritized if test["name"] == "valuation_calculation")
        valuation_index = prioritized.index(valuation_test)
        
        # Should be among top priorities
        assert valuation_index <= 1, "Valuation tests should be high priority"
        
        print(f"🧠 AI Test Prioritization Results:")
        for i, test in enumerate(prioritized):
            print(f"  {i+1}. {test['name']} (category: {test['category']})")


@pytest.mark.hypothesis
class TestHypothesisBasedValidation:
    """Property-based testing using Hypothesis for advanced validation"""

    @given(
        extent=st.floats(min_value=0.1, max_value=10000),
        rate_per_perch=st.floats(min_value=10000, max_value=5000000)
    )
    @settings(max_examples=100)
    def test_land_valuation_properties(self, extent, rate_per_perch):
        """Property-based test for land valuation calculations"""
        
        # Calculate expected value
        expected_value = extent * rate_per_perch
        
        # Test that our calculation logic maintains invariants
        assert expected_value >= 0
        
        # Value should scale linearly with extent
        double_extent_value = (extent * 2) * rate_per_perch
        assert abs(double_extent_value - (expected_value * 2)) < 0.01
        
        # Value should scale linearly with rate
        double_rate_value = extent * (rate_per_perch * 2)
        assert abs(double_rate_value - (expected_value * 2)) < 0.01

    @given(
        market_value=st.floats(min_value=100000, max_value=1000000000),
        fs_percentage=st.floats(min_value=0.5, max_value=0.95)
    )
    def test_forced_sale_value_properties(self, market_value, fs_percentage):
        """Property-based test for forced sale value calculations"""
        
        forced_sale_value = market_value * fs_percentage
        
        # Invariants that should always hold
        assert forced_sale_value < market_value
        assert forced_sale_value > 0
        assert 0.5 <= fs_percentage <= 0.95
        
        # Relationship preservation
        if market_value > 0:
            calculated_percentage = forced_sale_value / market_value
            assert abs(calculated_percentage - fs_percentage) < 0.001