'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProvider } from '@/components/wizard/WizardProvider';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { WizardInitializer } from '@/components/wizard/WizardInitializer';
import { ReportInfoStep } from '@/components/wizard/steps/ReportInfoStep';
import { IdentificationStep } from '@/components/wizard/steps/IdentificationStep';
import { LocationStep } from '@/components/wizard/steps/LocationStep';
import { SiteStep } from '@/components/wizard/steps/SiteStep';
import { BuildingsStep } from '@/components/wizard/steps/BuildingsStep';
import { UtilitiesStep } from '@/components/wizard/steps/UtilitiesStep';
import { PlanningStep } from '@/components/wizard/steps/PlanningStep';
import { TransportStep } from '@/components/wizard/steps/TransportStep';
import { EnvironmentalStep } from '@/components/wizard/steps/EnvironmentalStep';
import { MarketAnalysisStep } from '@/components/wizard/steps/MarketAnalysisStep';
import { LocalityStep } from '@/components/wizard/steps/LocalityStep';
import { ValuationStep } from '@/components/wizard/steps/ValuationStep';
import { LegalStep } from '@/components/wizard/steps/LegalStep';
import { AppendicesStep } from '@/components/wizard/steps/AppendicesStep';
import { ReviewStep } from '@/components/wizard/steps/ReviewStep';
import { useAuth } from '@/lib/auth';
import { reportsAPI } from '@/lib/api';

const wizardSteps = [
  {
    id: 'report-info',
    title: 'Report Info',
    description: 'Purpose, client, dates, reference',
    completed: false,
    current: true,
  },
  {
    id: 'identification',
    title: 'Identification & Title',
    description: 'Lot, plan, surveyor, boundaries',
    completed: false,
    current: false,
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Address, coordinates, directions',
    completed: false,
    current: false,
  },
  {
    id: 'site',
    title: 'Site Description',
    description: 'Shape, soil, features, accessibility',
    completed: false,
    current: false,
  },
  {
    id: 'buildings',
    title: 'Buildings',
    description: 'Type, area, materials, condition',
    completed: false,
    current: false,
  },
  {
    id: 'utilities',
    title: 'Utilities',
    description: 'Electricity, water, telecom, drainage',
    completed: false,
    current: false,
  },
  {
    id: 'planning',
    title: 'Planning/Zoning',
    description: 'Zoning, restrictions, easements',
    completed: false,
    current: false,
  },
  {
    id: 'transport',
    title: 'Transport & Access',
    description: 'Roads, public transport, connectivity',
    completed: false,
    current: false,
  },
  {
    id: 'environmental',
    title: 'Environmental Factors',
    description: 'NBRO, hazards, climate, clearances',
    completed: false,
    current: false,
  },
  {
    id: 'market',
    title: 'Market Analysis',
    description: 'Comparables, trends, pricing',
    completed: false,
    current: false,
  },
  {
    id: 'locality',
    title: 'Locality',
    description: 'Market context, neighborhood',
    completed: false,
    current: false,
  },
  {
    id: 'valuation',
    title: 'Valuation',
    description: 'Rates, calculations, values',
    completed: false,
    current: false,
  },
  {
    id: 'legal',
    title: 'Disclaimers',
    description: 'Legal text, certificates',
    completed: false,
    current: false,
  },
  {
    id: 'appendices',
    title: 'Appendices',
    description: 'Maps, photos, documents',
    completed: false,
    current: false,
  },
  {
    id: 'review',
    title: 'Review & Generate',
    description: 'Final review and export',
    completed: false,
    current: false,
  },
];

const CreateReportWizard = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update wizard steps with completion status
  const [steps, setSteps] = useState(wizardSteps);
  const [currentStep, setCurrentStep] = useState(0);

  // Handle authentication redirect
  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const updateStepCompletion = (stepIndex: number, completed: boolean) => {
    setSteps(prev => prev.map((step, index) => ({
      ...step,
      completed: index < stepIndex || completed,
      current: index === stepIndex
    })));
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or the next step
    if (stepIndex <= currentStep + 1) {
      setCurrentStep(stepIndex);
      updateStepCompletion(stepIndex, false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateStepCompletion(nextStep, false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateStepCompletion(prevStep, false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // The save functionality is now handled by the WizardProvider
      // Auto-save will handle the persistence
      console.log('Step data saved automatically');
      
      // Mark current step as completed
      updateStepCompletion(currentStep, true);
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canGoNext = () => {
    // Import validation function
    const { validateWizardStep } = require('@/lib/validation');
    
    // Get current step ID
    const currentStepId = steps[currentStep]?.id;
    if (!currentStepId) return false;

    // Get step data from wizard state
    const stepDataMap = {
      'report-info': 'reportInfo',
      'identification': 'identification', 
      'location': 'location',
      'site': 'site',
      'buildings': 'buildings',
      'utilities': 'utilities',
      'planning': 'planning',
      'transport': 'transport',
      'environmental': 'environmental',
      'market': 'market',
      'locality': 'locality',
      'valuation': 'valuation',
      'legal': 'legal',
      'appendices': 'appendices',
      'review': 'review'
    };

    const dataKey = stepDataMap[currentStepId as keyof typeof stepDataMap];
    if (!dataKey) return true; // Allow navigation for steps without validation rules
    
    // This would need to access the wizard state - for now return true but structure is in place
    // In a real implementation, we'd get the state from WizardProvider
    return true;
  };

  const canGoPrevious = () => {
    return currentStep > 0;
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <ReportInfoStep />;
      case 1:
        return <IdentificationStep />;
      case 2:
        return <LocationStep />;
      case 3:
        return <SiteStep />;
      case 4:
        return <BuildingsStep />;
      case 5:
        return <UtilitiesStep />;
      case 6:
        return <PlanningStep />;
      case 7:
        return <TransportStep />;
      case 8:
        return <EnvironmentalStep />;
      case 9:
        return <MarketAnalysisStep />;
      case 10:
        return <LocalityStep />;
      case 11:
        return <ValuationStep />;
      case 12:
        return <LegalStep />;
      case 13:
        return <AppendicesStep />;
      case 14:
        return <ReviewStep />;
      default:
        return <ReportInfoStep />;
    }
  };

  if (!user && !loading) {
    return null;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <WizardProvider>
      <WizardInitializer>
        <WizardLayout
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSave={handleSave}
          canGoNext={canGoNext()}
          canGoPrevious={canGoPrevious()}
          isLoading={isLoading}
          saveLabel={currentStep === steps.length - 1 ? 'Generate Report' : 'Save & Continue'}
        >
          {renderCurrentStep()}
        </WizardLayout>
      </WizardInitializer>
    </WizardProvider>
  );
};

export default CreateReportWizard;