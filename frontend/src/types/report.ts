// Report and Valuation Types

import type { User, Client } from './user';
import type { Property } from './property';

export type ReportStatus = 'draft' | 'in_progress' | 'completed' | 'finalized';

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
  properties?: Property[];
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

export interface ValuationData {
  method?: string;
  approach?: string;
  land_value?: number;
  improvement_value?: number;
  total_value?: number;
  forced_sale_percentage?: number;
  forced_sale_value?: number;
  depreciation_factors?: DepreciationFactor[];
  assumptions?: string[];
  limitations?: string[];
}

export interface DepreciationFactor {
  type: string;
  percentage: number;
  reason: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  sections: ReportSection[];
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  is_required: boolean;
  section_type: 'text' | 'table' | 'image' | 'calculation';
}

export interface ReportExportOptions {
  format: 'pdf' | 'docx';
  include_images: boolean;
  include_appendices: boolean;
  watermark?: string;
  template_id?: string;
}

export interface ReportMetrics {
  total_reports: number;
  completed_reports: number;
  avg_completion_time: number;
  reports_this_month: number;
  value_assessed: number;
}

// Additional report-related interfaces
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
  distance?: string;
  duration?: string;
  instructions?: string[];
}

export interface AIAnalysis {
  confidence_score?: number;
  extracted_data?: any;
  validation_status?: 'pending' | 'approved' | 'rejected';
  suggestions?: string[];
  errors?: string[];
}

export interface UploadedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_url: string;
  thumbnail_url?: string;
  ocr_status?: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface PropertyDetails {
  property_type?: string;
  construction_type?: string;
  age?: number;
  condition?: string;
  facilities?: string[];
  improvements?: Improvement[];
  environmental_factors?: EnvironmentalFactor[];
}

export interface Improvement {
  type: string;
  description: string;
  age: number;
  condition: string;
  replacement_cost: number;
  depreciated_value: number;
}

export interface EnvironmentalFactor {
  type: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  significance: 'low' | 'medium' | 'high';
}

export interface MarketAnalysis {
  market_conditions?: 'strong' | 'moderate' | 'weak';
  demand_level?: 'high' | 'moderate' | 'low';
  supply_level?: 'high' | 'moderate' | 'low';
  price_trends?: 'increasing' | 'stable' | 'decreasing';
  market_indicators?: MarketIndicator[];
}

export interface MarketIndicator {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  significance: string;
}

export interface Comparable {
  id: string;
  address: string;
  property_type: string;
  sale_price: number;
  sale_date: string;
  area: number;
  price_per_unit: number;
  adjustments: Adjustment[];
  adjusted_value: number;
  weight: number;
  distance: number;
  source: string;
  reliability: 'high' | 'medium' | 'low';
}

export interface Adjustment {
  factor: string;
  adjustment_percentage: number;
  reasoning: string;
}