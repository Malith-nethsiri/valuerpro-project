// Modern API Types for Enhanced Connectivity
import type { User, Report, UploadedFile, OCRResult } from './index';

// Enhanced API Response patterns with generics
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
  detail?: string;
  status_code: number;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Modern HTTP Client Configuration
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
  onError?: (error: ApiErrorResponse) => Promise<never>;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  registration_no?: string;
  qualifications?: string;
  experience_years?: number | string;
  specialization?: string;
  firm_name?: string;
  designation?: string;
  contact_phone?: string;
}

// Reports API Types
export interface CreateReportRequest {
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

export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  id: string;
}

export interface ReportsListParams {
  status?: string;
  client_id?: string;
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// File Upload Types
export interface UploadRequest {
  file: File;
  report_id?: string;
  category?: string;
  description?: string;
}

export interface MultiUploadRequest {
  files: File[];
  report_id?: string;
  category?: string;
}

export interface UploadResponse extends UploadedFile {
  upload_progress?: number;
}

export interface BatchUploadResponse {
  files: UploadResponse[];
  total_files: number;
  successful_uploads: number;
  failed_uploads: number;
  total_size: number;
}

// OCR API Types
export interface OCRRequest {
  file_id?: string;
  file_path?: string;
  language?: string;
  extract_tables?: boolean;
  extract_forms?: boolean;
}

export interface OCRResponse extends OCRResult {
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  estimated_completion?: string;
}

export interface BatchOCRRequest {
  file_ids: string[];
  language?: string;
  extract_tables?: boolean;
  extract_forms?: boolean;
}

export interface BatchOCRResponse {
  batch_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_files: number;
  completed_files: number;
  failed_files: number;
  results?: OCRResponse[];
}

// AI Analysis Types
export interface AIAnalysisRequest {
  file_id: string;
  analysis_type: 'document_extraction' | 'property_analysis' | 'market_analysis';
  custom_prompts?: string[];
}

export interface AIAnalysisResponse {
  analysis_id: string;
  file_id: string;
  analysis_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: Record<string, unknown>;
  confidence_scores?: Record<string, number>;
  processing_time?: number;
  created_at: string;
  completed_at?: string;
}

// Maps API Types
export interface StaticMapRequest {
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  map_type?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  markers?: MapMarker[];
}

export interface MapMarker {
  lat: number;
  lng: number;
  color?: string;
  label?: string;
}

export interface GeocodeRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeocodeResponse {
  formatted_address: string;
  components: AddressComponents;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  place_id?: string;
}

export interface AddressComponents {
  house_number?: string;
  street?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  postal_code?: string;
}

// WebSocket Types for Real-time Features
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  id?: string;
}

export interface ReportUpdateMessage {
  report_id: string;
  update_type: 'status_change' | 'field_update' | 'file_added' | 'analysis_complete';
  data: Record<string, unknown>;
  user_id: string;
}

export interface OCRProgressMessage {
  file_id: string;
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  estimated_remaining?: number;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retry_after?: number;
}

// Cache Types
export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: boolean;
  tags?: string[];
}

export interface CachedResponse<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// Validation Types
export interface ValidationRule {
  field: string;
  rules: ('required' | 'email' | 'min' | 'max' | 'pattern')[];
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Export utility types
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ResponseStatus = 'success' | 'error' | 'loading';

// Generic API function type
export type ApiFunction<TRequest = unknown, TResponse = unknown> = (
  request: TRequest,
  config?: RequestConfig
) => Promise<ApiResponse<TResponse>>;

// Hook types for React Query integration
export interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  retry?: number | boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiErrorResponse) => void;
}

export interface MutationOptions<TRequest, TResponse> {
  onSuccess?: (data: TResponse, variables: TRequest) => void;
  onError?: (error: ApiErrorResponse, variables: TRequest) => void;
  onMutate?: (variables: TRequest) => Promise<unknown> | unknown;
}