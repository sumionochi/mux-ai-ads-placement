'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, saveProject } from '@/lib/storage';
import { VideoProject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  CheckCircle2, 
  Circle, 
  Video, 
  Cpu, 
  Rocket, 
  ArrowLeft,
  Info,
  Layers
} from 'lucide-react';

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [assetDetails, setAssetDetails] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('uploading');

  useEffect(() => {
    if (!params.id) return;

    const storedUploadId = localStorage.getItem(`project_${params.id}_upload_id`);
    setUploadId(storedUploadId);

    let pollInterval: NodeJS.Timeout;

    const pollProject = async () => {
      const loaded = getProject(params.id as string);
      setProject(loaded);

      if (!loaded) return;

      if (!loaded.mux_asset_id && storedUploadId) {
        try {
          const uploadResponse = await fetch(`/api/mux/upload/${storedUploadId}`);
          const uploadData = await uploadResponse.json();

          if (uploadData.success) {
            setUploadStatus(uploadData.upload.status);
            if (uploadData.upload.asset_id) {
              const updatedProject = {
                ...loaded,
                mux_asset_id: uploadData.upload.asset_id,
                status: 'processing' as const,
              };
              saveProject(updatedProject);
              setProject(updatedProject);
            }
            if (uploadData.upload.status === 'errored') {
              const errorProject = { ...loaded, status: 'error' as const };
              saveProject(errorProject);
              setProject(errorProject);
            }
          }
        } catch (err) {
          console.error('Failed to fetch upload status:', err);
        }
      }

      if (loaded.mux_asset_id && loaded.status !== 'ready') {
        try {
          const assetResponse = await fetch(`/api/mux/asset/${loaded.mux_asset_id}`);
          const assetData = await assetResponse.json();

          if (assetData.success) {
            setAssetDetails(assetData);
            if (assetData.asset.status === 'ready') {
              const updatedProject = {
                ...loaded,
                status: 'ready' as const,
                playback_id: assetData.asset.playback_id,
                chapters: assetData.chapters,
              };
              saveProject(updatedProject);
              setProject(updatedProject);
              setTimeout(() => {
                router.push(`/review/${loaded.id}`);
              }, 2000);
            }
            if (assetData.asset.status === 'errored') {
              const errorProject = { ...loaded, status: 'error' as const };
              saveProject(errorProject);
              setProject(errorProject);
            }
          }
        } catch (err) {
          console.error('Failed to fetch asset details:', err);
        }
      }
    };

    pollProject();
    pollInterval = setInterval(pollProject, 3000);
    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [params.id, router]);

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium tracking-widest text-xs uppercase">Initializing Engine...</p>
      </div>
    );
  }

  // FIXED: Explicitly casting to boolean to resolve TypeScript error
  const isUploading = !project.mux_asset_id;
  const isProcessing = !!(project.mux_asset_id && project.status === 'processing');
  const isReady = project.status === 'ready';
  const isError = project.status === 'error';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[20%] h-[20%] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-tr from-indigo-600 to-blue-500 p-1.5 rounded-lg shadow-lg">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              MuxAI Ads
            </h1>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Cancel
          </button>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-12 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Status Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tighter text-white">
                {project.title}
              </h2>
              <div className="flex items-center gap-2 text-indigo-400">
                {isReady ? (
                  <Rocket className="w-4 h-4 animate-bounce" />
                ) : (
                  <Cpu className="w-4 h-4 animate-pulse" />
                )}
                <span className="text-sm font-medium">
                  {isReady ? 'System check complete. Deploying...' : 'AI Pipeline Active'}
                </span>
              </div>
            </div>

            {/* Stepper Implementation */}
            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-indigo-500 before:via-zinc-800 before:to-transparent">
              
              {/* Step 1: Uploading */}
              <div className="relative flex items-start gap-6 group">
                <StatusIcon isActive={isUploading} isDone={!isUploading} />
                <div className="space-y-1">
                  <h3 className={`font-bold tracking-tight ${!isUploading ? 'text-zinc-100' : 'text-indigo-400'}`}>
                    Ingesting Source Media
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {isUploading ? `Status: ${uploadStatus}` : 'Source file successfully mirrored to Mux.'}
                  </p>
                  {uploadId && isUploading && (
                    <code className="block text-[10px] text-zinc-600 font-mono mt-2 bg-zinc-900/50 p-2 rounded border border-white/5">
                      TXID: {uploadId.substring(0, 24)}...
                    </code>
                  )}
                </div>
              </div>

              {/* Step 2: Processing */}
              <div className="relative flex items-start gap-6 group">
                <StatusIcon isActive={isProcessing} isDone={isReady} />
                <div className="space-y-1">
                  <h3 className={`font-bold tracking-tight ${isProcessing ? 'text-indigo-400' : isReady ? 'text-zinc-100' : 'text-zinc-600'}`}>
                    Temporal Analysis & Scene Detection
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {isProcessing 
                      ? 'Neural network scanning for optimal ad insertion markers...' 
                      : isReady 
                      ? 'Analysis successful. 4K proxies generated.' 
                      : 'Awaiting source completion...'}
                  </p>
                  {assetDetails?.asset?.duration && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                      Duration: {assetDetails.asset.duration.toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Ready */}
              <div className="relative flex items-start gap-6 group">
                <StatusIcon isActive={false} isDone={isReady} />
                <div className="space-y-1">
                  <h3 className={`font-bold tracking-tight ${isReady ? 'text-indigo-400' : 'text-zinc-600'}`}>
                    Finalizing Production
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {isReady ? 'Redirecting to Review Suite...' : 'Preparing workspace...'}
                  </p>
                </div>
              </div>
            </div>

            {isError && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                <Info className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400">Pipeline Failure Detected</p>
                  <button onClick={() => router.push('/')} className="text-xs text-red-500/70 underline hover:text-red-400">Restart Session</button>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Column */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="bg-zinc-900/60 border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">System Logs</span>
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <CardContent className="p-6 space-y-6">
                {/* ID Stack */}
                {project.mux_asset_id && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Mux Asset ID</label>
                      <div className="font-mono text-xs text-indigo-300 bg-zinc-950 p-2 rounded border border-white/5 truncate">
                        {project.mux_asset_id}
                      </div>
                    </div>
                    {project.playback_id && (
                      <div className="space-y-1.5 animate-in fade-in">
                        <label className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Playback ID</label>
                        <div className="font-mono text-xs text-blue-300 bg-zinc-950 p-2 rounded border border-white/5 truncate">
                          {project.playback_id}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chapters Section */}
                {project.chapters && project.chapters.length > 0 && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <h4 className="text-xs font-bold uppercase text-zinc-100 tracking-widest flex items-center gap-2">
                      Detected Scenes
                      <span className="text-indigo-500 text-[10px]">({project.chapters.length})</span>
                    </h4>
                    <div className="space-y-2 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
                      {project.chapters.map((chapter, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white">
                            {formatTime(chapter.start_time)}
                          </span>
                          <span className="text-xs font-medium text-zinc-300 truncate ml-4 flex-1 text-right">
                            {chapter.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl bg-linear-to-br from-indigo-500/5 to-transparent border border-white/5">
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                Mux AI is utilizing deep learning to identify semantic boundaries. 
                Average processing time: <span className="text-zinc-300 font-bold">42s</span>
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// Utility Helper for status icons
function StatusIcon({ isActive, isDone }: { isActive: boolean, isDone: boolean }) {
  if (isDone) {
    return (
      <div className="z-10 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all">
        <CheckCircle2 className="w-6 h-6 text-white" />
      </div>
    );
  }
  if (isActive) {
    return (
      <div className="z-10 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-950 border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }
  return (
    <div className="z-10 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-950 border-2 border-zinc-800">
      <Circle className="w-4 h-4 text-zinc-700" />
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}