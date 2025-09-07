import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type { 
  GroupState, 
  GroupAction, 
  WizardGroup, 
  GroupWizardData,
  GroupValidation
} from '@/types/groupWizard';
import { WIZARD_GROUPS } from '@/types/groupWizard';
import { reportsAPI } from '@/lib/api';
import { SmartDataMerger } from '@/utils/smartDataMerger';

interface GroupContextType extends GroupState {
  // Group navigation
  goToGroup: (group: WizardGroup) => void;
  nextGroup: () => void;
  previousGroup: () => void;
  
  // Data management
  updateGroupData: <T extends WizardGroup>(group: T, data: Partial<GroupWizardData[T]>) => void;
  bulkUpdateData: (data: Partial<GroupWizardData>) => void;
  
  // Validation
  validateGroup: (group: WizardGroup) => GroupValidation;
  validateAllGroups: () => boolean;
  
  // AI integration
  populateFromAiAnalysis: (aiAnalysis: any) => void;
  
  // Persistence
  saveReport: () => Promise<void>;
  loadReport: (reportId: string) => Promise<void>;
  createReport: () => Promise<string>;
}

const initialState: GroupState = {
  currentGroup: 'document_processing',
  groupData: {
    document_processing: {
      uploaded_files: [],
      ocr_results: [],
      ai_analysis: {},
      property_identification: {
        lot_number: '',
        plan_number: '',
        surveyor_name: '',
        extent_perches: 0,
        boundaries: {}
      },
      legal_information: {}
    },
    location_mapping: {
      location_details: {
        coordinates: {
          latitude: '',
          longitude: ''
        },
        components: {
          street: '',
          city: '',
          district: '',
          province: '',
          postal_code: ''
        },
        formatted_address: '',
        // Direct properties for compatibility
        district: '',
        province: '',
        gn_division: '',
        ds_division: '',
        road_access: '',
        road_width: '',
        nearest_landmark: '',
        directions: '',
        public_transport: '',
        distance_to_town: '',
        distance_to_colombo: '',
        nearest_railway_station: ''
      },
      google_maps: {},
      infrastructure: {
        road_access: '',
        electricity_available: false,
        water_supply_available: false,
        sewerage_available: false,
        telecommunication_coverage: ''
      }
    },
    property_assessment: {
      site_characteristics: {
        terrain: '',
        soil_type: '',
        drainage: '',
        orientation: '',
        shape: '',
        access_quality: ''
      },
      buildings_improvements: [],
      utilities_assessment: {
        electricity: { available: false, condition: '' },
        water: { source: '', quality: '', pressure: '' },
        sewerage: { type: '', condition: '' }
      },
      environmental_factors: {
        factors: [],
        restrictions: [],
        hazards: [],
        conservation_areas: [],
        noise_level: '',
        air_quality: ''
      }
    },
    market_valuation: {
      market_analysis: {},
      comparables: [],
      valuation: { lines: [], summary: {} },
      final_valuation: {
        market_value: 0,
        market_value_words: '',
        forced_sale_value: 0,
        forced_sale_percentage: 80,
        valuation_date: new Date().toISOString().split('T')[0],
        validity_period: '6 months'
      }
    },
    report_finalization: {
      report_info: {
        ref: '',
        purpose: '',
        basis_of_value: 'Market Value',
        report_type: 'Bank Valuation',
        report_date: new Date().toISOString().split('T')[0],
        inspection_date: new Date().toISOString().split('T')[0],
        currency: 'LKR'
      },
      client_info: {
        client_id: '',
        client_name: ''
      },
      review: {
        quality_checks: [],
        completeness_checks: [],
        accuracy_verification: false,
        client_requirements_met: false,
        ready_for_finalization: false
      },
      export_settings: {
        format: 'pdf',
        include_appendices: true,
        include_photos: true,
        watermark: false,
        digital_signature: true
      }
    }
  },
  groupValidations: {
    document_processing: { isValid: false, errors: [], warnings: [], completionPercentage: 0 },
    location_mapping: { isValid: false, errors: [], warnings: [], completionPercentage: 0 },
    property_assessment: { isValid: false, errors: [], warnings: [], completionPercentage: 0 },
    market_valuation: { isValid: false, errors: [], warnings: [], completionPercentage: 0 },
    report_finalization: { isValid: false, errors: [], warnings: [], completionPercentage: 0 }
  },
  isLoading: false,
  reportId: null,
  errors: {},
  isDirty: false
};

