/**
 * Group-based wizard types for the new 5-group architecture
 * This replaces the complex 15-step wizard with functional groupings
 */

import type { 
  ReportData, 
  PropertyInfo, 
  LocationData, 
  AIAnalysis,
  UploadedFile,
  PropertyDetails,
  ValuationData,
  MarketAnalysis
} from './index';

// Group definitions for the new architecture
export const WIZARD_GROUPS = [
  'document_processing',
  'location_mapping', 
  'property_assessment',
  'market_valuation',
  'report_finalization'
] as const;

export type WizardGroup = typeof WIZARD_GROUPS[number];

export interface GroupInfo {
  id: WizardGroup;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  current: boolean;
  expanded: boolean;
}

// Group-specific data interfaces
export interface DocumentProcessingData {
  // File upload & OCR results
  uploaded_files: UploadedFile[];
  ocr_results: any[];
  
  // AI extracted data (all OCR/AI data stays in this group)
  ai_analysis: AIAnalysis;
  
  // Property identification (from documents)
  property_identification: {
    lot_number: string;
    plan_number: string;
    plan_date?: string;
    surveyor_name: string;
    licensed_surveyor_number?: string;
    land_name?: string;
    property_name?: string;
    extent_perches: number;
    extent_sqm?: number;
    extent_acres?: number;
    extent_local?: string;
    boundaries: {
      north?: string;
      south?: string;
      east?: string;
      west?: string;
    };
    ownership_type?: string;
  };
  
  // Legal information (from deeds)
  legal_information: {
    title_owner?: string;
    deed_no?: string;
    deed_date?: string;
    notary?: string;
    easements?: string[];
    restrictions?: string[];
    covenants?: string[];
    pending_litigation?: boolean;
    statutory_approvals?: string[];
  };
}

export interface LocationMappingData {
  // Address verification with external data
  location_details: LocationData;
  
  // Google Maps integration
  google_maps: {
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    map_data?: any;
    nearby_landmarks?: string[];
    distance_to_town?: string;
    distance_to_colombo?: string;
    public_transport_access?: string[];
  };
  
  // Infrastructure verification
  infrastructure: {
    road_access: string;
    road_width?: string;
    electricity_available: boolean;
    water_supply_available: boolean;
    sewerage_available: boolean;
    telecommunication_coverage: string;
  };
}

export interface PropertyAssessmentData {
  // Physical site characteristics (inspection data)
  site_characteristics: {
    terrain: string;
    soil_type: string;
    drainage: string;
    orientation: string;
    shape: string;
    frontage?: string;
    access_quality: string;
  };
  
  // Buildings and improvements (current condition)
  buildings_improvements: Array<{
    building_type: string;
    construction_year?: number;
    construction_material: string;
    floor_area: number;
    stories: number;
    roof_type: string;
    wall_type: string;
    flooring: string;
    condition: string;
    amenities: string[];
  }>;
  
  // Utilities assessment (functionality)
  utilities_assessment: {
    electricity: {
      available: boolean;
      condition: string;
      meter_reading?: string;
    };
    water: {
      source: string;
      quality: string;
      pressure: string;
    };
    sewerage: {
      type: string;
      condition: string;
    };
    gas?: {
      available: boolean;
      type: string;
    };
  };
  
  // Environmental factors
  environmental_factors: {
    factors: string[];
    restrictions: string[];
    hazards: string[];
    conservation_areas: string[];
    noise_level: string;
    air_quality: string;
  };
}

export interface MarketValuationData {
  // Market analysis
  market_analysis: MarketAnalysis;
  
  // Comparable sales
  comparables: Array<{
    address: string;
    sale_date: string;
    sale_price: number;
    land_area: number;
    building_area?: number;
    distance_km: number;
    adjustments: {
      location: number;
      size: number;
      condition: number;
      other: number;
    };
    adjusted_price: number;
  }>;
  
  // Valuation calculations
  valuation: ValuationData;
  
  // Final values
  final_valuation: {
    market_value: number;
    market_value_words: string;
    forced_sale_value: number;
    forced_sale_percentage: number;
    valuation_date: string;
    validity_period: string;
  };
}

export interface ReportFinalizationData {
  // Report information
  report_info: {
    ref: string;
    purpose: string;
    basis_of_value: string;
    report_type: string;
    report_date: string;
    inspection_date: string;
    currency: string;
    fsv_percentage?: number;
  };
  
  // Client information  
  client_info: {
    client_id: string;
    client_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  
  // Final review data
  review: {
    quality_checks: boolean[];
    completeness_checks: boolean[];
    accuracy_verification: boolean;
    client_requirements_met: boolean;
    ready_for_finalization: boolean;
  };
  
  // Export settings
  export_settings: {
    format: 'pdf' | 'docx';
    include_appendices: boolean;
    include_photos: boolean;
    watermark: boolean;
    digital_signature: boolean;
  };
}

// Complete group-based wizard data structure
export interface GroupWizardData {
  document_processing: DocumentProcessingData;
  location_mapping: LocationMappingData;
  property_assessment: PropertyAssessmentData;
  market_valuation: MarketValuationData;
  report_finalization: ReportFinalizationData;
}

// Group validation interface
export interface GroupValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completionPercentage: number;
}

export interface GroupState {
  currentGroup: WizardGroup;
  groupData: GroupWizardData;
  groupValidations: Record<WizardGroup, GroupValidation>;
  isLoading: boolean;
  reportId: string | null;
  errors: Record<string, string[]>;
  isDirty: boolean;
}

// Group action types
export type GroupAction =
  | { type: 'SET_CURRENT_GROUP'; payload: WizardGroup }
  | { type: 'UPDATE_GROUP_DATA'; payload: { group: WizardGroup; data: Partial<GroupWizardData[WizardGroup]> } }
  | { type: 'SET_GROUP_VALIDATION'; payload: { group: WizardGroup; validation: GroupValidation } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REPORT_ID'; payload: string }
  | { type: 'SET_ERRORS'; payload: Record<string, string[]> }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'RESET_GROUPS' };