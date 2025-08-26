"""
AI-powered test case generators for ValuerPro backend
Uses property-based testing, fuzzing, and intelligent test data generation
"""
import random
from typing import Any, Dict, List, Optional, Generator
from datetime import datetime, timedelta
from decimal import Decimal
from faker import Faker
from hypothesis import strategies as st
from hypothesis.strategies import composite
import factory


fake = Faker(['en_US'])  # English US locale


class AITestDataGenerator:
    """AI-powered test data generation with contextual awareness"""
    
    @staticmethod
    def generate_property_valuation_data(
        property_type: str = "residential",
        complexity: str = "standard"
    ) -> Dict[str, Any]:
        """Generate realistic property valuation test data based on Sri Lankan context"""
        
        # Sri Lankan districts and their typical property values
        district_value_ranges = {
            'Colombo': (15000000, 100000000),  # Higher values for Colombo
            'Gampaha': (8000000, 50000000),
            'Kandy': (5000000, 30000000),
            'Galle': (6000000, 35000000),
            'Matara': (4000000, 25000000),
            'Kurunegala': (3000000, 20000000),
        }
        
        district = fake.random_element(list(district_value_ranges.keys()))
        min_val, max_val = district_value_ranges[district]
        
        # Generate contextually appropriate data
        base_data = {
            "report_info": {
                "ref": f"VAL-{fake.year()}-{fake.random_int(1000, 9999)}",
                "purpose": fake.random_element([
                    "Bank valuation", "Insurance valuation", "Sale/Purchase",
                    "Investment decision", "Tax assessment", "Legal proceedings"
                ]),
                "basis_of_value": fake.random_element([
                    "Market Value", "Fair Value", "Investment Value"
                ]),
                "report_date": fake.date_between(start_date='-30d', end_date='today'),
                "inspection_date": fake.date_between(start_date='-60d', end_date='-1d'),
                "currency": "LKR"
            },
            "identification": {
                "lot_number": fake.bothify("LOT###??"),
                "plan_number": fake.bothify("PLAN####"),
                "plan_date": fake.date_between(start_date='-20y', end_date='-1y'),
                "surveyor_name": fake.name(),
                "land_name": fake.street_name() + " Land",
                "extent_perches": fake.random_int(10, 200),
                "deed_no": fake.bothify("DEED#####"),
                "deed_date": fake.date_between(start_date='-30y', end_date='-1y'),
                "notary": fake.name(),
                "interest": fake.random_element(["freehold", "leasehold"])
            },
            "location": {
                "district": district,
                "province": fake.random_element([
                    "Western", "Central", "Southern", "Northern", "Eastern",
                    "North Western", "North Central", "Uva", "Sabaragamuwa"
                ]),
                "gn_division": fake.city(),
                "ds_division": fake.city() + " Division",
                "lat": fake.latitude(),
                "lng": fake.longitude()
            },
            "valuation": {
                "market_value": fake.random_int(min_val, max_val),
                "forced_sale_percentage": fake.random_int(70, 90)
            }
        }
        
        # Add complexity-based variations
        if complexity == "complex":
            base_data["buildings"] = [{
                "type": fake.random_element(["residential", "commercial", "mixed"]),
                "area_sqft": fake.random_int(500, 5000),
                "condition": fake.random_element(["excellent", "good", "average", "poor"]),
                "construction_year": fake.random_int(1980, 2024)
            }]
            
            base_data["utilities"] = {
                "electricity": fake.random_element(["available", "not_available"]),
                "water": fake.random_element(["available", "partially_available", "not_available"]),
                "telecom": fake.random_element(["available", "not_available"])
            }
        
        return base_data

    @staticmethod
    def generate_edge_case_data() -> Generator[Dict[str, Any], None, None]:
        """Generate edge cases that might break the system"""
        
        edge_cases = [
            # Extreme values
            {
                "identification": {"extent_perches": 0.001},  # Very small extent
                "valuation": {"market_value": 999999999999}  # Very large value
            },
            # Boundary dates
            {
                "report_info": {
                    "report_date": datetime.now().date(),  # Today's date
                    "inspection_date": datetime.now().date() - timedelta(days=1)  # Yesterday
                }
            },
            # Unicode and special characters
            {
                "identification": {
                    "land_name": "පෙනමැයි Penamayie மார்க் தோட்டம்",  # Multilingual
                    "surveyor_name": "සුරේෂ් කුමාර් O'Brien-Smith"
                }
            },
            # Empty and null values
            {
                "location": {
                    "district": "",
                    "gn_division": None
                }
            },
            # Invalid but potentially accepted values
            {
                "identification": {
                    "lot_number": "LOT@#$%^&*()",
                    "extent_perches": -10  # Negative extent
                }
            }
        ]
        
        for edge_case in edge_cases:
            yield edge_case

    @staticmethod
    def generate_performance_test_data(count: int = 1000) -> List[Dict[str, Any]]:
        """Generate large datasets for performance testing"""
        
        data = []
        for _ in range(count):
            data.append(AITestDataGenerator.generate_property_valuation_data())
        
        return data

    @staticmethod
    def generate_security_test_payloads() -> Generator[Dict[str, Any], None, None]:
        """Generate payloads to test security vulnerabilities"""
        
        # SQL Injection attempts
        sql_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "1' UNION SELECT * FROM users --"
        ]
        
        # XSS attempts
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>"
        ]
        
        # Path traversal attempts
        path_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam"
        ]
        
        for payload in sql_payloads + xss_payloads + path_payloads:
            yield {
                "report_info": {"ref": payload},
                "identification": {"land_name": payload},
                "location": {"district": payload}
            }


