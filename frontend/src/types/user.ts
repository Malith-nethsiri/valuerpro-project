// User and Valuer Profile Types

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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  full_name: string;
  password: string;
  confirm_password?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}