import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { ReportWizardData } from '@/types';
import { reportsAPI } from '@/lib/api';
import { SmartDataMerger } from '@/utils/smartDataMerger';

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
    transport: {},
    environmental: {},
    market: {},
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
  populateFromAiAnalysis: (aiAnalysis: any) => void;
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
  editMode?: boolean;
  reportId?: string;
}

export const WizardProvider = ({ children, editMode = false, reportId }: WizardProviderProps) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Load existing report data when in edit mode
  useEffect(() => {
    if (editMode && reportId && !state.reportId) {
      loadReport(reportId);
    }
  }, [editMode, reportId]);

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
    if (step >= 0 && step < 15 && canGoToStep(step)) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const nextStep = () => {
    if (state.currentStep < 14) {
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
        
      case 7: // Transport & Access
        if (isEmpty(data.transport.road_type)) {
          errors.push('Road type is required');
        }
        if (isEmpty(data.transport.road_condition)) {
          errors.push('Road condition assessment is required');
        }
        if (!validateNumber(data.transport.road_width, 0)) {
          errors.push('Valid road width is required');
        }
        if (isEmpty(data.transport.accessibility_rating)) {
          errors.push('Overall accessibility rating is required');
        }
        break;
        
      case 8: // Environmental Factors
        if (isEmpty(data.environmental.nbro_clearance)) {
          errors.push('NBRO clearance status is required');
        }
        if (isEmpty(data.environmental.environmental_impact)) {
          errors.push('Environmental impact assessment is required');
        }
        break;
        
      case 9: // Market Analysis
        if (isEmpty(data.market.market_summary)) {
          errors.push('Market analysis summary is required');
        }
        // Validate comparable sales if any exist
        if (data.market.comparable_sales && data.market.comparable_sales.length > 0) {
          data.market.comparable_sales.forEach((comp: any, index: number) => {
            if (isEmpty(comp.address)) {
              errors.push(`Comparable ${index + 1}: Address is required`);
            }
            if (!validateNumber(comp.sale_price, 1)) {
              errors.push(`Comparable ${index + 1}: Valid sale price is required`);
            }
            if (!validateNumber(comp.land_extent, 0.01)) {
              errors.push(`Comparable ${index + 1}: Valid land extent is required`);
            }
          });
        }
        break;
        
      case 10: // Locality
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
        
      case 11: // Valuation
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
        
      case 12: // Legal
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
        
      case 13: // Appendices
        const hasFiles = data.appendices.files && data.appendices.files.length > 0;
        const hasPhotos = data.appendices.photos && data.appendices.photos.length > 0;
        if (!hasFiles && !hasPhotos) {
          errors.push('At least one supporting document or photograph is required');
        }
        break;
        
      case 14: // Review
        // Validate that all previous steps are complete
        for (let i = 0; i < 14; i++) {
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
    
    for (let i = 0; i < 15; i++) {
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
      // Load report basic info
      const report = await reportsAPI.getById(reportId);
      
      // Load related data in parallel
      const [properties, files, ocrResults] = await Promise.all([
        reportsAPI.getProperties(reportId).catch(() => []),
        reportsAPI.getFiles(reportId).catch(() => []),
        reportsAPI.getOcrResults(reportId).catch(() => [])
      ]);

      // Process property data for identification and location
      const primaryProperty = properties?.[0];
      const identification = primaryProperty ? {
        lot_number: primaryProperty.identification?.lot_number || '',
        plan_number: primaryProperty.identification?.plan_number || '',
        extent_perches: primaryProperty.identification?.extent_perches || 0,
        extent_local: primaryProperty.identification?.extent_local || '',
        surveyor_name: primaryProperty.identification?.surveyor_name || '',
        survey_date: primaryProperty.identification?.survey_date || '',
        boundaries: primaryProperty.identification?.boundaries || {}
      } : state.data.identification;

      const location = primaryProperty ? {
        address: primaryProperty.location?.address || '',
        district: primaryProperty.location?.district || '',
        province: primaryProperty.location?.province || '',
        gn_division: primaryProperty.location?.gn_division || '',
        ds_division: primaryProperty.location?.ds_division || '',
        village: primaryProperty.location?.village || '',
        postal_code: primaryProperty.location?.postal_code || '',
        coordinates: primaryProperty.location?.coordinates || null,
        directions: primaryProperty.location?.directions || '',
        distance_to_town: primaryProperty.location?.distance_to_town || ''
      } : state.data.location;

      // Extract buildings data
      const buildings = primaryProperty?.buildings || state.data.buildings;

      // Extract site data
      const site = primaryProperty ? {
        area: primaryProperty.site?.area || 0,
        frontage: primaryProperty.site?.frontage || 0,
        depth: primaryProperty.site?.depth || 0,
        shape: primaryProperty.site?.shape || '',
        topography: primaryProperty.site?.topography || '',
        soil_type: primaryProperty.site?.soil_type || '',
        drainage: primaryProperty.site?.drainage || '',
        access_road: primaryProperty.site?.access_road || '',
        access_quality: primaryProperty.site?.access_quality || '',
        special_features: primaryProperty.site?.special_features || ''
      } : state.data.site;

      // Extract utilities data
      const utilities = primaryProperty ? {
        electricity: primaryProperty.utilities?.electricity || '',
        water: primaryProperty.utilities?.water || '',
        telecom: primaryProperty.utilities?.telecom || '',
        drainage: primaryProperty.utilities?.drainage || '',
        gas: primaryProperty.utilities?.gas || '',
        cable_tv: primaryProperty.utilities?.cable_tv || ''
      } : state.data.utilities;

      // Load valuation data from report
      let valuationData = state.data.valuation;
      if (report.valuation_summary) {
        valuationData = {
          lines: report.valuation_lines || [],
          summary: {
            market_value: report.valuation_summary.market_value,
            market_value_words: report.valuation_summary.market_value_words,
            forced_sale_value: report.valuation_summary.forced_sale_value
          }
        };
      }

      // Process files for appendices
      const appendices = {
        files: files || [],
        photos: files?.filter(f => f.mime_type?.startsWith('image/')) || [],
        documents: files?.filter(f => f.mime_type === 'application/pdf') || []
      };

      // Transform backend data to wizard format
      const wizardData: ReportWizardData = {
        reportInfo: {
          ref: report.ref,
          purpose: report.purpose,
          client_id: report.client_id,
          report_date: report.report_date,
          inspection_date: report.inspection_date,
          basis_of_value: report.basis_of_value,
          currency: report.currency,
          fsv_percentage: report.fsv_percentage
        },
        identification,
        location,
        site,
        buildings,
        utilities,
        planning: primaryProperty?.planning || state.data.planning,
        locality: primaryProperty?.locality || state.data.locality,
        valuation: valuationData,
        legal: primaryProperty?.legal || state.data.legal,
        appendices,
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

  // Helper function to populate from comprehensive AI data
  const populateFromComprehensiveData = (comprehensiveData: any): void => {
    console.log('Populating from comprehensive AI data:', comprehensiveData);
    
    // 1. Populate Identification Step
    if (comprehensiveData.identification) {
      const identification = comprehensiveData.identification;
      const identificationUpdate: any = {};
      
      if (identification.lot_number) identificationUpdate.lot_number = identification.lot_number;
      if (identification.plan_number) identificationUpdate.plan_number = identification.plan_number;
      if (identification.plan_date) identificationUpdate.plan_date = identification.plan_date;
      if (identification.surveyor_name) identificationUpdate.surveyor_name = identification.surveyor_name;
      if (identification.licensed_surveyor_number) identificationUpdate.licensed_surveyor_number = identification.licensed_surveyor_number;
      if (identification.land_name) identificationUpdate.land_name = identification.land_name;
      if (identification.extent_perches) identificationUpdate.extent_perches = identification.extent_perches;
      if (identification.extent_sqm) identificationUpdate.extent_sqm = identification.extent_sqm;
      if (identification.extent_local) identificationUpdate.extent_local = identification.extent_local;
      if (identification.boundaries) identificationUpdate.boundaries = identification.boundaries;
      if (identification.title_owner) identificationUpdate.title_owner = identification.title_owner;
      if (identification.deed_no) identificationUpdate.deed_no = identification.deed_no;
      if (identification.deed_date) identificationUpdate.deed_date = identification.deed_date;
      if (identification.notary) identificationUpdate.notary = identification.notary;
      if (identification.interest) identificationUpdate.interest = identification.interest;
      
      if (Object.keys(identificationUpdate).length > 0) {
        updateStepData('identification', identificationUpdate);
      }
    }

    // 2. Populate Location Step
    if (comprehensiveData.location) {
      const location = comprehensiveData.location;
      const locationUpdate: any = {};
      
      if (location.address) locationUpdate.address = location.address;
      if (location.gn_division) locationUpdate.gn_division = location.gn_division;
      if (location.ds_division) locationUpdate.ds_division = location.ds_division;
      if (location.district) locationUpdate.district = location.district;
      if (location.province) locationUpdate.province = location.province;
      if (location.latitude) locationUpdate.latitude = location.latitude;
      if (location.longitude) locationUpdate.longitude = location.longitude;
      if (location.road_access) locationUpdate.road_access = location.road_access;
      if (location.road_width) locationUpdate.road_width = location.road_width;
      if (location.nearest_landmark) locationUpdate.nearest_landmark = location.nearest_landmark;
      if (location.directions) locationUpdate.directions = location.directions;
      if (location.public_transport) locationUpdate.public_transport = location.public_transport;
      if (location.distance_to_town) locationUpdate.distance_to_town = location.distance_to_town;
      if (location.distance_to_colombo) locationUpdate.distance_to_colombo = location.distance_to_colombo;
      if (location.nearest_railway_station) locationUpdate.nearest_railway_station = location.nearest_railway_station;
      
      if (Object.keys(locationUpdate).length > 0) {
        updateStepData('location', locationUpdate);
      }
    }

    // 3. Populate Site Step
    if (comprehensiveData.site) {
      const site = comprehensiveData.site;
      const siteUpdate: any = {};
      
      if (site.shape) siteUpdate.shape = site.shape;
      if (site.frontage) siteUpdate.frontage = site.frontage;
      if (site.depth) siteUpdate.depth = site.depth;
      if (site.aspect) siteUpdate.aspect = site.aspect;
      if (site.topography) siteUpdate.topography = site.topography;
      if (site.gradient) siteUpdate.gradient = site.gradient;
      if (site.level_relative_to_road) siteUpdate.level_relative_to_road = site.level_relative_to_road;
      if (site.elevation_difference) siteUpdate.elevation_difference = site.elevation_difference;
      if (site.soil_type) siteUpdate.soil_type = site.soil_type;
      if (site.drainage) siteUpdate.drainage = site.drainage;
      if (site.flood_risk) siteUpdate.flood_risk = site.flood_risk;
      if (site.bearing_capacity) siteUpdate.bearing_capacity = site.bearing_capacity;
      if (site.soil_notes) siteUpdate.soil_notes = site.soil_notes;
      if (site.site_features) siteUpdate.site_features = site.site_features;
      if (site.other_features) siteUpdate.other_features = site.other_features;
      if (site.noise_level) siteUpdate.noise_level = site.noise_level;
      if (site.air_quality) siteUpdate.air_quality = site.air_quality;
      if (site.environmental_issues) siteUpdate.environmental_issues = site.environmental_issues;
      if (site.pedestrian_access) siteUpdate.pedestrian_access = site.pedestrian_access;
      if (site.vehicle_access) siteUpdate.vehicle_access = site.vehicle_access;
      if (site.access_notes) siteUpdate.access_notes = site.access_notes;
      
      if (Object.keys(siteUpdate).length > 0) {
        updateStepData('site', siteUpdate);
      }
    }

    // 4. Populate Buildings Step
    if (comprehensiveData.buildings && Array.isArray(comprehensiveData.buildings)) {
      const buildings = comprehensiveData.buildings
        .filter((building: any) => building.type || building.floor_area)
        .map((building: any, index: number) => ({
          id: Date.now().toString() + index,
          type: building.type || '',
          use: building.use || '',
          floor_area: building.floor_area || 0,
          construction_year: building.construction_year || new Date().getFullYear(),
          construction_type: building.construction_type || '',
          roof_type: building.roof_type || '',
          wall_type: building.wall_type || '',
          floor_type: building.floor_type || '',
          condition: building.condition || '',
          stories: building.stories || 1,
          description: building.description || ''
        }));
      
      if (buildings.length > 0) {
        updateStepData('buildings', buildings);
      }
    }

    // 5. Populate Utilities Step
    if (comprehensiveData.utilities) {
      const utilities = comprehensiveData.utilities;
      const utilitiesUpdate: any = {};
      
      if (utilities.electricity) utilitiesUpdate.electricity = utilities.electricity;
      if (utilities.water) utilitiesUpdate.water = utilities.water;
      if (utilities.telecom) utilitiesUpdate.telecom = utilities.telecom;
      if (utilities.sewerage) utilitiesUpdate.sewerage = utilities.sewerage;
      if (utilities.drainage) utilitiesUpdate.drainage = utilities.drainage;
      
      if (Object.keys(utilitiesUpdate).length > 0) {
        updateStepData('utilities', utilitiesUpdate);
      }
    }

    // 6. Populate Locality Step
    if (comprehensiveData.locality) {
      const locality = comprehensiveData.locality;
      const localityUpdate: any = {};
      
      if (locality.neighborhood_character) localityUpdate.neighborhood_character = locality.neighborhood_character;
      if (locality.development_stage) localityUpdate.development_stage = locality.development_stage;
      if (locality.property_types) localityUpdate.property_types = locality.property_types;
      if (locality.commercial_activities) localityUpdate.commercial_activities = locality.commercial_activities;
      if (locality.schools) localityUpdate.schools = locality.schools;
      if (locality.hospitals) localityUpdate.hospitals = locality.hospitals;
      if (locality.banks) localityUpdate.banks = locality.banks;
      if (locality.markets) localityUpdate.markets = locality.markets;
      if (locality.religious_places) localityUpdate.religious_places = locality.religious_places;
      if (locality.recreational_facilities) localityUpdate.recreational_facilities = locality.recreational_facilities;
      if (locality.security_situation) localityUpdate.security_situation = locality.security_situation;
      if (locality.future_development) localityUpdate.future_development = locality.future_development;
      
      if (Object.keys(localityUpdate).length > 0) {
        updateStepData('locality', localityUpdate);
      }
    }

    // 7. Populate Planning Step
    if (comprehensiveData.planning) {
      const planning = comprehensiveData.planning;
      const planningUpdate: any = {};
      
      if (planning.zoning) planningUpdate.zoning = planning.zoning;
      if (planning.permitted_uses) planningUpdate.permitted_uses = planning.permitted_uses;
      if (planning.building_height_limit) planningUpdate.building_height_limit = planning.building_height_limit;
      if (planning.setback_requirements) planningUpdate.setback_requirements = planning.setback_requirements;
      if (planning.floor_area_ratio) planningUpdate.floor_area_ratio = planning.floor_area_ratio;
      if (planning.coverage_ratio) planningUpdate.coverage_ratio = planning.coverage_ratio;
      if (planning.special_conditions) planningUpdate.special_conditions = planning.special_conditions;
      
      if (Object.keys(planningUpdate).length > 0) {
        updateStepData('planning', planningUpdate);
      }
    }

    // 8. Populate Transport Step
    if (comprehensiveData.transport) {
      const transport = comprehensiveData.transport;
      const transportUpdate: any = {};
      
      if (transport.road_type) transportUpdate.road_type = transport.road_type;
      if (transport.road_condition) transportUpdate.road_condition = transport.road_condition;
      if (transport.road_width) transportUpdate.road_width = transport.road_width;
      if (transport.access_quality) transportUpdate.access_quality = transport.access_quality;
      if (transport.public_transport_available) transportUpdate.public_transport_available = transport.public_transport_available;
      if (transport.parking_availability) transportUpdate.parking_availability = transport.parking_availability;
      if (transport.accessibility_rating) transportUpdate.accessibility_rating = transport.accessibility_rating;
      if (transport.transport_impact) transportUpdate.transport_impact = transport.transport_impact;
      if (transport.transport_notes) transportUpdate.transport_notes = transport.transport_notes;
      
      if (Object.keys(transportUpdate).length > 0) {
        updateStepData('transport', transportUpdate);
      }
    }

    // 9. Populate Environmental Step
    if (comprehensiveData.environmental) {
      const environmental = comprehensiveData.environmental;
      const environmentalUpdate: any = {};
      
      if (environmental.nbro_clearance) environmentalUpdate.nbro_clearance = environmental.nbro_clearance;
      if (environmental.landslide_risk) environmentalUpdate.landslide_risk = environmental.landslide_risk;
      if (environmental.flood_risk) environmentalUpdate.flood_risk = environmental.flood_risk;
      if (environmental.climate_zone) environmentalUpdate.climate_zone = environmental.climate_zone;
      if (environmental.air_quality) environmentalUpdate.air_quality = environmental.air_quality;
      if (environmental.noise_levels) environmentalUpdate.noise_levels = environmental.noise_levels;
      if (environmental.environmental_impact) environmentalUpdate.environmental_impact = environmental.environmental_impact;
      if (environmental.natural_hazards) environmentalUpdate.natural_hazards = environmental.natural_hazards;
      if (environmental.environmental_restrictions) environmentalUpdate.environmental_restrictions = environmental.environmental_restrictions;
      if (environmental.environmental_notes) environmentalUpdate.environmental_notes = environmental.environmental_notes;
      
      if (Object.keys(environmentalUpdate).length > 0) {
        updateStepData('environmental', environmentalUpdate);
      }
    }

    // 10. Populate Market Analysis Step
    if (comprehensiveData.market) {
      const market = comprehensiveData.market;
      const marketUpdate: any = {};
      
      if (market.comparable_sales) marketUpdate.comparable_sales = market.comparable_sales;
      if (market.rental_comparables) marketUpdate.rental_comparables = market.rental_comparables;
      if (market.market_trends) marketUpdate.market_trends = market.market_trends;
      if (market.price_analysis) marketUpdate.price_analysis = market.price_analysis;
      if (market.market_influences) marketUpdate.market_influences = market.market_influences;
      if (market.market_summary) marketUpdate.market_summary = market.market_summary;
      
      if (Object.keys(marketUpdate).length > 0) {
        updateStepData('market', marketUpdate);
      }
    }

    // 11. Populate Legal Step
    if (comprehensiveData.legal) {
      const legal = comprehensiveData.legal;
      const legalUpdate: any = {};
      
      if (legal.ownership_type) legalUpdate.ownership_type = legal.ownership_type;
      if (legal.encumbrances) legalUpdate.encumbrances = legal.encumbrances;
      if (legal.restrictions) legalUpdate.restrictions = legal.restrictions;
      if (legal.easements) legalUpdate.easements = legal.easements;
      if (legal.pending_litigation) legalUpdate.pending_litigation = legal.pending_litigation;
      if (legal.statutory_approvals) legalUpdate.statutory_approvals = legal.statutory_approvals;
      
      if (Object.keys(legalUpdate).length > 0) {
        updateStepData('legal', legalUpdate);
      }
    }
  };

  const populateFromAiAnalysis = (aiAnalysis: any): void => {
    if (!aiAnalysis) return;
    
    try {
      // Use expert-level smart data merger
      const mergeResult = SmartDataMerger.mergeAiData(
        state.data,
        aiAnalysis,
        {
          preserveUserData: true,
          overwriteEmptyFields: true,
          validateData: true,
          logChanges: true
        }
      );

      // Apply merged data
      if (mergeResult.fieldsUpdated > 0) {
        dispatch({ type: 'SET_DATA', payload: mergeResult.mergedData });
        
        // Log success
        console.log(`🚀 AI Analysis Complete: ${mergeResult.fieldsUpdated} fields populated across all wizard steps!`);
        console.log('📋 Changes applied:', mergeResult.changesApplied);
        
        if (mergeResult.validationErrors.length > 0) {
          console.warn('⚠️ Validation warnings:', mergeResult.validationErrors);
        }

        // Mark wizard as dirty for auto-save
        dispatch({ type: 'SET_DIRTY', payload: true });
      } else {
        console.log('ℹ️ No new data to populate from AI analysis');
      }

      return;
      
    } catch (error) {
      console.error('❌ Smart data merge failed, falling back to legacy method:', error);
    }
    
    // Fallback to legacy method
    const comprehensiveData = aiAnalysis.document_analysis?.comprehensive_data || 
                              aiAnalysis.comprehensive_data || 
                              null;
    
    if (comprehensiveData && !comprehensiveData.error) {
      // Use the comprehensive extraction format
      console.log('Using comprehensive AI data extraction (fallback):', comprehensiveData);
      populateFromComprehensiveData(comprehensiveData);
      console.log('Comprehensive AI analysis data has been populated across all wizard steps!');
      return;
    }
    
    // Legacy format fallback
    if (!aiAnalysis.document_analysis) return;

    const analysis = aiAnalysis.document_analysis;
    const extractedData = analysis.extracted_data || {};
    const generalData = analysis.general_data || {};
    const documentType = analysis.document_type;

    // 1. Populate Identification Step
    if (extractedData || generalData) {
      const identificationData: any = {};

      // From survey plans
      if (documentType === 'survey_plan' && extractedData) {
        identificationData.lot_number = extractedData.lot_number;
        identificationData.plan_number = extractedData.plan_number;
        identificationData.plan_date = extractedData.plan_date;
        identificationData.surveyor_name = extractedData.surveyor_name;
        identificationData.extent_perches = extractedData.extent_perches;
        identificationData.extent_local = extractedData.extent;
        if (extractedData.boundaries) {
          identificationData.boundaries = extractedData.boundaries;
        }
      }

      // From deeds
      if (documentType === 'deed' && extractedData) {
        identificationData.title_owner = extractedData.parties?.purchaser || extractedData.parties?.vendor;
        identificationData.deed_no = extractedData.deed_number;
        identificationData.deed_date = extractedData.deed_date;
        identificationData.notary = extractedData.notary_attorney;
      }

      // From general data
      if (generalData.owner_name) identificationData.title_owner = generalData.owner_name;
      
      updateStepData('identification', identificationData);
    }

    // 2. Populate Location Step
    if (generalData.location_details || extractedData.location || generalData.property_address) {
      const locationData: any = {};
      
      const locationDetails = generalData.location_details || extractedData.location || {};
      
      locationData.address = generalData.property_address || extractedData.property_address;
      locationData.village = locationDetails.village;
      locationData.gn_division = locationDetails.grama_niladhari_division;
      locationData.ds_division = locationDetails.divisional_secretariat;
      locationData.district = locationDetails.district;
      locationData.province = locationDetails.province;
      locationData.postal_code = locationDetails.postal_code;

      // Coordinates from survey plans
      if (extractedData.coordinates) {
        locationData.coordinates = {
          latitude: extractedData.coordinates.latitude,
          longitude: extractedData.coordinates.longitude
        };
      }

      updateStepData('location', locationData);
    }

    // 3. Populate Site Step
    if (generalData.site_features || generalData.access_details) {
      const siteData: any = {};
      
      const siteFeatures = generalData.site_features || {};
      const accessDetails = generalData.access_details || {};
      
      siteData.topography = siteFeatures.topography;
      siteData.soil_type = siteFeatures.soil_type;
      siteData.drainage = siteFeatures.drainage;
      siteData.access_road = accessDetails.road_type;
      siteData.access_quality = accessDetails.road_width;
      siteData.special_features = siteFeatures.special_features?.join(', ');

      updateStepData('site', siteData);
    }

    // 4. Populate Buildings Step
    if (generalData.building_details) {
      const buildingData: any = {};
      const buildingDetails = generalData.building_details;
      
      buildingData.type = buildingDetails.type;
      buildingData.floors = buildingDetails.floors;
      buildingData.area = buildingDetails.area;
      buildingData.construction_year = buildingDetails.construction_year;
      buildingData.construction_material = buildingDetails.construction_material;
      buildingData.condition = buildingDetails.condition;

      updateStepData('buildings', buildingData);
    }

    // 5. Populate Utilities Step
    if (generalData.utilities) {
      const utilitiesData: any = {};
      const utilities = generalData.utilities;
      
      utilitiesData.electricity = utilities.electricity ? 'available' : 'not_available';
      utilitiesData.water = utilities.water ? 'available' : 'not_available';
      utilitiesData.telecom = utilities.telephone ? 'available' : 'not_available';
      utilitiesData.drainage = utilities.drainage ? 'available' : 'not_available';
      utilitiesData.gas = utilities.gas ? 'available' : 'not_available';
      utilitiesData.cable_tv = utilities.internet ? 'available' : 'not_available';

      updateStepData('utilities', utilitiesData);
    }

    // 6. Populate Locality Step
    if (generalData.nearby_amenities || generalData.landmarks) {
      const localityData: any = {};
      
      const amenities = generalData.nearby_amenities || {};
      
      localityData.nearest_school = amenities.schools?.[0];
      localityData.nearest_hospital = amenities.hospitals?.[0];
      localityData.nearest_bank = amenities.banks?.[0];
      localityData.nearest_market = amenities.markets?.[0];
      localityData.nearest_landmark = generalData.landmarks?.[0];

      updateStepData('locality', localityData);
    }

    // 7. Populate Legal Step
    if (generalData.legal_status || extractedData.encumbrances) {
      const legalData: any = {};
      
      const legalStatus = generalData.legal_status || {};
      
      legalData.ownership_type = legalStatus.ownership_type;
      legalData.encumbrances = legalStatus.encumbrances || extractedData.encumbrances;
      legalData.restrictions = legalStatus.restrictions || extractedData.conditions;

      updateStepData('legal', legalData);
    }

    console.log('AI analysis data has been populated across wizard steps');
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
    populateFromAiAnalysis,
    saveStepData,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};