# Hypothesis strategies for property-based testing
@composite
def property_valuation_strategy(draw):
    """Hypothesis strategy for generating valid property valuations"""
    
    return {
        "market_value": draw(st.floats(min_value=100000, max_value=1000000000)),
        "extent_perches": draw(st.floats(min_value=0.1, max_value=10000)),
        "report_date": draw(st.dates(
            min_value=datetime(2020, 1, 1).date(),
            max_value=datetime.now().date()
        )),
        "purpose": draw(st.sampled_from([
            "Bank valuation", "Insurance valuation", "Sale/Purchase",
            "Investment decision", "Tax assessment", "Legal proceedings"
        ]))
    }


@composite
def sri_lankan_location_strategy(draw):
    """Generate valid Sri Lankan locations"""
    
    districts = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar'
    ]
    
    provinces = [
        'Western', 'Central', 'Southern', 'Northern', 'Eastern',
        'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
    ]
    
    return {
        "district": draw(st.sampled_from(districts)),
        "province": draw(st.sampled_from(provinces)),
        "lat": draw(st.floats(min_value=5.5, max_value=10.0)),  # Sri Lankan bounds
        "lng": draw(st.floats(min_value=79.0, max_value=82.0))
    }


class AIBehaviorPredictor:
    """Predict likely user behaviors and test scenarios"""
    
    @staticmethod
    def generate_user_journey_scenarios() -> List[Dict[str, Any]]:
        """Generate realistic user journey test scenarios"""
        
        scenarios = [
            {
                "name": "new_user_first_report",
                "description": "New user creating their first valuation report",
                "steps": [
                    "register_account",
                    "verify_email",
                    "complete_profile",
                    "create_first_report",
                    "save_draft",
                    "complete_report",
                    "generate_pdf"
                ],
                "expected_behaviors": [
                    "might_abandon_at_step_3",
                    "likely_to_save_multiple_drafts",
                    "may_need_help_with_valuation_calculations"
                ]
            },
            {
                "name": "experienced_user_bulk_reports",
                "description": "Experienced user creating multiple reports efficiently",
                "steps": [
                    "login",
                    "create_report_template",
                    "duplicate_template",
                    "batch_update_properties",
                    "generate_multiple_pdfs"
                ],
                "expected_behaviors": [
                    "fast_completion_times",
                    "uses_keyboard_shortcuts",
                    "expects_bulk_operations"
                ]
            },
            {
                "name": "mobile_user_quick_inspection",
                "description": "User on mobile device doing field inspection",
                "steps": [
                    "mobile_login",
                    "start_new_report",
                    "use_gps_location",
                    "capture_photos",
                    "save_draft_offline",
                    "sync_when_online"
                ],
                "expected_behaviors": [
                    "frequent_interruptions",
                    "network_connectivity_issues",
                    "prefers_voice_input"
                ]
            }
        ]
        
        return scenarios

    @staticmethod
    def predict_failure_scenarios() -> List[Dict[str, Any]]:
        """Predict likely failure scenarios using AI-like reasoning"""
        
        return [
            {
                "scenario": "concurrent_edit_conflict",
                "probability": 0.3,
                "description": "Multiple users editing same report simultaneously",
                "test_approach": "Create race conditions, test conflict resolution"
            },
            {
                "scenario": "large_file_upload_timeout",
                "probability": 0.4,
                "description": "User uploads very large PDF documents",
                "test_approach": "Test with files > 50MB, simulate slow connections"
            },
            {
                "scenario": "calculation_precision_errors",
                "probability": 0.2,
                "description": "Floating point errors in valuation calculations",
                "test_approach": "Use extreme decimal values, test rounding behavior"
            },
            {
                "scenario": "session_expiry_during_work",
                "probability": 0.6,
                "description": "User session expires while working on report",
                "test_approach": "Simulate long work sessions, test auto-save"
            }
        ]


