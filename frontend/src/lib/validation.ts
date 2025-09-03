/**
 * Validation utilities for wizard steps
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, allData?: any) => string | null;
  message?: string;
}

/**
 * Validate a single field against rules
 */
export function validateField(
  value: any, 
  rules: ValidationRule[], 
  allData?: any
): string | null {
  for (const rule of rules) {
    // Required check
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${rule.field} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.trim().length < rule.minLength) {
        return rule.message || `${rule.field} must be at least ${rule.minLength} characters`;
      }

      if (rule.maxLength && value.trim().length > rule.maxLength) {
        return rule.message || `${rule.field} must not exceed ${rule.maxLength} characters`;
      }

      if (rule.pattern && !rule.pattern.test(value.trim())) {
        return rule.message || `${rule.field} format is invalid`;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, allData);
      if (customError) {
        return customError;
      }
    }
  }

  return null;
}

/**
 * Validate multiple fields
 */
export function validateFields(
  data: Record<string, any>, 
  fieldRules: Record<string, ValidationRule[]>
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const value = data[fieldName];
    const error = validateField(value, rules, data);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Step-specific validation rules
 */
export const stepValidationRules = {
  reportInfo: {
    ref: [
      { field: 'Report Reference', required: true },
      { field: 'Report Reference', minLength: 3, message: 'Reference must be at least 3 characters' },
      { field: 'Report Reference', maxLength: 50, message: 'Reference must not exceed 50 characters' }
    ],
    purpose: [
      { field: 'Valuation Purpose', required: true }
    ],
    inspection_date: [
      { 
        field: 'Inspection Date', 
        required: true,
        custom: (value: string) => {
          if (!value) return null;
          const inspectionDate = new Date(value);
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today
          
          if (inspectionDate > today) {
            return 'Inspection date cannot be in the future';
          }
          return null;
        }
      }
    ]
  },

  identification: {
    lot_number: [
      { field: 'Lot Number', required: true }
    ],
    plan_number: [
      { field: 'Plan Number', required: true }
    ],
    surveyor_name: [
      { field: 'Surveyor Name', required: true }
    ]
  },

  location: {
    address: [
      { field: 'Address', required: true, minLength: 5 }
    ],
    latitude: [
      {
        field: 'Latitude',
        custom: (value: number) => {
          if (value && (value < -90 || value > 90)) {
            return 'Latitude must be between -90 and 90';
          }
          return null;
        }
      }
    ],
    longitude: [
      {
        field: 'Longitude',
        custom: (value: number) => {
          if (value && (value < -180 || value > 180)) {
            return 'Longitude must be between -180 and 180';
          }
          return null;
        }
      }
    ]
  },

  site: {
    shape: [
      { field: 'Site Shape', required: true }
    ],
    extent: [
      { 
        field: 'Extent', 
        required: true,
        custom: (value: number) => {
          if (value && value <= 0) {
            return 'Extent must be greater than 0';
          }
          return null;
        }
      }
    ]
  },

  valuation: {
    land_rate: [
      { 
        field: 'Land Rate', 
        required: true,
        custom: (value: number) => {
          if (value && value <= 0) {
            return 'Land rate must be greater than 0';
          }
          return null;
        }
      }
    ],
    building_rate: [
      {
        field: 'Building Rate',
        custom: (value: number) => {
          if (value && value <= 0) {
            return 'Building rate must be greater than 0';
          }
          return null;
        }
      }
    ]
  }
};

/**
 * Get validation rules for a specific step
 */
export function getStepValidationRules(stepId: string): Record<string, ValidationRule[]> {
  return stepValidationRules[stepId as keyof typeof stepValidationRules] || {};
}

/**
 * Validate a complete wizard step
 */
export function validateWizardStep(stepId: string, stepData: Record<string, any>): ValidationResult {
  const rules = getStepValidationRules(stepId);
  return validateFields(stepData, rules);
}

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number validation regex (Sri Lankan format)
 */
export const PHONE_REGEX = /^(\+94|94|0)?[1-9]\d{8}$/;

/**
 * Common validation utilities
 */
export const validators = {
  email: (value: string) => {
    if (value && !EMAIL_REGEX.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value: string) => {
    if (value && !PHONE_REGEX.test(value.replace(/\s+/g, ''))) {
      return 'Please enter a valid Sri Lankan phone number';
    }
    return null;
  },

  positiveNumber: (value: number, fieldName: string = 'Value') => {
    if (value !== undefined && value !== null && value <= 0) {
      return `${fieldName} must be greater than 0`;
    }
    return null;
  },

  dateNotInFuture: (value: string, fieldName: string = 'Date') => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date > today) {
      return `${fieldName} cannot be in the future`;
    }
    return null;
  },

  required: (value: any, fieldName: string = 'Field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  }
};