import { useEffect, useState } from 'react';
import { useWizard } from './WizardProvider';
import { useSearchParams } from 'next/navigation';

interface WizardInitializerProps {
  children: React.ReactNode;
}

export const WizardInitializer = ({ children }: WizardInitializerProps) => {
  const { state, createReport, loadReport } = useWizard();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');

  useEffect(() => {
    initializeWizard();
  }, []);

  const initializeWizard = async () => {
    setIsInitializing(true);
    setInitError(null);

    try {
      if (reportId) {
        // Load existing report
        console.log('Loading existing report:', reportId);
        await loadReport(reportId);
      } else {
        // Create new report
        console.log('Creating new report...');
        const newReportId = await createReport();
        console.log('Created report with ID:', newReportId);
        
        // Update URL to include the new report ID
        const url = new URL(window.location.href);
        url.searchParams.set('reportId', newReportId);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (error) {
      console.error('Error initializing wizard:', error);
      setInitError('Failed to initialize report. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {reportId ? 'Loading Report...' : 'Creating New Report...'}
          </h3>
          <p className="text-sm text-gray-600">
            Please wait while we initialize your valuation report.
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-red-200 text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Initialization Failed</h3>
          <p className="text-sm text-gray-600 mb-4">{initError}</p>
          <button
            onClick={initializeWizard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show wizard content with report info
  return (
    <div>
      {/* Report Status Bar */}
      <div className="bg-blue-600 text-white text-center py-2 text-sm">
        Report ID: {state.reportId} | Status: {state.isLoading ? 'Saving...' : state.isDirty ? 'Unsaved Changes' : 'Saved'}
        {state.isDirty && (
          <span className="ml-2 inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
        )}
      </div>
      {children}
    </div>
  );
};