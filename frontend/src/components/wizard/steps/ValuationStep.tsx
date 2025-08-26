import { useState } from 'react';
import { useWizard } from '../WizardProvider';
import { PlusIcon, TrashIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface ValuationLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  depreciation_pct: number;
  value: number;
  line_type: string;
}

export const ValuationStep = () => {
  const { state, updateStepData } = useWizard();
  const valuation = state.data.valuation;
  const [selectedLineType, setSelectedLineType] = useState('land');

  const addValuationLine = () => {
    const newLine: ValuationLine = {
      id: Date.now().toString(),
      description: '',
      quantity: 0,
      unit: selectedLineType === 'land' ? 'perches' : 'sqft',
      rate: 0,
      depreciation_pct: selectedLineType === 'land' ? 0 : 10,
      value: 0,
      line_type: selectedLineType
    };

    const lines = valuation.lines || [];
    updateStepData('valuation', { lines: [...lines, newLine] });
  };

  const updateValuationLine = (index: number, field: string, value: any) => {
    const lines = [...(valuation.lines || [])];
    lines[index] = { ...lines[index], [field]: value };

    // Auto-calculate value when quantity, rate, or depreciation changes
    if (field === 'quantity' || field === 'rate' || field === 'depreciation_pct') {
      const line = lines[index];
      const grossValue = (line.quantity || 0) * (line.rate || 0);
      const depreciationAmount = grossValue * ((line.depreciation_pct || 0) / 100);
      lines[index].value = grossValue - depreciationAmount;
    }

    updateStepData('valuation', { lines });
    updateSummary();
  };

  const removeValuationLine = (index: number) => {
    const lines = valuation.lines || [];
    const updatedLines = lines.filter((_: ValuationLine, i: number) => i !== index);
    updateStepData('valuation', { lines: updatedLines });
    updateSummary();
  };

  const updateSummary = () => {
    const lines = valuation.lines || [];
    const landLines = lines.filter((line: ValuationLine) => line.line_type === 'land');
    const buildingLines = lines.filter((line: ValuationLine) => line.line_type === 'building');
    const improvementLines = lines.filter((line: ValuationLine) => line.line_type === 'improvement');

    const landValue = landLines.reduce((sum: number, line: ValuationLine) => sum + (line.value || 0), 0);
    const buildingValue = buildingLines.reduce((sum: number, line: ValuationLine) => sum + (line.value || 0), 0);
    const improvementValue = improvementLines.reduce((sum: number, line: ValuationLine) => sum + (line.value || 0), 0);
    
    const marketValue = landValue + buildingValue + improvementValue;
    const fsvPercentage = valuation.summary?.fsv_percentage || 75;
    const forcedSaleValue = marketValue * (fsvPercentage / 100);

    updateStepData('valuation', {
      summary: {
        ...valuation.summary,
        land_value: landValue,
        building_value: buildingValue,
        improvement_value: improvementValue,
        market_value: marketValue,
        forced_sale_value: forcedSaleValue
      }
    });
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    let result = '';
    let thousandIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        result = convertHundreds(chunk) + thousands[thousandIndex] + ' ' + result;
      }
      num = Math.floor(num / 1000);
      thousandIndex++;
    }

    return result.trim() + ' Rupees Only';
  };

  const handleSummaryChange = (field: string, value: any) => {
    const summary = valuation.summary || {};
    const updatedSummary = { ...summary, [field]: value };

    if (field === 'market_value') {
      const marketValue = parseFloat(value) || 0;
      updatedSummary.market_value_words = numberToWords(marketValue);
      
      const fsvPercentage = summary.fsv_percentage || 75;
      updatedSummary.forced_sale_value = marketValue * (fsvPercentage / 100);
    }

    if (field === 'fsv_percentage') {
      const marketValue = summary.market_value || 0;
      const fsvPercentage = parseFloat(value) || 75;
      updatedSummary.forced_sale_value = marketValue * (fsvPercentage / 100);
    }

    updateStepData('valuation', { summary: updatedSummary });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Valuation
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Calculate the market value using detailed valuation lines for land, buildings, and improvements. The system will automatically calculate totals and forced sale values.
        </p>
      </div>

      {/* Valuation Method */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-4">Valuation Approach</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Valuation Method
            </label>
            <select
              value={valuation.method || 'cost_approach'}
              onChange={(e) => updateStepData('valuation', { method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cost_approach">Cost Approach (Land + Buildings)</option>
              <option value="market_approach">Market/Comparison Approach</option>
              <option value="income_approach">Income Approach</option>
              <option value="combined_approach">Combined Approach</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valuation Date
            </label>
            <input
              type="date"
              value={valuation.valuation_date ? valuation.valuation_date.split('T')[0] : ''}
              onChange={(e) => updateStepData('valuation', { 
                valuation_date: e.target.value ? new Date(e.target.value).toISOString() : '' 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Valuation Lines */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Detailed Valuation Breakdown</h4>
          <div className="flex items-center space-x-2">
            <select
              value={selectedLineType}
              onChange={(e) => setSelectedLineType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="land">Land</option>
              <option value="building">Building</option>
              <option value="improvement">Improvement</option>
            </select>
            <button
              onClick={addValuationLine}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add {selectedLineType.charAt(0).toUpperCase() + selectedLineType.slice(1)} Line
            </button>
          </div>
        </div>

        {(!valuation.lines || valuation.lines.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <CalculatorIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No valuation lines added yet.</p>
            <p className="text-sm">Add valuation lines to calculate the property value.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Land Lines */}
            {valuation.lines?.filter((line: ValuationLine) => line.line_type === 'land').length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-800 mb-2 bg-green-100 px-2 py-1 rounded">Land Valuation</h5>
                {valuation.lines
                  .map((line: ValuationLine, index: number) => ({ ...line, originalIndex: index }))
                  .filter((line: any) => line.line_type === 'land')
                  .map((line: any) => (
                    <ValuationLineComponent
                      key={line.id}
                      line={line}
                      index={line.originalIndex}
                      onUpdate={updateValuationLine}
                      onRemove={removeValuationLine}
                    />
                  ))}
              </div>
            )}

            {/* Building Lines */}
            {valuation.lines?.filter((line: ValuationLine) => line.line_type === 'building').length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2 bg-blue-100 px-2 py-1 rounded">Building Valuation</h5>
                {valuation.lines
                  .map((line: ValuationLine, index: number) => ({ ...line, originalIndex: index }))
                  .filter((line: any) => line.line_type === 'building')
                  .map((line: any) => (
                    <ValuationLineComponent
                      key={line.id}
                      line={line}
                      index={line.originalIndex}
                      onUpdate={updateValuationLine}
                      onRemove={removeValuationLine}
                    />
                  ))}
              </div>
            )}

            {/* Improvement Lines */}
            {valuation.lines?.filter((line: ValuationLine) => line.line_type === 'improvement').length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-purple-800 mb-2 bg-purple-100 px-2 py-1 rounded">Improvements Valuation</h5>
                {valuation.lines
                  .map((line: ValuationLine, index: number) => ({ ...line, originalIndex: index }))
                  .filter((line: any) => line.line_type === 'improvement')
                  .map((line: any) => (
                    <ValuationLineComponent
                      key={line.id}
                      line={line}
                      index={line.originalIndex}
                      onUpdate={updateValuationLine}
                      onRemove={removeValuationLine}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Valuation Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-green-900 mb-4">Valuation Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Land Value:</span>
              <span className="text-sm font-semibold text-green-600">
                Rs. {(valuation.summary?.land_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Building Value:</span>
              <span className="text-sm font-semibold text-blue-600">
                Rs. {(valuation.summary?.building_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Improvements Value:</span>
              <span className="text-sm font-semibold text-purple-600">
                Rs. {(valuation.summary?.improvement_value || 0).toLocaleString()}
              </span>
            </div>
            <hr className="border-gray-300" />
            <div className="flex justify-between items-center">
              <span className="text-md font-bold text-gray-900">Total Market Value:</span>
              <span className="text-md font-bold text-green-700">
                Rs. {(valuation.summary?.market_value || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Value (Manual Override)
              </label>
              <input
                type="number"
                value={valuation.summary?.market_value || ''}
                onChange={(e) => handleSummaryChange('market_value', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-calculated from lines above"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FSV Percentage (%)
              </label>
              <input
                type="number"
                min="50"
                max="90"
                value={valuation.summary?.fsv_percentage || 75}
                onChange={(e) => handleSummaryChange('fsv_percentage', parseFloat(e.target.value) || 75)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-orange-100 rounded border border-orange-200">
              <span className="text-md font-bold text-orange-900">Forced Sale Value:</span>
              <span className="text-md font-bold text-orange-700">
                Rs. {(valuation.summary?.forced_sale_value || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Market Value in Words
          </label>
          <textarea
            value={valuation.summary?.market_value_words || ''}
            onChange={(e) => handleSummaryChange('market_value_words', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Auto-generated when market value is entered"
          />
        </div>
      </div>

      {/* Market Analysis */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-yellow-900 mb-4">Market Analysis & Justification</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Land Rate per Perch Justification
            </label>
            <textarea
              value={valuation.land_rate_justification || ''}
              onChange={(e) => updateStepData('valuation', { land_rate_justification: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Explain how the land rate was determined based on market analysis, comparable sales, location factors, etc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Rate Justification
            </label>
            <textarea
              value={valuation.building_rate_justification || ''}
              onChange={(e) => updateStepData('valuation', { building_rate_justification: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Explain how building construction rates were determined, including depreciation factors, condition, and market rates..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Valuation Comments
            </label>
            <textarea
              value={valuation.valuation_comments || ''}
              onChange={(e) => updateStepData('valuation', { valuation_comments: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide overall comments on the valuation approach, any assumptions made, market conditions, and factors affecting the value..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for valuation lines
interface ValuationLineComponentProps {
  line: ValuationLine & { originalIndex: number };
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

const ValuationLineComponent = ({ line, index, onUpdate, onRemove }: ValuationLineComponentProps) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 border border-gray-200 rounded bg-gray-50">
      <div className="col-span-12 md:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={line.description || ''}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Land extent, Building area"
        />
      </div>
      
      <div className="col-span-3 md:col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
        <input
          type="number"
          step="0.01"
          value={line.quantity || ''}
          onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="col-span-3 md:col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
        <select
          value={line.unit || ''}
          onChange={(e) => onUpdate(index, 'unit', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="perches">Perches</option>
          <option value="sqft">Sq Ft</option>
          <option value="sqm">Sq M</option>
          <option value="each">Each</option>
          <option value="lump">Lump Sum</option>
        </select>
      </div>

      <div className="col-span-3 md:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">Rate (Rs.)</label>
        <input
          type="number"
          step="0.01"
          value={line.rate || ''}
          onChange={(e) => onUpdate(index, 'rate', parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="col-span-3 md:col-span-1">
        <label className="block text-xs font-medium text-gray-700 mb-1">Depr %</label>
        <input
          type="number"
          min="0"
          max="100"
          value={line.depreciation_pct || 0}
          onChange={(e) => onUpdate(index, 'depreciation_pct', parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="col-span-8 md:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Value (Rs.)</label>
        <div className="flex">
          <input
            type="number"
            value={line.value || 0}
            readOnly
            className="flex-1 px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-l focus:outline-none"
          />
        </div>
      </div>

      <div className="col-span-4 md:col-span-1 text-right">
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          title="Remove line"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};