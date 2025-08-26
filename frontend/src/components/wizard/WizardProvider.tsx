import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { ReportWizardData } from '@/types';
import { reportsAPI } from '@/lib/api';

interface WizardState {
  currentStep: number;
  data: ReportWizardData;
  reportId: string | null;
  isLoading: boolean;
  errors: Record<string, string[]>;
  isDirty: boolean;
}

type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_DATA'; payload: Partial<ReportWizardData> }
  | { type: 'SET_REPORT_ID'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: Record<string, string[]> }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'RESET_WIZARD' }
  | { type: 'UPDATE_STEP_DATA'; payload: { step: keyof ReportWizardData; data: any } };

const initialState: WizardState = {
  currentStep: 0,
  data: {
    reportInfo: {},
    identification: {},
    location: {},
    site: {},
    buildings: [],
    utilities: {},
    planning: {},
    locality: {},
    valuation: {
      lines: [],
      summary: {},
    },
    legal: {},
    appendices: {
      files: [],
      photos: [],
    },
    review: {},
  },
  reportId: null,
  isLoading: false,
  errors: {},
  isDirty: false,
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
      
    case 'SET_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.payload },
        isDirty: true,
      };
      
    case 'UPDATE_STEP_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.step]: {
            ...state.data[action.payload.step],
            ...action.payload.data,
          },
        },
        isDirty: true,
      };
      
    case 'SET_REPORT_ID':
      return { ...state, reportId: action.payload };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
      
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
      
    case 'RESET_WIZARD':
      return initialState;
      
    default:
      return state;
  }
};

interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateStepData: (step: keyof ReportWizardData, data: any) => void;
  validateStep: (step: number) => string[];
  canGoToStep: (step: number) => boolean;
  getStepCompletion: () => boolean[];
  saveReport: () => Promise<void>;
  loadReport: (reportId: string) => Promise<void>;
  createReport: () => Promise<string>;
  saveStepData: (step: keyof ReportWizardData, data: any) => Promise<void>;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

interface WizardProviderProps {
  children: ReactNode;
}

