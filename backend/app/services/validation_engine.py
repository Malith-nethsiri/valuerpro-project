"""
Business Rules and Validation Engine

Implements comprehensive validation rules for valuation reports
to ensure compliance with professional standards and completeness.
"""

from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from sqlalchemy.orm import Session
from app.models import (
    Report, Property, Identification, Location, Access, Site, 
    Building, Utilities, Planning, Locality, ValuationLine,
    ValuationSummary, Client, ValuerProfile
)


class ValidationSeverity(Enum):
    """Validation rule severity levels"""
    ERROR = "error"        # Prevents finalization
    WARNING = "warning"    # Shows warning but allows finalization
    INFO = "info"          # Informational only


@dataclass
class ValidationResult:
    """Single validation result"""
    rule: str
    severity: ValidationSeverity
    message: str
    field: Optional[str] = None
    section: Optional[str] = None


@dataclass
class ValidationReport:
    """Complete validation report for a report"""
    report_id: str
    is_valid: bool
    can_finalize: bool
    errors: List[ValidationResult]
    warnings: List[ValidationResult]
    info: List[ValidationResult]
    completion_percentage: float
    
    @property
    def total_issues(self) -> int:
        return len(self.errors) + len(self.warnings) + len(self.info)
    
    @property
    def error_count(self) -> int:
        return len(self.errors)
    
    @property
    def warning_count(self) -> int:
        return len(self.warnings)