class IntelligentTestPrioritizer:
    """AI-powered test prioritization based on risk and impact"""
    
    @staticmethod
    def prioritize_tests(test_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize test cases using AI-like scoring"""
        
        def calculate_priority_score(test_case: Dict[str, Any]) -> float:
            score = 0.0
            
            # Business impact factors
            if 'valuation' in test_case.get('category', ''):
                score += 10  # Core business logic
            
            if test_case.get('involves_money', False):
                score += 8  # Financial calculations
            
            if test_case.get('user_visible', True):
                score += 5  # User experience
            
            # Technical risk factors
            complexity = test_case.get('complexity', 'medium')
            complexity_scores = {'low': 1, 'medium': 3, 'high': 7}
            score += complexity_scores.get(complexity, 3)
            
            # Historical failure rate
            failure_rate = test_case.get('historical_failure_rate', 0.1)
            score += failure_rate * 10
            
            # Recent code changes
            if test_case.get('covers_recent_changes', False):
                score += 6
            
            return score
        
        # Sort by priority score (highest first)
        return sorted(test_cases, key=calculate_priority_score, reverse=True)


# Factory classes for generating test objects
class UserFactory(factory.Factory):
    """Factory for generating test users with realistic data"""
    
    class Meta:
        model = dict
    
    email = factory.LazyFunction(fake.email)
    full_name = factory.LazyFunction(fake.name)
    role = factory.LazyFunction(lambda: fake.random_element(['valuer', 'admin', 'client']))
    is_active = True
    

class ReportFactory(factory.Factory):
    """Factory for generating test reports"""
    
    class Meta:
        model = dict
    
    ref = factory.LazyFunction(lambda: f"TEST-{fake.random_int(1000, 9999)}")
    purpose = factory.LazyFunction(lambda: fake.random_element([
        "Bank valuation", "Sale/Purchase", "Insurance valuation"
    ]))
    status = "draft"
    report_date = factory.LazyFunction(fake.date_this_year)
    inspection_date = factory.LazyFunction(
        lambda: fake.date_between(start_date='-60d', end_date='-1d')
    )
    basis_of_value = "Market Value"
    currency = "LKR"


# AI-powered test result analyzer
class TestResultAnalyzer:
    """Analyze test results and provide intelligent insights"""
    
    @staticmethod
    def analyze_failure_patterns(test_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze failure patterns using AI-like pattern recognition"""
        
        failures = [result for result in test_results if not result.get('passed', True)]
        
        if not failures:
            return {"status": "all_tests_passed", "insights": []}
        
        insights = []
        
        # Pattern 1: Similar error messages
        error_patterns = {}
        for failure in failures:
            error_msg = failure.get('error_message', '').lower()
            for existing_pattern in error_patterns:
                if existing_pattern in error_msg or error_msg in existing_pattern:
                    error_patterns[existing_pattern] += 1
                    break
            else:
                error_patterns[error_msg] = 1
        
        common_errors = {k: v for k, v in error_patterns.items() if v > 1}
        if common_errors:
            insights.append({
                "type": "repeated_error_pattern",
                "description": f"Found {len(common_errors)} error patterns occurring multiple times",
                "details": common_errors
            })
        
        # Pattern 2: Component-based failures
        component_failures = {}
        for failure in failures:
            component = failure.get('component', 'unknown')
            component_failures[component] = component_failures.get(component, 0) + 1
        
        if component_failures:
            most_problematic = max(component_failures.items(), key=lambda x: x[1])
            if most_problematic[1] > len(failures) * 0.3:  # >30% of failures in one component
                insights.append({
                    "type": "component_hotspot",
                    "description": f"Component '{most_problematic[0]}' has {most_problematic[1]} failures",
                    "recommendation": f"Focus debugging efforts on {most_problematic[0]} component"
                })
        
        return {
            "status": "failures_detected",
            "total_failures": len(failures),
            "insights": insights
        }