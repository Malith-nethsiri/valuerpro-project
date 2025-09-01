/**
 * Expert-level smart data merging utilities for frontend
 * Intelligently merges AI extracted data with user input
 */

import { ReportWizardData } from '@/types';

export interface MergeOptions {
  preserveUserData: boolean;
  overwriteEmptyFields: boolean;
  validateData: boolean;
  logChanges: boolean;
}

export interface MergeResult {
  mergedData: Partial<ReportWizardData>;
  changesApplied: string[];
  validationErrors: string[];
  fieldsUpdated: number;
}

export class SmartDataMerger {
  private static defaultOptions: MergeOptions = {
    preserveUserData: true,
    overwriteEmptyFields: true,
    validateData: true,
    logChanges: true
  };

  /**
   * Intelligently merge AI extracted data with existing wizard data
   */
  static mergeAiData(
    existingData: Partial<ReportWizardData>,
    aiData: any,
    options: Partial<MergeOptions> = {}
  ): MergeResult {
    const mergeOptions = { ...this.defaultOptions, ...options };
    const result: MergeResult = {
      mergedData: { ...existingData },
      changesApplied: [],
      validationErrors: [],
      fieldsUpdated: 0
    };

    try {
      // Check if we have comprehensive AI data
      const comprehensiveData = aiData?.document_analysis?.comprehensive_data || 
                               aiData?.comprehensive_data;

      if (comprehensiveData && !comprehensiveData.error) {
        // Use new comprehensive format
        this.mergeComprehensiveData(result, comprehensiveData, mergeOptions);
      } else {
        // Fallback to legacy format
        this.mergeLegacyAiData(result, aiData, mergeOptions);
      }

      if (mergeOptions.logChanges) {
        console.log(`Smart merge completed: ${result.fieldsUpdated} fields updated, ${result.changesApplied.length} changes applied`);
      }

    } catch (error) {
      console.error('Smart data merge failed:', error);
      result.validationErrors.push(`Merge failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Merge comprehensive AI data format
   */
  private static mergeComprehensiveData(
    result: MergeResult,
    comprehensiveData: any,
    options: MergeOptions
  ): void {
    // Merge report information
    if (comprehensiveData.report_information) {
      this.mergeSection(
        result,
        'reportInfo',
        comprehensiveData.report_information,
        options
      );
    }

    // Merge identification data
    if (comprehensiveData.property_identification) {
      this.mergeSection(
        result,
        'identification',
        comprehensiveData.property_identification,
        options
      );
    }

    // Merge location data
    if (comprehensiveData.location_details) {
      this.mergeSection(
        result,
        'location',
        comprehensiveData.location_details,
        options
      );
    }

    // Merge site data
    if (comprehensiveData.site_characteristics) {
      this.mergeSection(
        result,
        'site',
        comprehensiveData.site_characteristics,
        options
      );
    }

    // Merge buildings data (special handling for arrays)
    if (comprehensiveData.buildings_improvements && Array.isArray(comprehensiveData.buildings_improvements)) {
      this.mergeBuildingsData(result, comprehensiveData.buildings_improvements, options);
    }

    // Merge utilities data
    if (comprehensiveData.utilities_assessment) {
      this.mergeSection(
        result,
        'utilities',
        comprehensiveData.utilities_assessment,
        options
      );
    }

    // Merge locality data
    if (comprehensiveData.locality_analysis) {
      this.mergeSection(
        result,
        'locality',
        comprehensiveData.locality_analysis,
        options
      );
    }

    // Merge planning data
    if (comprehensiveData.planning_zoning) {
      this.mergeSection(
        result,
        'planning',
        comprehensiveData.planning_zoning,
        options
      );
    }

    // Merge transport data
    if (comprehensiveData.transport_access) {
      this.mergeSection(
        result,
        'transport',
        comprehensiveData.transport_access,
        options
      );
    }

    // Merge environmental data
    if (comprehensiveData.environmental_factors) {
      this.mergeSection(
        result,
        'environmental',
        comprehensiveData.environmental_factors,
        options
      );
    }

    // Merge market analysis data
    if (comprehensiveData.market_analysis) {
      this.mergeMarketData(result, comprehensiveData.market_analysis, options);
    }

    // Merge legal data
    if (comprehensiveData.legal_information) {
      this.mergeSection(
        result,
        'legal',
        comprehensiveData.legal_information,
        options
      );
    }
  }

  /**
   * Merge a specific section of data
   */
  private static mergeSection(
    result: MergeResult,
    sectionName: keyof ReportWizardData,
    aiSectionData: any,
    options: MergeOptions
  ): void {
    if (!result.mergedData[sectionName]) {
      result.mergedData[sectionName] = {};
    }

    const existingSection = result.mergedData[sectionName] as any;
    let fieldsUpdatedInSection = 0;

    for (const [key, aiValue] of Object.entries(aiSectionData)) {
      if (this.shouldUpdateField(existingSection[key], aiValue, options)) {
        const oldValue = existingSection[key];
        existingSection[key] = this.processFieldValue(aiValue, key);
        
        result.changesApplied.push(
          `${sectionName}.${key}: ${this.formatValueForLog(oldValue)} → ${this.formatValueForLog(aiValue)}`
        );
        fieldsUpdatedInSection++;
      }
    }

    result.fieldsUpdated += fieldsUpdatedInSection;

    if (options.logChanges && fieldsUpdatedInSection > 0) {
      console.log(`Updated ${fieldsUpdatedInSection} fields in ${sectionName} section`);
    }
  }

  /**
   * Special handling for market data (includes comparable sales arrays)
   */
  private static mergeMarketData(
    result: MergeResult,
    aiMarketData: any,
    options: MergeOptions
  ): void {
    if (!result.mergedData.market) {
      result.mergedData.market = {};
    }

    const existingMarket = result.mergedData.market as any;
    let fieldsUpdatedInSection = 0;

    // Handle comparable sales (array data)
    if (aiMarketData.comparable_sales && Array.isArray(aiMarketData.comparable_sales)) {
      const existingComparables = existingMarket.comparable_sales || [];
      
      // If no existing comparables, add AI extracted comparables
      if (existingComparables.length === 0) {
        const processedComparables = aiMarketData.comparable_sales
          .filter(comp => comp.address && comp.sale_price)
          .map((comp, index) => ({
            id: `ai_comp_${Date.now()}_${index}`,
            ...comp,
            // Ensure required fields have defaults
            adjustments: comp.adjustments || {
              location: 0,
              time: 0,
              size: 0,
              condition: 0,
              other: 0,
              total: 0
            }
          }));

        if (processedComparables.length > 0) {
          existingMarket.comparable_sales = processedComparables;
          fieldsUpdatedInSection += processedComparables.length;
          result.changesApplied.push(
            `market.comparable_sales: Added ${processedComparables.length} comparables from AI`
          );
        }
      }
    }

    // Handle other market data fields
    const marketFields = ['market_trends', 'price_analysis', 'market_influences', 'forecast', 'market_summary'];
    for (const field of marketFields) {
      if (aiMarketData[field] && this.shouldUpdateField(existingMarket[field], aiMarketData[field], options)) {
        const oldValue = existingMarket[field];
        existingMarket[field] = this.processFieldValue(aiMarketData[field], field);
        
        result.changesApplied.push(
          `market.${field}: ${this.formatValueForLog(oldValue)} → ${this.formatValueForLog(aiMarketData[field])}`
        );
        fieldsUpdatedInSection++;
      }
    }

    result.fieldsUpdated += fieldsUpdatedInSection;

    if (options.logChanges && fieldsUpdatedInSection > 0) {
      console.log(`Updated ${fieldsUpdatedInSection} fields in market section`);
    }
  }

  /**
   * Special handling for buildings data (array of objects)
   */
  private static mergeBuildingsData(
    result: MergeResult,
    aiBuildingsData: any[],
    options: MergeOptions
  ): void {
    const existingBuildings = result.mergedData.buildings || [];

    // If no existing buildings, add AI extracted buildings
    if (!existingBuildings || existingBuildings.length === 0) {
      const processedBuildings = aiBuildingsData
        .filter(building => building.building_type || building.type || building.floor_area)
        .map((building, index) => ({
          id: Date.now().toString() + index,
          type: building.building_type || building.type,
          use: building.primary_use || building.use,
          floor_area: building.floor_area,
          construction_year: building.construction_year,
          construction_type: building.construction_type,
          roof_type: building.roof_type,
          wall_type: building.wall_type,
          floor_type: building.floor_type,
          condition: building.condition,
          stories: building.stories,
          rooms: building.rooms,
          special_features: building.special_features,
          renovation_required: building.renovation_required,
          estimated_replacement_cost: building.estimated_replacement_cost
        }));

      if (processedBuildings.length > 0) {
        result.mergedData.buildings = processedBuildings;
        result.fieldsUpdated += processedBuildings.length;
        result.changesApplied.push(
          `buildings: Added ${processedBuildings.length} buildings from AI extraction`
        );
      }
    } else if (options.logChanges) {
      console.log('Existing buildings found, preserving user data');
    }
  }

  /**
   * Determine if a field should be updated
   */
  private static shouldUpdateField(existingValue: any, aiValue: any, options: MergeOptions): boolean {
    // Don't update if AI value is null/undefined/empty
    if (!this.hasValue(aiValue)) {
      return false;
    }

    // If preserveUserData is true, don't overwrite existing user data
    if (options.preserveUserData && this.hasValue(existingValue)) {
      return false;
    }

    // If overwriteEmptyFields is true, update empty fields
    if (options.overwriteEmptyFields && !this.hasValue(existingValue)) {
      return true;
    }

    // If preserveUserData is false, always update
    if (!options.preserveUserData) {
      return true;
    }

    return false;
  }

  /**
   * Check if a value is meaningful (not null, undefined, empty string, or empty array)
   */
  private static hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }

  /**
   * Process field value to ensure proper format
   */
  private static processFieldValue(value: any, fieldName: string): any {
    // Handle specific field types
    if (fieldName.includes('date') && typeof value === 'string') {
      // Validate and format dates
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return value;
        }
      } catch {
        console.warn(`Invalid date value for ${fieldName}: ${value}`);
        return null;
      }
    }

    // Handle numeric fields
    if (fieldName.includes('area') || fieldName.includes('distance') || fieldName.includes('width') || 
        fieldName.includes('extent') || fieldName.includes('year')) {
      const numValue = parseFloat(String(value));
      if (!isNaN(numValue) && numValue >= 0) {
        return numValue;
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.filter(item => item && item.toString().trim() !== '');
    }

    // Handle strings
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  }

  /**
   * Format value for logging
   */
  private static formatValueForLog(value: any): string {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'string' && value.trim() === '') return 'empty';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Legacy AI data merging for backward compatibility
   */
  private static mergeLegacyAiData(
    result: MergeResult,
    aiData: any,
    options: MergeOptions
  ): void {
    if (!aiData?.document_analysis) return;

    const analysis = aiData.document_analysis;
    
    // Handle legacy extracted data
    if (analysis.extracted_data) {
      this.mergeLegacyExtractedData(result, analysis.extracted_data, options);
    }

    // Handle legacy general data
    if (analysis.general_data) {
      this.mergeLegacyGeneralData(result, analysis.general_data, options);
    }
  }

  /**
   * Handle legacy extracted data format
   */
  private static mergeLegacyExtractedData(
    result: MergeResult,
    extractedData: any,
    options: MergeOptions
  ): void {
    // Map legacy fields to new structure
    const legacyMapping = {
      lot_number: ['identification', 'lot_number'],
      plan_number: ['identification', 'plan_number'],
      plan_date: ['identification', 'plan_date'],
      surveyor_name: ['identification', 'surveyor_name'],
      // Add more mappings as needed
    };

    for (const [legacyField, [section, newField]] of Object.entries(legacyMapping)) {
      if (extractedData[legacyField]) {
        if (!result.mergedData[section as keyof ReportWizardData]) {
          result.mergedData[section as keyof ReportWizardData] = {};
        }
        
        const sectionData = result.mergedData[section as keyof ReportWizardData] as any;
        if (this.shouldUpdateField(sectionData[newField], extractedData[legacyField], options)) {
          sectionData[newField] = this.processFieldValue(extractedData[legacyField], newField);
          result.fieldsUpdated++;
          result.changesApplied.push(`${section}.${newField}: Updated from legacy data`);
        }
      }
    }
  }

  /**
   * Handle legacy general data format
   */
  private static mergeLegacyGeneralData(
    result: MergeResult,
    generalData: any,
    options: MergeOptions
  ): void {
    // Handle location data
    if (generalData.location_details) {
      this.mergeSection(result, 'location', generalData.location_details, options);
    }

    // Handle building data
    if (generalData.building_details) {
      if (!result.mergedData.buildings || result.mergedData.buildings.length === 0) {
        result.mergedData.buildings = [{
          id: Date.now().toString(),
          ...generalData.building_details
        }];
        result.fieldsUpdated++;
        result.changesApplied.push('buildings: Added from legacy general data');
      }
    }
  }

  /**
   * Validate merged data
   */
  static validateMergedData(data: Partial<ReportWizardData>): string[] {
    const errors: string[] = [];

    // Basic validation rules
    if (data.identification) {
      if (data.identification.extent_perches && data.identification.extent_perches <= 0) {
        errors.push('Extent in perches must be positive');
      }
    }

    if (data.location) {
      if (data.location.latitude && (data.location.latitude < 5.9 || data.location.latitude > 9.9)) {
        errors.push('Latitude appears to be outside Sri Lanka bounds');
      }
      if (data.location.longitude && (data.location.longitude < 79.6 || data.location.longitude > 81.9)) {
        errors.push('Longitude appears to be outside Sri Lanka bounds');
      }
    }

    if (data.buildings && Array.isArray(data.buildings)) {
      data.buildings.forEach((building, index) => {
        if (building.floor_area && building.floor_area <= 0) {
          errors.push(`Building ${index + 1}: Floor area must be positive`);
        }
        if (building.construction_year && building.construction_year > new Date().getFullYear()) {
          errors.push(`Building ${index + 1}: Construction year cannot be in the future`);
        }
      });
    }

    return errors;
  }
}

/**
 * Hook for using smart data merger in React components
 */
export const useSmartDataMerger = () => {
  const mergeAiData = (existingData: Partial<ReportWizardData>, aiData: any, options?: Partial<MergeOptions>) => {
    return SmartDataMerger.mergeAiData(existingData, aiData, options);
  };

  const validateData = (data: Partial<ReportWizardData>) => {
    return SmartDataMerger.validateMergedData(data);
  };

  return {
    mergeAiData,
    validateData
  };
};

// Export types for TypeScript support
export type { MergeOptions, MergeResult };