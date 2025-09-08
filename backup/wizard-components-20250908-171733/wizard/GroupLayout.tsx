import React, { ReactNode, useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CheckIcon,
  DocumentTextIcon,
  MapIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import type { WizardGroup, GroupValidation } from '@/types/groupWizard';
import { WIZARD_GROUPS } from '@/types/groupWizard';

interface GroupInfo {
  id: WizardGroup;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  completed: boolean;
  validation: GroupValidation;
}

interface GroupLayoutProps {
  groups: GroupInfo[];
  currentGroup: WizardGroup;
  onGroupClick: (group: WizardGroup) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  children: ReactNode;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading?: boolean;
  saveLabel?: string;
}

const GROUP_ICONS = {
  document_processing: DocumentTextIcon,
  location_mapping: MapIcon,
  property_assessment: BuildingOfficeIcon,
  market_valuation: ChartBarIcon,
  report_finalization: ClipboardDocumentCheckIcon
};

const GROUP_INFO = {
  document_processing: {
    title: 'Document Processing & AI Extraction',
    description: 'Upload documents, OCR processing, AI analysis, and data extraction'
  },
  location_mapping: {
    title: 'Location Verification & Mapping',
    description: 'Address verification, Google Maps, coordinates, and infrastructure'
  },
  property_assessment: {
    title: 'Property Assessment',
    description: 'Site characteristics, buildings, utilities, and environmental factors'
  },
  market_valuation: {
    title: 'Market Analysis & Valuation', 
    description: 'Market research, comparables, and valuation calculations'
  },
  report_finalization: {
    title: 'Report Setup & Finalization',
    description: 'Report information, client details, review, and export'
  }
};

export const GroupLayout = ({
  groups,
  currentGroup,
  onGroupClick,
  onPrevious,
  onNext,
  onSave,
  children,
  canGoNext,
  canGoPrevious,
  isLoading = false,
  saveLabel = 'Save & Continue'
}: GroupLayoutProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<WizardGroup>>(new Set([currentGroup]));
  const currentGroupIndex = WIZARD_GROUPS.indexOf(currentGroup);
  const isLastGroup = currentGroupIndex === WIZARD_GROUPS.length - 1;

  const toggleGroupExpansion = (groupId: WizardGroup) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupClick = (groupId: WizardGroup) => {
    onGroupClick(groupId);
    // Auto-expand the clicked group
    setExpandedGroups(prev => new Set([...prev, groupId]));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Valuation Report - Group-Based Workflow
            </h1>
            
            {/* Group Progress Bar */}
            <div className="flex items-center space-x-2 mb-4">
              {WIZARD_GROUPS.map((groupId, index) => {
                const groupInfo = groups.find(g => g.id === groupId);
                const Icon = GROUP_ICONS[groupId];
                const isCurrent = groupId === currentGroup;
                const isCompleted = groupInfo?.completed || false;
                const completionPercentage = groupInfo?.validation?.completionPercentage || 0;
                
                return (
                  <div key={groupId} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleGroupClick(groupId)}
                        className={`
                          relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200
                          ${isCurrent
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg scale-110'
                            : isCompleted
                            ? 'border-green-500 bg-green-500 text-white hover:bg-green-600'
                            : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:bg-gray-50'
                          }
                        `}
                        disabled={isLoading}
                      >
                        {isCompleted ? (
                          <CheckIcon className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                        
                        {/* Completion percentage ring */}
                        {!isCompleted && completionPercentage > 0 && (
                          <div className="absolute inset-0 rounded-full">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="text-blue-200"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeDasharray={`${completionPercentage * 1.26} 126`}
                                className="text-blue-500"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                      
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-600'}`}>
                          {GROUP_INFO[groupId].title.split(' ')[0]}
                        </p>
                        {completionPercentage > 0 && (
                          <p className="text-xs text-gray-500">{completionPercentage}%</p>
                        )}
                      </div>
                    </div>
                    
                    {index < WIZARD_GROUPS.length - 1 && (
                      <ChevronRightIcon className="w-5 h-5 text-gray-300 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Group Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Groups</h3>
              
              <div className="space-y-2">
                {WIZARD_GROUPS.map(groupId => {
                  const groupInfo = groups.find(g => g.id === groupId);
                  const Icon = GROUP_ICONS[groupId];
                  const isCurrent = groupId === currentGroup;
                  const isCompleted = groupInfo?.completed || false;
                  const isExpanded = expandedGroups.has(groupId);
                  const hasErrors = (groupInfo?.validation?.errors || []).length > 0;
                  
                  return (
                    <div key={groupId} className="border border-gray-200 rounded-md">
                      <div
                        className={`
                          w-full flex items-center justify-between p-3 transition-all duration-200 cursor-pointer
                          ${isCurrent
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : isCompleted
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : hasErrors
                            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            : 'bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div 
                          className="flex items-center flex-1"
                          onClick={() => handleGroupClick(groupId)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleGroupClick(groupId);
                            }
                          }}
                          aria-label={`Go to ${GROUP_INFO[groupId].title}`}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          <div>
                            <p className="font-medium text-sm">{GROUP_INFO[groupId].title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {groupInfo?.validation?.completionPercentage || 0}% complete
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {isCompleted && <CheckIcon className="w-4 h-4 mr-2" />}
                          {hasErrors && (
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupExpansion(groupId);
                            }}
                            className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${GROUP_INFO[groupId].title} details`}
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <p className="text-xs text-gray-600 mb-2">
                            {GROUP_INFO[groupId].description}
                          </p>
                          
                          {/* Show validation errors */}
                          {hasErrors && (
                            <div className="space-y-1">
                              {groupInfo?.validation?.errors.map((error, idx) => (
                                <p key={idx} className="text-xs text-red-600">• {error}</p>
                              ))}
                            </div>
                          )}
                          
                          {/* Show warnings */}
                          {(groupInfo?.validation?.warnings || []).length > 0 && (
                            <div className="space-y-1 mt-2">
                              {groupInfo?.validation?.warnings.map((warning, idx) => (
                                <p key={idx} className="text-xs text-yellow-600">⚠ {warning}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Group Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {React.createElement(GROUP_ICONS[currentGroup], { 
                      className: "w-6 h-6 text-blue-600 mr-3" 
                    })}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {GROUP_INFO[currentGroup].title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {GROUP_INFO[currentGroup].description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Group {currentGroupIndex + 1} of {WIZARD_GROUPS.length}
                  </div>
                </div>
              </div>

              {/* Group Content */}
              <div className="p-6">
                {children}
              </div>

              {/* Navigation Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onPrevious}
                    disabled={!canGoPrevious || isLoading}
                    className={`
                      flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200
                      ${canGoPrevious && !isLoading
                        ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500'
                        : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                      }
                    `}
                  >
                    <ChevronLeftIcon className="w-4 h-4 mr-2" />
                    Previous
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={onSave}
                      disabled={isLoading}
                      className={`
                        px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md
                        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50
                        transition-colors duration-200
                      `}
                    >
                      {isLoading ? 'Saving...' : 'Save Progress'}
                    </button>

                    <button
                      onClick={onNext}
                      disabled={!canGoNext || isLoading}
                      className={`
                        flex items-center px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200
                        ${canGoNext && !isLoading
                          ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                        }
                      `}
                    >
                      {isLastGroup ? 'Complete Report' : 'Next Group'}
                      {!isLastGroup && <ChevronRightIcon className="w-4 h-4 ml-2" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};