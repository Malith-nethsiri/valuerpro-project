/**
 * Expert-level smart data merging utilities for frontend
 * Intelligently merges AI extracted data with user input
 */

import { GroupWizardData } from '@/types/groupWizard';

export interface MergeOptions {
  preserveUserData: boolean;
  overwriteEmptyFields: boolean;
  validateData: boolean;
  logChanges: boolean;
}

export interface MergeResult {
  mergedData: Partial<GroupWizardData>;
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
    existingData: Partial<GroupWizardData>,
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
      // Debug logging
      console.log('SmartDataMerger.mergeAiData called with:', JSON.stringify(aiData, null, 2));
      
      // Check if we have comprehensive AI data
      const comprehensiveData = aiData?.document_analysis?.comprehensive_data || 
                               aiData?.comprehensive_data;

      console.log('Extracted comprehensiveData:', comprehensiveData);
      console.log('Has error?', comprehensiveData?.error);

      if (comprehensiveData && !comprehensiveData.error) {
        // Use new comprehensive format
        this.mergeComprehensiveData(result, comprehensiveData, mergeOptions);
      } else if (aiData?.report_information || aiData?.property_identification) {
        // Handle pre-processed data (already extracted from comprehensive_data)
        console.log('Processing pre-extracted comprehensive data');
        this.mergeComprehensiveData(result, aiData, mergeOptions);
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
   * Merge comprehensive AI data format - Fixed for GroupWizardData structure
   */
  private static mergeComprehensiveData(
    result: MergeResult,
    comprehensiveData: any,
    options: MergeOptions
  ): void {
    console.log('🔄 mergeComprehensiveData called with:', Object.keys(comprehensiveData));

    // Initialize group structures if they don't exist
    if (!result.mergedData.document_processing) {
      result.mergedData.document_processing = {};
    }
    if (!result.mergedData.location_mapping) {
      result.mergedData.location_mapping = {};
    }
    if (!result.mergedData.property_assessment) {
      result.mergedData.property_assessment = {};
    }
    if (!result.mergedData.market_valuation) {
      result.mergedData.market_valuation = {};
    }
    if (!result.mergedData.report_finalization) {
      result.mergedData.report_finalization = {};
    }

    // 1. Map property_identification to document_processing.property_identification
    if (comprehensiveData.property_identification) {
      console.log('📍 Mapping property_identification to document_processing');
      this.mergePropertyIdentificationData(
        result,
        comprehensiveData.property_identification,
        options
      );
    }

    // 2. Map location_details to location_mapping
    if (comprehensiveData.location_details) {
      console.log('🗺️ Mapping location_details to location_mapping');
      this.mergeLocationData(result, comprehensiveData.location_details, options);
    }

    // 3. Map site_characteristics and buildings_improvements to property_assessment
    if (comprehensiveData.site_characteristics) {
      console.log('🏗️ Mapping site_characteristics to property_assessment');
      this.mergeSiteData(result, comprehensiveData.site_characteristics, options);
    }

    if (comprehensiveData.buildings_improvements) {
      console.log('🏠 Mapping buildings_improvements to property_assessment');
      this.mergeBuildingData(result, comprehensiveData.buildings_improvements, options);
    }

    // 4. Map utilities_assessment to property_assessment
    if (comprehensiveData.utilities_assessment) {
      console.log('⚡ Mapping utilities_assessment to property_assessment');
      this.mergeToGroup(
        result,
        'property_assessment',
        'utilities',
        comprehensiveData.utilities_assessment,
        options
      );
    }

    // 5. Map market_analysis to market_valuation
    if (comprehensiveData.market_analysis) {
      console.log('💰 Mapping market_analysis to market_valuation');
      this.mergeMarketAnalysisData(result, comprehensiveData.market_analysis, options);
    }

    // 6. Map report_information to report_finalization
    if (comprehensiveData.report_information) {
      console.log('📋 Mapping report_information to report_finalization');
      this.mergeReportInfo(result, comprehensiveData.report_information, options);
    }

    // 7. Map legal_information to document_processing.legal_information
    if (comprehensiveData.legal_information) {
      console.log('⚖️ Mapping legal_information to document_processing');
      this.mergeToGroup(
        result,
        'document_processing',
        'legal_information',
        comprehensiveData.legal_information,
        options
      );
    }

    console.log(`✅ mergeComprehensiveData completed: ${result.fieldsUpdated} fields updated`);
  }

  /**
   * Merge a specific section of data to a group field
   */
  private static mergeSection(
    result: MergeResult,
    groupName: keyof GroupWizardData,
    fieldName: string,
    aiSectionData: any,
    options: MergeOptions
  ): void {
    const group = result.mergedData[groupName] as any;
    if (!group) {
      result.mergedData[groupName] = {};
    }
    if (!group[fieldName]) {
      group[fieldName] = {};
    }

    const existingSection = group[fieldName];
    let fieldsUpdatedInSection = 0;

    for (const [key, aiValue] of Object.entries(aiSectionData)) {
      if (this.shouldUpdateField(existingSection[key], aiValue, options)) {
        const oldValue = existingSection[key];
        existingSection[key] = this.processFieldValue(aiValue, key);
        
        result.changesApplied.push(
          `${groupName}.${fieldName}.${key}: ${this.formatValueForLog(oldValue)} → ${this.formatValueForLog(aiValue)}`
        );
        fieldsUpdatedInSection++;
      }
    }

    result.fieldsUpdated += fieldsUpdatedInSection;

    if (options.logChanges && fieldsUpdatedInSection > 0) {
      console.log(`Updated ${fieldsUpdatedInSection} fields in ${groupName}.${fieldName} section`);
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
    if (!result.mergedData.market_valuation) {
      result.mergedData.market_valuation = {};
    }

    const existingMarket = result.mergedData.market_valuation as any;
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
            `market_valuation.comparable_sales: Added ${processedComparables.length} comparables from AI`
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
          `market_valuation.${field}: ${this.formatValueForLog(oldValue)} → ${this.formatValueForLog(aiMarketData[field])}`
        );
        fieldsUpdatedInSection++;
      }
    }

