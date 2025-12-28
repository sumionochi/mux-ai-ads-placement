'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProject } from '@/lib/storage';
import { VideoProject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Video, Sparkles, Zap, Eye, ChevronRight } from 'lucide-react';

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

    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 500MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    
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

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const projectId = `project_${Date.now()}`;
          const project: VideoProject = {
            id: projectId,
            mux_asset_id: '',
            playback_id: '',
            title,
            status: 'uploading',
            created_at: Date.now(),
          };

          saveProject(project);
          localStorage.setItem(`project_${projectId}_upload_id`, uploadId);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30 font-sans antialiased">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-linear-to-tr from-indigo-600 to-blue-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Mux AI Ads Placement
            </h1>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-indigo-400 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Transitions with Veo 3.1
          </div>
          
          <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-balance">
            Seamless Ads. <br />
            <span className="bg-linear-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Zero Interruptions.
            </span>
          </h2>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Revolutionize viewer engagement with AI-driven ad placement. We detect the perfect 
            moment to blend sponsored content into your narrative.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Features */}
          <div className="lg:col-span-5 space-y-8 py-4">
            {[
              { icon: Video, title: "Smart Analysis", desc: "Mux AI scans scenes for natural break points.", color: "text-blue-400" },
              { icon: Zap, title: "Instant Generation", desc: "Veo 3.1 synthesizes transitions in seconds.", color: "text-indigo-400" },
              { icon: Eye, title: "Native Experience", desc: "Ads look like part of the original production.", color: "text-purple-400" },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 group">
                <div className={`mt-1 p-2 rounded-lg bg-zinc-900 border border-white/5 ${feature.color} group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-snug">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Upload Card */}
          <div className="lg:col-span-7">
            <Card className="bg-zinc-900/40 border-white/10 backdrop-blur-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
              
              <CardHeader>
                <CardTitle className="text-xl">Upload Media</CardTitle>
                <CardDescription className="text-zinc-500">
                  Select a video to begin AI-powered ad detection.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-zinc-300 text-xs uppercase tracking-widest font-bold">Project Title</Label>
                  <Input
                    id="title"
                    placeholder="E.g. Summer Vlog 2024"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                    className="bg-zinc-950/50 border-white/5 focus-visible:ring-indigo-500 h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs uppercase tracking-widest font-bold">Video File</Label>
                  <div 
                    className={`
                      relative group border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300
                      ${file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'}
                      ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      {file ? (
                        <div className="space-y-3 animate-in zoom-in-95 duration-300">
                          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-indigo-500/10">
                            <Video className="w-8 h-8 text-indigo-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-100 truncate max-w-xs mx-auto">
                              {file.name}
                            </p>
                            <p className="text-xs text-zinc-500 uppercase">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          {!uploading && (
                            <span className="text-[10px] text-indigo-400 font-bold tracking-tighter uppercase underline decoration-indigo-500/30 underline-offset-4">
                              Swap File
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center mx-auto border border-white/5 group-hover:border-indigo-500/50 transition-colors">
                            <Upload className="w-6 h-6 text-zinc-500 group-hover:text-indigo-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-zinc-300">Drag and drop your video</p>
                            <p className="text-xs text-zinc-500">MP4, MOV up to 500MB</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                {uploading && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Transmitting to Mux
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5 bg-zinc-800" />
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || !title || uploading}
                  className="w-full h-12 text-sm font-bold tracking-wide transition-all duration-300 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-3" />
                      Processing Pipeline...
                    </>
                  ) : (
                    <>
                      Upload & Start Analysis
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <p className="mt-6 text-center text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
              Secure AES-256 Encryption &middot; Powered by Mux
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}