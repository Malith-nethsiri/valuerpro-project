'use client';

import { useState } from 'react';
import { ocrAPI } from '@/lib/api';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fullText: string;
  pages?: Array<{ page: number; text: string }>;
  ocrId?: string;
  isEdited?: boolean;
  onTextUpdated?: (newText: string) => void;
}

export default function OCRModal({ 
  isOpen, 
  onClose, 
  title, 
  fullText, 
  pages = [], 
  ocrId,
  isEdited = false,
  onTextUpdated 
}: OCRModalProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'full' | 'pages' | 'edit'>('preview');
  const [editedText, setEditedText] = useState(fullText);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const previewText = fullText.slice(0, 1000);
  const showFullTextOption = fullText.length > 1000;
  
  const handleSave = async () => {
    if (!ocrId || editedText === fullText) return;
    
    try {
      setSaving(true);
      await ocrAPI.updateResults(ocrId, editedText);
      onTextUpdated?.(editedText);
      alert('OCR text updated successfully!');
      setViewMode('preview');
    } catch (error: any) {
      alert(`Failed to save changes: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    setEditedText(fullText);
    setViewMode('preview');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              OCR Results: {title}
            </h3>
            {isEdited && (
              <p className="text-sm text-amber-600 mt-1">
                ✓ Text has been edited
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-4 mb-4 border-b">
          <button
            onClick={() => setViewMode('preview')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'preview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Preview
          </button>
          {showFullTextOption && (
            <button
              onClick={() => setViewMode('full')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'full'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Full Text
            </button>
          )}
          {pages.length > 1 && (
            <button
              onClick={() => setViewMode('pages')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'pages'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              By Pages ({pages.length})
            </button>
          )}
          {ocrId && (
            <button
              onClick={() => setViewMode('edit')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'edit'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit Text
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {viewMode === 'preview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {previewText}
                </pre>
                {showFullTextOption && (
                  <div className="mt-2 text-sm text-gray-500">
                    Showing first 1000 characters. Click &ldquo;Full Text&rdquo; to view complete content.
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'full' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {fullText}
                </pre>
              </div>
            </div>
          )}

          {viewMode === 'pages' && pages.length > 0 && (
            <div className="space-y-4">
              {pages.map((page) => (
                <div key={page.page} className="border rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium text-gray-900">
                      Page {page.page}
                    </h4>
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {page.text || 'No text detected on this page.'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'edit' && ocrId && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label htmlFor="editedText" className="block text-sm font-medium text-gray-700 mb-2">
                  Edit OCR Text:
                </label>
                <textarea
                  id="editedText"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="Edit the extracted text here..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || editedText === fullText}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-md"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-gray-500">
            {fullText.length.toLocaleString()} characters extracted
            {pages.length > 1 && ` from ${pages.length} pages`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullText);
                // You could add a toast notification here
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-md"
            >
              Copy Text
            </button>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}