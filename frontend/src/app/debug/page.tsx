'use client';

import { authAPI } from '@/lib/api';

export default function DebugPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  const testConnection = async () => {
    try {
      console.log('Testing connection to:', apiUrl);
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      console.log('Health check response:', data);
      alert(`Health check successful: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Connection failed:', error);
      alert(`Connection failed: ${error.message}`);
    }
  };

  const testRegistration = async () => {
    try {
      console.log('Testing registration API...');
      const testUser = {
        email: 'debugtest@example.com',
        password: 'DebugTest123!',
        full_name: 'Debug Test User',
        registration_no: 'DEBUG123',
        qualifications: 'AIVSL',
        experience_years: 5,
        specialization: 'residential',
        firm_name: 'Debug Firm',
        designation: 'Debug Valuer',
        contact_phone: '+94771234567'
      };
      
      const result = await authAPI.register(testUser);
      console.log('Registration successful:', result);
      alert(`Registration successful: ${result.email}`);
    } catch (error) {
      console.error('Registration failed:', error);
      alert(`Registration failed: ${error.message}\nResponse: ${error.response?.data?.detail || 'No details'}`);
    }
  };

  const testLogin = async () => {
    try {
      console.log('Testing login API...');
      const result = await authAPI.login('qa@valuerpro.com', 'QATesting123!');
      console.log('Login successful:', result);
      alert(`Login successful: Token received`);
    } catch (error) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}\nResponse: ${error.response?.data?.detail || 'No details'}`);
    }
  };

  const testDirectLogin = async () => {
    try {
      console.log('Testing direct login API with fetch...');
      const formData = new FormData();
      formData.append('username', 'qa@valuerpro.com');
      formData.append('password', 'QATesting123!');
      
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, let the browser set it
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Direct login successful:', data);
      alert(`Direct login successful: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Direct login failed:', error);
      alert(`Direct login failed: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Information</h1>
      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <strong>API URL:</strong> {apiUrl || 'NOT SET'}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={testConnection}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#e0e0e0' }}
        >
          Test Health Check
        </button>
        <button 
          onClick={testRegistration}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#ffcccc' }}
        >
          Test Registration
        </button>
        <button 
          onClick={testLogin}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#ccffcc' }}
        >
          Test Login (Axios)
        </button>
        <button 
          onClick={testDirectLogin}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#ccccff' }}
        >
          Test Login (Direct)
        </button>
      </div>
    </div>
  );
}