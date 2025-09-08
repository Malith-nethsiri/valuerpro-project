import { useState } from 'react';
import { useWizard } from '../WizardProvider';
import { mapsAPI, regulationsAPI } from '@/lib/api';
import { SparklesIcon, MapPinIcon, DocumentTextIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';

export const PlanningStep = () => {
  const { state, updateStepData } = useWizard();
  const planning = state.data.planning;
  const location = state.data.location;
  
  // AI zoning detection state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // NBRO landslide risk assessment state
  const [isAssessingNBRO, setIsAssessingNBRO] = useState(false);
  const [nbروResults, setNBROResults] = useState<any>(null);
  const [nbroError, setNBROError] = useState<string | null>(null);

  // Compliance analysis state
  const [isAnalyzingCompliance, setIsAnalyzingCompliance] = useState(false);
  const [complianceResults, setComplianceResults] = useState<any>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    updateStepData('planning', { [field]: value });
  };

  const handleRestrictionToggle = (restriction: string) => {
    const restrictions = planning.restrictions || [];
    const updatedRestrictions = restrictions.includes(restriction)
      ? restrictions.filter((r: string) => r !== restriction)
      : [...restrictions, restriction];
    updateStepData('planning', { restrictions: updatedRestrictions });
  };

  // AI Zoning Analysis Function
  const analyzeZoning = async () => {
    if (!location?.latitude || !location?.longitude) {
      setAnalysisError('Property coordinates are required for zoning analysis. Please complete the Location step first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults(null);

    try {
      // Determine property type from current form data or infer from property type
      const propertyType = planning.current_use || state.data.identification?.property_type || 'residential';
      
      // Perform comprehensive zoning analysis
      const zoningData = await mapsAPI.analyzeZoning(
        location.latitude,
        location.longitude,
        propertyType
      );

      if (zoningData.error) {
        setAnalysisError(zoningData.error);
        return;
      }

      setAnalysisResults(zoningData);
      
      // Auto-populate fields from zoning analysis
      populateZoningFields(zoningData);
      
    } catch (error: any) {
      console.error('Zoning analysis failed:', error);
      setAnalysisError(error.response?.data?.detail || 'Failed to analyze zoning. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Populate form fields from zoning analysis
  const populateZoningFields = (zoningData: any) => {
    const regulations = zoningData.zoning_analysis?.regulations;
    const authority = zoningData.planning_authority;
    const authorityType = zoningData.authority_type;
    const developmentPlan = zoningData.development_plan;
    const inferredZoning = zoningData.zoning_analysis?.inferred_zoning;
    const isUdaZone = zoningData.uda_zone;
    
    if (!regulations) return;

    const updates: any = {};
    
    // Planning Authority Information
    if (authority) {
      updates.planning_authority = authorityType || 'municipal_council';
      // Store the actual authority name in notes or separate field
      updates.authority_name = authority;
    }
    
    if (developmentPlan) {
      updates.development_plan = developmentPlan;
    }
    
    // Zoning Classification
    if (inferredZoning) {
      updates.zoning_classification = inferredZoning;
    }
    
    // Building Regulations from detected authority
    if (regulations.max_height) {
      updates.max_height = regulations.max_height;
    }
    if (regulations.max_floors) {
      updates.max_floors = regulations.max_floors;
    }
    if (regulations.floor_area_ratio) {
      updates.floor_area_ratio = regulations.floor_area_ratio;
    }
    if (regulations.building_coverage) {
      updates.building_coverage = regulations.building_coverage;
    }
    if (regulations.front_setback) {
      updates.front_setback = regulations.front_setback;
    }
    if (regulations.side_setbacks) {
      updates.side_setbacks = regulations.side_setbacks;
    }
    if (regulations.rear_setback) {
      updates.rear_setback = regulations.rear_setback;
    }
    if (regulations.parking_requirements) {
      updates.parking_requirements = regulations.parking_requirements;
    }
    if (regulations.landscaping_percentage) {
      updates.landscaping_percentage = regulations.landscaping_percentage;
    }
    
    // Add compliance notes about UDA vs Municipal regulations
    const regulationSource = zoningData.zoning_analysis?.regulation_source;
    if (regulationSource) {
      const complianceNote = `Automated analysis: ${regulationSource}${isUdaZone ? ' (UDA Zone - stricter controls apply)' : ''}`;
      updates.compliance_notes = planning.compliance_notes ? 
        `${planning.compliance_notes}\n\n${complianceNote}` : complianceNote;
    }

    // Update all fields at once
    updateStepData('planning', updates);
  };

  // NBRO Landslide Risk Assessment Function
  const assessNBRORisk = async () => {
    if (!location?.latitude || !location?.longitude) {
      setNBROError('Property coordinates are required for NBRO assessment. Please complete the Location step first.');
      return;
    }

    setIsAssessingNBRO(true);
    setNBROError(null);
    setNBROResults(null);

    try {
      // Determine property type from current form data
      const propertyType = planning.current_use || state.data.identification?.property_type || 'residential';
      
      // Perform NBRO landslide risk assessment
      const nbroData = await mapsAPI.assessLandslideRisk(
        location.latitude,
        location.longitude,
        propertyType
      );

      if (nbroData.error && !nbroData.fallback_assessment) {
        setNBROError(nbroData.error);
        return;
      }

      setNBROResults(nbroData);
      
      // Auto-populate NBRO fields
      populateNBROFields(nbroData);
      
    } catch (error: any) {
      console.error('NBRO assessment failed:', error);
      setNBROError(error.response?.data?.detail || 'Failed to assess landslide risk. Please try again.');
    } finally {
      setIsAssessingNBRO(false);
    }
  };

  // Populate NBRO-related fields from assessment
  const populateNBROFields = (nbroData: any) => {
    const assessment = nbroData.nbro_assessment || nbroData.fallback_assessment?.nbro_assessment;
    
    if (!assessment) return;

    const updates: any = {};
    
    // NBRO Risk Information
    if (assessment.landslide_prone_area !== undefined) {
      updates.landslide_risk_zone = assessment.landslide_prone_area ? 'yes' : 'no';
    }
    
    if (assessment.nbro_clearance_required !== undefined) {
      updates.nbro_clearance_required = assessment.nbro_clearance_required ? 'required' : 'not_required';
    }
    
    // Risk level and hazard types
    if (assessment.risk_level) {
      updates.landslide_risk_level = assessment.risk_level;
    }
    
    if (assessment.hazard_types && assessment.hazard_types.length > 0) {
      updates.hazard_types = assessment.hazard_types.join(', ');
    }
    
    // Add NBRO assessment summary to compliance notes
    if (nbroData.recommendations && nbroData.recommendations.length > 0) {
      const nbroNotes = `NBRO Assessment: ${assessment.risk_level} risk zone. ${nbroData.recommendations.slice(0, 3).join(' ')}`;
      updates.nbro_assessment_notes = nbroNotes;
      
      // Append to existing compliance notes
      if (planning.compliance_notes) {
        updates.compliance_notes = `${planning.compliance_notes}\n\n${nbroNotes}`;
      } else {
        updates.compliance_notes = nbroNotes;
      }
    }
    
    // Update all fields at once
    updateStepData('planning', updates);
  };

  // Comprehensive Compliance Analysis Function
  const analyzeCompliance = async () => {
    if (!location?.latitude || !location?.longitude) {
      setComplianceError('Property coordinates are required for compliance analysis. Please complete the Location step first.');
      return;
    }

    setIsAnalyzingCompliance(true);
    setComplianceError(null);
    setComplianceResults(null);

    try {
      // Determine property type from current form data
      const propertyType = planning.current_use || state.data.identification?.property_type || 'residential';
      
      // Perform comprehensive compliance analysis
      const complianceData = await regulationsAPI.analyzeCompliance(
        location.latitude,
        location.longitude,
        propertyType,
        true,  // include documents
        true   // generate report
      );

      setComplianceResults(complianceData);
      
      // Auto-populate compliance fields
      populateComplianceFields(complianceData);
      
    } catch (error: any) {
      console.error('Compliance analysis failed:', error);
      setComplianceError(error.response?.data?.detail || 'Failed to analyze regulatory compliance. Please try again.');
    } finally {
      setIsAnalyzingCompliance(false);
    }
  };

  // Populate compliance-related fields from analysis
  const populateComplianceFields = (complianceData: any) => {
    const regulationAnalysis = complianceData.regulation_analysis;
    const complianceReport = complianceData.compliance_report;
    
    if (!regulationAnalysis) return;

    const updates: any = {};
    
    // Primary planning authority
    const planningAuthority = regulationAnalysis.planning_authority;
    if (planningAuthority?.authority_type) {
      updates.planning_authority = planningAuthority.authority_type;
      updates.authority_name = planningAuthority.authority_name;
    }
    
    // Development plan reference
    if (planningAuthority?.development_plan) {
      updates.development_plan = planningAuthority.development_plan;
    }
    
    // Compliance complexity and requirements
    const regulationSummary = regulationAnalysis.regulation_summary;
    if (regulationSummary) {
      updates.complexity_level = regulationSummary.complexity_level;
      updates.estimated_timeline = regulationAnalysis.compliance_requirements?.estimated_timeline;
    }
    
    // Generate comprehensive compliance notes
    if (complianceReport?.executive_summary) {
      const summary = complianceReport.executive_summary;
      const complianceNotes = [
        `Regulatory Compliance Analysis:`,
        `- Complexity: ${summary.complexity_level?.toUpperCase()}`,
        `- Timeline: ${summary.estimated_timeline}`,
        `- Authorities: ${summary.total_authorities} (${regulationSummary.primary_authority})`,
        `- Key Challenge: ${summary.key_challenge}`
      ].join('\n');
      
      // Append to existing compliance notes
      if (planning.compliance_notes) {
        updates.compliance_notes = `${planning.compliance_notes}\n\n${complianceNotes}`;
      } else {
        updates.compliance_notes = complianceNotes;
      }
    }
    
    // Add regulation summary
    if (complianceData.available_documents?.available_documents?.length > 0) {
      const docCount = complianceData.available_documents.available_documents.length;
      updates.regulation_documents_available = `${docCount} regulation documents found for this location`;
    }
    
    // Update all fields at once
    updateStepData('planning', updates);
  };

  const restrictionOptions = [
    'Building height restriction',
    'Setback requirements',
    'FAR/Plot ratio limitations',
    'Coverage ratio limits',
    'Parking requirements',
    'Landscape requirements',
    'Architectural style controls',
    'Environmental restrictions',
    'Heritage/Archaeological restrictions',
    'Flood plain restrictions',
    'Slope protection requirements',
    'Road reservation',
    'Utility easements',
    'Right of way',
    'Coastal reservation'
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Planning & Zoning Information
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Document the planning and zoning regulations that affect the property, including permitted uses, building restrictions, and development potential.
        </p>
      </div>

      {/* AI-Powered Zoning Detection */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <h4 className="text-md font-medium text-indigo-900 mb-3">
          🤖 AI-Powered Zoning Detection
        </h4>
        <p className="text-sm text-indigo-700 mb-4">
          Automatically analyze property coordinates to determine applicable planning authority, 
          zoning regulations, and building controls based on Sri Lankan planning laws.
        </p>
        
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={analyzeZoning}
            disabled={isAnalyzing || !location?.latitude || !location?.longitude}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Zoning...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4 mr-2" />
                Auto-Detect Zoning & Regulations
              </>
            )}
          </button>
          
          {!location?.latitude || !location?.longitude ? (
            <div className="flex items-center text-amber-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Complete Location step to enable auto-detection</span>
            </div>
          ) : (
            <div className="flex items-center text-indigo-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Ready to analyze: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
            </div>
          )}
        </div>
        
        {analysisError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
            <strong>Analysis Error:</strong> {analysisError}
          </div>
        )}
        
        {analysisResults && (
          <div className="bg-indigo-100 border border-indigo-300 rounded p-3">
            <h5 className="font-medium text-indigo-900 mb-2">✅ Analysis Complete</h5>
            <div className="space-y-2 text-sm text-indigo-800">
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 text-indigo-500 mr-2" />
                <span><strong>Authority:</strong> {analysisResults.planning_authority}</span>
              </div>
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 text-indigo-500 mr-2" />
                <span><strong>Zoning:</strong> {analysisResults.zoning_analysis?.inferred_zoning || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 text-indigo-500 mr-2" />
                <span><strong>Regulation Source:</strong> {analysisResults.zoning_analysis?.regulation_source || 'N/A'}</span>
              </div>
              {analysisResults.uda_zone && (
                <div className="flex items-center">
                  <DocumentTextIcon className="h-4 w-4 text-indigo-500 mr-2" />
                  <span><strong>UDA Zone:</strong> Stricter development controls apply</span>
                </div>
              )}
            </div>
            <p className="text-xs text-indigo-600 mt-2">
              ℹ️ Fields have been automatically populated. Please review and adjust as needed.
            </p>
          </div>
        )}
      </div>

      {/* NBRO Landslide Risk Assessment */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h4 className="text-md font-medium text-red-900 mb-3">
          ⚠️ NBRO Landslide Risk Assessment
        </h4>
        <p className="text-sm text-red-700 mb-4">
          Assess landslide hazard zones and NBRO clearance requirements based on property location 
          using National Building Research Organisation (NBRO) risk maps.
        </p>
        
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={assessNBRORisk}
            disabled={isAssessingNBRO || !location?.latitude || !location?.longitude}
            className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssessingNBRO ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Assessing Risk...
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Assess Landslide Risk
              </>
            )}
          </button>
          
          {!location?.latitude || !location?.longitude ? (
            <div className="flex items-center text-amber-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Complete Location step to enable risk assessment</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Ready to assess: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
            </div>
          )}
        </div>
        
        {nbroError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
            <strong>Assessment Error:</strong> {nbroError}
          </div>
        )}
        
        {nbروResults && (
          <div className="bg-red-100 border border-red-300 rounded p-3">
            <h5 className="font-medium text-red-900 mb-2">✅ NBRO Assessment Complete</h5>
            <div className="space-y-2 text-sm text-red-800">
              {nbروResults.nbro_assessment && (
                <>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                    <span><strong>Risk Level:</strong> {nbروResults.nbro_assessment.risk_level?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                    <span><strong>Landslide Prone:</strong> {nbروResults.nbro_assessment.landslide_prone_area ? 'YES' : 'NO'}</span>
                  </div>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                    <span><strong>NBRO Clearance:</strong> {nbروResults.nbro_assessment.nbro_clearance_required ? 'REQUIRED' : 'Not Required'}</span>
                  </div>
                  {nbروResults.nbro_assessment.hazard_types && nbروResults.nbro_assessment.hazard_types.length > 0 && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                      <span><strong>Hazard Types:</strong> {nbروResults.nbro_assessment.hazard_types.join(', ')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-red-600 mt-2">
              ℹ️ Risk assessment fields populated. Verify with NBRO district office for site-specific guidance.
            </p>
            <div className="mt-2 text-xs text-red-600">
              📞 NBRO Contact: +94-11-2665991 | 🌐 Website: nbro.gov.lk
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Compliance Analysis */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h4 className="text-md font-medium text-green-900 mb-3">
          📋 Comprehensive Regulatory Compliance Analysis
        </h4>
        <p className="text-sm text-green-700 mb-4">
          Analyze all applicable regulations, authorities, and compliance requirements for this property location.
          Includes UDA, Municipal, Environmental, NBRO, and other regulatory requirements.
        </p>
        
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={analyzeCompliance}
            disabled={isAnalyzingCompliance || !location?.latitude || !location?.longitude}
            className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzingCompliance ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Compliance...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Analyze Regulatory Compliance
              </>
            )}
          </button>
          
          {!location?.latitude || !location?.longitude ? (
            <div className="flex items-center text-amber-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Complete Location step to enable compliance analysis</span>
            </div>
          ) : (
            <div className="flex items-center text-green-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">Ready to analyze: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
            </div>
          )}
        </div>
        
        {complianceError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
            <strong>Analysis Error:</strong> {complianceError}
          </div>
        )}
        
        {complianceResults && (
          <div className="bg-green-100 border border-green-300 rounded p-3">
            <h5 className="font-medium text-green-900 mb-2">✅ Compliance Analysis Complete</h5>
            <div className="space-y-2 text-sm text-green-800">
              {complianceResults.regulation_analysis?.regulation_summary && (
                <>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span><strong>Complexity Level:</strong> {complianceResults.regulation_analysis.regulation_summary.complexity_level?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span><strong>Authorities:</strong> {complianceResults.regulation_analysis.regulation_summary.total_categories} ({complianceResults.regulation_analysis.regulation_summary.primary_authority})</span>
                  </div>
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span><strong>Timeline:</strong> {complianceResults.regulation_analysis.compliance_requirements?.estimated_timeline || 'Contact authorities'}</span>
                  </div>
                  {complianceResults.available_documents?.available_documents && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span><strong>Documents Available:</strong> {complianceResults.available_documents.available_documents.length} regulation documents found</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-green-600 mt-2">
              ℹ️ Comprehensive compliance analysis complete. Review populated fields and recommendations.
            </p>
            {complianceResults.compliance_report?.executive_summary?.key_challenge && (
              <div className="mt-2 text-xs text-green-600">
                ⚠️ <strong>Key Challenge:</strong> {complianceResults.compliance_report.executive_summary.key_challenge}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoning Classification */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Zoning & Land Use Classification</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zoning Classification
            </label>
            <select
              value={planning.zoning_classification || ''}
              onChange={(e) => handleInputChange('zoning_classification', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select zoning...</option>
              <option value="residential_low">Residential - Low Density</option>
              <option value="residential_medium">Residential - Medium Density</option>
              <option value="residential_high">Residential - High Density</option>
              <option value="commercial">Commercial</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="industrial_light">Industrial - Light</option>
              <option value="industrial_heavy">Industrial - Heavy</option>
              <option value="agricultural">Agricultural</option>
              <option value="institutional">Institutional</option>
              <option value="recreational">Recreational/Open Space</option>
              <option value="special_economic_zone">Special Economic Zone</option>
              <option value="tourism_zone">Tourism Zone</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Authority
            </label>
            <select
              value={planning.planning_authority || ''}
              onChange={(e) => handleInputChange('planning_authority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select authority...</option>
              <option value="upa">Urban Planning Authority (UPA)</option>
              <option value="municipal_council">Municipal Council</option>
              <option value="urban_council">Urban Council</option>
              <option value="pradeshiya_sabha">Pradeshiya Sabha</option>
              <option value="surdec">SURDEC</option>
              <option value="boi">Board of Investment (BOI)</option>
              <option value="cea">Central Environmental Authority</option>
              <option value="other">Other Authority</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Plan Reference
            </label>
            <input
              type="text"
              value={planning.development_plan || ''}
              onChange={(e) => handleInputChange('development_plan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Colombo Metropolitan Regional Structure Plan, Local Development Plan"
            />
          </div>
        </div>
      </div>

      {/* Permitted Uses */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Permitted Uses & Development Rights</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Permitted Use
            </label>
            <select
              value={planning.current_use || ''}
              onChange={(e) => handleInputChange('current_use', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select current use...</option>
              <option value="single_dwelling">Single Dwelling</option>
              <option value="multi_dwelling">Multi-dwelling/Apartments</option>
              <option value="commercial">Commercial</option>
              <option value="office">Office</option>
              <option value="retail">Retail</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
              <option value="institutional">Institutional</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="vacant_land">Vacant Land</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Potential
            </label>
            <select
              value={planning.development_potential || ''}
              onChange={(e) => handleInputChange('development_potential', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select potential...</option>
              <option value="high">High (Significant development possible)</option>
              <option value="moderate">Moderate (Some development possible)</option>
              <option value="limited">Limited (Minor improvements only)</option>
              <option value="restricted">Restricted (Minimal development)</option>
              <option value="none">No Development Potential</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Permitted Uses
            </label>
            <textarea
              value={planning.additional_uses || ''}
              onChange={(e) => handleInputChange('additional_uses', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List other uses that may be permitted under current zoning (e.g., home office, bed & breakfast, etc.)"
            />
          </div>
        </div>
      </div>

      {/* Building Regulations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Building Regulations & Controls</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Building Height (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.max_height || ''}
              onChange={(e) => handleInputChange('max_height', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 12.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Floors
            </label>
            <input
              type="number"
              min="1"
              value={planning.max_floors || ''}
              onChange={(e) => handleInputChange('max_floors', parseInt(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor Area Ratio (FAR)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.floor_area_ratio || ''}
              onChange={(e) => handleInputChange('floor_area_ratio', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Coverage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={planning.building_coverage || ''}
              onChange={(e) => handleInputChange('building_coverage', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Front Setback (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.front_setback || ''}
              onChange={(e) => handleInputChange('front_setback', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 3.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Side Setbacks (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.side_setbacks || ''}
              onChange={(e) => handleInputChange('side_setbacks', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rear Setback (m)
            </label>
            <input
              type="number"
              step="0.1"
              value={planning.rear_setback || ''}
              onChange={(e) => handleInputChange('rear_setback', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parking Requirements
            </label>
            <input
              type="text"
              value={planning.parking_requirements || ''}
              onChange={(e) => handleInputChange('parking_requirements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1 space per dwelling unit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landscaping Requirements (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={planning.landscaping_percentage || ''}
              onChange={(e) => handleInputChange('landscaping_percentage', parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 20"
            />
          </div>
        </div>
      </div>

      {/* Restrictions & Easements */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Planning Restrictions & Easements</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Applicable Restrictions:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {restrictionOptions.map((restriction) => (
              <label key={restriction} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={(planning.restrictions || []).includes(restriction)}
                  onChange={() => handleRestrictionToggle(restriction)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{restriction}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Road Reservation (if applicable)
            </label>
            <input
              type="text"
              value={planning.road_reservation || ''}
              onChange={(e) => handleInputChange('road_reservation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2m road reservation on north boundary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utility Easements
            </label>
            <input
              type="text"
              value={planning.utility_easements || ''}
              onChange={(e) => handleInputChange('utility_easements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Power line easement along east boundary"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Other Restrictions & Easements
          </label>
          <textarea
            value={planning.other_restrictions || ''}
            onChange={(e) => handleInputChange('other_restrictions', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Detail any other planning restrictions, easements, or encumbrances that affect the property's development potential or use..."
          />
        </div>
      </div>

      {/* Approvals & Compliance */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Approvals & Compliance Status</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Approval Status
            </label>
            <select
              value={planning.planning_approval || ''}
              onChange={(e) => handleInputChange('planning_approval', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="approved">Planning Permission Approved</option>
              <option value="pending">Planning Application Pending</option>
              <option value="required">Planning Permission Required</option>
              <option value="not_required">Planning Permission Not Required</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Approval Status
            </label>
            <select
              value={planning.building_approval || ''}
              onChange={(e) => handleInputChange('building_approval', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="approved">Building Plan Approved</option>
              <option value="pending">Building Application Pending</option>
              <option value="required">Building Approval Required</option>
              <option value="unauthorized">Unauthorized Construction</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NBRO Clearance Status
            </label>
            <select
              value={planning.nbro_clearance_required || ''}
              onChange={(e) => handleInputChange('nbro_clearance_required', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select NBRO status...</option>
              <option value="required">NBRO Clearance Required</option>
              <option value="not_required">NBRO Clearance Not Required</option>
              <option value="obtained">NBRO Clearance Obtained</option>
              <option value="pending">NBRO Application Pending</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landslide Risk Zone
            </label>
            <select
              value={planning.landslide_risk_zone || ''}
              onChange={(e) => handleInputChange('landslide_risk_zone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select risk status...</option>
              <option value="yes">Yes - Landslide Prone Area</option>
              <option value="no">No - Not Landslide Prone</option>
              <option value="moderate">Moderate Risk Area</option>
              <option value="unknown">Risk Level Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environmental Clearance
            </label>
            <select
              value={planning.environmental_clearance || ''}
              onChange={(e) => handleInputChange('environmental_clearance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="not_required">Not Required</option>
              <option value="obtained">Environmental Clearance Obtained</option>
              <option value="required">Environmental Clearance Required</option>
              <option value="pending">Environmental Assessment Pending</option>
              <option value="unknown">Status Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Rating
            </label>
            <select
              value={planning.compliance_rating || ''}
              onChange={(e) => handleInputChange('compliance_rating', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select rating...</option>
              <option value="fully_compliant">Fully Compliant</option>
              <option value="mostly_compliant">Mostly Compliant</option>
              <option value="minor_violations">Minor Violations</option>
              <option value="major_violations">Major Violations</option>
              <option value="non_compliant">Non-Compliant</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compliance Notes & Issues
          </label>
          <textarea
            value={planning.compliance_notes || ''}
            onChange={(e) => handleInputChange('compliance_notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Note any compliance issues, violations, or requirements for obtaining necessary approvals..."
          />
        </div>
      </div>

      {/* Impact Assessment */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          📋 Planning Impact on Value
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Development Feasibility
            </label>
            <select
              value={planning.development_feasibility || ''}
              onChange={(e) => handleInputChange('development_feasibility', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select feasibility...</option>
              <option value="highly_feasible">Highly Feasible</option>
              <option value="feasible">Feasible</option>
              <option value="moderately_feasible">Moderately Feasible</option>
              <option value="limited_feasibility">Limited Feasibility</option>
              <option value="not_feasible">Not Feasible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Impact on Value
            </label>
            <select
              value={planning.value_impact || ''}
              onChange={(e) => handleInputChange('value_impact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select impact...</option>
              <option value="significant_positive">Significant Positive (+20% to +50%)</option>
              <option value="positive">Positive (+10% to +20%)</option>
              <option value="neutral">Neutral (0%)</option>
              <option value="negative">Negative (-10% to -20%)</option>
              <option value="significant_negative">Significant Negative (-20% or more)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Planning Assessment Summary
          </label>
          <textarea
            value={planning.planning_summary || ''}
            onChange={(e) => handleInputChange('planning_summary', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Summarize how planning and zoning factors affect the property's current use, development potential, and market value..."
          />
        </div>
      </div>
    </div>
  );
};