import { useState } from 'react';
import { useWizard } from '../WizardProvider';
import { filesAPI } from '@/lib/api';
import { UploadedFile } from '@/types';
import { 
  DocumentIcon, 
  PhotoIcon, 
  MapIcon, 
  TrashIcon, 
  EyeIcon,
  ArrowUpTrayIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

export const AppendicesStep = () => {
  const { state, updateStepData } = useWizard();
  const appendices = state.data.appendices;
  const [activeTab, setActiveTab] = useState('documents');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const handleFileUpload = async (category: 'files' | 'photos', files: FileList | null) => {
    if (!files || !state.reportId) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    
    try {
      // Upload files to backend
      const uploadPromises = fileArray.map(async (file) => {
        const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));
        
        try {
          const uploadedFile = await filesAPI.uploadSingle(file, state.reportId!);
          
          // Convert backend response to our format
          const processedFile = {
            id: uploadedFile.file_id,
            file_name: uploadedFile.original_filename,
            file_size: uploadedFile.size,
            file_type: uploadedFile.mime_type,
            upload_date: uploadedFile.uploaded_at,
            category: category,
            description: '',
            file_url: uploadedFile.path,
            processing_status: 'completed' as const,
            backend_file_id: uploadedFile.file_id
          };
          
          setUploadProgress(prev => ({ ...prev, [tempId]: 100 }));
          return processedFile;
        } catch (error) {
          console.error('Error uploading file:', file.name, error);
          setUploadProgress(prev => ({ ...prev, [tempId]: -1 })); // -1 indicates error
          return null;
        }
      });

      const uploadedFiles = (await Promise.all(uploadPromises)).filter(file => file !== null);
      
      if (uploadedFiles.length > 0) {
        const currentFiles = appendices[category] || [];
        updateStepData('appendices', {
          [category]: [...currentFiles, ...uploadedFiles]
        });
      }
    } catch (error) {
      console.error('Error during file upload:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const removeFile = async (category: 'files' | 'photos', fileId: string) => {
    const currentFiles = appendices[category] || [];
    const fileToRemove = currentFiles.find((file: any) => file.id === fileId);
    
    if (fileToRemove?.backend_file_id) {
      try {
        await filesAPI.delete(fileToRemove.backend_file_id);
      } catch (error) {
        console.error('Error deleting file from backend:', error);
        // Continue with local removal even if backend deletion fails
      }
    }
    
    const updatedFiles = currentFiles.filter((file: any) => file.id !== fileId);
    updateStepData('appendices', { [category]: updatedFiles });
  };

  const updateFileDescription = async (category: 'files' | 'photos', fileId: string, description: string) => {
    const currentFiles = appendices[category] || [];
    const fileToUpdate = currentFiles.find((file: any) => file.id === fileId);
    
    // Update backend if the file was uploaded
    if (fileToUpdate?.backend_file_id) {
      try {
        await filesAPI.updateMetadata(fileToUpdate.backend_file_id, description);
      } catch (error) {
        console.error('Error updating file description in backend:', error);
        // Continue with local update even if backend update fails
      }
    }
    
    const updatedFiles = currentFiles.map((file: any) => 
      file.id === fileId ? { ...file, description } : file
    );
    updateStepData('appendices', { [category]: updatedFiles });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Appendices & Supporting Documents
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload and organize all supporting documents, photographs, maps, and other materials that will be included in the final valuation report.
        </p>
      </div>

      {/* File Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentIcon className="w-5 h-5 inline mr-2" />
            Documents ({(appendices.files || []).length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'photos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PhotoIcon className="w-5 h-5 inline mr-2" />
            Photos ({(appendices.photos || []).length})
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maps'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapIcon className="w-5 h-5 inline mr-2" />
            Maps & Plans
          </button>
        </nav>
      </div>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-blue-900 mb-4">Supporting Documents</h4>
            
            {/* Upload Area */}
            <div className="mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <DocumentIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload documents such as deeds, survey plans, title documents, permits, etc.
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                </p>
                <label className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload('files', e.target.files)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Choose Documents'}
                  </span>
                </label>
              </div>
            </div>

            {/* Document List */}
            {(!appendices.files || appendices.files.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appendices.files.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center flex-1">
                      <DocumentIcon className="w-8 h-8 text-blue-500 mr-3" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="text-sm font-medium text-gray-900">{file.file_name}</h5>
                          <span className="text-xs text-gray-500">({formatFileSize(file.file_size)})</span>
                        </div>
                        <input
                          type="text"
                          value={file.description || ''}
                          onChange={(e) => updateFileDescription('files', file.id, e.target.value)}
                          placeholder="Add description..."
                          className="mt-1 w-full text-sm border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 rounded">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeFile('files', file.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document Categories */}
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Recommended Document Categories:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <span className="bg-gray-100 px-2 py-1 rounded">Title Deeds</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Survey Plans</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Building Plans</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Planning Permits</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Tax Assessments</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Property Certificates</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Previous Valuations</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Legal Documents</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Inspection Reports</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-green-900 mb-4">Property Photographs</h4>
            
            {/* Upload Area */}
            <div className="mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload property photographs showing exterior, interior, and key features
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supported formats: JPG, JPEG, PNG, HEIC (Max 5MB per file)
                </p>
                <label className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.heic"
                    onChange={(e) => handleFileUpload('photos', e.target.files)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <PhotoIcon className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Photos'}
                  </span>
                </label>
              </div>
            </div>

            {/* Photo Grid */}
            {(!appendices.photos || appendices.photos.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No photos uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appendices.photos.map((photo: any) => (
                  <div key={photo.id} className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Photo Preview */}
                    <div className="aspect-w-16 aspect-h-12 bg-gray-100">
                      {photo.file_url ? (
                        <img 
                          src={photo.file_url} 
                          alt={photo.file_name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-48">
                          <PhotoIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Photo Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900 truncate">{photo.file_name}</h5>
                        <button 
                          onClick={() => removeFile('photos', photo.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={photo.description || ''}
                        onChange={(e) => updateFileDescription('photos', photo.id, e.target.value)}
                        placeholder="Add caption..."
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(photo.file_size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Guidelines */}
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Photography Guidelines:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <ul className="space-y-1 list-disc list-inside">
                  <li>Front elevation of the property</li>
                  <li>Rear elevation and backyard</li>
                  <li>Street view and neighborhood</li>
                  <li>Interior rooms (if accessible)</li>
                  <li>Notable features and amenities</li>
                </ul>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Building condition and defects</li>
                  <li>Access roads and parking</li>
                  <li>Boundaries and fencing</li>
                  <li>Utilities and services</li>
                  <li>Surrounding developments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maps & Plans Tab */}
      {activeTab === 'maps' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-yellow-900 mb-4">Maps & Location Plans</h4>
            
            {/* Static Map Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Location Map</h5>
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-100 rounded mb-3 flex items-center justify-center">
                    {appendices.location_map_url ? (
                      <img 
                        src={appendices.location_map_url} 
                        alt="Location Map"
                        className="w-full h-64 object-cover rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <MapIcon className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No location map available</p>
                      </div>
                    )}
                  </div>
                  <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                    Generate Location Map
                  </button>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Satellite View</h5>
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-100 rounded mb-3 flex items-center justify-center">
                    {appendices.satellite_map_url ? (
                      <img 
                        src={appendices.satellite_map_url} 
                        alt="Satellite Map"
                        className="w-full h-64 object-cover rounded"
                      />
                    ) : (
                      <div className="text-center">
                        <MapIcon className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No satellite view available</p>
                      </div>
                    )}
                  </div>
                  <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                    Generate Satellite View
                  </button>
                </div>
              </div>
            </div>

            {/* Map Settings */}
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Map Configuration</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Map Zoom Level</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="14">Close-up (Building level)</option>
                    <option value="16">Medium (Street level)</option>
                    <option value="18">Wide (Neighborhood)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Map Type</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="roadmap">Road Map</option>
                    <option value="satellite">Satellite</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="terrain">Terrain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Image Size</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500">
                    <option value="640x640">640 x 640 (Standard)</option>
                    <option value="800x600">800 x 600 (Wide)</option>
                    <option value="1024x768">1024 x 768 (Large)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Organization */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Report Organization</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appendix Numbering Style
            </label>
            <select
              value={appendices.numbering_style || 'letters'}
              onChange={(e) => updateStepData('appendices', { numbering_style: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="letters">Letters (A, B, C...)</option>
              <option value="numbers">Numbers (1, 2, 3...)</option>
              <option value="roman">Roman (I, II, III...)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Layout
            </label>
            <select
              value={appendices.page_layout || 'one_per_page'}
              onChange={(e) => updateStepData('appendices', { page_layout: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="one_per_page">One Document/Photo per Page</option>
              <option value="multiple_per_page">Multiple Items per Page</option>
              <option value="best_fit">Best Fit (Auto-arrange)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Appendices Instructions
          </label>
          <textarea
            value={appendices.instructions || ''}
            onChange={(e) => updateStepData('appendices', { instructions: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any special instructions for how appendices should be organized or presented in the final report..."
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-blue-900 mb-3">Appendices Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Documents:</span>
            <span className="text-blue-600">{(appendices.files || []).length} files</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Photographs:</span>
            <span className="text-green-600">{(appendices.photos || []).length} photos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Maps/Plans:</span>
            <span className="text-yellow-600">
              {(appendices.location_map_url ? 1 : 0) + (appendices.satellite_map_url ? 1 : 0)} maps
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};