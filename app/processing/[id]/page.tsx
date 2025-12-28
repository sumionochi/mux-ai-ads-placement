'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, saveProject } from '@/lib/storage';
import { VideoProject } from '@/lib/types';

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [assetDetails, setAssetDetails] = useState<any>(null);

  useEffect(() => {
    if (!params.id) return;

    let pollInterval: NodeJS.Timeout;

    const pollProject = async () => {
      // Load project from localStorage
      const loaded = getProject(params.id as string);
      setProject(loaded);

      if (!loaded) return;

      // If we have an asset ID, fetch details from Mux
      if (loaded.mux_asset_id && loaded.status !== 'ready') {
        try {
          const response = await fetch(`/api/mux/asset/${loaded.mux_asset_id}`);
          const data = await response.json();

          if (data.success) {
            setAssetDetails(data);

            // If asset is ready, update project
            if (data.asset.status === 'ready') {
              const updatedProject = {
                ...loaded,
                status: 'ready' as const,
                playback_id: data.asset.playback_id,
                chapters: data.chapters,
              };
              saveProject(updatedProject);
              setProject(updatedProject);

              // Redirect to review page after 2 seconds
              setTimeout(() => {
                router.push(`/review/${loaded.id}`);
              }, 2000);
            }
          }
        } catch (err) {
          console.error('Failed to fetch asset details:', err);
        }
      }
    };

    // Initial poll
    pollProject();

    // Poll every 3 seconds
    pollInterval = setInterval(pollProject, 3000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [params.id, router]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isUploading = project.status === 'uploading';
  const isProcessing = project.status === 'processing';
  const isReady = project.status === 'ready';
  const isError = project.status === 'error';

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-gray-600 mb-8">
            {isReady 
              ? 'Video is ready! Redirecting...' 
              : 'Processing your video...'}
          </p>

          {/* Status Steps */}
          <div className="space-y-6">
            {/* Step 1: Uploading */}
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isUploading 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {isUploading ? (
                  <div className="animate-spin text-lg">⟳</div>
                ) : (
                  <span className="text-lg">✓</span>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className="font-semibold text-lg">Uploading to Mux</p>
                <p className="text-sm text-gray-500 mt-1">
                  {isUploading 
                    ? 'Uploading your video to Mux servers...' 
                    : 'Upload complete!'}
                </p>
              </div>
            </div>

            {/* Step 2: Processing */}
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isProcessing 
                  ? 'bg-blue-600 text-white' 
                  : isReady
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {isProcessing ? (
                  <div className="animate-spin text-lg">⟳</div>
                ) : isReady ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="text-lg">○</span>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className="font-semibold text-lg">AI Analysis</p>
                <p className="text-sm text-gray-500 mt-1">
                  {isProcessing 
                    ? 'Mux AI is detecting scenes and analyzing video...' 
                    : isReady
                    ? 'Analysis complete!'
                    : 'Waiting for upload to complete...'}
                </p>
                {assetDetails && isProcessing && (
                  <div className="mt-2 text-xs text-gray-400">
                    Duration: {assetDetails.asset.duration?.toFixed(1)}s
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Ready */}
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isReady 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {isReady ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="text-lg">○</span>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className="font-semibold text-lg">Ready for Review</p>
                <p className="text-sm text-gray-500 mt-1">
                  {isReady 
                    ? 'Redirecting to review page...' 
                    : 'Waiting for analysis...'}
                </p>
              </div>
            </div>
          </div>

          {/* Asset Info */}
          {project.mux_asset_id && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Asset ID:</strong> <code className="text-xs">{project.mux_asset_id}</code>
              </p>
              {project.playback_id && (
                <p className="text-sm text-gray-600">
                  <strong>Playback ID:</strong> <code className="text-xs">{project.playback_id}</code>
                </p>
              )}
            </div>
          )}

          {/* Chapters Preview */}
          {project.chapters && project.chapters.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Detected Chapters:</h3>
              <div className="space-y-2">
                {project.chapters.slice(0, 5).map((chapter, idx) => (
                  <div key={idx} className="flex items-center text-sm">
                    <span className="text-gray-500 w-20">
                      {Math.floor(chapter.start_time / 60)}:{String(Math.floor(chapter.start_time % 60)).padStart(2, '0')}
                    </span>
                    <span className="text-gray-700">→</span>
                    <span className="text-gray-500 w-20 ml-2">
                      {Math.floor(chapter.end_time / 60)}:{String(Math.floor(chapter.end_time % 60)).padStart(2, '0')}
                    </span>
                    <span className="ml-4 text-gray-700">{chapter.title}</span>
                  </div>
                ))}
                {project.chapters.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    + {project.chapters.length - 5} more chapters
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                Processing failed. Please try uploading again.
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-3 text-sm text-red-700 underline"
              >
                Go back to upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}