    result.fieldsUpdated += fieldsUpdatedInSection;

    if (options.logChanges && fieldsUpdatedInSection > 0) {
      console.log(`Updated ${fieldsUpdatedInSection} fields in market_valuation section`);
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
    if (!result.mergedData.property_assessment) {
      result.mergedData.property_assessment = {};
    }
    const propertyAssessment = result.mergedData.property_assessment as any;
    const existingBuildings = propertyAssessment.buildings_improvements || [];

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
        propertyAssessment.buildings_improvements = processedBuildings;
        result.fieldsUpdated += processedBuildings.length;
        result.changesApplied.push(
          `property_assessment.buildings_improvements: Added ${processedBuildings.length} buildings from AI extraction`
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
        if (!result.mergedData[section as keyof GroupWizardData]) {
          result.mergedData[section as keyof GroupWizardData] = {};
        }
        
        const sectionData = result.mergedData[section as keyof GroupWizardData] as any;
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
      this.mergeSection(result, 'location_mapping', 'location_details', generalData.location_details, options);
    }

    // Handle building data
    if (generalData.building_details) {
      if (!result.mergedData.property_assessment) {
        result.mergedData.property_assessment = {};
      }
      const propertyAssessment = result.mergedData.property_assessment as any;
      if (!propertyAssessment.buildings_improvements || propertyAssessment.buildings_improvements.length === 0) {
        propertyAssessment.buildings_improvements = [{
          id: Date.now().toString(),
          ...generalData.building_details
        }];
        result.fieldsUpdated++;
        result.changesApplied.push('property_assessment.buildings_improvements: Added from legacy general data');
      }
    }
  }

