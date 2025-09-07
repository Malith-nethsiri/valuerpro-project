/**
 * AI Field Mapping Utility
 * Maps AI extracted data to wizard steps and field paths for cross-step highlighting
 */

import type { WizardStep } from '@/store/wizardStore';

export interface AIFieldMapping {
  step: WizardStep;
  fieldPath: string;
  aiDataPath: string;
}

// Comprehensive mapping of AI data paths to wizard steps and field paths
export const AI_FIELD_MAPPINGS: AIFieldMapping[] = [
  // Property Identification step mappings
  { step: 'property_identification', fieldPath: 'lot_number', aiDataPath: 'property_identification.lot_number' },
  { step: 'property_identification', fieldPath: 'plan_number', aiDataPath: 'property_identification.plan_number' },
  { step: 'property_identification', fieldPath: 'extent', aiDataPath: 'property_identification.extent' },
  { step: 'property_identification', fieldPath: 'tenure', aiDataPath: 'property_identification.tenure' },
  { step: 'property_identification', fieldPath: 'property_type', aiDataPath: 'property_identification.property_type' },
  { step: 'property_identification', fieldPath: 'certificate_title', aiDataPath: 'property_identification.certificate_title' },
  { step: 'property_identification', fieldPath: 'boundary_north', aiDataPath: 'property_identification.boundaries.north' },
  { step: 'property_identification', fieldPath: 'boundary_south', aiDataPath: 'property_identification.boundaries.south' },
  { step: 'property_identification', fieldPath: 'boundary_east', aiDataPath: 'property_identification.boundaries.east' },
  { step: 'property_identification', fieldPath: 'boundary_west', aiDataPath: 'property_identification.boundaries.west' },
  
  // Location Analysis step mappings
  { step: 'location_analysis', fieldPath: 'address', aiDataPath: 'location_details.address' },
  { step: 'location_analysis', fieldPath: 'city', aiDataPath: 'location_details.city' },
  { step: 'location_analysis', fieldPath: 'province', aiDataPath: 'location_details.province' },
  { step: 'location_analysis', fieldPath: 'postal_code', aiDataPath: 'location_details.postal_code' },
  { step: 'location_analysis', fieldPath: 'district', aiDataPath: 'location_details.district' },
  { step: 'location_analysis', fieldPath: 'division', aiDataPath: 'location_details.division' },
  { step: 'location_analysis', fieldPath: 'coordinates_lat', aiDataPath: 'location_details.coordinates.latitude' },
  { step: 'location_analysis', fieldPath: 'coordinates_lng', aiDataPath: 'location_details.coordinates.longitude' },
  
  // Property Details step mappings  
  { step: 'property_details', fieldPath: 'land_area', aiDataPath: 'site_characteristics.land_area' },
  { step: 'property_details', fieldPath: 'terrain', aiDataPath: 'site_characteristics.terrain' },
  { step: 'property_details', fieldPath: 'soil_type', aiDataPath: 'site_characteristics.soil_type' },
  { step: 'property_details', fieldPath: 'drainage', aiDataPath: 'site_characteristics.drainage' },
  { step: 'property_details', fieldPath: 'access', aiDataPath: 'site_characteristics.access' },
  { step: 'property_details', fieldPath: 'frontage', aiDataPath: 'site_characteristics.frontage' },
  { step: 'property_details', fieldPath: 'shape', aiDataPath: 'site_characteristics.shape' },
  { step: 'property_details', fieldPath: 'orientation', aiDataPath: 'site_characteristics.orientation' },
  
  // Improvements step mappings
  { step: 'improvements', fieldPath: 'building_type', aiDataPath: 'buildings_improvements.0.building_type' },
  { step: 'improvements', fieldPath: 'construction_year', aiDataPath: 'buildings_improvements.0.construction_year' },
  { step: 'improvements', fieldPath: 'construction_material', aiDataPath: 'buildings_improvements.0.construction_material' },
  { step: 'improvements', fieldPath: 'floor_area', aiDataPath: 'buildings_improvements.0.floor_area' },
  { step: 'improvements', fieldPath: 'stories', aiDataPath: 'buildings_improvements.0.stories' },
  { step: 'improvements', fieldPath: 'roof_type', aiDataPath: 'buildings_improvements.0.roof_type' },
  { step: 'improvements', fieldPath: 'wall_type', aiDataPath: 'buildings_improvements.0.wall_type' },
  { step: 'improvements', fieldPath: 'flooring', aiDataPath: 'buildings_improvements.0.flooring' },
  { step: 'improvements', fieldPath: 'condition', aiDataPath: 'buildings_improvements.0.condition' },
  { step: 'improvements', fieldPath: 'amenities', aiDataPath: 'buildings_improvements.0.amenities' },
  
  // Environmental step mappings
  { step: 'environmental', fieldPath: 'environmental_factors', aiDataPath: 'environmental_factors.factors' },
  { step: 'environmental', fieldPath: 'restrictions', aiDataPath: 'environmental_factors.restrictions' },
  { step: 'environmental', fieldPath: 'hazards', aiDataPath: 'environmental_factors.hazards' },
  { step: 'environmental', fieldPath: 'conservation', aiDataPath: 'environmental_factors.conservation_areas' },
  
  // Market Analysis step mappings
  { step: 'market_analysis', fieldPath: 'market_trends', aiDataPath: 'market_analysis.market_trends' },
  { step: 'market_analysis', fieldPath: 'price_range', aiDataPath: 'market_analysis.price_range' },
  { step: 'market_analysis', fieldPath: 'demand_supply', aiDataPath: 'market_analysis.demand_supply' },
  { step: 'market_analysis', fieldPath: 'growth_prospects', aiDataPath: 'market_analysis.growth_prospects' },
  { step: 'market_analysis', fieldPath: 'comparable_sales', aiDataPath: 'market_analysis.comparable_sales' },
];

/**
 * Get nested value from object using dot notation path
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (key.match(/^\d+$/)) {
      // Handle array indices
      const index = parseInt(key);
      return Array.isArray(current) ? current[index] : undefined;
    }
    return current[key];
  }, obj);
}

/**
 * Check if a nested value exists and is not empty
 */
export function hasNestedValue(obj: any, path: string): boolean {
  const value = getNestedValue(obj, path);
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * Get field paths that should be highlighted based on AI data
 */
export function getPopulatedFieldPaths(aiData: any): Record<WizardStep, string[]> {
  const result: Record<WizardStep, string[]> = {
    'report_info': [],
    'client_info': [],
    'property_identification': [],
    'location_analysis': [],
    'file_upload': [],
    'ocr_processing': [],
    'ai_analysis': [],
    'property_details': [],
    'improvements': [],
    'environmental': [],
    'market_analysis': [],
    'comparables': [],
    'valuation': [],
    'review': [],
    'finalize': []
  };
  
  AI_FIELD_MAPPINGS.forEach(mapping => {
    if (hasNestedValue(aiData, mapping.aiDataPath)) {
      result[mapping.step].push(mapping.fieldPath);
    }
  });
  
  return result;
}

/**
 * Create a comprehensive field mapping for debugging
 */
export function debugFieldMapping(aiData: any): { [path: string]: any } {
  const debug: { [path: string]: any } = {};
  
  AI_FIELD_MAPPINGS.forEach(mapping => {
    const value = getNestedValue(aiData, mapping.aiDataPath);
    if (value !== undefined) {
      debug[`${mapping.step}.${mapping.fieldPath}`] = value;
    }
  });
  
  return debug;
}