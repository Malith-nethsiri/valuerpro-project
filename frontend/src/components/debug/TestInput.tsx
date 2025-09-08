import { useState } from 'react';

export const TestInput = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '20px' }}>
      <h3>ISOLATED TEST INPUT (No Wizard, No Providers)</h3>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type here - should NEVER lose focus"
        style={{
          width: '300px',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      />
      <p>Current value: {value}</p>
    </div>
  );
};