  /**
   * Validate merged data
   */
  static validateMergedData(data: Partial<GroupWizardData>): string[] {
    const errors: string[] = [];

    // Basic validation rules for GroupWizardData structure
    if (data.document_processing?.property_identification) {
      const prop = data.document_processing.property_identification;
      if (prop.extent_perches && prop.extent_perches <= 0) {
        errors.push('Extent in perches must be positive');
      }
    }

    if (data.location_mapping?.location_details) {
      const loc = data.location_mapping.location_details as any;
      if (loc.latitude && (loc.latitude < 5.9 || loc.latitude > 9.9)) {
        errors.push('Latitude appears to be outside Sri Lanka bounds');
      }
      if (loc.longitude && (loc.longitude < 79.6 || loc.longitude > 81.9)) {
        errors.push('Longitude appears to be outside Sri Lanka bounds');
      }
    }

    if (data.property_assessment?.buildings_improvements && Array.isArray(data.property_assessment.buildings_improvements)) {
      data.property_assessment.buildings_improvements.forEach((building, index) => {
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

  /**
   * Helper method to merge data to a specific group and field
   */
  private static mergeToGroup(
    result: MergeResult,
    groupName: keyof GroupWizardData,
    fieldName: string,
    aiData: any,
    options: MergeOptions
  ): void {
    const group = result.mergedData[groupName] as any;
    if (!group[fieldName]) {
      group[fieldName] = {};
    }

    let fieldsUpdatedInGroup = 0;
    Object.keys(aiData).forEach(key => {
      const aiValue = aiData[key];
      if (aiValue !== null && aiValue !== undefined && aiValue !== '') {
        if (options.overwriteEmptyFields || !group[fieldName][key]) {
          group[fieldName][key] = aiValue;
          fieldsUpdatedInGroup++;
          result.changesApplied.push(`${groupName}.${fieldName}.${key}: ${aiValue}`);
        }
      }
    });

    result.fieldsUpdated += fieldsUpdatedInGroup;
    console.log(`  ✅ ${groupName}.${fieldName}: ${fieldsUpdatedInGroup} fields updated`);
  }

  /**
   * Merge location details to location_mapping group
   */
  private static mergeLocationData(
    result: MergeResult,
    locationData: any,
    options: MergeOptions
  ): void {
    const locationGroup = result.mergedData.location_mapping as any;
    let fieldsUpdated = 0;

    // Initialize location_details structure
    if (!locationGroup.location_details) {
      locationGroup.location_details = {};
    }
    if (!locationGroup.location_details.coordinates) {
      locationGroup.location_details.coordinates = {};
    }
    if (!locationGroup.location_details.components) {
      locationGroup.location_details.components = {};
    }

    const locationDetails = locationGroup.location_details;

    // Map coordinate fields to location_details.coordinates
    if (locationData.latitude && (options.overwriteEmptyFields || !locationDetails.coordinates.latitude)) {
      locationDetails.coordinates.latitude = locationData.latitude;
      fieldsUpdated++;
      result.changesApplied.push(`location_mapping.location_details.coordinates.latitude: ${locationData.latitude}`);
    }
    if (locationData.longitude && (options.overwriteEmptyFields || !locationDetails.coordinates.longitude)) {
      locationDetails.coordinates.longitude = locationData.longitude;
      fieldsUpdated++;
      result.changesApplied.push(`location_mapping.location_details.coordinates.longitude: ${locationData.longitude}`);
    }

    // Map address fields to location_details.components
    const componentMap = {
      street: 'street',
      city: 'city', 
      district: 'district',
      province: 'province',
      postal_code: 'postal_code'
    };

    Object.entries(componentMap).forEach(([aiField, targetField]) => {
      if (locationData[aiField] && (options.overwriteEmptyFields || !locationDetails.components[targetField])) {
        locationDetails.components[targetField] = locationData[aiField];
        fieldsUpdated++;
        result.changesApplied.push(`location_mapping.location_details.components.${targetField}: ${locationData[aiField]}`);
      }
    });

    // Map additional fields directly to location_details
    const directFieldMap = {
      district: 'district',
      province: 'province',
      gn_division: 'gn_division',
      ds_division: 'ds_division',
      road_access: 'road_access',
      road_width: 'road_width',
      nearest_landmark: 'nearest_landmark',
      directions: 'directions',
      public_transport: 'public_transport',
      distance_to_town: 'distance_to_town',
      distance_to_colombo: 'distance_to_colombo',
      nearest_railway_station: 'nearest_railway_station'
    };

    Object.entries(directFieldMap).forEach(([aiField, targetField]) => {
      if (locationData[aiField] && (options.overwriteEmptyFields || !locationDetails[targetField])) {
        locationDetails[targetField] = locationData[aiField];
        fieldsUpdated++;
        result.changesApplied.push(`location_mapping.location_details.${targetField}: ${locationData[aiField]}`);
      }
    });

    // Handle formatted_address if present
    if (locationData.formatted_address && (options.overwriteEmptyFields || !locationDetails.formatted_address)) {
      locationDetails.formatted_address = locationData.formatted_address;
      fieldsUpdated++;
      result.changesApplied.push(`location_mapping.location_details.formatted_address: ${locationData.formatted_address}`);
    }

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ location_mapping.location_details: ${fieldsUpdated} fields updated`);
  }

  /**
   * Merge property identification with extent calculations
   */
  private static mergePropertyIdentificationData(
    result: MergeResult,
    propertyData: any,
    options: MergeOptions
  ): void {
    const docGroup = result.mergedData.document_processing as any;
    if (!docGroup.property_identification) {
      docGroup.property_identification = {};
    }

    const propertyId = docGroup.property_identification;
    let fieldsUpdated = 0;

    // Direct field mapping
    const directFields = [
      'lot_number', 'plan_number', 'plan_date', 'surveyor_name', 
      'licensed_surveyor_number', 'land_name', 'property_name',
      'extent_local', 'ownership_type'
    ];

    directFields.forEach(field => {
      if (propertyData[field] && (options.overwriteEmptyFields || !propertyId[field])) {
        propertyId[field] = propertyData[field];
        fieldsUpdated++;
        result.changesApplied.push(`document_processing.property_identification.${field}: ${propertyData[field]}`);
      }
    });

    // Handle extent fields with calculations
    if (propertyData.extent_perches && (options.overwriteEmptyFields || !propertyId.extent_perches)) {
      const perches = parseFloat(propertyData.extent_perches);
      if (!isNaN(perches)) {
        propertyId.extent_perches = perches;
        fieldsUpdated++;
        result.changesApplied.push(`document_processing.property_identification.extent_perches: ${perches}`);

        // Calculate extent_sqm (1 perch = 25.293 square meters)
        const sqm = Math.round(perches * 25.293 * 100) / 100; // Round to 2 decimal places
        if (options.overwriteEmptyFields || !propertyId.extent_sqm) {
          propertyId.extent_sqm = sqm;
          fieldsUpdated++;
          result.changesApplied.push(`document_processing.property_identification.extent_sqm: ${sqm} (calculated)`);
        }

        // Calculate extent_acres (1 perch = 1/160 acres)
        const acres = Math.round((perches / 160) * 10000) / 10000; // Round to 4 decimal places
        if (options.overwriteEmptyFields || !propertyId.extent_acres) {
          propertyId.extent_acres = acres;
          fieldsUpdated++;
          result.changesApplied.push(`document_processing.property_identification.extent_acres: ${acres} (calculated)`);
        }
      }
    }

    // Handle extent_sqm if provided directly (and calculate others)
    if (propertyData.extent_sqm && !propertyId.extent_perches && (options.overwriteEmptyFields || !propertyId.extent_sqm)) {
      const sqm = parseFloat(propertyData.extent_sqm);
      if (!isNaN(sqm)) {
        propertyId.extent_sqm = sqm;
        fieldsUpdated++;
        result.changesApplied.push(`document_processing.property_identification.extent_sqm: ${sqm}`);

        // Calculate perches and acres from sqm
        const perches = Math.round((sqm / 25.293) * 100) / 100;
        const acres = Math.round((sqm / 4046.86) * 10000) / 10000;

        if (options.overwriteEmptyFields || !propertyId.extent_perches) {
          propertyId.extent_perches = perches;
          fieldsUpdated++;
          result.changesApplied.push(`document_processing.property_identification.extent_perches: ${perches} (calculated)`);
        }

        if (options.overwriteEmptyFields || !propertyId.extent_acres) {
          propertyId.extent_acres = acres;
          fieldsUpdated++;
          result.changesApplied.push(`document_processing.property_identification.extent_acres: ${acres} (calculated)`);
        }
      }
    }

    // Handle boundaries object
    if (propertyData.boundaries && (options.overwriteEmptyFields || !propertyId.boundaries)) {
      propertyId.boundaries = { ...propertyId.boundaries, ...propertyData.boundaries };
      const boundaryCount = Object.keys(propertyData.boundaries).length;
      fieldsUpdated += boundaryCount;
      result.changesApplied.push(`document_processing.property_identification.boundaries: ${boundaryCount} boundaries updated`);
    }

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ document_processing.property_identification: ${fieldsUpdated} fields updated`);
  }

  /**
   * Merge site characteristics to property_assessment group
   */
  private static mergeSiteData(
    result: MergeResult,
    siteData: any,
    options: MergeOptions
  ): void {
    const propertyGroup = result.mergedData.property_assessment as any;
    if (!propertyGroup.site_information) {
      propertyGroup.site_information = {};
    }

    let fieldsUpdated = 0;
    Object.keys(siteData).forEach(key => {
      const value = siteData[key];
      if (value !== null && value !== undefined && value !== '') {
        if (options.overwriteEmptyFields || !propertyGroup.site_information[key]) {
          propertyGroup.site_information[key] = value;
          fieldsUpdated++;
          result.changesApplied.push(`property_assessment.site_information.${key}: ${value}`);
        }
      }
    });

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ property_assessment.site_information: ${fieldsUpdated} fields updated`);
  }

  /**
   * Merge building improvements to property_assessment group
   */
  private static mergeBuildingData(
    result: MergeResult,
    buildingData: any,
    options: MergeOptions
  ): void {
    const propertyGroup = result.mergedData.property_assessment as any;
    if (!propertyGroup.buildings) {
      propertyGroup.buildings = [];
    }

    let fieldsUpdated = 0;
    if (Array.isArray(buildingData) && buildingData.length > 0) {
      // Take the first building from AI data
      const firstBuilding = buildingData[0];
      
      if (propertyGroup.buildings.length === 0) {
        propertyGroup.buildings.push({ id: Date.now().toString(), ...firstBuilding });
        fieldsUpdated += Object.keys(firstBuilding).length;
        result.changesApplied.push(`property_assessment.buildings[0]: Added building from AI`);
      }
    }

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ property_assessment.buildings: ${fieldsUpdated} fields updated`);
  }

  /**
   * Merge market analysis to market_valuation group
   */
  private static mergeMarketAnalysisData(
    result: MergeResult,
    marketData: any,
    options: MergeOptions
  ): void {
    const marketGroup = result.mergedData.market_valuation as any;
    if (!marketGroup.analysis) {
      marketGroup.analysis = {};
    }

    let fieldsUpdated = 0;
    Object.keys(marketData).forEach(key => {
      const value = marketData[key];
      if (value !== null && value !== undefined && value !== '') {
        if (options.overwriteEmptyFields || !marketGroup.analysis[key]) {
          marketGroup.analysis[key] = value;
          fieldsUpdated++;
          result.changesApplied.push(`market_valuation.analysis.${key}: ${value}`);
        }
      }
    });

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ market_valuation.analysis: ${fieldsUpdated} fields updated`);
  }

  /**
   * Merge report information to report_finalization group
   */
  private static mergeReportInfo(
    result: MergeResult,
    reportData: any,
    options: MergeOptions
  ): void {
    const reportGroup = result.mergedData.report_finalization as any;
    if (!reportGroup.report_info) {
      reportGroup.report_info = {};
    }

    let fieldsUpdated = 0;
    Object.keys(reportData).forEach(key => {
      const value = reportData[key];
      if (value !== null && value !== undefined && value !== '') {
        if (options.overwriteEmptyFields || !reportGroup.report_info[key]) {
          reportGroup.report_info[key] = value;
          fieldsUpdated++;
          result.changesApplied.push(`report_finalization.report_info.${key}: ${value}`);
        }
      }
    });

    result.fieldsUpdated += fieldsUpdated;
    console.log(`  ✅ report_finalization.report_info: ${fieldsUpdated} fields updated`);
  }
}

/**
 * Hook for using smart data merger in React components
 */
export const useSmartDataMerger = () => {
  const mergeAiData = (existingData: Partial<GroupWizardData>, aiData: any, options?: Partial<MergeOptions>) => {
    return SmartDataMerger.mergeAiData(existingData, aiData, options);
  };

  const validateData = (data: Partial<GroupWizardData>) => {
    return SmartDataMerger.validateMergedData(data);
  };

  return {
    mergeAiData,
    validateData
  };
};

// Export types for TypeScript support
export type { MergeOptions, MergeResult };