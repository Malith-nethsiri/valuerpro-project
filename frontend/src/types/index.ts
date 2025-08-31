// Core Types for ValuerPro Application

export interface ValuerProfile {
  id: string;
  user_id: string;
  // Basic professional details
  titles?: string;
  full_name?: string;
  designation?: string;
  qualifications?: string[];
  panels?: string[];
  // Registration & Membership
  registration_no?: string;
  membership_status?: string;
  // Company Information
  company_name?: string;
  firm_address?: string;
  // Contact information
  address?: string;
  phones?: string[];
  contact_phones?: string[];
  email?: string;
  contact_email?: string;
  // Professional Standards & Insurance
  default_standards?: string;
  indemnity_status?: string;
  // Default Legal Content (to reuse across reports)
  default_disclaimers?: string;
  default_certificate?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  valuer_profile?: ValuerProfile;
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  contact_numbers?: string[];
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  ref?: string;
  purpose?: string;
  basis_of_value?: string;
  report_type?: string;
  status: ReportStatus;
  report_date?: string;
  inspection_date?: string;
  finalized_at?: string;
  currency?: string;
  fsv_percentage?: number;
  created_at: string;
  updated_at: string;
  author_id?: string;
  client_id?: string;
  author?: User;
  client?: Client;
}

export type ReportStatus = 'draft' | 'in_progress' | 'completed' | 'finalized';

export interface Property {
  id: string;
  report_id: string;
  property_index: number;
  property_type: string;
  created_at: string;
  updated_at: string;
  identification?: Identification;
  location?: Location;
}

export interface Identification {
  id: string;
  property_id: string;
  lot_number?: string;
  plan_number?: string;
  plan_date?: string;
  surveyor_name?: string;
  land_name?: string;
  extent_perches?: number;
  extent_sqm?: number;
  extent_local?: string;
  boundaries?: Record<string, any>;
  title_owner?: string;
  deed_no?: string;
  deed_date?: string;
  notary?: string;
  interest?: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  property_id: string;
  address_full?: string;
  village?: string;
  gn_division?: string;
  ds_division?: string;
  district?: string;
  province?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at: string;
}

export interface ValuationLine {
  id: string;
  property_id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  depreciation_pct: number;
  value: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ValuationSummary {
  id: string;
  report_id: string;
  market_value: number;
  market_value_words: string;
  forced_sale_value: number;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  property_info?: PropertyInfo;
  location_data?: LocationData;
  ai_analysis?: AIAnalysis;
  uploaded_files?: UploadedFile[];
  property_details?: PropertyDetails;
  valuation?: ValuationData;
  market_analysis?: MarketAnalysis;
  comparables?: Comparable[];
}

export interface PropertyInfo {
  lot_number?: string;
  plan_number?: string;
  plan_date?: string;
  surveyor_name?: string;
  land_name?: string;
  extent?: string;
  boundaries?: Boundaries;
  coordinates?: Coordinates;
  scale?: string;
}

export interface Boundaries {
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}

export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

export interface LocationData {
  coordinates?: Coordinates;
  formatted_address?: string;
  components?: AddressComponents;
  static_map_url?: string;
  access_route?: RouteDescription;
  analysis_complete?: boolean;
}

export interface AddressComponents {
  area?: string;
  city?: string;
  district?: string;
  province?: string;
  country?: string;
}

export interface RouteDescription {
  description?: string;
  distance?: string;
  duration?: string;
  start_address?: string;
  end_address?: string;
}

export interface AIAnalysis {
  document_type?: DocumentType;
  extracted_data?: ExtractedData;
  general_data?: GeneralPropertyData;
  processing_status?: string;
}

export type DocumentType = 'survey_plan' | 'deed' | 'prior_valuation' | 'other';

export interface ExtractedData {
  // Survey Plan specific
  lot_number?: string;
  plan_number?: string;
  plan_date?: string;
  surveyor_name?: string;
  land_name?: string;
  extent?: string;
  boundaries?: Boundaries;
  coordinates?: Coordinates;
  scale?: string;
  
  // Deed specific
  deed_number?: string;
  deed_date?: string;
  notary_attorney?: string;
  parties?: {
    vendor?: string;
    purchaser?: string;
  };
  consideration_amount?: string;
  
