import axios from 'axios';
import type { Report, ReportFormData, User, LoginResponse, UploadedFile, LocationData } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookie
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }): Promise<User> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  
  updateProfile: async (userData: {
    email?: string;
    full_name?: string;
    role?: string;
  }): Promise<User> => {
    const response = await apiClient.put('/auth/me', userData);
    return response.data;
  },
  
  createValuerProfile: async (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }): Promise<User> => {
    const response = await apiClient.post('/auth/me/valuer-profile', profileData);
    return response.data;
  },
  
  updateValuerProfile: async (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }): Promise<User> => {
    const response = await apiClient.put('/auth/me/valuer-profile', profileData);
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Client API functions
export const clientsAPI = {
  list: async (): Promise<any[]> => {
    const response = await apiClient.get('/reports/clients/');
    return response.data;
  },
  
  create: async (clientData: {
    name: string;
    address?: string;
    contact_numbers?: string[];
    email?: string;
  }): Promise<any> => {
    const response = await apiClient.post('/reports/clients/', clientData);
    return response.data;
  },
};

// Reports API functions
export const reportsAPI = {
  list: async (status?: string): Promise<Report[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/reports/', { params });
    return response.data;
  },
  
  create: async (reportData: {
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
  }): Promise<Report> => {
    const response = await apiClient.post('/reports/', reportData);
    return response.data;
  },
  
  finalize: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/reports/${id}/finalize`);
    return response.data;
  },
  
  // Property management
  createProperty: async (reportId: string, propertyData: {
    property_type: string;
    property_index?: number;
  }): Promise<any> => {
    const response = await apiClient.post(`/reports/${reportId}/properties`, propertyData);
    return response.data;
  },
  
  getProperties: async (reportId: string): Promise<any[]> => {
    const response = await apiClient.get(`/reports/${reportId}/properties`);
    return response.data;
  },
  
  // Valuation management
  createValuationLines: async (reportId: string, lines: any[]): Promise<any[]> => {
    const response = await apiClient.post(`/reports/${reportId}/valuation-lines`, lines);
    return response.data;
  },
  
  createValuationSummary: async (reportId: string, summary: {
    market_value: number;
    market_value_words: string;
    forced_sale_value: number;
  }): Promise<any> => {
    const response = await apiClient.post(`/reports/${reportId}/valuation-summary`, summary);
    return response.data;
  },
  
  get: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },
  
  update: async (id: string, reportData: any): Promise<Report> => {
    const response = await apiClient.put(`/reports/${id}`, reportData);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  },
  
  getFiles: async (reportId: string): Promise<UploadedFile[]> => {
    const response = await apiClient.get(`/reports/${reportId}/files`);
    return response.data;
  },
  
  getOcrResults: async (reportId: string): Promise<unknown[]> => {
    const response = await apiClient.get(`/reports/${reportId}/ocr-results`);
    return response.data;
  },
  
  generatePDF: async (reportId: string): Promise<Blob> => {
    const response = await apiClient.get(`/reports/${reportId}/generate-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  generateDOCX: async (reportId: string): Promise<Blob> => {
    const response = await apiClient.get(`/reports/${reportId}/generate-docx`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// OCR API functions
export const ocrAPI = {
  extractText: async (filePath?: string, fileId?: string): Promise<unknown> => {
    const requestData: Record<string, string> = {};
    if (filePath) requestData.file_path = filePath;
    if (fileId) requestData.file_id = fileId;
    
    const response = await apiClient.post('/ocr/extract_text', requestData);
    return response.data;
  },
  
  getResults: async (fileId: string) => {
    const response = await apiClient.get(`/ocr/results/${fileId}`);
    return response.data;
  },
  
  updateResults: async (ocrId: string, updatedText: string) => {
    const response = await apiClient.put(`/ocr/results/${ocrId}`, {
      edited_text: updatedText,
      is_edited: true
    });
    return response.data;
  },
  
  analyzeDocument: async (fileId: string) => {
    const response = await apiClient.post('/ocr/analyze_document', {
      file_id: fileId
    });
    return response.data;
  },
};

// Maps API functions
export const mapsAPI = {
  getStatus: async () => {
    const response = await apiClient.get('/maps/status');
    return response.data;
  },
  
  generateStaticMap: async (
    latitude: number, 
    longitude: number, 
    options: {
      zoom?: number;
      width?: number;
      height?: number;
      mapType?: string;
    } = {}
  ) => {
    const response = await apiClient.post('/maps/static-map', {
      latitude,
      longitude,
      ...options
    });
    return response.data;
  },
  
  getDirections: async (origin: string, destination: string, mode: string = 'driving') => {
    const response = await apiClient.post('/maps/directions', {
      origin,
      destination,
      mode
    });
    return response.data;
  },
  
  getRouteDescription: async (latitude: number, longitude: number, nearestCity?: string) => {
    const response = await apiClient.post('/maps/route-description', {
      latitude,
      longitude,
      nearest_city: nearestCity
    });
    return response.data;
  },
  
  reverseGeocode: async (latitude: number, longitude: number) => {
    const response = await apiClient.post('/maps/reverse-geocode', {
      latitude,
      longitude
    });
    return response.data;
  },
  
  analyzePropertyLocation: async (latitude: number, longitude: number) => {
    const response = await apiClient.post('/maps/property-analysis', {
      latitude,
      longitude
    });
    return response.data;
  },
};

// File Upload API functions
export const filesAPI = {
  uploadSingle: async (file: File, reportId?: string): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    if (reportId) {
      formData.append('report_id', reportId);
    }
    
    const response = await apiClient.post('/uploads/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  uploadMultiple: async (files: File[], reportId?: string): Promise<{ files: UploadedFile[]; total_files: number; total_size: number }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (reportId) {
      formData.append('report_id', reportId);
    }
    
    const response = await apiClient.post('/uploads/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  list: async (reportId?: string): Promise<UploadedFile[]> => {
    const params = reportId ? { report_id: reportId } : {};
    const response = await apiClient.get('/uploads/', { params });
    return response.data;
  },
  
  get: async (fileId: string): Promise<UploadedFile> => {
    const response = await apiClient.get(`/uploads/${fileId}`);
    return response.data;
  },
  
  delete: async (fileId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/uploads/${fileId}`);
    return response.data;
  },
  
  updateMetadata: async (fileId: string, description?: string): Promise<UploadedFile> => {
    const formData = new FormData();
    if (description) {
      formData.append('description', description);
    }
    
    const response = await apiClient.put(`/uploads/${fileId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};