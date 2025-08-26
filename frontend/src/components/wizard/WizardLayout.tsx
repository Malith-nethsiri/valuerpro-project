import { ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  children: ReactNode;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading?: boolean;
  saveLabel?: string;
}

export const WizardLayout = ({
  steps,
  currentStep,
  onStepClick,
  onPrevious,
  onNext,
  onSave,
  children,
  canGoNext,
  canGoPrevious,
  isLoading = false,
  saveLabel = 'Save & Continue'
}: WizardLayoutProps) => {
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Progress Header */}
      <div className=\"bg-white border-b border-gray-200 sticky top-0 z-10\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"py-4\">
            <h1 className=\"text-2xl font-bold text-gray-900 mb-4\">
              Valuation Report Wizard
            </h1>
            
            {/* Progress Steps */}
            <nav aria-label=\"Progress\" className=\"mb-4\">
              <ol className=\"flex items-center space-x-2 overflow-x-auto pb-2\">
                {steps.map((step, index) => (
                  <li key={step.id} className=\"flex items-center\">
                    <button
                      onClick={() => onStepClick(index)}
                      className={`group flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        step.completed
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : step.current
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {step.completed ? (
                        <CheckIcon className=\"w-5 h-5\" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </button>
                    
                    <div className=\"ml-3 min-w-0 flex-1\">
                      <p className={`text-sm font-medium ${
                        step.current ? 'text-blue-600' : step.completed ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className=\"text-xs text-gray-500 hidden sm:block truncate\">
                        {step.description}
                      </p>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <ChevronRightIcon className=\"w-5 h-5 text-gray-400 mx-2 flex-shrink-0\" />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            
            {/* Current Step Info */}
            <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-3\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <h2 className=\"text-lg font-semibold text-blue-900\">
                    Step {currentStep + 1}: {currentStepData?.title}
                  </h2>
                  <p className=\"text-sm text-blue-700 mt-1\">
                    {currentStepData?.description}
                  </p>
                </div>
                <div className=\"text-sm text-blue-600 font-medium\">
                  {currentStep + 1} of {steps.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
          {/* Step Content */}
          <div className=\"min-h-[400px]\">{children}</div>

          {/* Navigation */}
          <div className=\"flex items-center justify-between pt-8 border-t border-gray-200 mt-8\">
            <button
              type=\"button\"
              onClick={onPrevious}
              disabled={!canGoPrevious || isLoading}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border ${
                canGoPrevious && !isLoading
                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <ChevronLeftIcon className=\"w-4 h-4 mr-2\" />
              Previous
            </button>

            <div className=\"flex items-center space-x-3\">
              <button
                type=\"button\"
                onClick={onSave}
                disabled={isLoading}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border ${
                  isLoading
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className=\"animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400\" fill=\"none\" viewBox=\"0 0 24 24\">
                      <circle className=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4\"></circle>
                      <path className=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  saveLabel
                )}
              </button>

              <button
                type=\"button\"
                onClick={onNext}
                disabled={!canGoNext || isLoading}
                className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-md ${
                  canGoNext && !isLoading
                    ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border border-transparent'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed border border-gray-200'
                }`}
              >
                {isLastStep ? 'Review & Generate' : 'Next'}
                {!isLastStep && <ChevronRightIcon className=\"w-4 h-4 ml-2\" />}
              </button>
            </div>
          </div>
        </div>

        {/* AI Assist Panel - Sidebar */}
        <div className=\"fixed right-6 top-1/2 transform -translate-y-1/2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 hidden xl:block\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-3\">
            AI Assistant
          </h3>
          <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4\">
            <p className=\"text-sm text-blue-800\">
              Need help with this step? Our AI can suggest values based on uploaded documents or provide guidance.
            </p>
          </div>
          
          <div className=\"space-y-3\">
            <button className=\"w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border\">
              💡 Get AI Suggestions
            </button>
            <button className=\"w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border\">
              📄 Analyze Uploaded Documents
            </button>
            <button className=\"w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border\">
              🗺️ Generate Location Analysis
            </button>
            <button className=\"w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border\">
              📊 Calculate Market Rates
            </button>
          </div>
          
          <div className=\"mt-4 pt-3 border-t border-gray-200\">
            <p className=\"text-xs text-gray-500\">
              AI suggestions are based on document analysis and market data. Always verify before using.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};