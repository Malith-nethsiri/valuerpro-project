/**
 * Zustand store for ValuerPro 15-step wizard state management
 * Provides centralized state management with persistence and validation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { 
  ReportData, 
  PropertyInfo, 
  LocationData, 
  AIAnalysis,
  UploadedFile,
  PropertyDetails,
  ValuationData,
  MarketAnalysis,
  Comparable
} from '../types';

// Wizard step definitions
export const WIZARD_STEPS = [
  'report_info',
  'client_info',
  'property_identification',
  'location_analysis',
  'file_upload',
  'ocr_processing',
  'ai_analysis',
  'property_details',
  'improvements',
  'environmental',
  'market_analysis',
  'comparables',
  'valuation',
  'review',
  'finalize'
] as const;

export type WizardStep = typeof WIZARD_STEPS[number];

export interface ValidationError {
  field: string;
  message: string;
  step: WizardStep;
}

export interface StepValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface WizardProgress {
  currentStep: WizardStep;
  currentStepIndex: number;
  completedSteps: WizardStep[];
  totalSteps: number;
  progressPercentage: number;
}

export interface WizardState {
  // Progress tracking
  progress: WizardProgress;
  
  // Data for each step
  reportData: ReportData;
  
  // UI state
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // AI-populated fields tracking across all steps
  aiPopulatedFields: Record<WizardStep, Set<string>>;
  
  // Validation
  stepValidations: Record<WizardStep, StepValidation>;
  globalErrors: string[];
  
  // Navigation history for undo/redo
  history: ReportData[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Actions
  actions: {
    // Navigation
    goToStep: (step: WizardStep) => void;
    nextStep: () => boolean;
    previousStep: () => void;
    jumpToStep: (step: WizardStep) => boolean;
    
    // Data management
    updateReportData: <K extends keyof ReportData>(
      key: K, 
      data: Partial<ReportData[K]>
    ) => void;
    
    bulkUpdateData: (data: Partial<ReportData>) => void;
    clearData: () => void;
    resetStep: (step: WizardStep) => void;
    
    // Validation
    validateStep: (step: WizardStep) => StepValidation;
    validateAllSteps: () => boolean;
    clearValidationErrors: (step?: WizardStep) => void;
    
    // State management
    saveProgress: () => Promise<void>;
    loadProgress: (reportId?: string) => Promise<void>;
    markSaved: () => void;
    markUnsaved: () => void;
    
    // History management
    pushToHistory: () => void;
    undo: () => boolean;
    redo: () => boolean;
    clearHistory: () => void;
    
    // AI field tracking
    markFieldAsAIPopulated: (step: WizardStep, fieldPath: string) => void;
    markFieldsAsAIPopulated: (step: WizardStep, fieldPaths: string[]) => void;
    clearAIPopulatedFields: (step?: WizardStep) => void;
    isFieldAIPopulated: (step: WizardStep, fieldPath: string) => boolean;
    getAIPopulatedFields: (step: WizardStep) => Set<string>;
    
    // Utility
    getStepData: <T>(step: WizardStep) => T | undefined;
    isStepComplete: (step: WizardStep) => boolean;
    getCompletionPercentage: () => number;
    canNavigateToStep: (step: WizardStep) => boolean;
  };
}

// Default validation state
const defaultValidation: StepValidation = {
  isValid: false,
  errors: [],
  warnings: []
};

// Create default step validations
const createDefaultValidations = (): Record<WizardStep, StepValidation> => {
  return WIZARD_STEPS.reduce((acc, step) => {
    acc[step] = { ...defaultValidation };
    return acc;
  }, {} as Record<WizardStep, StepValidation>);
};

// Create default AI-populated fields tracking
const createDefaultAIFields = (): Record<WizardStep, Set<string>> => {
  return WIZARD_STEPS.reduce((acc, step) => {
    acc[step] = new Set<string>();
    return acc;
  }, {} as Record<WizardStep, Set<string>>);
};

// Validation functions for each step
const stepValidators = {
  report_info: (data: ReportData): StepValidation => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    
    if (!data.property_info?.lot_number) {
      errors.push({
        field: 'lot_number',
        message: 'Lot number is required',
        step: 'report_info'
      });
    }
    
    if (!data.property_info?.plan_number) {
      errors.push({
        field: 'plan_number',
        message: 'Plan number is required',
        step: 'report_info'
      });
    }
    
    if (data.property_info?.extent && !data.property_info.extent.match(/\d+(\.\d+)?\s*(perches|acres|sqm)/i)) {
      warnings.push('Extent format may not be standard');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  client_info: (data: ReportData): StepValidation => {
    const errors: ValidationError[] = [];
    
    // Client validation would go here
    // For now, assume it's valid if any client data exists
    
    return {
      isValid: true,
      errors,
      warnings: []
    };
  },
  
  property_identification: (data: ReportData): StepValidation => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    
    if (!data.property_info?.boundaries) {
      errors.push({
        field: 'boundaries',
        message: 'Property boundaries are required',
        step: 'property_identification'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  location_analysis: (data: ReportData): StepValidation => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    
    if (!data.location_data?.coordinates) {
      errors.push({
        field: 'coordinates',
        message: 'Property coordinates are required',
        step: 'location_analysis'
      });
    }
    
    if (!data.location_data?.formatted_address) {
      warnings.push('Property address could be more detailed');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  // Add validators for other steps...
  file_upload: () => ({ isValid: true, errors: [], warnings: [] }),
  ocr_processing: () => ({ isValid: true, errors: [], warnings: [] }),
  ai_analysis: () => ({ isValid: true, errors: [], warnings: [] }),
  property_details: () => ({ isValid: true, errors: [], warnings: [] }),
  improvements: () => ({ isValid: true, errors: [], warnings: [] }),
  environmental: () => ({ isValid: true, errors: [], warnings: [] }),
  market_analysis: () => ({ isValid: true, errors: [], warnings: [] }),
  comparables: () => ({ isValid: true, errors: [], warnings: [] }),
  valuation: (data: ReportData): StepValidation => {
    const errors: ValidationError[] = [];
    
    if (!data.valuation?.total_value || data.valuation.total_value <= 0) {
      errors.push({
        field: 'total_value',
        message: 'Valid total valuation is required',
        step: 'valuation'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  },
  review: () => ({ isValid: true, errors: [], warnings: [] }),
  finalize: () => ({ isValid: true, errors: [], warnings: [] })
};

// Enable Immer MapSet plugin for Set object support
enableMapSet();

export const useWizardStore = create<WizardState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      progress: {
        currentStep: 'report_info',
        currentStepIndex: 0,
        completedSteps: [],
        totalSteps: WIZARD_STEPS.length,
        progressPercentage: 0
      },
      
      reportData: {},
      
      isLoading: false,
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      
      aiPopulatedFields: createDefaultAIFields(),
      
      stepValidations: createDefaultValidations(),
      globalErrors: [],
      
      history: [{}],
      historyIndex: 0,
      maxHistorySize: 50,
      
      actions: {
        goToStep: (step: WizardStep) => {
          const stepIndex = WIZARD_STEPS.indexOf(step);
          if (stepIndex === -1) return;
          
          set((state) => {
            state.progress.currentStep = step;
            state.progress.currentStepIndex = stepIndex;
            state.progress.progressPercentage = Math.round((stepIndex / (WIZARD_STEPS.length - 1)) * 100);
          });
        },
        
        nextStep: () => {
          const { progress, actions } = get();
          const currentIndex = progress.currentStepIndex;
          
          // Validate current step first
          const validation = actions.validateStep(progress.currentStep);
          if (!validation.isValid) {
            return false;
          }
          
          if (currentIndex < WIZARD_STEPS.length - 1) {
            const nextStep = WIZARD_STEPS[currentIndex + 1];
            actions.goToStep(nextStep);
            
            set((state) => {
              if (!state.progress.completedSteps.includes(progress.currentStep)) {
                state.progress.completedSteps.push(progress.currentStep);
              }
              state.hasUnsavedChanges = true;
            });
            
            return true;
          }
          return false;
        },
        
        previousStep: () => {
          const { progress, actions } = get();
          const currentIndex = progress.currentStepIndex;
          
          if (currentIndex > 0) {
            const previousStep = WIZARD_STEPS[currentIndex - 1];
            actions.goToStep(previousStep);
          }
        },
        
        jumpToStep: (step: WizardStep) => {
          const { actions } = get();
          
          if (!actions.canNavigateToStep(step)) {
            return false;
          }
          
          actions.goToStep(step);
          return true;
        },
        
        updateReportData: (key, data) => {
          set((state) => {
            if (!state.reportData[key]) {
              state.reportData[key] = {} as any;
            }
            Object.assign(state.reportData[key], data);
            state.hasUnsavedChanges = true;
          });
          
          // Push to history after update
          get().actions.pushToHistory();
        },
        
        bulkUpdateData: (data) => {
          set((state) => {
            Object.assign(state.reportData, data);
            state.hasUnsavedChanges = true;
          });
          
          get().actions.pushToHistory();
        },
        
        clearData: () => {
          set((state) => {
            state.reportData = {};
            state.progress = {
              currentStep: 'report_info',
              currentStepIndex: 0,
              completedSteps: [],
              totalSteps: WIZARD_STEPS.length,
              progressPercentage: 0
            };
            state.stepValidations = createDefaultValidations();
            state.aiPopulatedFields = createDefaultAIFields();
            state.hasUnsavedChanges = true;
          });
        },
        
        resetStep: (step: WizardStep) => {
          set((state) => {
            const stepKey = step.replace('_', '') as keyof ReportData;
            if (state.reportData[stepKey]) {
              delete state.reportData[stepKey];
            }
            
            state.stepValidations[step] = { ...defaultValidation };
            state.aiPopulatedFields[step] = new Set<string>();
            state.hasUnsavedChanges = true;
            
            // Remove from completed steps
            state.progress.completedSteps = state.progress.completedSteps.filter(s => s !== step);
          });
        },
        
        validateStep: (step: WizardStep) => {
          const { reportData } = get();
          const validator = stepValidators[step];
          const validation = validator(reportData);
          
          set((state) => {
            state.stepValidations[step] = validation;
          });
          
          return validation;
        },
        
        validateAllSteps: () => {
          const { actions } = get();
          let allValid = true;
          
          for (const step of WIZARD_STEPS) {
            const validation = actions.validateStep(step);
            if (!validation.isValid) {
              allValid = false;
            }
          }
          
          return allValid;
        },
        
        clearValidationErrors: (step?: WizardStep) => {
          set((state) => {
            if (step) {
              state.stepValidations[step] = { ...defaultValidation };
            } else {
              state.stepValidations = createDefaultValidations();
              state.globalErrors = [];
            }
          });
        },
        
        saveProgress: async () => {
          set((state) => {
            state.isSaving = true;
          });
          
          try {
            // Here you would call your API to save progress
            // await api.saveReportProgress(get().reportData);
            
            set((state) => {
              state.lastSaved = new Date();
              state.hasUnsavedChanges = false;
              state.isSaving = false;
            });
          } catch (error) {
            set((state) => {
              state.isSaving = false;
              state.globalErrors.push('Failed to save progress. Please try again.');
            });
          }
        },
        
        loadProgress: async (reportId?: string) => {
          set((state) => {
            state.isLoading = true;
          });
          
          try {
            // Here you would call your API to load progress
            // const data = await api.loadReportProgress(reportId);
            
            set((state) => {
              // state.reportData = data;
              state.hasUnsavedChanges = false;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.globalErrors.push('Failed to load report data.');
            });
          }
        },
        
        markSaved: () => {
          set((state) => {
            state.hasUnsavedChanges = false;
            state.lastSaved = new Date();
          });
        },
        
        markUnsaved: () => {
          set((state) => {
            state.hasUnsavedChanges = true;
          });
        },
        
        pushToHistory: () => {
          const { reportData, history, historyIndex, maxHistorySize } = get();
          
          set((state) => {
            // Remove any history after current index (for redo functionality)
            state.history = state.history.slice(0, state.historyIndex + 1);
            
            // Add current state to history
            state.history.push(JSON.parse(JSON.stringify(reportData)));
            
            // Limit history size
            if (state.history.length > maxHistorySize) {
              state.history = state.history.slice(-maxHistorySize);
            }
            
            state.historyIndex = state.history.length - 1;
          });
        },
        
        undo: () => {
          const { history, historyIndex } = get();
          
          if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            
            set((state) => {
              state.reportData = JSON.parse(JSON.stringify(previousState));
              state.historyIndex = historyIndex - 1;
              state.hasUnsavedChanges = true;
            });
            
            return true;
          }
          
          return false;
        },
        
        redo: () => {
          const { history, historyIndex } = get();
          
          if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            
            set((state) => {
              state.reportData = JSON.parse(JSON.stringify(nextState));
              state.historyIndex = historyIndex + 1;
              state.hasUnsavedChanges = true;
            });
            
            return true;
          }
          
          return false;
        },
        
        clearHistory: () => {
          set((state) => {
            state.history = [JSON.parse(JSON.stringify(state.reportData))];
            state.historyIndex = 0;
          });
        },
        
        markFieldAsAIPopulated: (step: WizardStep, fieldPath: string) => {
          set((state) => {
            // Create a new Set with the existing fields plus the new one
            const existingFields = Array.from(state.aiPopulatedFields[step]);
            state.aiPopulatedFields[step] = new Set([...existingFields, fieldPath]);
          });
        },
        
        markFieldsAsAIPopulated: (step: WizardStep, fieldPaths: string[]) => {
          set((state) => {
            // Create a new Set with all existing fields plus new ones
            const existingFields = Array.from(state.aiPopulatedFields[step]);
            const allFields = [...new Set([...existingFields, ...fieldPaths])];
            state.aiPopulatedFields[step] = new Set(allFields);
          });
        },
        
        clearAIPopulatedFields: (step?: WizardStep) => {
          set((state) => {
            if (step) {
              state.aiPopulatedFields[step] = new Set<string>();
            } else {
              state.aiPopulatedFields = createDefaultAIFields();
            }
          });
        },
        
        isFieldAIPopulated: (step: WizardStep, fieldPath: string) => {
          const { aiPopulatedFields } = get();
          return aiPopulatedFields[step]?.has(fieldPath) || false;
        },
        
        getAIPopulatedFields: (step: WizardStep) => {
          const { aiPopulatedFields } = get();
          return aiPopulatedFields[step] || new Set<string>();
        },
        
        getStepData: <T>(step: WizardStep): T | undefined => {
          const { reportData } = get();
          const stepKey = step.replace('_', '') as keyof ReportData;
          return reportData[stepKey] as T;
        },
        
        isStepComplete: (step: WizardStep) => {
          const { progress, stepValidations } = get();
          return progress.completedSteps.includes(step) && stepValidations[step].isValid;
        },
        
        getCompletionPercentage: () => {
          const { progress } = get();
          return progress.progressPercentage;
        },
        
        canNavigateToStep: (step: WizardStep) => {
          const { progress, actions } = get();
          const stepIndex = WIZARD_STEPS.indexOf(step);
          const currentIndex = progress.currentStepIndex;
          
          // Can always go back
          if (stepIndex < currentIndex) {
            return true;
          }
          
          // Can go forward only if previous steps are complete
          if (stepIndex === currentIndex + 1) {
            return actions.isStepComplete(progress.currentStep);
          }
          
          // Can jump to step if all previous steps are complete
          for (let i = 0; i < stepIndex; i++) {
            if (!actions.isStepComplete(WIZARD_STEPS[i])) {
              return false;
            }
          }
          
          return true;
        }
      }
    })),
    {
      name: 'valuerpro-wizard-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        reportData: state.reportData,
        progress: state.progress,
        stepValidations: state.stepValidations,
        lastSaved: state.lastSaved,
        // Convert Sets to arrays for serialization
        aiPopulatedFields: Object.keys(state.aiPopulatedFields).reduce((acc, step) => {
          acc[step as WizardStep] = Array.from(state.aiPopulatedFields[step as WizardStep]);
          return acc;
        }, {} as Record<WizardStep, string[]>)
      }),
      // Handle deserialization of AI fields arrays back to Sets
      onRehydrateStorage: () => (state) => {
        if (state) {
          const aiFields = state.aiPopulatedFields as any;
          if (aiFields && typeof aiFields === 'object') {
            const newAIFields = createDefaultAIFields();
            Object.keys(aiFields).forEach(step => {
              if (Array.isArray(aiFields[step])) {
                newAIFields[step as WizardStep] = new Set(aiFields[step]);
              }
            });
            state.aiPopulatedFields = newAIFields;
          }
        }
      }
    }
  )
);

// Convenience hooks for specific functionality
export const useWizardProgress = () => {
  return useWizardStore((state) => state.progress);
};

export const useWizardActions = () => {
  return useWizardStore((state) => state.actions);
};

export const useWizardValidation = () => {
  return useWizardStore((state) => ({
    stepValidations: state.stepValidations,
    globalErrors: state.globalErrors,
    validateStep: state.actions.validateStep,
    validateAllSteps: state.actions.validateAllSteps,
    clearValidationErrors: state.actions.clearValidationErrors
  }));
};

export const useWizardData = () => {
  return useWizardStore((state) => ({
    reportData: state.reportData,
    updateReportData: state.actions.updateReportData,
    bulkUpdateData: state.actions.bulkUpdateData,
    getStepData: state.actions.getStepData
  }));
};

export const useWizardPersistence = () => {
  return useWizardStore((state) => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    hasUnsavedChanges: state.hasUnsavedChanges,
    saveProgress: state.actions.saveProgress,
    loadProgress: state.actions.loadProgress,
    markSaved: state.actions.markSaved,
    markUnsaved: state.actions.markUnsaved
  }));
};

export const useWizardHistory = () => {
  return useWizardStore((state) => ({
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    undo: state.actions.undo,
    redo: state.actions.redo,
    clearHistory: state.actions.clearHistory
  }));
};

export const useWizardAIFields = () => {
  return useWizardStore((state) => ({
    aiPopulatedFields: state.aiPopulatedFields,
    markFieldAsAIPopulated: state.actions.markFieldAsAIPopulated,
    markFieldsAsAIPopulated: state.actions.markFieldsAsAIPopulated,
    clearAIPopulatedFields: state.actions.clearAIPopulatedFields,
    isFieldAIPopulated: state.actions.isFieldAIPopulated,
    getAIPopulatedFields: state.actions.getAIPopulatedFields
  }));
};