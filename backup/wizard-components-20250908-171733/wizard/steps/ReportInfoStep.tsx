import { useState, useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { clientsAPI, reportsAPI } from '@/lib/api';
import { Client } from '@/types';

export const ReportInfoStep = () => {
  const { state, updateStepData } = useWizard();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    address: '',
    email: '',
    contact_numbers: [''],
  });
  const [editClient, setEditClient] = useState({
    name: '',
    address: '',
    email: '',
    contact_numbers: [''],
  });

  // Reference validation state
  const [referenceError, setReferenceError] = useState<string>('');
  const [isCheckingReference, setIsCheckingReference] = useState(false);

  const reportInfo = state.data.reportInfo;

  useEffect(() => {
    loadClients();
  }, []);

  // Debounced reference validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (reportInfo.ref) {
        checkReferenceAvailability(reportInfo.ref);
      } else {
        setReferenceError('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [reportInfo.ref, state.reportId]);

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

  const startEditingClient = async (clientId: string) => {
    try {
      const client = await clientsAPI.get(clientId);
      setEditClient({
        name: client.name || '',
        address: client.address || '',
        email: client.email || '',
        contact_numbers: client.contact_numbers?.length ? client.contact_numbers : [''],
      });
      setEditingClient(clientId);
    } catch (error) {
      console.error('Error loading client details:', error);
    }
  };

  const saveEditClient = async () => {
    if (!editingClient) return;
    
    try {
      const updatedClient = await clientsAPI.update(editingClient, {
        name: editClient.name,
        address: editClient.address,
        email: editClient.email,
        contact_numbers: editClient.contact_numbers.filter(num => num.trim() !== ''),
      });
      
      setClients(clients.map(c => c.id === editingClient ? updatedClient : c));
      setEditingClient(null);
      setEditClient({ name: '', address: '', email: '', contact_numbers: [''] });
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const cancelEditClient = () => {
    setEditingClient(null);
    setEditClient({ name: '', address: '', email: '', contact_numbers: [''] });
  };

  // Reference validation function
  const checkReferenceAvailability = async (ref: string) => {
    if (!ref || ref.trim() === '') {
      setReferenceError('');
      return;
    }

    setIsCheckingReference(true);
    setReferenceError('');

    try {
      const result = await reportsAPI.checkReferenceAvailability(ref.trim(), state.reportId);
      if (!result.available) {
        setReferenceError(result.message);
      }
    } catch (error) {
      console.error('Error checking reference:', error);
      setReferenceError('Error checking reference availability');
    } finally {
      setIsCheckingReference(false);
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

  // Edit client contact number functions
  const addEditContactNumber = () => {
    setEditClient({
      ...editClient,
      contact_numbers: [...editClient.contact_numbers, ''],
    });
  };

  const updateEditContactNumber = (index: number, value: string) => {
    const updated = [...editClient.contact_numbers];
    updated[index] = value;
    setEditClient({ ...editClient, contact_numbers: updated });
  };

  const removeEditContactNumber = (index: number) => {
    const updated = editClient.contact_numbers.filter((_, i) => i !== index);
    setEditClient({ ...editClient, contact_numbers: updated });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Report Information
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide basic information about this valuation report including purpose, client, and key dates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Reference */}
        <div>
          <label htmlFor="ref" className="block text-sm font-medium text-gray-700 mb-2">
            Report Reference *
          </label>
          <div className="relative">
            <input
              type="text"
              id="ref"
              value={reportInfo.ref || ''}
              onChange={(e) => handleInputChange('ref', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
                referenceError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="e.g., VR-2024-001"
            />
            {isCheckingReference && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {referenceError ? (
            <p className="text-xs text-red-600 mt-1">
              {referenceError}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Unique reference number for this report
            </p>
          )}
        </div>

        {/* Purpose */}
        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
            Valuation Purpose *
          </label>
          <select
            id="purpose"
            value={reportInfo.purpose || ''}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select purpose...</option>
            <option value="Bank valuation">Bank Valuation</option>
            <option value="Insurance valuation">Insurance Valuation</option>
            <option value="Investment decision">Investment Decision</option>
            <option value="Sale/Purchase">Sale/Purchase</option>
            <option value="Rental assessment">Rental Assessment</option>
            <option value="Tax assessment">Tax Assessment</option>
            <option value="Legal proceedings">Legal Proceedings</option>
            <option value="Asset management">Asset Management</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Report Date */}
        <div>
          <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 mb-2">
            Report Date
          </label>
          <input
            type="date"
            id="report-date"
            value={reportInfo.report_date ? reportInfo.report_date.split('T')[0] : ''}
            onChange={(e) => handleInputChange('report_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Inspection Date */}
        <div>
          <label htmlFor="inspection-date" className="block text-sm font-medium text-gray-700 mb-2">
            Inspection Date *
          </label>
          <input
            type="date"
            id="inspection-date"
            value={reportInfo.inspection_date ? reportInfo.inspection_date.split('T')[0] : ''}
            onChange={(e) => handleInputChange('inspection_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Basis of Value */}
        <div>
          <label htmlFor="basis-of-value" className="block text-sm font-medium text-gray-700 mb-2">
            Basis of Value
          </label>
          <select
            id="basis-of-value"
            value={reportInfo.basis_of_value || 'Market Value'}
            onChange={(e) => handleInputChange('basis_of_value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Market Value">Market Value</option>
            <option value="Investment Value">Investment Value</option>
            <option value="Fair Value">Fair Value</option>
            <option value="Liquidation Value">Liquidation Value</option>
            <option value="Insurance Value">Insurance Value</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            id="currency"
            value={reportInfo.currency || 'LKR'}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LKR">Sri Lankan Rupee (LKR)</option>
            <option value="USD">US Dollar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </div>
      </div>

      {/* Client Selection */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Client Information</h4>
          <button
            type="button"
            onClick={() => setShowNewClientForm(!showNewClientForm)}
            className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            {showNewClientForm ? 'Cancel' : 'Add New Client'}
          </button>
        </div>

        {!showNewClientForm && !editingClient && (
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
              Select Client
            </label>
            {isLoadingClients ? (
              <div className="text-sm text-gray-500">Loading clients...</div>
            ) : (
              <div className="space-y-2">
                <select
                  id="client"
                  value={reportInfo.client_id || ''}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.email && `(${client.email})`}
                    </option>
                  ))}
                </select>
                {reportInfo.client_id && (
                  <button
                    type="button"
                    onClick={() => startEditingClient(reportInfo.client_id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit Selected Client
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {showNewClientForm && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900">Add New Client</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Numbers
                </label>
                {newClient.contact_numbers.map((number, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="tel"
                      value={number}
                      onChange={(e) => updateContactNumber(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone number"
                    />
                    {newClient.contact_numbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactNumber(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addContactNumber}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another number
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewClientForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
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
        
        {editingClient && (
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900">Edit Client</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={editClient.name}
                  onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editClient.email}
                  onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={editClient.address}
                  onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Numbers
                </label>
                {editClient.contact_numbers.map((number, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="tel"
                      value={number}
                      onChange={(e) => updateEditContactNumber(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone number"
                    />
                    {editClient.contact_numbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditContactNumber(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEditContactNumber}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another number
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={cancelEditClient}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditClient}
                disabled={!editClient.name.trim()}
                className={`px-4 py-2 text-sm rounded ${
                  editClient.name.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};