'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProject } from '@/lib/storage';
import { VideoProject } from '@/lib/types';

export default function Home() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 500MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    
    // Auto-fill title from filename if empty
    if (!title) {
      const filename = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(filename);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setError('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Step 1: Get upload URL from our API
      const response = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create upload');
      }

      const { uploadUrl, uploadId } = data;

      // Step 2: Upload file directly to Mux
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          // Step 3: Create project in localStorage
          const projectId = `project_${Date.now()}`;
          const project: VideoProject = {
            id: projectId,
            mux_asset_id: '', // Will be set by webhook
            playback_id: '',
            title,
            status: 'uploading',
            created_at: Date.now(),
          };

          saveProject(project);

          // Store upload ID for webhook to match
          localStorage.setItem(`upload_${uploadId}`, projectId);

          // Redirect to processing page
          router.push(`/processing/${projectId}`);
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('PUT', uploadUrl);
      xhr.send(file);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Mux AI Ads Placement
          </h1>
          <p className="text-xl text-gray-600">
            Seamless AI-powered video ad transitions
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6">Upload Your Video</h2>

          {/* Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome video"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                {file ? (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
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
                    <p className="mt-2 text-sm text-gray-600">
                      Click to select a video file
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max size: 500MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !title || uploading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Your video will be analyzed by Mux AI to detect optimal ad placement moments
          </p>
        </div>
      </div>
    </div>
  );
}