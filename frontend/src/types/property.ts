// Property-related Types

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

export interface PropertyFeature {
  id: string;
  property_id: string;
  feature_type: 'amenity' | 'facility' | 'improvement' | 'defect';
  name: string;
  description?: string;
  impact_on_value: 'positive' | 'negative' | 'neutral';
  estimated_value?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  age?: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  file_id: string;
  image_type: 'exterior' | 'interior' | 'surroundings' | 'aerial' | 'plan';
  title?: string;
  description?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyInspection {
  id: string;
  property_id: string;
  inspector_id: string;
  inspection_date: string;
  inspection_type: 'initial' | 'follow_up' | 'final';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  findings: InspectionFinding[];
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export interface InspectionFinding {
  category: string;
  item: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  requires_attention: boolean;
  urgency?: 'low' | 'medium' | 'high';
}

export interface PropertyAccess {
  type: 'public_road' | 'private_road' | 'pathway' | 'no_direct_access';
  width?: number;
  surface_type?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  legal_status?: string;
  maintenance_responsibility?: string;
  restrictions?: string[];
}

export interface Utilities {
  electricity: UtilityStatus;
  water: UtilityStatus;
  sewerage: UtilityStatus;
  gas?: UtilityStatus;
  internet: UtilityStatus;
  telephone: UtilityStatus;
}

export interface UtilityStatus {
  available: boolean;
  connection_status: 'connected' | 'available' | 'not_available';
  provider?: string;
  capacity?: string;
  cost_estimate?: number;
  notes?: string;
}

export interface PropertyZoning {
  current_zoning: string;
  permitted_uses: string[];
  restrictions: string[];
  height_restrictions?: number;
  setback_requirements?: {
    front?: number;
    rear?: number;
    side?: number;
  };
  coverage_ratio?: number;
  floor_area_ratio?: number;
}

export interface EnvironmentalAssessment {
  environmental_risks: EnvironmentalRisk[];
  soil_conditions?: SoilCondition;
  flood_risk: 'low' | 'medium' | 'high';
  contamination_risk: 'low' | 'medium' | 'high';
  natural_hazards: string[];
  protected_areas_nearby: boolean;
  environmental_clearances: string[];
}

export interface EnvironmentalRisk {
  type: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation_measures?: string[];
  impact_on_value: 'positive' | 'negative' | 'neutral';
}

export interface SoilCondition {
  type: string;
  bearing_capacity?: number;
  drainage: 'excellent' | 'good' | 'fair' | 'poor';
  stability: 'stable' | 'moderate' | 'unstable';
  suitability_for_construction: boolean;
  special_considerations?: string[];
}

export interface PropertyDimensions {
  frontage?: number;
  depth?: number;
  total_area: number;
  built_up_area?: number;
  floor_area_ratio?: number;
  coverage_ratio?: number;
  boundary_measurements: BoundaryMeasurement[];
}

export interface BoundaryMeasurement {
  side: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  length: number;
  description?: string;
  adjacent_property?: string;
}

export interface PropertyHistory {
  previous_sales: PropertySale[];
  ownership_changes: OwnershipChange[];
  developments: PropertyDevelopment[];
  legal_issues: LegalIssue[];
}

export interface PropertySale {
  date: string;
  sale_price: number;
  buyer: string;
  seller: string;
  sale_type: 'market_sale' | 'forced_sale' | 'family_transfer' | 'government_acquisition';
  conditions?: string[];
}

export interface OwnershipChange {
  date: string;
  previous_owner: string;
  new_owner: string;
  transfer_type: 'sale' | 'inheritance' | 'gift' | 'court_order';
  deed_reference: string;
}

export interface PropertyDevelopment {
  date: string;
  type: 'construction' | 'renovation' | 'addition' | 'subdivision';
  description: string;
  cost?: number;
  permits_obtained: string[];
}

export interface LegalIssue {
  type: string;
  status: 'active' | 'resolved' | 'pending';
  description: string;
  impact_on_ownership: boolean;
  resolution_date?: string;
}