function groupReducer(state: GroupState, action: GroupAction): GroupState {
  switch (action.type) {
    case 'SET_CURRENT_GROUP':
      return { ...state, currentGroup: action.payload };
      
    case 'UPDATE_GROUP_DATA':
      return {
        ...state,
        groupData: {
          ...state.groupData,
          [action.payload.group]: {
            ...state.groupData[action.payload.group],
            ...action.payload.data
          }
        },
        isDirty: true
      };
      
    case 'SET_GROUP_VALIDATION':
      return {
        ...state,
        groupValidations: {
          ...state.groupValidations,
          [action.payload.group]: action.payload.validation
        }
      };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_REPORT_ID':
      return { ...state, reportId: action.payload };
      
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
      
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
      
    case 'RESET_GROUPS':
      return { ...initialState };
      
    default:
      return state;
  }
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

interface GroupProviderProps {
  children: ReactNode;
  reportId?: string;
}

export const GroupProvider = ({ children, reportId }: GroupProviderProps) => {
  const [state, dispatch] = useReducer(groupReducer, initialState);

  // Group navigation functions
  const goToGroup = (group: WizardGroup) => {
    dispatch({ type: 'SET_CURRENT_GROUP', payload: group });
  };

  const nextGroup = () => {
    const currentIndex = WIZARD_GROUPS.indexOf(state.currentGroup);
    if (currentIndex < WIZARD_GROUPS.length - 1) {
      dispatch({ type: 'SET_CURRENT_GROUP', payload: WIZARD_GROUPS[currentIndex + 1] });
    }
  };

  const previousGroup = () => {
    const currentIndex = WIZARD_GROUPS.indexOf(state.currentGroup);
    if (currentIndex > 0) {
      dispatch({ type: 'SET_CURRENT_GROUP', payload: WIZARD_GROUPS[currentIndex - 1] });
    }
  };

  // Data management functions
  const updateGroupData = <T extends WizardGroup>(group: T, data: Partial<GroupWizardData[T]>) => {
    dispatch({
      type: 'UPDATE_GROUP_DATA',
      payload: { group, data }
    });
  };

  const bulkUpdateData = (data: Partial<GroupWizardData>) => {
    Object.entries(data).forEach(([group, groupData]) => {
      if (groupData) {
        dispatch({
          type: 'UPDATE_GROUP_DATA',
          payload: { group: group as WizardGroup, data: groupData }
        });
      }
    });
  };

  // Validation functions
  const validateGroup = (group: WizardGroup): GroupValidation => {
    const validation: GroupValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      completionPercentage: 0
    };

    const groupData = state.groupData[group];

    switch (group) {
      case 'document_processing':
        if (!groupData.property_identification.lot_number) {
          validation.errors.push('Lot number is required');
          validation.isValid = false;
        }
        if (!groupData.property_identification.plan_number) {
          validation.errors.push('Plan number is required');
          validation.isValid = false;
        }
        if (!groupData.property_identification.surveyor_name) {
          validation.errors.push('Surveyor name is required');
          validation.isValid = false;
        }
        
        // Additional validation for extent fields
        if (groupData.property_identification.extent_perches && groupData.property_identification.extent_perches <= 0) {
          validation.errors.push('Extent in perches must be greater than zero');
          validation.isValid = false;
        }
        
        // Warnings for missing optional but important fields
        if (!groupData.property_identification.land_name && !groupData.property_identification.property_name) {
          validation.warnings.push('Consider adding land name or property name for better identification');
        }
        
        if (!groupData.property_identification.plan_date) {
          validation.warnings.push('Plan date helps verify document currency');
        }
        
        // Count completed fields for better completion percentage
        let completedFieldsDoc = 0;
        const requiredFieldsDoc = 3; // lot_number, plan_number, surveyor_name
        const optionalFieldsDoc = 6; // land_name, property_name, extent_perches, extent_sqm, extent_acres, plan_date
        
        if (groupData.property_identification.lot_number) completedFieldsDoc++;
        if (groupData.property_identification.plan_number) completedFieldsDoc++;
        if (groupData.property_identification.surveyor_name) completedFieldsDoc++;
        if (groupData.property_identification.land_name) completedFieldsDoc++;
        if (groupData.property_identification.property_name) completedFieldsDoc++;
        if (groupData.property_identification.extent_perches && groupData.property_identification.extent_perches > 0) completedFieldsDoc++;
        if (groupData.property_identification.plan_date) completedFieldsDoc++;
        
        // Calculate percentage: required fields are 70% weight, optional are 30%
        const requiredProgress = (Math.min(completedFieldsDoc, requiredFieldsDoc) / requiredFieldsDoc) * 0.7;
        const optionalProgress = (Math.max(0, completedFieldsDoc - requiredFieldsDoc) / optionalFieldsDoc) * 0.3;
        validation.completionPercentage = Math.round((requiredProgress + optionalProgress) * 100);
        break;

      case 'location_mapping':
        if (!groupData.location_details?.components?.city) {
          validation.errors.push('City is required');
          validation.isValid = false;
        }
        if (!groupData.location_details?.components?.district && !groupData.location_details?.district) {
          validation.errors.push('District is required');
          validation.isValid = false;
        }
        // Count required fields: city, district, coordinates
        let completedFields = 0;
        const totalFields = 4;
        
        if (groupData.location_details?.components?.city) completedFields++;
        if (groupData.location_details?.components?.district || groupData.location_details?.district) completedFields++;
        if (groupData.location_details?.coordinates?.latitude) completedFields++;
        if (groupData.location_details?.coordinates?.longitude) completedFields++;
        
        validation.completionPercentage = Math.round((completedFields / totalFields) * 100);
        break;

      case 'property_assessment':
        if (!groupData.site_characteristics?.terrain) {
          validation.errors.push('Terrain description is required');
          validation.isValid = false;
        }
        validation.completionPercentage = Math.round(
          (Object.values(groupData.site_characteristics || {}).filter(v => v && v !== '').length / 6) * 100
        );
        break;

      case 'market_valuation':
        if (!groupData.final_valuation?.market_value || groupData.final_valuation.market_value <= 0) {
          validation.errors.push('Market value must be greater than zero');
          validation.isValid = false;
        }
        validation.completionPercentage = (groupData.final_valuation?.market_value || 0) > 0 ? 100 : 0;
        break;

      case 'report_finalization':
        if (!groupData.report_info?.purpose) {
          validation.errors.push('Report purpose is required');
          validation.isValid = false;
        }
        if (!groupData.client_info?.client_id) {
          validation.errors.push('Client selection is required');
          validation.isValid = false;
        }
        validation.completionPercentage = Math.round(
          ((groupData.report_info?.purpose ? 1 : 0) + (groupData.client_info?.client_id ? 1 : 0)) / 2 * 100
        );
        break;
    }

    return validation;
  };

  // Separate function to validate and update state
  const validateAndUpdateGroup = (group: WizardGroup) => {
    const validation = validateGroup(group);
    dispatch({
      type: 'SET_GROUP_VALIDATION',
      payload: { group, validation }
    });
    return validation;
  };

  const validateAllGroups = (): boolean => {
    let allValid = true;
    WIZARD_GROUPS.forEach(group => {
      const validation = validateAndUpdateGroup(group);
      if (!validation.isValid) {
        allValid = false;
      }
    });
    return allValid;
  };

  // AI integration
  const populateFromAiAnalysis = (aiAnalysis: any): void => {
    if (!aiAnalysis) return;
    
    try {
      console.log('🚀 Populating groups from AI analysis...');
      
      // Use SmartDataMerger to process the AI data
      const mergeResult = SmartDataMerger.mergeAiData(
        state.groupData,
        aiAnalysis,
        {
          preserveUserData: true,
          overwriteEmptyFields: true,
          validateData: true,
          logChanges: true
        }
      );

      if (mergeResult.fieldsUpdated > 0) {
        // Apply the merged data across all groups
        bulkUpdateData(mergeResult.mergedData as Partial<GroupWizardData>);
        
        console.log(`✅ AI Analysis Complete: ${mergeResult.fieldsUpdated} fields populated across all groups!`);
        console.log('📋 Changes applied:', mergeResult.changesApplied);
      } else {
        console.log('ℹ️ No new data to populate from AI analysis');
      }

    } catch (error) {
      console.error('❌ AI data population failed:', error);
    }
  };

  // Persistence functions
  const createReport = async (): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const reportData = {
        ref: state.groupData.report_finalization.report_info.ref || `VR-${new Date().getFullYear()}-${Date.now()}`,
        purpose: state.groupData.report_finalization.report_info.purpose || 'Bank valuation',
        report_date: state.groupData.report_finalization.report_info.report_date,
        inspection_date: state.groupData.report_finalization.report_info.inspection_date,
        status: 'draft' as const,
        currency: state.groupData.report_finalization.report_info.currency || 'LKR'
      };

      const report = await reportsAPI.create(reportData);
      dispatch({ type: 'SET_REPORT_ID', payload: report.id });
      
      console.log('✅ Group-based report created:', report.id);
      return report.id;
      
    } catch (error) {
      console.error('❌ Failed to create group-based report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveReport = async (): Promise<void> => {
    if (!state.reportId) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Save report data to backend
      await reportsAPI.update(state.reportId, {
        ref: state.groupData.report_finalization.report_info.ref,
        purpose: state.groupData.report_finalization.report_info.purpose,
        report_date: state.groupData.report_finalization.report_info.report_date,
        inspection_date: state.groupData.report_finalization.report_info.inspection_date,
        currency: state.groupData.report_finalization.report_info.currency,
        client_id: state.groupData.report_finalization.client_info.client_id
      });

      dispatch({ type: 'SET_DIRTY', payload: false });
      console.log('✅ Group-based report saved successfully');
      
    } catch (error) {
      console.error('❌ Failed to save group-based report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadReport = async (reportId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const report = await reportsAPI.get(reportId);
      
      // Transform backend data to group format
      // This is a simplified version - in practice, you'd map all the data
      const groupData: Partial<GroupWizardData> = {
        report_finalization: {
          ...state.groupData.report_finalization,
          report_info: {
            ...state.groupData.report_finalization.report_info,
            ref: report.ref || '',
            purpose: report.purpose || '',
            report_date: report.report_date || '',
            inspection_date: report.inspection_date || '',
            currency: report.currency || 'LKR'
          },
          client_info: {
            ...state.groupData.report_finalization.client_info,
            client_id: report.client_id || ''
          }
        }
      };

      bulkUpdateData(groupData);
      dispatch({ type: 'SET_REPORT_ID', payload: reportId });
      dispatch({ type: 'SET_DIRTY', payload: false });
      
      console.log('✅ Group-based report loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load group-based report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Initialize with reportId if provided (prevent infinite loops)
  useEffect(() => {
    if (reportId && !state.reportId && reportId !== state.reportId) {
      console.log('🔄 Loading existing report:', reportId);
      loadReport(reportId);
    }
  }, [reportId]); // Removed loadReport from dependencies to prevent infinite loops

  const value: GroupContextType = {
    ...state,
    goToGroup,
    nextGroup,
    previousGroup,
    updateGroupData,
    bulkUpdateData,
    validateGroup: validateAndUpdateGroup,
    validateAllGroups,
    populateFromAiAnalysis,
    saveReport,
    loadReport,
    createReport
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};