  // Common
  additional_notes?: string;
}

export interface GeneralPropertyData {
  property_address?: string;
  location_details?: {
    village?: string;
    grama_niladhari_division?: string;
    district?: string;
    province?: string;
  };
  owner_name?: string;
  property_type?: string;
  building_details?: BuildingDetails;
  utilities?: Utilities;
  access_road?: string;
  landmarks?: string[];
  additional_features?: string[];
}

export interface BuildingDetails {
  type?: string;
  floors?: number;
  area?: string;
  construction_year?: string;
}

export interface Utilities {
  electricity?: boolean;
  water?: boolean;
  telephone?: boolean;
}

export interface PropertyDetails {
  [key: string]: unknown;
}

export interface ValuationData {
  land_value?: number;
  building_value?: number;
  total_market_value?: number;
  forced_sale_value?: number;
  insurance_value?: number;
  valuation_date?: string;
  components?: ValuationComponent[];
}

export interface ValuationComponent {
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  value: number;
}

export interface MarketAnalysis {
  [key: string]: unknown;
}

export interface Comparable {
  id?: string;
  address?: string;
  sale_price?: number;
  sale_date?: string;
  property_type?: string;
  area?: number;
  price_per_unit?: number;
}

export interface UploadedFile {
  file_id: string;
  filename: string;
  original_filename: string;
  path: string;
  mime_type: string;
  size: number;
  report_id?: string;
  uploaded_at: string;
  aiAnalysis?: AIAnalysis;
}

export interface OCRResult {
  id: string;
  full_text?: string;
  pages_data?: OCRPageData[];
  confidence_score?: number;
  processing_time?: number;
  ocr_engine: string;
  language_detected?: string;
  edited_text?: string;
  is_edited: boolean;
  file_id: string;
  processed_by: string;
  created_at: string;
  updated_at: string;
}

export interface OCRPageData {
  page: number;
  text: string;
}

// API Response Types
export interface APIResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  original_filename: string;
  path: string;
  mime_type: string;
  size: number;
  report_id?: string;
  uploaded_at: string;
}

// Error Types
export interface APIError {
  detail: string;
  status_code?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Form Types
export interface LoginFormData extends Record<string, unknown> {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  role?: string;
}

export interface ValuerProfileFormData {
  // Basic professional details
  titles?: string;
  full_name?: string;
  designation?: string;
  qualifications?: string[];
  panels?: string[];
  // Registration & Membership
  registration_no?: string;
  membership_status?: string;
  // Company Information
  company_name?: string;
  firm_address?: string;
  // Contact information
  address?: string;
  phones?: string[];
  contact_phones?: string[];
  email?: string;
  contact_email?: string;
  // Professional Standards & Insurance
  default_standards?: string;
  indemnity_status?: string;
  // Default Legal Content (to reuse across reports)
  default_disclaimers?: string;
  default_certificate?: string;
}

export interface ReportWizardData {
  // Step 1: Report Info
  reportInfo: {
    ref?: string;
    purpose?: string;
    client_id?: string;
    report_date?: string;
    inspection_date?: string;
    basis_of_value?: string;
    currency?: string;
  };
  
  // Step 2: Identification & Title
  identification: {
    lot_number?: string;
    plan_number?: string;
    plan_date?: string;
    surveyor_name?: string;
    land_name?: string;
    extent_perches?: number;
    extent_sqm?: number;
    extent_local?: string;
    boundaries?: Record<string, string>;
    title_owner?: string;
    deed_no?: string;
    deed_date?: string;
    notary?: string;
    interest?: string;
  };
  
  // Step 3: Location & Access
  location: {
    address?: {
      house_number?: string;
      street?: string;
      city?: string;
      postal_code?: string;
    };
    gn_division?: string;
    ds_division?: string;
    district?: string;
    province?: string;
    latitude?: string;
    longitude?: string;
    road_access?: string;
    road_width?: number;
    nearest_landmark?: string;
    directions?: string;
    public_transport?: string;
    distance_to_town?: number;
    distance_to_colombo?: number;
    nearest_railway_station?: string;
  };
  
  // Step 4: Site Description
  site: {
    shape?: string;
    frontage?: number;
    depth?: number;
    aspect?: string;
    topography?: string;
    gradient?: number;
    level_relative_to_road?: string;
    elevation_difference?: number;
    soil_type?: string;
    drainage?: string;
    flood_risk?: string;
    bearing_capacity?: string;
    soil_notes?: string;
    site_features?: string[];
    other_features?: string;
    noise_level?: string;
    air_quality?: string;
    environmental_issues?: string;
    pedestrian_access?: string;
    vehicle_access?: string;
    access_notes?: string;
  };
  
  // Step 5: Buildings
  buildings: {
    id: string;
    type: string;
    use: string;
    floor_area: number;
    construction_year: number;
    construction_type: string;
    roof_type: string;
    wall_type: string;
    floor_type: string;
    condition: string;
    stories: number;
    description: string;
    replacement_cost_per_sqft?: number;
    depreciation_rate?: number;
    current_value?: number;
  }[];
  
