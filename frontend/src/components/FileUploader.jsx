import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function FileUploader() {
  const { uploadFile, loading } = useApp();
  const [uploadStatus, setUploadStatus] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadStatus('uploading');
    try {
      await uploadFile(file);
      setUploadStatus('success');
      toast.success(`Successfully loaded ${file.name}`);
    } catch (error) {
      setUploadStatus('error');
      toast.error(error.message || 'Failed to upload file');
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {loading ? (
          <>
            <div className="loading-spinner w-12 h-12 border-4" />
            <p className="text-gray-600">Uploading and processing...</p>
          </>
        ) : uploadStatus === 'success' ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-gray-600">File uploaded successfully!</p>
            <p className="text-sm text-gray-400">Drop another file to replace</p>
          </>
        ) : uploadStatus === 'error' ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-600">Upload failed. Please try again.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              {isDragActive ? (
                <FileSpreadsheet className="w-8 h-8 text-primary-600" />
              ) : (
                <Upload className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your data file'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse
              </p>
            </div>
            <div className="flex gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded">CSV</span>
              <span className="px-2 py-1 bg-gray-100 rounded">XLSX</span>
              <span className="px-2 py-1 bg-gray-100 rounded">XLS</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
