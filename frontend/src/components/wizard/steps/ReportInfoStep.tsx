import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { clientsAPI } from '@/lib/api';
import { Client } from '@/types';

export const ReportInfoStep = () => {
  const { state, updateStepData } = useWizard();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    address: '',
    email: '',
    contact_numbers: [''],
  });

  const reportInfo = state.data.reportInfo;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientData = await clientsAPI.list();
      setClients(clientData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const createClient = async () => {
    try {
      const client = await clientsAPI.create({
        name: newClient.name,
        address: newClient.address,
        email: newClient.email,
        contact_numbers: newClient.contact_numbers.filter(num => num.trim() !== ''),
      });
      
      setClients([...clients, client]);
      updateStepData('reportInfo', { client_id: client.id });
      setShowNewClientForm(false);
      setNewClient({ name: '', address: '', email: '', contact_numbers: [''] });
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    updateStepData('reportInfo', { [field]: value });
  };

  const addContactNumber = () => {
    setNewClient({
      ...newClient,
      contact_numbers: [...newClient.contact_numbers, ''],
    });
  };

  const updateContactNumber = (index: number, value: string) => {
    const updated = [...newClient.contact_numbers];
    updated[index] = value;
    setNewClient({ ...newClient, contact_numbers: updated });
  };

  const removeContactNumber = (index: number) => {
    const updated = newClient.contact_numbers.filter((_, i) => i !== index);
    setNewClient({ ...newClient, contact_numbers: updated });
  };

  return (
    <div className=\"space-y-8\">
      <div>
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">
          Report Information
        </h3>
        <p className=\"text-sm text-gray-600 mb-6\">
          Provide basic information about this valuation report including purpose, client, and key dates.
        </p>
      </div>

      <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
        {/* Report Reference */}
        <div>
          <label htmlFor=\"ref\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Report Reference *
          </label>
          <input
            type=\"text\"
            id=\"ref\"
            value={reportInfo.ref || ''}
            onChange={(e) => handleInputChange('ref', e.target.value)}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
            placeholder=\"e.g., VR-2024-001\"
          />
          <p className=\"text-xs text-gray-500 mt-1\">
            Unique reference number for this report
          </p>
        </div>

        {/* Purpose */}
        <div>
          <label htmlFor=\"purpose\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Valuation Purpose *
          </label>
          <select
            id=\"purpose\"
            value={reportInfo.purpose || ''}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
          >
            <option value=\"\">Select purpose...</option>
            <option value=\"Bank valuation\">Bank Valuation</option>
            <option value=\"Insurance valuation\">Insurance Valuation</option>
            <option value=\"Mortgage valuation\">Mortgage Valuation</option>
            <option value=\"Sale/purchase\">Sale/Purchase</option>
            <option value=\"Legal proceeding\">Legal Proceeding</option>
            <option value=\"Taxation\">Taxation</option>
            <option value=\"Investment analysis\">Investment Analysis</option>
            <option value=\"Other\">Other</option>
          </select>
        </div>

        {/* Report Date */}
        <div>
          <label htmlFor=\"report-date\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Report Date
          </label>
          <input
            type=\"date\"
            id=\"report-date\"
            value={reportInfo.report_date ? reportInfo.report_date.split('T')[0] : ''}
            onChange={(e) => handleInputChange('report_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
          />
        </div>

        {/* Inspection Date */}
        <div>
          <label htmlFor=\"inspection-date\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Inspection Date *
          </label>
          <input
            type=\"date\"
            id=\"inspection-date\"
            value={reportInfo.inspection_date ? reportInfo.inspection_date.split('T')[0] : ''}
            onChange={(e) => handleInputChange('inspection_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
          />
        </div>

        {/* Basis of Value */}
        <div>
          <label htmlFor=\"basis-of-value\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Basis of Value
          </label>
          <select
            id=\"basis-of-value\"
            value={reportInfo.basis_of_value || 'Market Value'}
            onChange={(e) => handleInputChange('basis_of_value', e.target.value)}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
          >
            <option value=\"Market Value\">Market Value</option>
            <option value=\"Investment Value\">Investment Value</option>
            <option value=\"Fair Value\">Fair Value</option>
            <option value=\"Liquidation Value\">Liquidation Value</option>
            <option value=\"Insurance Value\">Insurance Value</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor=\"currency\" className=\"block text-sm font-medium text-gray-700 mb-2\">
            Currency
          </label>
          <select
            id=\"currency\"
            value={reportInfo.currency || 'LKR'}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
          >
            <option value=\"LKR\">Sri Lankan Rupee (LKR)</option>
            <option value=\"USD\">US Dollar (USD)</option>
            <option value=\"EUR\">Euro (EUR)</option>
          </select>
        </div>
      </div>

      {/* Client Selection */}
      <div className=\"border-t border-gray-200 pt-6\">
        <div className=\"flex items-center justify-between mb-4\">
          <h4 className=\"text-md font-medium text-gray-900\">Client Information</h4>
          <button
            type=\"button\"
            onClick={() => setShowNewClientForm(!showNewClientForm)}
            className=\"px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50\"
          >
            {showNewClientForm ? 'Cancel' : 'Add New Client'}
          </button>
        </div>

        {!showNewClientForm ? (
          <div>
            <label htmlFor=\"client\" className=\"block text-sm font-medium text-gray-700 mb-2\">
              Select Client
            </label>
            {isLoadingClients ? (
              <div className=\"text-sm text-gray-500\">Loading clients...</div>
            ) : (
              <select
                id=\"client\"
                value={reportInfo.client_id || ''}
                onChange={(e) => handleInputChange('client_id', e.target.value)}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
              >
                <option value=\"\">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.email && `(${client.email})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className=\"space-y-4 bg-gray-50 p-4 rounded-lg\">
            <h5 className=\"font-medium text-gray-900\">Add New Client</h5>
            
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Client Name *
                </label>
                <input
                  type=\"text\"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Email
                </label>
                <input
                  type=\"email\"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
                />
              </div>

              <div className=\"md:col-span-2\">
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Address
                </label>
                <textarea
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  rows={2}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
                />
              </div>

              <div className=\"md:col-span-2\">
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Contact Numbers
                </label>
                {newClient.contact_numbers.map((number, index) => (
                  <div key={index} className=\"flex items-center space-x-2 mb-2\">
                    <input
                      type=\"tel\"
                      value={number}
                      onChange={(e) => updateContactNumber(index, e.target.value)}
                      className=\"flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
                      placeholder=\"Phone number\"
                    />
                    {newClient.contact_numbers.length > 1 && (
                      <button
                        type=\"button\"
                        onClick={() => removeContactNumber(index)}
                        className=\"px-2 py-2 text-red-600 hover:text-red-800\"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type=\"button\"
                  onClick={addContactNumber}
                  className=\"text-sm text-blue-600 hover:text-blue-800\"
                >
                  + Add another number
                </button>
              </div>
            </div>

            <div className=\"flex items-center justify-end space-x-3 pt-4\">
              <button
                type=\"button\"
                onClick={() => setShowNewClientForm(false)}
                className=\"px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50\"
              >
                Cancel
              </button>
              <button
                type=\"button\"
                onClick={createClient}
                disabled={!newClient.name.trim()}
                className={`px-4 py-2 text-sm rounded ${
                  newClient.name.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Create Client
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};