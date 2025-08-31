'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  fileId?: string;
  error?: string;
}

interface MultiFileUploadProps {
  onFilesUploaded: (fileIds: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

export default function MultiFileUpload({ 
  onFilesUploaded, 
  maxFiles = 10, 
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  className = ''
}: MultiFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles.length} more files.`);
      return;
    }

    // Create file objects with initial state
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${file.name}`,
      progress: 0,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);

    // Upload files one by one
    const uploadPromises = newFiles.map(async (fileObj) => {
      try {
        // Update status to uploading
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f)
        );

        const formData = new FormData();
        formData.append('file', fileObj.file);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileObj.id && f.progress < 90 
              ? { ...f, progress: f.progress + 10 } 
              : f)
          );
        }, 100);

        const response = await fetch('http://localhost:8000/api/v1/uploads/single', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Update file with success
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileObj.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100, 
                fileId: result.file_id 
              } 
            : f)
        );

        return result.file_id;
      } catch (error) {
        // Update file with error
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileObj.id 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Upload failed'
              } 
            : f)
        );
        return null;
      }
    });

    // Wait for all uploads to complete
    const fileIds = await Promise.all(uploadPromises);
    const successfulFileIds = fileIds.filter(id => id !== null) as string[];
    
    setIsUploading(false);
    
    if (successfulFileIds.length > 0) {
      onFilesUploaded(successfulFileIds);
    }
  }, [uploadedFiles.length, maxFiles, onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading || uploadedFiles.length >= maxFiles
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-6 h-6 text-green-500" />;
    } else if (file.type === 'application/pdf') {
      return <DocumentIcon className="w-6 h-6 text-red-500" />;
    }
    return <DocumentIcon className="w-6 h-6 text-gray-500" />;
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'uploading': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : uploadedFiles.length >= maxFiles || isUploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-indigo-600">Drop the files here...</p>
        ) : uploadedFiles.length >= maxFiles ? (
          <p className="text-gray-500">Maximum {maxFiles} files reached</p>
        ) : isUploading ? (
          <p className="text-blue-600">Uploading files...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag & drop property documents here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Support for PDF, JPG, PNG files up to 10MB each
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {uploadedFiles.length}/{maxFiles} files selected
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Files to Process ({uploadedFiles.length})
          </h4>
          
          {uploadedFiles.map((fileObj) => (
            <div
              key={fileObj.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(fileObj.status)}`}
            >
              <div className="flex items-center space-x-3 flex-1">
                {getFileIcon(fileObj.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileObj.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                {/* Progress Bar */}
                {fileObj.status === 'uploading' && (
                  <div className="w-24">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${fileObj.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center mt-1">{fileObj.progress}%</p>
                  </div>
                )}
                
                {/* Status */}
                <div className="text-xs font-medium">
                  {fileObj.status === 'completed' && '✓ Uploaded'}
                  {fileObj.status === 'error' && '✗ Failed'}
                  {fileObj.status === 'uploading' && '⟳ Uploading'}
                  {fileObj.status === 'pending' && '⏳ Pending'}
                </div>
              </div>

              {/* Remove Button */}
              {fileObj.status !== 'uploading' && (
                <button
                  onClick={() => removeFile(fileObj.id)}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {uploadedFiles.length > 0 && (
        <div className="text-sm text-gray-600">
          <p>
            {uploadedFiles.filter(f => f.status === 'completed').length} of {uploadedFiles.length} files uploaded successfully
          </p>
          {uploadedFiles.some(f => f.status === 'error') && (
            <p className="text-red-600 mt-1">
              Some files failed to upload. Please try again or contact support.
            </p>
          )}
        </div>
      )}
    </div>
  );
}