export const WizardProvider = ({ children }: WizardProviderProps) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Auto-save debounce timer
  useEffect(() => {
    let saveTimer: NodeJS.Timeout;
    
    if (state.isDirty && state.reportId) {
      saveTimer = setTimeout(() => {
        saveReport();
      }, 2000); // Auto-save after 2 seconds of no changes
    }

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [state.isDirty, state.data, state.reportId]);

  const goToStep = (step: number) => {
    if (step >= 0 && step < 12 && canGoToStep(step)) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const nextStep = () => {
    if (state.currentStep < 11) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
    }
  };

  const previousStep = () => {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
    }
  };

  const updateStepData = (step: keyof ReportWizardData, data: any) => {
    dispatch({ type: 'UPDATE_STEP_DATA', payload: { step, data } });
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    const { data } = state;

    // Helper function to safely check if a value exists and is not empty
    const isEmpty = (value: any): boolean => {
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '') ||
             (typeof value === 'number' && isNaN(value)) ||
             (Array.isArray(value) && value.length === 0);
    };

    // Helper to validate numeric values
    const validateNumber = (value: any, min?: number, max?: number): boolean => {
      const num = Number(value);
      if (isNaN(num)) return false;
      if (min !== undefined && num < min) return false;
      if (max !== undefined && num > max) return false;
      return true;
    };

    // Helper to validate date
    const validateDate = (dateString: any): boolean => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && date <= new Date();
    };

    switch (step) {
      case 0: // Report Info
        if (isEmpty(data.reportInfo.purpose)) {
          errors.push('Report purpose is required');
        }
        if (isEmpty(data.reportInfo.inspection_date)) {
          errors.push('Inspection date is required');
        } else if (!validateDate(data.reportInfo.inspection_date)) {
          errors.push('Invalid inspection date or date is in the future');
        }
        if (isEmpty(data.reportInfo.client_id)) {
          errors.push('Client selection is required');
        }
        if (isEmpty(data.reportInfo.currency)) {
          errors.push('Currency is required');
        }
        if (data.reportInfo.report_date && !validateDate(data.reportInfo.report_date)) {
          errors.push('Invalid report date');
        }
        break;
        
      case 1: // Identification
        if (isEmpty(data.identification.lot_number)) {
          errors.push('Lot number is required');
        }
        if (isEmpty(data.identification.plan_number)) {
          errors.push('Plan number is required');
        }
        if (!validateNumber(data.identification.extent_perches, 0.01)) {
          errors.push('Valid land extent greater than 0 is required');
        }
        if (isEmpty(data.identification.surveyor_name)) {
          errors.push('Licensed surveyor name is required');
        }
        // Validate boundaries
        const boundaries = data.identification.boundaries;
        if (!boundaries || Object.keys(boundaries).length === 0) {
          errors.push('At least one boundary description is required');
        }
        break;
        
      case 2: // Location
        if (isEmpty(data.location.district)) {
          errors.push('District is required');
        }
        if (isEmpty(data.location.province)) {
          errors.push('Province is required');
        }
        if (isEmpty(data.location.address)) {
          errors.push('Property address is required');
        }
        // Validate coordinates if provided
        if (data.location.coordinates) {
          const { latitude, longitude } = data.location.coordinates;
          if (!validateNumber(latitude, -90, 90) || !validateNumber(longitude, -180, 180)) {
            errors.push('Invalid GPS coordinates');
          }
        }
        break;
        
      case 3: // Site Description
        if (isEmpty(data.site.topography)) {
          errors.push('Site topography description is required');
        }
        if (isEmpty(data.site.soil_type)) {
          errors.push('Soil type is required');
        }
        if (isEmpty(data.site.access_quality)) {
          errors.push('Access quality assessment is required');
        }
        break;
        
      case 4: // Buildings
        if (!data.buildings || data.buildings.length === 0) {
          errors.push('At least one building must be documented (use "No Buildings" if vacant land)');
        } else {
          data.buildings.forEach((building: any, index: number) => {
            if (isEmpty(building.type)) {
              errors.push(`Building ${index + 1}: Building type is required`);
            }
            if (isEmpty(building.condition)) {
              errors.push(`Building ${index + 1}: Condition assessment is required`);
            }
            if (building.floor_area && !validateNumber(building.floor_area, 0)) {
              errors.push(`Building ${index + 1}: Invalid floor area`);
            }
          });
        }
        break;
        
      case 5: // Utilities
        if (isEmpty(data.utilities.electricity)) {
          errors.push('Electricity availability is required');
        }
        if (isEmpty(data.utilities.water)) {
          errors.push('Water supply information is required');
        }
        if (isEmpty(data.utilities.drainage)) {
          errors.push('Drainage system information is required');
        }
        if (isEmpty(data.utilities.telecom)) {
          errors.push('Telecommunication availability is required');
        }
        break;
        
      case 6: // Planning/Zoning
        if (isEmpty(data.planning.zoning_classification)) {
          errors.push('Zoning classification is required');
        }
        if (isEmpty(data.planning.development_restrictions)) {
          errors.push('Development restrictions information is required');
        }
        break;
        
      case 7: // Locality
        if (isEmpty(data.locality.area_type)) {
          errors.push('Area type classification is required');
        }
        if (isEmpty(data.locality.neighborhood_quality)) {
          errors.push('Neighborhood quality assessment is required');
        }
        if (isEmpty(data.locality.market_activity)) {
          errors.push('Market activity level is required');
        }
        break;
        
      case 8: // Valuation
        if (!data.valuation.summary.market_value || !validateNumber(data.valuation.summary.market_value, 1)) {
          errors.push('Market value must be greater than 0');
        }
        if (isEmpty(data.valuation.summary.market_value_words)) {
          errors.push('Market value in words is required');
        }
        if (data.valuation.summary.forced_sale_value) {
          if (!validateNumber(data.valuation.summary.forced_sale_value, 1)) {
            errors.push('Forced sale value must be greater than 0');
          }
          if (data.valuation.summary.forced_sale_value > data.valuation.summary.market_value) {
            errors.push('Forced sale value cannot exceed market value');
          }
        }
        // Validate valuation lines if they exist
        if (data.valuation.lines && data.valuation.lines.length > 0) {
          data.valuation.lines.forEach((line: any, index: number) => {
            if (isEmpty(line.description)) {
              errors.push(`Valuation line ${index + 1}: Description is required`);
            }
            if (!validateNumber(line.value, 0)) {
              errors.push(`Valuation line ${index + 1}: Valid value is required`);
            }
          });
        }
        break;
        
      case 9: // Legal
        if (isEmpty(data.legal.disclaimers)) {
          errors.push('Legal disclaimers are required');
        }
        if (isEmpty(data.legal.certificate)) {
          errors.push('Professional certificate is required');
        }
        if (isEmpty(data.legal.assumptions)) {
          errors.push('Valuation assumptions are required');
        }
        break;
        
      case 10: // Appendices
        const hasFiles = data.appendices.files && data.appendices.files.length > 0;
        const hasPhotos = data.appendices.photos && data.appendices.photos.length > 0;
        if (!hasFiles && !hasPhotos) {
          errors.push('At least one supporting document or photograph is required');
        }
        break;
        
      case 11: // Review
        // Validate that all previous steps are complete
        for (let i = 0; i < 11; i++) {
          const stepErrors = validateStep(i);
          if (stepErrors.length > 0) {
            errors.push(`Step ${i + 1} has validation errors that must be resolved`);
            break; // Don't overwhelm with all step errors
          }
        }
        break;
    }

    return errors;
  };

  const canGoToStep = (step: number): boolean => {
    // Allow going to previous steps or the next immediate step
    if (step <= state.currentStep + 1) return true;
    
    // Check if all previous steps are valid
    for (let i = 0; i < step; i++) {
      const errors = validateStep(i);
      if (errors.length > 0 && i < state.currentStep) return false;
    }
    
    return true;
  };

  const getStepCompletion = (): boolean[] => {
    const completion: boolean[] = [];
    
    for (let i = 0; i < 12; i++) {
      const errors = validateStep(i);
      completion.push(errors.length === 0);
    }
    
    return completion;
  };

  // API Integration Functions
  const createReport = async (): Promise<string> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const reportData = {
        ref: state.data.reportInfo.ref || `VR-${new Date().getFullYear()}-${Date.now()}`,
        purpose: state.data.reportInfo.purpose || 'Bank valuation',
        report_date: state.data.reportInfo.report_date || new Date().toISOString(),
        inspection_date: state.data.reportInfo.inspection_date || new Date().toISOString(),
        status: 'draft' as const,
        currency: state.data.reportInfo.currency || 'LKR'
      };

      const report = await reportsAPI.create(reportData);
      dispatch({ type: 'SET_REPORT_ID', payload: report.id });
      dispatch({ type: 'SET_DIRTY', payload: false });
      return report.id;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadReport = async (reportId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const report = await reportsAPI.getById(reportId);
      // Transform backend data to wizard format
      const wizardData: ReportWizardData = {
        reportInfo: {
          ref: report.ref,
          purpose: report.purpose,
          client_id: report.client_id,
          report_date: report.report_date,
          inspection_date: report.inspection_date,
          basis_of_value: report.basis_of_value,
          currency: report.currency
        },
        identification: state.data.identification, // Load from property data when available
        location: state.data.location,
        site: state.data.site,
        buildings: state.data.buildings,
        utilities: state.data.utilities,
        planning: state.data.planning,
        locality: state.data.locality,
        valuation: state.data.valuation,
        legal: state.data.legal,
        appendices: state.data.appendices,
        review: state.data.review
      };
      
      dispatch({ type: 'SET_DATA', payload: wizardData });
      dispatch({ type: 'SET_REPORT_ID', payload: reportId });
      dispatch({ type: 'SET_DIRTY', payload: false });
    } catch (error) {
      console.error('Error loading report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveReport = async (): Promise<void> => {
    if (!state.reportId) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Update report basic info
      await reportsAPI.update(state.reportId, {
        ref: state.data.reportInfo.ref,
        purpose: state.data.reportInfo.purpose,
        report_date: state.data.reportInfo.report_date,
        inspection_date: state.data.reportInfo.inspection_date,
        basis_of_value: state.data.reportInfo.basis_of_value,
        currency: state.data.reportInfo.currency,
        client_id: state.data.reportInfo.client_id
      });

      // Save valuation data if exists
      if (state.data.valuation?.summary?.market_value) {
        await reportsAPI.createValuationSummary(state.reportId, {
          market_value: state.data.valuation.summary.market_value,
          market_value_words: state.data.valuation.summary.market_value_words || '',
          forced_sale_value: state.data.valuation.summary.forced_sale_value || 0
        });
      }

      dispatch({ type: 'SET_DIRTY', payload: false });
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveStepData = async (step: keyof ReportWizardData, data: any): Promise<void> => {
    if (!state.reportId) return;

    try {
      // Save specific step data based on step type
      switch (step) {
        case 'identification':
          // Create property with identification data
          if (data.lot_number && data.plan_number) {
            await reportsAPI.createProperty(state.reportId, {
              property_type: 'land_and_building',
              identification: data
            });
          }
          break;
        case 'valuation':
          // Save valuation lines and summary
          if (data.summary?.market_value) {
            await reportsAPI.createValuationSummary(state.reportId, {
              market_value: data.summary.market_value,
              market_value_words: data.summary.market_value_words || '',
              forced_sale_value: data.summary.forced_sale_value || 0
            });
          }
          break;
        // Add other step-specific API calls as needed
      }
    } catch (error) {
      console.error(`Error saving ${step} data:`, error);
      // Don't throw - let the form continue working
    }
  };

  const value = {
    state,
    dispatch,
    goToStep,
    nextStep,
    previousStep,
    updateStepData,
    validateStep,
    canGoToStep,
    getStepCompletion,
    saveReport,
    loadReport,
    createReport,
    saveStepData,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};