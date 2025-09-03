// Re-export all types from domain-specific modules
// This maintains backward compatibility while providing better organization

// User and Authentication Types
export * from './user';

// Report and Valuation Types
export * from './report';

// Property Types
export * from './property';

// API Types
export * from './api';

// Common/Shared Types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampedEntity extends BaseEntity {}

export interface SortableEntity {
  sort_order: number;
}

export interface MetaData {
  total?: number;
  page?: number;
  limit?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  render?: (value: any, record: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox' | 'radio' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | undefined;
  };
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date;
}

export interface Theme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  light: string;
  dark: string;
}

export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: {
    enableAI: boolean;
    enableOCR: boolean;
    enableMaps: boolean;
    enableAnalytics: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFilesPerUpload: number;
    maxReportsPerUser: number;
  };
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredOnly<T, K extends keyof T> = Pick<T, K>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonEmptyArray<T> = [T, ...T[]];

export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Event Handler Types
export type EventHandler<T = Event> = (event: T) => void;

export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;

export type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void;

// Status Types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ValidationStatus = 'valid' | 'invalid' | 'pending' | 'skipped';

// Permission Types
export type Permission = 'read' | 'write' | 'delete' | 'admin';

export type Role = 'user' | 'admin' | 'super_admin' | 'valuer' | 'client';

export interface UserPermissions {
  reports: Permission[];
  files: Permission[];
  clients: Permission[];
  settings: Permission[];
  users: Permission[];
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  requiresAuth?: boolean;
  permissions?: Permission[];
  exact?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

// Chart/Analytics Types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: ChartDataPoint[] | TimeSeriesPoint[];
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    legend?: boolean;
    grid?: boolean;
    animations?: boolean;
  };
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  timestamp: Date;
  read: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

// Search and Filter Types
export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchQuery {
  query?: string;
  filters?: SearchFilter[];
  sort?: SortConfig;
  page?: number;
  limit?: number;
}

// Export format types for backward compatibility
export type { User, Client, Report, ReportStatus, Property, ValuationLine, ValuationSummary } from './user';
export type { Identification, Location } from './property';
export type { ApiResponse, ApiError, FileUpload, OCRResult } from './api';