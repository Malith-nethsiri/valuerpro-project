// Components Index - Main export file for all components

// UI Components (Atomic)
export * from './ui';

// Feature Components (Business Logic)
export * from './features';

// Form Components
export * from './forms';

// Layout Components
export * from './layout';

// Wizard Components (keep existing structure)
export { default as WizardInitializer } from './wizard/WizardInitializer';
export { default as WizardLayout } from './wizard/WizardLayout';
export { default as WizardProvider } from './wizard/WizardProvider';

// Providers
export { default as ClientProviders } from './providers/ClientProviders';

// Wizard Steps
export { default as ReportInfoStep } from './wizard/steps/ReportInfoStep';
export { default as IdentificationStep } from './wizard/steps/IdentificationStep';
export { default as LocationStep } from './wizard/steps/LocationStep';
export { default as SiteStep } from './wizard/steps/SiteStep';
export { default as BuildingsStep } from './wizard/steps/BuildingsStep';
export { default as UtilitiesStep } from './wizard/steps/UtilitiesStep';
export { default as PlanningStep } from './wizard/steps/PlanningStep';
export { default as TransportStep } from './wizard/steps/TransportStep';
export { default as EnvironmentalStep } from './wizard/steps/EnvironmentalStep';
export { default as MarketAnalysisStep } from './wizard/steps/MarketAnalysisStep';
export { default as LocalityStep } from './wizard/steps/LocalityStep';
export { default as ValuationStep } from './wizard/steps/ValuationStep';
export { default as LegalStep } from './wizard/steps/LegalStep';
export { default as AppendicesStep } from './wizard/steps/AppendicesStep';
export { default as ReviewStep } from './wizard/steps/ReviewStep';