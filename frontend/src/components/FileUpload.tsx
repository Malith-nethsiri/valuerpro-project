'use client';

import { useState, useCallback } from 'react';
import { apiClient, ocrAPI } from '@/lib/api';
import OCRModal from './OCRModal';
import AIAnalysisModal from './AIAnalysisModal';
import BatchAnalysisModal from './BatchAnalysisModal';

interface UploadedFile {
  file_id: string;
  filename: string;
  original_filename: string;
  path: string;
  mime_type: string;
  size: number;
  report_id?: string;
  uploaded_at: string;
  ocrText?: string;
  ocrProcessing?: boolean;
  documentType?: string;
  aiAnalysis?: any;
  translationApplied?: boolean;
  detectedLanguages?: string;
}

interface FileUploadProps {
  reportId?: string;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  onAiDataExtracted?: (aiAnalysis: any) => void; // Callback for AI auto-population
}

export default function FileUpload({ reportId, onFilesUploaded, multiple = true, onAiDataExtracted }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [ocrResults, setOcrResults] = useState<Record<string, any>>({});
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [selectedOcrResult, setSelectedOcrResult] = useState<any>(null);
  const [analyzingFiles, setAnalyzingFiles] = useState<Set<string>>(new Set());
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchAnalysisModalOpen, setBatchAnalysisModalOpen] = useState(false);
  const [batchAnalysisResult, setBatchAnalysisResult] = useState<any>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/tif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    
    if (file.size > maxSize) {
      throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File "${file.name}" has unsupported format. Allowed: PDF, JPG, PNG, TIFF, DOCX.`);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (reportId) {
      formData.append('report_id', reportId);
    }

    try {
      const response = await apiClient.post('/uploads/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          }
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || `Failed to upload ${file.name}`);
    }
  };

  const uploadFiles = async (fileList: File[]) => {
    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];
    const errors: string[] = [];
    const totalFiles = fileList.length;

    // Validate all files first
    const validFiles: File[] = [];
    for (const file of fileList) {
      try {
        validateFile(file);
        validFiles.push(file);
      } catch (error: any) {
        errors.push(error.message);
      }
    }

    // Process uploads with better progress tracking
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const uploadedFile = await uploadFile(file);
        uploadedFiles.push(uploadedFile);
      } catch (error: any) {
        errors.push(`Upload failed for "${file.name}": ${error.message}`);
      }
    }

    // Show comprehensive results
    if (errors.length > 0) {
      const successCount = uploadedFiles.length;
      const errorCount = errors.length;
      
      let message = '';
      if (successCount > 0) {
        message += `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}.\n`;
      }
      if (errorCount > 0) {
        message += `${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload:\n${errors.join('\n')}`;
      }
      alert(message);
    } else if (uploadedFiles.length > 0) {
      // Success message for all files
      const count = uploadedFiles.length;
      console.log(`Successfully uploaded ${count} file${count > 1 ? 's' : ''}`);
    }

    const newFiles = [...files, ...uploadedFiles];
    setFiles(newFiles);
    onFilesUploaded?.(newFiles);
    
    setUploading(false);
    setUploadProgress({});
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const filesArray = Array.from(fileList);
    
    if (!multiple && filesArray.length > 1) {
      alert('Only one file is allowed');
      return;
    }

    if (filesArray.length > 10) {
      alert('Maximum 10 files allowed');
      return;
    }

    uploadFiles(filesArray);
  }, [multiple]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    const newFiles = files.filter(f => f.file_id !== fileId);
    setFiles(newFiles);
    onFilesUploaded?.(newFiles);
  };

  const runOCR = async (file: UploadedFile) => {
    try {
      // Update file state to show OCR processing
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.file_id === file.file_id 
            ? { ...f, ocrProcessing: true }
            : f
        )
      );

      // Try using file_id first, fallback to file path
      const result = await ocrAPI.extractText(file.path, file.file_id);
      
      // Update OCR results
      setOcrResults(prev => ({
        ...prev,
        [file.file_id]: result
      }));

      // Update file state with OCR text and AI data
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.file_id === file.file_id 
            ? { 
                ...f, 
                ocrText: result.full_text, 
                ocrProcessing: false,
                documentType: result.document_type,
                aiAnalysis: result.ai_extracted_data,
                translationApplied: result.translation_applied,
                detectedLanguages: result.detected_languages
              }
            : f
        )
      );

      // Notify parent component
      const updatedFiles = files.map(f => 
        f.file_id === file.file_id 
          ? { 
              ...f, 
              ocrText: result.full_text, 
              ocrProcessing: false,
              documentType: result.document_type,
              aiAnalysis: result.ai_extracted_data,
              translationApplied: result.translation_applied,
              detectedLanguages: result.detected_languages
            }
          : f
      );
      onFilesUploaded?.(updatedFiles);

    } catch (error: any) {
      alert(`OCR failed for ${file.original_filename}: ${error.response?.data?.detail || error.message}`);
      
      // Reset processing state
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.file_id === file.file_id 
            ? { ...f, ocrProcessing: false }
            : f
        )
      );
    }
  };

  const viewOcrResults = async (file: UploadedFile) => {
    try {
      // First try to get from local state
      let ocrData = ocrResults[file.file_id];
      
      // If not in local state, try to fetch from database
      if (!ocrData) {
        try {
          const dbOcrResult = await ocrAPI.getResults(file.file_id);
          // Convert database format to expected format
          ocrData = {
            pages: dbOcrResult.pages_data?.map((p: any) => ({ page: p.page, text: p.text })) || [],
            full_text: dbOcrResult.edited_text || dbOcrResult.full_text || '',
            total_pages: dbOcrResult.pages_data?.length || 1,
            file_path: file.path,
            ocrId: dbOcrResult.id,
            isEdited: dbOcrResult.is_edited
          };
          // Update local state
          setOcrResults(prev => ({
            ...prev,
            [file.file_id]: ocrData
          }));
        } catch (error) {
          console.log('No OCR result found in database, using local data');
        }
      }
      
      if (ocrData) {
        setSelectedOcrResult({
          filename: file.original_filename,
          fileId: file.file_id,
          ...ocrData
        });
        setOcrModalOpen(true);
      } else {
        alert('No OCR results available. Please run OCR first.');
      }
    } catch (error: any) {
      alert(`Failed to load OCR results: ${error.message}`);
    }
  };
  
  const handleTextUpdated = (fileId: string, newText: string) => {
    // Update local OCR results
    setOcrResults(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        full_text: newText,
        isEdited: true
      }
    }));
    
    // Update files state
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.file_id === fileId 
          ? { ...f, ocrText: newText }
          : f
      )
    );
  };
  
  const analyzeDocument = async (file: UploadedFile) => {
    if (!file.ocrText) {
      alert('Please run OCR first before analyzing the document');
      return;
    }
    
    try {
      setAnalyzingFiles(prev => new Set([...prev, file.file_id]));
      
      const result = await ocrAPI.analyzeDocument(file.file_id);
      
      // Update file state with analysis data
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.file_id === file.file_id 
            ? { 
                ...f, 
                aiAnalysis: result.document_analysis,
                documentType: result.document_analysis?.document_type
              }
            : f
        )
      );
      
      // Update OCR results
      setOcrResults(prev => ({
        ...prev,
        [file.file_id]: {
          ...prev[file.file_id],
          aiAnalysis: result.document_analysis
        }
      }));

      // Trigger auto-population if callback is provided
      if (onAiDataExtracted && result.document_analysis) {
        onAiDataExtracted(result.document_analysis);
      }
      
    } catch (error: any) {
      alert(`Document analysis failed for ${file.original_filename}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setAnalyzingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.file_id);
        return newSet;
      });
    }
  };
  
  const viewAiAnalysis = (file: UploadedFile) => {
    if (!file.aiAnalysis) {
      alert('No AI analysis available. Please run document analysis first.');
      return;
    }
    
    setSelectedAnalysis({
      filename: file.original_filename,
      fileId: file.file_id,
      analysis: file.aiAnalysis,
      documentType: file.documentType
    });
    setAiAnalysisModalOpen(true);
  };

  const runBatchAnalysis = async () => {
    if (files.length === 0) {
      alert('No files to process');
      return;
    }

    if (files.length < 2) {
      alert('Batch analysis requires at least 2 files for cross-document validation');
      return;
    }

    setBatchProcessing(true);
    
    try {
      const fileIds = files.map(f => f.file_id);
      
      const response = await apiClient.post('/batch-ocr/batch-process', {
        file_ids: fileIds,
        consolidate_analysis: true,
        auto_populate: true
      });
      
      setBatchAnalysisResult(response.data);
      setBatchAnalysisModalOpen(true);
      
      // Update files with results
      const updatedFiles = files.map(file => {
        const result = response.data.files.find((r: any) => r.file_id === file.file_id);
        if (result && result.success) {
          return {
            ...file,
            ocrText: result.ocr_text,
            aiAnalysis: result.ai_analysis,
            documentType: result.document_type,
            ocrProcessing: false
          };
        }
        return file;
      });
      
      setFiles(updatedFiles);
      onFilesUploaded?.(updatedFiles);
      
    } catch (error: any) {
      alert(`Batch analysis failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchAutoPopulation = (autoPopulationData: any) => {
    if (onAiDataExtracted) {
      onAiDataExtracted(autoPopulationData);
    }
    setBatchAnalysisModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={multiple}
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.doc"
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600">
            <span className="font-medium text-indigo-600 hover:text-indigo-500">
              Click to upload
            </span>{' '}
            or drag and drop
          </div>
          <p className="text-xs text-gray-500">
            PDF, JPG, PNG, TIFF, DOCX up to 10MB {multiple && '(max 10 files)'}
          </p>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                Uploaded Files ({files.length})
              </h4>
              {files.length >= 2 && (
                <button
                  onClick={runBatchAnalysis}
                  disabled={batchProcessing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  title="Process all files together with cross-document validation and consolidated analysis"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {batchProcessing ? 'Processing All Files...' : 'Smart Batch Analysis'}
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div key={file.file_id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {file.mime_type === 'application/pdf' ? (
                      <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    ) : file.mime_type?.includes('word') || file.mime_type?.includes('document') ? (
                      <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
                        <path d="M6 7h8v1H6V7zm0 2h8v1H6V9zm0 2h5v1H6v-1z" />
                      </svg>
                    ) : file.mime_type?.startsWith('image/') ? (
                      <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.mime_type}
                      {file.ocrText && <span className="text-green-600"> • OCR Complete</span>}
                      {file.documentType && (
                        <span className="text-blue-600"> • {file.documentType.replace('_', ' ').toUpperCase()}</span>
                      )}
                      {file.translationApplied && (
                        <span className="text-purple-600"> • Translated</span>
                      )}
                    </p>
                    {file.detectedLanguages && file.detectedLanguages !== 'unknown' && (
                      <p className="text-xs text-gray-400">
                        Languages: {file.detectedLanguages}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => runOCR(file)}
                    disabled={file.ocrProcessing}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 hover:text-indigo-800 transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Extract text using Google Vision OCR"
                  >
                    <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {file.ocrProcessing ? 'Processing...' : 'Run OCR'}
                  </button>
                  {file.ocrText && (
                    <>
                      <button
                        onClick={() => analyzeDocument(file)}
                        disabled={analyzingFiles.has(file.file_id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 hover:text-blue-800 transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Analyze with AI to extract structured data"
                      >
                        <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {analyzingFiles.has(file.file_id) ? 'Analyzing...' : 'Analyze'}
                      </button>
                      <button
                        onClick={() => viewOcrResults(file)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 hover:text-green-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                        title="View extracted text"
                      >
                        <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Text
                      </button>
                      {file.aiAnalysis && (
                        <>
                          <button
                            onClick={() => viewAiAnalysis(file)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 hover:text-purple-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                            title="View AI analysis results"
                          >
                            <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            View Analysis
                          </button>
                          {onAiDataExtracted && (
                            <button
                              onClick={() => onAiDataExtracted(file.aiAnalysis)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 hover:text-orange-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                              title="Auto-populate wizard fields from AI analysis"
                            >
                              <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Auto-populate
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => removeFile(file.file_id)}
                    className="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 hover:text-red-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                    title="Remove file"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Modal */}
      <OCRModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        title={selectedOcrResult?.filename || 'OCR Results'}
        fullText={selectedOcrResult?.full_text || ''}
        pages={selectedOcrResult?.pages || []}
        ocrId={selectedOcrResult?.ocrId}
        isEdited={selectedOcrResult?.isEdited || false}
        onTextUpdated={(newText) => {
          if (selectedOcrResult?.fileId) {
            handleTextUpdated(selectedOcrResult.fileId, newText);
          }
        }}
      />

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={aiAnalysisModalOpen}
        onClose={() => setAiAnalysisModalOpen(false)}
        title={selectedAnalysis?.filename || 'AI Analysis'}
        analysis={selectedAnalysis?.analysis}
        documentType={selectedAnalysis?.documentType}
      />

      {/* Batch Analysis Modal */}
      <BatchAnalysisModal
        isOpen={batchAnalysisModalOpen}
        onClose={() => setBatchAnalysisModalOpen(false)}
        result={batchAnalysisResult}
        onApplyAutoPopulation={handleBatchAutoPopulation}
      />
    </div>
  );
}