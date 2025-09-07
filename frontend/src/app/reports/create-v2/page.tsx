'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GroupProvider, useGroup } from '@/components/wizard/GroupProvider';
import { GroupLayout } from '@/components/wizard/GroupLayout';
import { DocumentProcessingGroup } from '@/components/wizard/groups/DocumentProcessingGroup';
import { useAuth } from '@/lib/auth';
import { WIZARD_GROUPS } from '@/types/groupWizard';
import type { WizardGroup, GroupValidation } from '@/types/groupWizard';

// Placeholder components for other groups (we'll create these next)
const LocationMappingGroup = () => (
  <div className="p-8 text-center">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Location Verification & Mapping</h3>
    <p className="text-gray-600">This group will contain address verification, Google Maps integration, and infrastructure details.</p>
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <p className="text-sm text-gray-500">Coming soon - this functionality will be migrated from the existing LocationStep component.</p>
    </div>
  </div>
);

const PropertyAssessmentGroup = () => (
  <div className="p-8 text-center">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Property Assessment</h3>
    <p className="text-gray-600">This group will contain site characteristics, buildings, utilities, and environmental factors.</p>
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <p className="text-sm text-gray-500">Coming soon - this functionality will combine SiteStep, BuildingsStep, UtilitiesStep, and EnvironmentalStep.</p>
    </div>
  </div>
);

const MarketValuationGroup = () => (
  <div className="p-8 text-center">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Market Analysis & Valuation</h3>
    <p className="text-gray-600">This group will contain market research, comparables, and valuation calculations.</p>
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <p className="text-sm text-gray-500">Coming soon - this functionality will combine MarketAnalysisStep and ValuationStep.</p>
    </div>
  </div>
);

const ReportFinalizationGroup = () => (
  <div className="p-8 text-center">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Report Setup & Finalization</h3>
    <p className="text-gray-600">This group will contain report information, client details, review, and export.</p>
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <p className="text-sm text-gray-500">Coming soon - this functionality will combine ReportInfoStep, ClientStep, ReviewStep, and finalization.</p>
    </div>
  </div>
);

function GroupWizardContent() {
  const router = useRouter();
  const { 
    currentGroup,
    groupData,
    groupValidations,
    isLoading,
    reportId,
    goToGroup,
    nextGroup,
    previousGroup,
    validateGroup,
    saveReport,
    createReport
  } = useGroup();

  // Convert group data to layout props
  const groups = WIZARD_GROUPS.map(groupId => ({
    id: groupId,
    title: groupId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: '',
    current: groupId === currentGroup,
    completed: groupValidations[groupId]?.isValid || false,
    validation: groupValidations[groupId] || { isValid: false, errors: [], warnings: [], completionPercentage: 0 }
  }));

  const currentGroupIndex = WIZARD_GROUPS.indexOf(currentGroup);
  const canGoNext = currentGroupIndex < WIZARD_GROUPS.length - 1;
  const canGoPrevious = currentGroupIndex > 0;

  const handleSave = async () => {
    try {
      if (!reportId) {
        await createReport();
      } else {
        await saveReport();
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save report. Please try again.');
    }
  };

  // Validate current group when switching
  useEffect(() => {
    validateGroup(currentGroup);
  }, [currentGroup, validateGroup]);

  const renderCurrentGroup = () => {
    switch (currentGroup) {
      case 'document_processing':
        return <DocumentProcessingGroup />;
      case 'location_mapping':
        return <LocationMappingGroup />;
      case 'property_assessment':
        return <PropertyAssessmentGroup />;
      case 'market_valuation':
        return <MarketValuationGroup />;
      case 'report_finalization':
        return <ReportFinalizationGroup />;
      default:
        return <div>Unknown group: {currentGroup}</div>;
    }
  };

  return (
    <GroupLayout
      groups={groups}
      currentGroup={currentGroup}
      onGroupClick={goToGroup}
      onPrevious={previousGroup}
      onNext={nextGroup}
      onSave={handleSave}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      isLoading={isLoading}
    >
      {renderCurrentGroup()}
    </GroupLayout>
  );
}

export default function CreateReportV2() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams?.get('reportId');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <GroupProvider reportId={reportId || undefined}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with version indicator */}
        <div className="bg-blue-600 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium">🚀 Group-Based Wizard (Beta)</span>
              <span className="ml-2 px-2 py-1 bg-blue-700 rounded text-xs">v2.0</span>
            </div>
            <button 
              onClick={() => router.push('/reports/create')}
              className="text-sm text-blue-100 hover:text-white underline"
            >
              Switch to Original Wizard
            </button>
          </div>
        </div>
        
        <GroupWizardContent />
      </div>
    </GroupProvider>
  );
}