import { useWizard } from '../WizardProvider';

export const LegalStep = () => {
  const { state, updateStepData } = useWizard();
  const legal = state.data.legal;

  const handleInputChange = (field: string, value: any) => {
    updateStepData('legal', { [field]: value });
  };

  const handleAssumptionToggle = (assumption: string) => {
    const assumptions = legal.assumptions || [];
    const updatedAssumptions = assumptions.includes(assumption)
      ? assumptions.filter((a: string) => a !== assumption)
      : [...assumptions, assumption];
    updateStepData('legal', { assumptions: updatedAssumptions });
  };

  const standardAssumptions = [
    'Property has clear and marketable title',
    'No undisclosed encumbrances or restrictions',
    'All statutory approvals are in place',
    'No environmental contamination',
    'No structural defects not visible during inspection',
    'Market conditions remain stable',
    'No adverse planning changes expected',
    'Physical condition as observed during inspection',
    'No hidden or latent defects',
    'All information provided is accurate and complete'
  ];

  const defaultDisclaimers = `1. This valuation is prepared for the specific purpose stated in this report and should not be used for any other purpose without further consideration.

2. The valuation is based on information available at the date of inspection and market conditions prevailing at the valuation date.

3. No responsibility is accepted for matters of a legal nature that may affect the value of the property.

4. This valuation is confidential and prepared solely for the use of the client named in this report.

5. No allowance has been made for any charges, mortgages, or other encumbrances that may affect the property.

6. The valuation assumes vacant possession unless otherwise stated.

7. No investigation has been made of the soil conditions or structural stability of the building.

8. This valuation is subject to the General Terms and Conditions of the Institute of Valuers of Sri Lanka.

9. The valuer has no pecuniary interest in the property valued.

10. This valuation may not be reproduced or published without the written consent of the valuer.`;

  const defaultCertificate = `I certify that:

1. I have made a personal inspection of the property on the date stated in this report.

2. The valuation has been prepared in accordance with the Valuation Standards of the Institute of Valuers of Sri Lanka and International Valuation Standards.

3. I have no present or prospective interest in the property valued.

4. My fee is not contingent upon the value reported.

5. I am a qualified valuer and member of the Institute of Valuers of Sri Lanka.

6. I have sufficient knowledge and experience to undertake this valuation competently.

7. The information contained in this report is true and correct to the best of my knowledge and belief.

8. This report represents my independent and impartial professional opinion.`;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Legal Disclaimers & Certificate
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Add legal disclaimers, assumptions, and professional certifications required for the valuation report to comply with professional standards and legal requirements.
        </p>
      </div>

      {/* Valuation Assumptions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Valuation Assumptions</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Standard Assumptions:
          </label>
          <div className="space-y-2">
            {standardAssumptions.map((assumption) => (
              <label key={assumption} className="inline-flex items-start">
                <input
                  type="checkbox"
                  checked={(legal.assumptions || []).includes(assumption)}
                  onChange={() => handleAssumptionToggle(assumption)}
                  className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{assumption}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Assumptions & Special Conditions
          </label>
          <textarea
            value={legal.additional_assumptions || ''}
            onChange={(e) => handleInputChange('additional_assumptions', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any specific assumptions or special conditions relevant to this particular valuation..."
          />
        </div>
      </div>

      {/* Disclaimers */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Legal Disclaimers</h4>
        
        <div className="mb-4 flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Standard Disclaimers
          </label>
          <button
            type="button"
            onClick={() => handleInputChange('disclaimers', defaultDisclaimers)}
            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Load Standard Text
          </button>
        </div>
        
        <textarea
          value={legal.disclaimers || ''}
          onChange={(e) => handleInputChange('disclaimers', e.target.value)}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="Enter legal disclaimers and limitations..."
        />
      </div>

      {/* Professional Certificate */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Valuer's Professional Certificate</h4>
        
        <div className="mb-4 flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Professional Certificate Statement
          </label>
          <button
            type="button"
            onClick={() => handleInputChange('certificate', defaultCertificate)}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Load Standard Text
          </button>
        </div>
        
        <textarea
          value={legal.certificate || ''}
          onChange={(e) => handleInputChange('certificate', e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="Enter professional certificate and declarations..."
        />
      </div>

      {/* Compliance Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-purple-900 mb-4">Professional Compliance</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuation Standards Applied
            </label>
            <select
              value={legal.valuation_standards || ''}
              onChange={(e) => handleInputChange('valuation_standards', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select standards...</option>
              <option value="ivsl">Institute of Valuers of Sri Lanka Standards</option>
              <option value="ivs">International Valuation Standards (IVS)</option>
              <option value="ivsl_ivs">IVSL & IVS Standards</option>
              <option value="other">Other Standards</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Indemnity Insurance
            </label>
            <select
              value={legal.indemnity_insurance || ''}
              onChange={(e) => handleInputChange('indemnity_insurance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="covered">Covered by Professional Indemnity Insurance</option>
              <option value="not_covered">Not Covered</option>
              <option value="not_applicable">Not Applicable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IVSL Membership Status
            </label>
            <select
              value={legal.membership_status || ''}
              onChange={(e) => handleInputChange('membership_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status...</option>
              <option value="fellow">Fellow Member (FIVSL)</option>
              <option value="associate">Associate Member (AIVSL)</option>
              <option value="probationer">Probationer Member</option>
              <option value="other">Other Professional Body</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>
            <input
              type="text"
              value={legal.registration_number || ''}
              onChange={(e) => handleInputChange('registration_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Professional registration/membership number"
            />
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Signature & Authentication</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuer's Full Name
            </label>
            <input
              type="text"
              value={legal.valuer_name || ''}
              onChange={(e) => handleInputChange('valuer_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full name of the valuer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Designation
            </label>
            <input
              type="text"
              value={legal.designation || ''}
              onChange={(e) => handleInputChange('designation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Chartered Valuer, FIVSL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company/Firm Name
            </label>
            <input
              type="text"
              value={legal.company_name || ''}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Valuation firm or company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Date
            </label>
            <input
              type="date"
              value={legal.report_date ? legal.report_date.split('T')[0] : ''}
              onChange={(e) => handleInputChange('report_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Digital Signature Upload
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Upload digital signature or company stamp
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PNG, JPG, PDF (Max 2MB)
            </p>
            <button
              type="button"
              className="mt-2 px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Choose File
            </button>
          </div>
        </div>
      </div>

      {/* Report Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Report Footer Information</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuation Firm Address
            </label>
            <textarea
              value={legal.firm_address || ''}
              onChange={(e) => handleInputChange('firm_address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Complete address of the valuation firm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone Numbers
              </label>
              <input
                type="text"
                value={legal.contact_phones || ''}
                onChange={(e) => handleInputChange('contact_phones', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., +94 11 2345678, +94 77 1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={legal.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="professional.email@valuers.lk"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Classification
            </label>
            <select
              value={legal.report_classification || 'confidential'}
              onChange={(e) => handleInputChange('report_classification', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
              <option value="internal">Internal Use Only</option>
              <option value="client_only">Client Use Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Validity */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-red-900 mb-4">Report Validity & Limitations</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Validity Period
            </label>
            <select
              value={legal.validity_period || '6_months'}
              onChange={(e) => handleInputChange('validity_period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
              <option value="12_months">12 Months</option>
              <option value="special">Special Circumstances</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Status
            </label>
            <select
              value={legal.report_status || 'final'}
              onChange={(e) => handleInputChange('report_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft Report</option>
              <option value="final">Final Report</option>
              <option value="revised">Revised Report</option>
              <option value="update">Updated Report</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Limitations & Conditions
          </label>
          <textarea
            value={legal.special_limitations || ''}
            onChange={(e) => handleInputChange('special_limitations', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any special limitations, conditions, or circumstances that affect this specific valuation report..."
          />
        </div>
      </div>
    </div>
  );
};