  // Step 6: Utilities
  utilities: {
    electricity?: {
      available?: string;
      type?: string;
      connection_status?: string;
      notes?: string;
    };
    water?: {
      main_source?: string;
      quality?: string;
      reliability?: string;
      storage_capacity?: number;
      notes?: string;
    };
    telecom?: {
      fixed_line?: boolean;
      mobile_coverage?: boolean;
      broadband?: boolean;
      fiber_optic?: boolean;
      cable_tv?: boolean;
      internet_speed?: number;
      providers?: string;
    };
    sewerage?: {
      type?: string;
      condition?: string;
    };
    drainage?: {
      surface?: string;
      storm_water?: string;
      notes?: string;
    };
    other?: {
      gas_connection?: boolean;
      garbage_collection?: boolean;
      street_lighting?: boolean;
      security_services?: boolean;
      postal_service?: boolean;
      fire_hydrant?: boolean;
      additional_notes?: string;
    };
    overall_rating?: string;
    value_impact?: string;
    assessment_summary?: string;
  };
  
  // Step 7: Planning/Zoning
  planning: {
    zoning_classification?: string;
    planning_authority?: string;
    development_plan?: string;
    current_use?: string;
    development_potential?: string;
    additional_uses?: string;
    max_height?: number;
    max_floors?: number;
    floor_area_ratio?: number;
    building_coverage?: number;
    front_setback?: number;
    side_setbacks?: number;
    rear_setback?: number;
    parking_requirements?: string;
    landscaping_percentage?: number;
    restrictions?: string[];
    road_reservation?: string;
    utility_easements?: string;
    other_restrictions?: string;
    planning_approval?: string;
    building_approval?: string;
    environmental_clearance?: string;
    compliance_rating?: string;
    compliance_notes?: string;
    development_feasibility?: string;
    value_impact?: string;
    planning_summary?: string;
  };
  
  // Step 8: Locality
  locality: {
    area_type?: string;
    development_stage?: string;
    socioeconomic_level?: string;
    property_mix?: string;
    neighborhood_description?: string;
    nearby_amenities?: string[];
    distance_to_school?: number;
    distance_to_hospital?: number;
    distance_to_shopping?: number;
    amenity_rating?: string;
    market_activity?: string;
    price_trend?: string;
    selling_period?: string;
    rental_market?: string;
    price_range_per_perch?: string;
    rental_yield_range?: string;
    growth_potential?: string;
    infrastructure_development?: string;
    planned_developments?: string;
    safety_level?: string;
    traffic_level?: string;
    environmental_issues?: string;
    overall_rating?: string;
    value_impact?: string;
    market_analysis_summary?: string;
  };
  
  // Step 9: Valuation
  valuation: {
    method?: string;
    valuation_date?: string;
    lines?: {
      id: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      depreciation_pct: number;
      value: number;
      line_type: string;
    }[];
    summary?: {
      land_value?: number;
      building_value?: number;
      improvement_value?: number;
      market_value?: number;
      market_value_words?: string;
      forced_sale_value?: number;
      fsv_percentage?: number;
    };
    land_rate_justification?: string;
    building_rate_justification?: string;
    valuation_comments?: string;
  };
  
  // Step 10: Legal & Disclaimers
  legal: {
    assumptions?: string[];
    additional_assumptions?: string;
    disclaimers?: string;
    certificate?: string;
    valuation_standards?: string;
    indemnity_insurance?: string;
    membership_status?: string;
    registration_number?: string;
    valuer_name?: string;
    designation?: string;
    company_name?: string;
    report_date?: string;
    firm_address?: string;
    contact_phones?: string;
    contact_email?: string;
    report_classification?: string;
    validity_period?: string;
    report_status?: string;
    special_limitations?: string;
  };
  
  // Step 11: Appendices
  appendices: {
    files?: {
      id: string;
      file_name: string;
      file_size: number;
      file_type: string;
      upload_date: string;
      category: string;
      description: string;
      file_url?: string;
      processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    }[];
    photos?: {
      id: string;
      file_name: string;
      file_size: number;
      file_type: string;
      upload_date: string;
      category: string;
      description: string;
      file_url?: string;
      processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    }[];
    location_map_url?: string;
    satellite_map_url?: string;
    numbering_style?: string;
    page_layout?: string;
    instructions?: string;
  };
  
  // Step 12: Review & Generate
  review: {
    validation_errors?: string[];
    completion_status?: Record<string, boolean>;
    final_notes?: string;
    ready_to_generate?: boolean;
  };
}

export interface ReportFormData {
  ref?: string;
  purpose?: string;
  basis_of_value?: string;
  report_type?: string;
  status?: string;
  report_date?: string;
  inspection_date?: string;
  currency?: string;
  fsv_percentage?: number;
  client_id?: string;
}

// Component Prop Types
export interface FileUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  acceptedTypes?: string[];
  maxSize?: number;
  reportId?: string;
}

export interface PropertyLocationMapProps {
  aiAnalysis?: AIAnalysis;
  onLocationUpdate?: (locationData: LocationData) => void;
}

export interface AIAnalysisModalProps {
  analysis?: AIAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error?: string;
}