class ReportValidationEngine:
    """Comprehensive validation engine for valuation reports"""
    
    def __init__(self, db: Session):
        self.db = db
        self.validation_rules = self._initialize_validation_rules()
    
    def validate_report(self, report_id: str) -> ValidationReport:
        """
        Perform comprehensive validation of a report
        
        Args:
            report_id: The report ID to validate
            
        Returns:
            ValidationReport with complete validation results
        """
        results = []
        
        # Get main report
        report = self.db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return ValidationReport(
                report_id=report_id,
                is_valid=False,
                can_finalize=False,
                errors=[ValidationResult(
                    rule="report_exists",
                    severity=ValidationSeverity.ERROR,
                    message="Report not found"
                )],
                warnings=[],
                info=[],
                completion_percentage=0.0
            )
        
        # Run all validation rules
        for rule_name, rule_func in self.validation_rules.items():
            try:
                rule_results = rule_func(report)
                if isinstance(rule_results, list):
                    results.extend(rule_results)
                elif rule_results:
                    results.append(rule_results)
            except Exception as e:
                results.append(ValidationResult(
                    rule=rule_name,
                    severity=ValidationSeverity.ERROR,
                    message=f"Validation rule failed: {str(e)}"
                ))
        
        # Categorize results
        errors = [r for r in results if r.severity == ValidationSeverity.ERROR]
        warnings = [r for r in results if r.severity == ValidationSeverity.WARNING]
        info = [r for r in results if r.severity == ValidationSeverity.INFO]
        
        # Calculate completion percentage
        completion_percentage = self._calculate_completion_percentage(report)
        
        # Determine if report can be finalized
        can_finalize = len(errors) == 0 and completion_percentage >= 80.0
        
        return ValidationReport(
            report_id=report_id,
            is_valid=len(errors) == 0,
            can_finalize=can_finalize,
            errors=errors,
            warnings=warnings,
            info=info,
            completion_percentage=completion_percentage
        )
    
    def _initialize_validation_rules(self) -> Dict[str, callable]:
        """Initialize all validation rules"""
        return {
            # Core report validation
            'report_metadata': self._validate_report_metadata,
            'report_dates': self._validate_report_dates,
            'report_references': self._validate_report_references,
            
            # Property validation
            'property_exists': self._validate_property_exists,
            'property_identification': self._validate_property_identification,
            'property_location': self._validate_property_location,
            'property_extent': self._validate_property_extent,
            'property_boundaries': self._validate_property_boundaries,
            
            # Valuation validation
            'valuation_exists': self._validate_valuation_exists,
            'valuation_amounts': self._validate_valuation_amounts,
            'valuation_calculations': self._validate_valuation_calculations,
            'valuation_words': self._validate_valuation_words,
            
            # Professional standards
            'valuer_profile': self._validate_valuer_profile,
            'client_information': self._validate_client_information,
            'inspection_details': self._validate_inspection_details,
            
            # Document completeness
            'required_sections': self._validate_required_sections,
            'certificate_identity': self._validate_certificate_identity,
            'assumptions_conditions': self._validate_assumptions_conditions,
            
            # Business logic
            'logical_consistency': self._validate_logical_consistency,
            'data_integrity': self._validate_data_integrity,
        }
    
    def _validate_report_metadata(self, report: Report) -> List[ValidationResult]:
        """Validate basic report metadata"""
        results = []
        
        if not report.ref:
            results.append(ValidationResult(
                rule="report_ref_required",
                severity=ValidationSeverity.ERROR,
                message="Report reference number is required",
                field="ref",
                section="Report Info"
            ))
        
        if not report.purpose:
            results.append(ValidationResult(
                rule="report_purpose_required",
                severity=ValidationSeverity.ERROR,
                message="Report purpose is required",
                field="purpose", 
                section="Report Info"
            ))
        
        if not report.basis_of_value:
            results.append(ValidationResult(
                rule="basis_of_value_required",
                severity=ValidationSeverity.WARNING,
                message="Basis of value should be specified",
                field="basis_of_value",
                section="Report Info"
            ))
        
        return results
    
    def _validate_report_dates(self, report: Report) -> List[ValidationResult]:
        """Validate report dates are logical"""
        results = []
        
        if not report.report_date:
            results.append(ValidationResult(
                rule="report_date_required",
                severity=ValidationSeverity.ERROR,
                message="Report date is required",
                field="report_date",
                section="Report Info"
            ))
        
        if not report.inspection_date:
            results.append(ValidationResult(
                rule="inspection_date_required",
                severity=ValidationSeverity.ERROR,
                message="Inspection date is required",
                field="inspection_date",
                section="Report Info"
            ))
        
        # Check date logic
        if report.inspection_date and report.report_date:
            if report.inspection_date > report.report_date:
                results.append(ValidationResult(
                    rule="inspection_before_report",
                    severity=ValidationSeverity.ERROR,
                    message="Inspection date cannot be after report date",
                    field="inspection_date",
                    section="Report Info"
                ))
            
            # Check if dates are too far in the future
            now = datetime.now()
            if report.report_date > now:
                results.append(ValidationResult(
                    rule="report_date_future",
                    severity=ValidationSeverity.WARNING,
                    message="Report date is in the future",
                    field="report_date",
                    section="Report Info"
                ))
        
        return results
    
    def _validate_report_references(self, report: Report) -> List[ValidationResult]:
        """Validate report references are unique"""
        results = []
        
        if report.ref:
            # Check for duplicate reference numbers
            duplicate = self.db.query(Report).filter(
                Report.ref == report.ref,
                Report.id != report.id
            ).first()
            
            if duplicate:
                results.append(ValidationResult(
                    rule="unique_reference",
                    severity=ValidationSeverity.ERROR,
                    message=f"Reference number '{report.ref}' is already used by another report",
                    field="ref",
                    section="Report Info"
                ))
        
        return results
    
    def _validate_property_exists(self, report: Report) -> ValidationResult:
        """Validate at least one property exists"""
        property_count = self.db.query(Property).filter(
            Property.report_id == report.id
        ).count()
        
        if property_count == 0:
            return ValidationResult(
                rule="property_required",
                severity=ValidationSeverity.ERROR,
                message="Report must have at least one property",
                section="Properties"
            )
        
        return None
    
    def _validate_property_identification(self, report: Report) -> List[ValidationResult]:
        """Validate property identification completeness"""
        results = []
        
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        for prop in properties:
            identification = self.db.query(Identification).filter(
                Identification.property_id == prop.id
            ).first()
            
            prop_name = f"Property {prop.property_index or 1}"
            
            if not identification:
                results.append(ValidationResult(
                    rule="identification_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Property identification details are required",
                    section="Identification"
                ))
                continue
            
            # Check required identification fields
            if not identification.lot_number:
                results.append(ValidationResult(
                    rule="lot_number_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Lot number is required",
                    field="lot_number",
                    section="Identification"
                ))
            
            if not identification.plan_number:
                results.append(ValidationResult(
                    rule="plan_number_required", 
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Plan number is required",
                    field="plan_number",
                    section="Identification"
                ))
            
            if not identification.plan_date:
                results.append(ValidationResult(
                    rule="plan_date_required",
                    severity=ValidationSeverity.WARNING,
                    message=f"{prop_name}: Plan date should be provided",
                    field="plan_date",
                    section="Identification"
                ))
            
            if not identification.surveyor_name:
                results.append(ValidationResult(
                    rule="surveyor_name_required",
                    severity=ValidationSeverity.WARNING,
                    message=f"{prop_name}: Surveyor name should be provided",
                    field="surveyor_name",
                    section="Identification"
                ))
        
        return results
    
    def _validate_property_location(self, report: Report) -> List[ValidationResult]:
        """Validate property location details"""
        results = []
        
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        for prop in properties:
            location = self.db.query(Location).filter(
                Location.property_id == prop.id
            ).first()
            
            prop_name = f"Property {prop.property_index or 1}"
            
            if not location:
                results.append(ValidationResult(
                    rule="location_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Location details are required",
                    section="Location"
                ))
                continue
            
            # Check administrative divisions
            if not location.district:
                results.append(ValidationResult(
                    rule="district_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: District is required",
                    field="district",
                    section="Location"
                ))
            
            if not location.province:
                results.append(ValidationResult(
                    rule="province_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Province is required",
                    field="province",
                    section="Location"
                ))
            
            # Check address or village
            if not location.address_full and not location.village:
                results.append(ValidationResult(
                    rule="address_or_village_required",
                    severity=ValidationSeverity.WARNING,
                    message=f"{prop_name}: Either full address or village should be provided",
                    section="Location"
                ))
        
        return results
    
    def _validate_property_extent(self, report: Report) -> List[ValidationResult]:
        """Validate property extent is positive and logical"""
        results = []
        
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        for prop in properties:
            identification = self.db.query(Identification).filter(
                Identification.property_id == prop.id
            ).first()
            
            prop_name = f"Property {prop.property_index or 1}"
            
            if identification:
                if not identification.extent_perches or identification.extent_perches <= 0:
                    results.append(ValidationResult(
                        rule="extent_positive",
                        severity=ValidationSeverity.ERROR,
                        message=f"{prop_name}: Property extent must be greater than zero",
                        field="extent_perches",
                        section="Identification"
                    ))
                
                # Check if extent is extremely large (likely an error)
                if identification.extent_perches and identification.extent_perches > 10000:
                    results.append(ValidationResult(
                        rule="extent_reasonable",
                        severity=ValidationSeverity.WARNING,
                        message=f"{prop_name}: Property extent seems unusually large ({identification.extent_perches} perches)",
                        field="extent_perches",
                        section="Identification"
                    ))
                
                # Check consistency between perches and sqm
                if identification.extent_perches and identification.extent_sqm:
                    expected_sqm = identification.extent_perches * 25.29  # 1 perch = 25.29 sqm
                    variance = abs(identification.extent_sqm - expected_sqm) / expected_sqm
                    
                    if variance > 0.1:  # 10% variance threshold
                        results.append(ValidationResult(
                            rule="extent_consistency",
                            severity=ValidationSeverity.WARNING,
                            message=f"{prop_name}: Extent in perches and square meters don't match",
                            section="Identification"
                        ))
        
        return results
    
    def _validate_property_boundaries(self, report: Report) -> List[ValidationResult]:
        """Validate property boundaries are specified"""
        results = []
        
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        for prop in properties:
            identification = self.db.query(Identification).filter(
                Identification.property_id == prop.id
            ).first()
            
            prop_name = f"Property {prop.property_index or 1}"
            
            if identification and identification.boundaries:
                boundaries = identification.boundaries
                directions = ['north', 'south', 'east', 'west']
                missing_boundaries = [d for d in directions if not boundaries.get(d)]
                
                if missing_boundaries:
                    results.append(ValidationResult(
                        rule="boundaries_complete",
                        severity=ValidationSeverity.WARNING,
                        message=f"{prop_name}: Missing boundaries for: {', '.join(missing_boundaries)}",
                        section="Identification"
                    ))
        
        return results
    
    def _validate_valuation_exists(self, report: Report) -> ValidationResult:
        """Validate valuation summary exists"""
        valuation_summary = self.db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report.id
        ).first()
        
        if not valuation_summary:
            return ValidationResult(
                rule="valuation_summary_required",
                severity=ValidationSeverity.ERROR,
                message="Valuation summary is required",
                section="Valuation"
            )
        
        return None
    
    def _validate_valuation_amounts(self, report: Report) -> List[ValidationResult]:
        """Validate valuation amounts are positive and logical"""
        results = []
        
        valuation_summary = self.db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report.id
        ).first()
        
        if valuation_summary:
            if not valuation_summary.market_value or valuation_summary.market_value <= 0:
                results.append(ValidationResult(
                    rule="market_value_positive",
                    severity=ValidationSeverity.ERROR,
                    message="Market value must be greater than zero",
                    field="market_value",
                    section="Valuation"
                ))
            
            if not valuation_summary.forced_sale_value or valuation_summary.forced_sale_value <= 0:
                results.append(ValidationResult(
                    rule="forced_sale_value_positive",
                    severity=ValidationSeverity.ERROR,
                    message="Forced sale value must be greater than zero",
                    field="forced_sale_value",
                    section="Valuation"
                ))
            
            # Check FSV is reasonable percentage of market value
            if (valuation_summary.market_value > 0 and 
                valuation_summary.forced_sale_value > 0):
                
                fsv_percentage = (valuation_summary.forced_sale_value / 
                                valuation_summary.market_value) * 100
                
                if fsv_percentage < 60 or fsv_percentage > 95:
                    results.append(ValidationResult(
                        rule="fsv_percentage_reasonable",
                        severity=ValidationSeverity.WARNING,
                        message=f"Forced sale value ({fsv_percentage:.1f}% of market value) seems unusual",
                        section="Valuation"
                    ))
        
        return results
    
    def _validate_valuation_calculations(self, report: Report) -> List[ValidationResult]:
        """Validate valuation calculation logic"""
        results = []
        
        # Get all properties and their valuation lines
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        total_calculated_value = 0
        
        for prop in properties:
            lines = self.db.query(ValuationLine).filter(
                ValuationLine.property_id == prop.id
            ).all()
            
            prop_name = f"Property {prop.property_index or 1}"
            
            for line in lines:
                # Check calculation logic
                expected_value = line.quantity * line.rate
                
                # Apply depreciation if applicable
                if line.depreciation_pct and line.depreciation_pct > 0:
                    expected_value *= (1 - line.depreciation_pct / 100)
                
                # Check if calculated value matches
                variance = abs(line.value - expected_value) / max(expected_value, 1)
                
                if variance > 0.01:  # 1% tolerance
                    results.append(ValidationResult(
                        rule="calculation_accuracy",
                        severity=ValidationSeverity.WARNING,
                        message=f"{prop_name}: Calculation mismatch in {line.description}",
                        section="Valuation"
                    ))
                
                total_calculated_value += line.value
        
        # Compare with valuation summary
        valuation_summary = self.db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report.id
        ).first()
        
        if valuation_summary and total_calculated_value > 0:
            variance = abs(valuation_summary.market_value - total_calculated_value) / total_calculated_value
            
            if variance > 0.02:  # 2% tolerance
                results.append(ValidationResult(
                    rule="summary_calculation_match",
                    severity=ValidationSeverity.WARNING,
                    message="Valuation summary doesn't match detailed calculations",
                    section="Valuation"
                ))
        
        return results
    
    def _validate_valuation_words(self, report: Report) -> ValidationResult:
        """Validate valuation amount matches words representation"""
        valuation_summary = self.db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report.id
        ).first()
        
        if valuation_summary:
            if not valuation_summary.market_value_words:
                return ValidationResult(
                    rule="market_value_words_required",
                    severity=ValidationSeverity.ERROR,
                    message="Market value in words is required",
                    field="market_value_words",
                    section="Valuation"
                )
        
        return None
    
    def _validate_valuer_profile(self, report: Report) -> List[ValidationResult]:
        """Validate valuer profile completeness"""
        results = []
        
        if not report.author:
            results.append(ValidationResult(
                rule="author_required",
                severity=ValidationSeverity.ERROR,
                message="Report author is required",
                section="Valuer Profile"
            ))
            return results
        
        valuer_profile = report.author.valuer_profile
        
        if not valuer_profile:
            results.append(ValidationResult(
                rule="valuer_profile_required",
                severity=ValidationSeverity.WARNING,
                message="Valuer profile should be completed",
                section="Valuer Profile"
            ))
        else:
            if not valuer_profile.qualifications:
                results.append(ValidationResult(
                    rule="qualifications_recommended",
                    severity=ValidationSeverity.WARNING,
                    message="Professional qualifications should be specified",
                    field="qualifications",
                    section="Valuer Profile"
                ))
            
            if not valuer_profile.registration_no:
                results.append(ValidationResult(
                    rule="registration_recommended",
                    severity=ValidationSeverity.WARNING,
                    message="Professional registration number should be specified",
                    field="registration_no",
                    section="Valuer Profile"
                ))
        
        return results
    
    def _validate_client_information(self, report: Report) -> List[ValidationResult]:
        """Validate client information"""
        results = []
        
        if not report.client_id:
            results.append(ValidationResult(
                rule="client_required",
                severity=ValidationSeverity.WARNING,
                message="Client information should be specified",
                section="Client"
            ))
        
        return results
    
    def _validate_inspection_details(self, report: Report) -> List[ValidationResult]:
        """Validate inspection details"""
        results = []
        
        if not report.inspection_date:
            results.append(ValidationResult(
                rule="inspection_date_required",
                severity=ValidationSeverity.ERROR,
                message="Inspection date is required",
                field="inspection_date",
                section="Inspection"
            ))
        
        return results
    
    def _validate_required_sections(self, report: Report) -> List[ValidationResult]:
        """Validate required report sections are present"""
        results = []
        
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        # Check if each property has minimum required sections
        for prop in properties:
            prop_name = f"Property {prop.property_index or 1}"
            
            # Check identification
            identification = self.db.query(Identification).filter(
                Identification.property_id == prop.id
            ).first()
            if not identification:
                results.append(ValidationResult(
                    rule="identification_section_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Identification section is required",
                    section="Identification"
                ))
            
            # Check location
            location = self.db.query(Location).filter(
                Location.property_id == prop.id
            ).first()
            if not location:
                results.append(ValidationResult(
                    rule="location_section_required",
                    severity=ValidationSeverity.ERROR,
                    message=f"{prop_name}: Location section is required",
                    section="Location"
                ))
        
        return results
    
    def _validate_certificate_identity(self, report: Report) -> ValidationResult:
        """Validate certificate of identity is present"""
        # This would check if certificate text is provided
        # For now, this is a placeholder
        return None
    
    def _validate_assumptions_conditions(self, report: Report) -> ValidationResult:
        """Validate assumptions and conditions are present"""
        # This would check if assumptions/disclaimers are provided
        # For now, this is a placeholder
        return None
    
    def _validate_logical_consistency(self, report: Report) -> List[ValidationResult]:
        """Validate logical consistency across report"""
        results = []
        
        # Check consistency between property type and buildings
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        for prop in properties:
            prop_name = f"Property {prop.property_index or 1}"
            
            buildings = self.db.query(Building).filter(
                Building.property_id == prop.id
            ).all()
            
            # If property type is vacant land, shouldn't have buildings
            if prop.property_type and 'vacant' in prop.property_type.lower():
                if buildings:
                    results.append(ValidationResult(
                        rule="vacant_land_consistency",
                        severity=ValidationSeverity.WARNING,
                        message=f"{prop_name}: Property marked as vacant land but has buildings",
                        section="Buildings"
                    ))
        
        return results
    
    def _validate_data_integrity(self, report: Report) -> List[ValidationResult]:
        """Validate data integrity constraints"""
        results = []
        
        # Check for orphaned records, data consistency, etc.
        # This could be expanded based on specific business rules
        
        return results
    
    def _calculate_completion_percentage(self, report: Report) -> float:
        """Calculate report completion percentage"""
        total_weight = 0
        completed_weight = 0
        
        # Define section weights (total should be 100)
        sections = {
            'report_metadata': 10,
            'property_identification': 20,
            'location': 15,
            'valuation': 25,
            'buildings': 10,
            'utilities': 5,
            'planning': 5,
            'locality': 5,
            'certificate': 5
        }
        
        # Check report metadata
        total_weight += sections['report_metadata']
        if report.ref and report.purpose and report.inspection_date:
            completed_weight += sections['report_metadata']
        elif report.ref or report.purpose:
            completed_weight += sections['report_metadata'] * 0.5
        
        # Check properties
        properties = self.db.query(Property).filter(Property.report_id == report.id).all()
        
        if properties:
            prop_completion = 0
            
            for prop in properties:
                # Check identification
                identification = self.db.query(Identification).filter(
                    Identification.property_id == prop.id
                ).first()
                
                if identification and identification.lot_number and identification.plan_number:
                    prop_completion += sections['property_identification']
                elif identification:
                    prop_completion += sections['property_identification'] * 0.5
                
                # Check location
                location = self.db.query(Location).filter(
                    Location.property_id == prop.id
                ).first()
                
                if location and location.district and location.province:
                    prop_completion += sections['location']
                elif location:
                    prop_completion += sections['location'] * 0.5
                
                # Check buildings
                buildings = self.db.query(Building).filter(
                    Building.property_id == prop.id
                ).all()
                
                if buildings or prop.property_type == 'vacant_land':
                    prop_completion += sections['buildings']
                
                # Check utilities
                utilities = self.db.query(Utilities).filter(
                    Utilities.property_id == prop.id
                ).first()
                
                if utilities:
                    prop_completion += sections['utilities']
                
                # Check planning
                planning = self.db.query(Planning).filter(
                    Planning.property_id == prop.id
                ).first()
                
                if planning:
                    prop_completion += sections['planning']
                
                # Check locality
                locality = self.db.query(Locality).filter(
                    Locality.property_id == prop.id
                ).first()
                
                if locality and locality.narrative:
                    prop_completion += sections['locality']
            
            # Average across properties
            if len(properties) > 0:
                prop_completion = prop_completion / len(properties)
            
            total_weight += (sections['property_identification'] + sections['location'] + 
                           sections['buildings'] + sections['utilities'] + 
                           sections['planning'] + sections['locality'])
            completed_weight += prop_completion
        
        # Check valuation
        total_weight += sections['valuation']
        valuation_summary = self.db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report.id
        ).first()
        
        if valuation_summary and valuation_summary.market_value > 0:
            completed_weight += sections['valuation']
        elif valuation_summary:
            completed_weight += sections['valuation'] * 0.5
        
        # Certificate (assume present if report has basic info)
        total_weight += sections['certificate']
        if report.ref and report.inspection_date:
            completed_weight += sections['certificate']
        
        return (completed_weight / total_weight) * 100 if total_weight > 0 else 0


# Factory function
def create_validation_engine(db: Session) -> ReportValidationEngine:
    """Factory function to create validation engine with database session"""
    return ReportValidationEngine(db)