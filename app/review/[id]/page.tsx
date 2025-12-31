'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, saveProject } from '@/lib/storage';
import { VideoProject, TransitionOpportunity } from '@/lib/types';
import { generateTransitionOpportunities } from '@/lib/frame-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Video, 
  Clock, 
  ChevronLeft,
  ScanSearch,
  Database,
  Play,
  CheckCircle2,
  Package
} from 'lucide-react';
import { VideoPreview } from '@/components/VideoPreview';
import { ProductInput } from '@/components/ProductInput';
import { PromptEditor } from '@/components/PromptEditor';
import { AnalysisResult, ProductInput as ProductInputType } from '@/types/smart-ad';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [transitions, setTransitions] = useState<TransitionOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simplified states
  const [productInputs, setProductInputs] = useState<Map<string, ProductInputType>>(new Map());
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [analyzingProduct, setAnalyzingProduct] = useState<string | null>(null);
  
  // Video generation states
  const [generating, setGenerating] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{[key: string]: number}>({});
  const [showFinalPreview, setShowFinalPreview] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(new Map());

  // NEW: Phase 5 - Selection & Stitching States
  const [selectedTransitions, setSelectedTransitions] = useState<Set<string>>(new Set());
  const [stitching, setStitching] = useState(false);
  const [stitchProgress, setStitchProgress] = useState(0);
  const [stitchStatus, setStitchStatus] = useState<string>('');
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // Auto-select all completed transitions when they're ready
useEffect(() => {
  const completed = new Set(
    transitions
      .filter(t => t.generated_video_path)
      .map(t => t.id)
  );
  setSelectedTransitions(completed);
}, [transitions]);

// Toggle transition selection
const toggleTransitionSelection = (transitionId: string) => {
  setSelectedTransitions(prev => {
    const newSet = new Set(prev);
    if (newSet.has(transitionId)) {
      newSet.delete(transitionId);
      console.log('❌ Deselected transition:', transitionId);
    } else {
      newSet.add(transitionId);
      console.log('✅ Selected transition:', transitionId);
    }
    return newSet;
  });
};

  useEffect(() => {
    async function loadProject() {
      if (!params.id) return;
      
      const loaded = getProject(params.id as string);
      if (!loaded) {
        setLoading(false);
        return;
      }
  
      setProject(loaded);
  
      if (!loaded.chapters && loaded.mux_asset_id) {
        try {
          const response = await fetch(`/api/mux/asset/${loaded.mux_asset_id}`);
          const data = await response.json();
          
          if (data.success && data.chapters) {
            loaded.chapters = data.chapters;
            loaded.playback_id = data.asset.playback_id;
            saveProject(loaded);
            setProject({ ...loaded });
          }
        } catch (err) {
          console.error('❌ Failed to fetch chapters:', err);
        }
      }
  
      if (loaded.chapters && loaded.chapters.length > 0) {
        if (!loaded.transitions) {
          const opportunities = generateTransitionOpportunities(
            loaded.chapters,
            loaded.playback_id,
            loaded.id
          );
          // ❌ REMOVE THIS LINE:
          // const limited = opportunities.slice(0, 5);
          
          // ✅ USE ALL TRANSITIONS:
          console.log(`✅ Generated ${opportunities.length} transitions`);
          setTransitions(opportunities);
          const updatedProject = { ...loaded, transitions: opportunities };
          saveProject(updatedProject);
          setProject(updatedProject);
        } else {
          setTransitions(loaded.transitions);
        }
      }
  
      setLoading(false);
    }
  
    loadProject();
  }, [params.id]);

  const handleProductSubmit = async (
    transitionId: string, 
    product: ProductInputType,
    mode: 'ai' | 'template' = 'template'
  ) => {
    const transition = transitions.find(t => t.id === transitionId);
    
    // ✅ UPDATED VALIDATION - Accept either image OR text
    if (!transition) {
      alert('Missing transition data');
      return;
    }
  
    if (product.type === 'image' && !product.imageBase64) {
      alert('Missing product image');
      return;
    }
  
    if (product.type === 'text' && !product.description) {
      alert('Missing product description');
      return;
    }
  
    // Store product input BEFORE analysis
    setProductInputs(prev => {
      const newMap = new Map(prev);
      newMap.set(transitionId, product);
      console.log('📦 Stored product for transition:', transitionId);
      return newMap;
    });
  
    setAnalyzingProduct(transitionId);
  
    try {
      // ✅ Handle text descriptions differently
      if (product.type === 'text' && mode === 'template') {
        // For text descriptions with template mode, skip GPT-4V
        console.log('📝 Using text description directly with template');
        
        const HARDCODED_PROMPT_TEMPLATE = `Continue seamlessly from the provided image reference (it is the FIRST FRAME). Preserve the exact same style, character design, linework, shading, environment, lighting logic, and camera feel. Let the reference image determine the setting and cinematography.
  
  Goal: a natural in-world product placement that feels like part of the story (NOT a commercial cutaway). No split-screen, no collage/borders, no captions, no subtitles, no text overlays, no "showroom" background, no product spin, no sudden zooms or angle changes.
  
  Integrate the product described below as a real physical object that belongs in the scene:
  - Match the product description exactly (shape, materials, colors, logo placement).
  - Correct scale relative to the characters and room.
  - Correct perspective + occlusion + contact (hands/feet/surface), with consistent shadows and reflections.
  - Keep the scene narrative-first; the product is revealed through a motivated action.
  
  Auto-choose the most natural placement based on the scene and the product type:
  - If wearable → worn naturally (walking/stepping/adjusting).
  - If handheld → briefly picked up/used/put down.
  - Otherwise → placed as a believable prop in the environment.
  
  Timing (in the allotted clip length): keep one continuous shot with ONE simple camera move and ONE main character action.
  Start: continue the reference action for a brief moment with minimal change.
  Middle: reveal/use the product clearly for about 1–2 seconds total (not centered the whole time).
  End: return focus back to the story and finish on a stable, cut-friendly frame (hold still for the final few frames).
  
  Hard constraints: do not warp logos, do not change the product design, do not add extra brand text, do not introduce new characters, do not change art style.
  
  PRODUCT DESCRIPTION (exact, do not alter):
  ${product.description}`;
  
        // Store analysis result directly
        const analysisResult: AnalysisResult = {
          productName: 'Product (from text description)',
          detailedProductDescription: product.description || '',
          integrationStrategy: 'Template-Based (Text Input)',
          reasoning: 'Using user-provided text description directly with hardcoded prompt template.',
          duration: 5,
          soraPrompt: HARDCODED_PROMPT_TEMPLATE,
          mode: 'template'
        };
  
        setAnalysisResults(prev => {
          const newMap = new Map(prev);
          newMap.set(transitionId, analysisResult);
          console.log('📊 Stored text-based analysis for transition:', transitionId);
          return newMap;
        });
  
        setAnalyzingProduct(null);
        return;
      }
  
      // ✅ For image mode or AI mode, use GPT-4V analysis
      console.log('🔍 Starting GPT-4V analysis for transition:', transitionId);
      console.log('📋 Mode:', mode);
  
      const response = await fetch('/api/analyze/product-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transitionId: transition.id,
          frameAUrl: transition.frame_a_url,
          frameBUrl: transition.frame_b_url,
          productImageBase64: product.imageBase64,
          mode: mode || 'template',
        }),
      });
  
      const data = await response.json();
  
      if (!data.success) {
        throw new Error(data.error);
      }
  
      console.log('✅ Analysis complete for transition:', transitionId);
      
      // Store analysis result
      setAnalysisResults(prev => {
        const newMap = new Map(prev);
        newMap.set(transitionId, data.analysis);
        console.log('📊 Stored analysis for transition:', transitionId);
        return newMap;
      });
  
    } catch (error: any) {
      console.error('❌ Analysis error for transition:', transitionId, error);
      alert('Analysis failed: ' + error.message);
      
      // Remove product input on error
      setProductInputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(transitionId);
        return newMap;
      });
    } finally {
      setAnalyzingProduct(null);
    }
  };

  // Handle video generation
const handleGenerate = async (transitionId: string, finalPrompt: string, duration: 5 | 10 | 12) => {
  const transition = transitions.find(t => t.id === transitionId);

  if (!transition) {
    alert('Missing transition data');
    return;
  }

  setGenerating(transitionId);
  setGenerationProgress(prev => ({ ...prev, [transitionId]: 0 }));

  try {
    console.log('🎬 Starting Wan 2.5 generation...');

    const response = await fetch('/api/generate/video-wan', {  // ⬅️ CHANGED from /video to /video-wan
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transitionId: transition.id,
        frameAUrl: transition.frame_a_url,
        soraPrompt: finalPrompt,
        duration: duration,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    pollGenerationProgress(data.generationId, transitionId);

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    alert('Generation failed: ' + error.message);
    setGenerating(null);
    setGenerationProgress(prev => {
      const updated = { ...prev };
      delete updated[transitionId];
      return updated;
    });
  }
};

  // Poll generation progress
  const pollGenerationProgress = (generationId: string, transitionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate/status/${generationId}`);
        const data = await response.json();

        if (data.success) {
          setGenerationProgress(prev => ({ ...prev, [transitionId]: data.progress }));

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            
            const updatedTransitions = transitions.map(t =>
              t.id === transitionId
                ? { 
                    ...t, 
                    generated_video_path: data.videoUrl,
                    status: 'generated' as const 
                  }
                : t
            );
            
            setTransitions(updatedTransitions);
            
            if (project) {
              const updatedProject = { ...project, transitions: updatedTransitions };
              saveProject(updatedProject);
              setProject(updatedProject);
            }

            setGenerating(null);
            setGenerationProgress(prev => {
              const updated = { ...prev };
              delete updated[transitionId];
              return updated;
            });
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            alert('Generation failed: ' + (data.error || 'Unknown error'));
            setGenerating(null);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

// Handle final video stitching
const stitchFinalVideo = async () => {
  if (!project || selectedTransitions.size === 0) {
    alert('Please select at least one transition to stitch');
    return;
  }

  // Verify project has required data
  if (!project.mux_asset_id) {
    alert('Missing Mux asset ID. Please re-upload your video.');
    return;
  }
  
  const selectedTransitionsList = transitions.filter(t => 
    selectedTransitions.has(t.id) && t.generated_video_path
  );

  if (selectedTransitionsList.length === 0) {
    alert('No valid transitions selected');
    return;
  }

  setStitching(true);
  setStitchProgress(0);
  setStitchStatus('Starting...');
  setFinalVideoUrl(null);

  try {
    console.log('🎬 Starting stitch with', selectedTransitionsList.length, 'transitions');
    console.log('📦 Project data:', {
      id: project.id,
      mux_asset_id: project.mux_asset_id,
      playback_id: project.playback_id
    });
    
    const response = await fetch('/api/stitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        muxAssetId: project.mux_asset_id,        // ⬅️ ADD THIS
        playbackId: project.playback_id,         // ⬅️ ADD THIS
        selectedTransitions: selectedTransitionsList,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to start stitching');
    }

    console.log('✅ Stitch job started, polling for progress...');
    
    // Start polling progress
    pollStitchProgress(project.id);

  } catch (error: any) {
    console.error('❌ Stitching error:', error);
    alert('Stitching failed: ' + error.message);
    setStitching(false);
    setStitchProgress(0);
    setStitchStatus('');
  }
};

// Poll stitch progress
const pollStitchProgress = (projectId: string) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/stitch/status/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setStitchProgress(data.progress || 0);
        setStitchStatus(getStitchStatusMessage(data.status, data));

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          console.log('✅ Stitching completed!');
          
          setFinalVideoUrl(data.videoPath);
          
          // Update project with final video
          if (project) {
            const updatedProject = {
              ...project,
              final_playback_id: data.videoPath,
            };
            saveProject(updatedProject);
            setProject(updatedProject);
          }
          
          setStitching(false);
          
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          console.error('❌ Stitching failed:', data.error);
          alert('Stitching failed: ' + (data.error || 'Unknown error'));
          setStitching(false);
          setStitchProgress(0);
          setStitchStatus('');
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }, 2000); // Poll every 2 seconds
};

// Helper to get user-friendly status messages
const getStitchStatusMessage = (status: string, data: any) => {
  const messages: Record<string, string> = {
    downloading: 'Downloading original video from Mux...',
    planning: 'Planning video segments...',
    clipping: `Clipping segments... (${data.segmentsProcessed || 0}/${data.totalSegments || 0})`,
    concatenating: 'Stitching all segments together...',
    finalizing: 'Finalizing video...',
    completed: 'Complete!',
    failed: 'Failed',
  };
  return messages[status] || 'Processing...';
};

  const resetTransition = (transitionId: string) => {
    // Clean up preview URL
    const preview = imagePreviews.get(transitionId);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    
    const updatedTransitions = transitions.map(t =>
      t.id === transitionId
        ? { ...t, generated_video_path: undefined, status: 'pending' as const }
        : t
    );
    setTransitions(updatedTransitions);
    
    setAnalysisResults(prev => {
      const updated = new Map(prev);
      updated.delete(transitionId);
      return updated;
    });
    
    setProductInputs(prev => {
      const updated = new Map(prev);
      updated.delete(transitionId);
      return updated;
    });
    
    setImagePreviews(prev => {
      const updated = new Map(prev);
      updated.delete(transitionId);
      return updated;
    });
    
    if (project) {
      saveProject({ ...project, transitions: updatedTransitions });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium tracking-widest text-xs uppercase italic">Loading Project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md">
          <Database className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Project Not Found</h2>
          <p className="text-zinc-400 text-sm mb-6">The project does not exist.</p>
          <Button variant="outline" onClick={() => router.push('/')} className="border-zinc-800 hover:bg-zinc-900">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-linear-to-tr from-indigo-600 to-blue-500 p-1.5 rounded-lg">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-linear-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              VISUAL-FIRST AD STUDIO
            </h1>
          </div>
          <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-[10px] uppercase tracking-tighter text-zinc-400">
            Project: {project.id.split('_')[1]}
          </Badge>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12 sm:py-16">
        {/* Summary */}
        <div className="mb-12 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]">
            <ScanSearch className="w-3.5 h-3.5" />
            GPT-4V + Sora 2.0
          </div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-white">{project.title}</h2>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Play className="w-3 h-3" /> Mux: <span className="text-zinc-300 font-mono">{project.mux_asset_id?.slice(0, 8)}...</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {transitions.length} Transitions
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> {transitions.filter(t => t.generated_video_path).length} Generated
            </span>
          </div>
        </div>

        {/* Transitions */}
        {transitions.length > 0 ? (
          <div className="space-y-8">
            {transitions.map((transition, idx) => (
              <Card 
                key={transition.id} 
                className="bg-zinc-900/40 border-white/5 backdrop-blur-sm overflow-hidden hover:border-indigo-500/30 transition-all duration-500 group"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    
                    {/* Frames */}
                    <div className="p-8 lg:w-1/2 bg-zinc-950/50 flex flex-col justify-center gap-6 border-b lg:border-b-0 lg:border-r border-white/5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Transition {idx + 1}</span>
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[9px] uppercase border-none">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          {Math.floor(transition.frame_b_time - transition.frame_a_time)}s Gap
                        </Badge>
                      </div>

                      <div className="relative flex items-center justify-center gap-4">
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                          <img src={transition.frame_a_url} alt="Exit" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <span className="text-[10px] font-bold text-white/70 uppercase">Exit Frame</span>
                            <span className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                              {formatTimeSimple(transition.frame_a_time)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="absolute z-10 bg-indigo-600 p-2 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.6)] group-hover:rotate-12 transition-transform border-2 border-zinc-950">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>

                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                          <img src={transition.frame_b_url} alt="Entry" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <span className="text-[10px] font-bold text-white/70 uppercase">Entry Frame</span>
                            <span className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                              {formatTimeSimple(transition.frame_b_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-1 p-8 space-y-6">
                      {!analysisResults.has(transition.id) && !transition.generated_video_path ? (
                        // Step 1: Product Upload
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-400" />
                            <h5 className="text-sm font-bold text-white uppercase tracking-wide">
                              Upload Product to Advertise
                            </h5>
                          </div>
                          
                          {/* Debug info - remove after testing */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="bg-zinc-800 p-2 rounded text-xs font-mono text-zinc-400">
                              Transition ID: {transition.id}<br/>
                              Has Product: {productInputs.has(transition.id) ? 'Yes' : 'No'}<br/>
                              Has Analysis: {analysisResults.has(transition.id) ? 'Yes' : 'No'}
                            </div>
                          )}
                          
                          <ProductInput
                            key={transition.id}
                            onSubmit={(product, mode) => handleProductSubmit(transition.id, product, mode)}  // ⬅️ ADD mode parameter
                            isAnalyzing={analyzingProduct === transition.id}
                            imagePreview={imagePreviews.get(transition.id)}
                            onImageChange={(preview) => {
                              setImagePreviews(prev => {
                                const newMap = new Map(prev);
                            
                                const old = newMap.get(transition.id);
                                if (old && old !== preview) {
                                  URL.revokeObjectURL(old);
                                }
                            
                                if (preview) newMap.set(transition.id, preview);
                                else newMap.delete(transition.id);
                            
                                return newMap;
                              });
                            }}
                          />
                        </div>
                      ) : analysisResults.has(transition.id) && !transition.generated_video_path ? (
                        // Step 2: Review/Edit Prompt
                        <div className="space-y-4">
                          <PromptEditor
                            productName={analysisResults.get(transition.id)!.productName}
                            detailedProductDescription={analysisResults.get(transition.id)!.detailedProductDescription}
                            integrationStrategy={analysisResults.get(transition.id)!.integrationStrategy}
                            reasoning={analysisResults.get(transition.id)!.reasoning}
                            suggestedDuration={analysisResults.get(transition.id)!.duration}
                            initialPrompt={analysisResults.get(transition.id)!.soraPrompt}
                            onGenerate={(prompt, duration) => handleGenerate(transition.id, prompt, duration)}
                            isGenerating={generating === transition.id}
                            mode={analysisResults.get(transition.id)!.mode}  // ⬅️ ADD
                          />

                          {generating === transition.id && generationProgress[transition.id] !== undefined && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-zinc-400">
                                <span>Generation Progress</span>
                                <span>{generationProgress[transition.id]}%</span>
                              </div>
                              <Progress 
                                value={generationProgress[transition.id]} 
                                className="h-2 bg-zinc-800"
                              />
                              <p className="text-xs text-zinc-500 text-center">
                                {generationProgress[transition.id] < 30 && 'Creating visual composite...'}
                                {generationProgress[transition.id] >= 30 && generationProgress[transition.id] < 70 && 'Sora generating...'}
                                {generationProgress[transition.id] >= 70 && 'Finalizing...'}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : transition.generated_video_path ? (
                        // Step 3: Video Ready
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                              Generated
                            </h5>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] uppercase font-black">
                              Ready
                            </Badge>
                          </div>
                      
                          <VideoPreview 
                            videoUrl={transition.generated_video_path}
                            title={`Transition ${idx + 1}`}
                          />
                      
                          {/* NEW: Selection Checkbox */}
                          <div className="border-t border-zinc-800 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={selectedTransitions.has(transition.id)}
                                onChange={() => toggleTransitionSelection(transition.id)}
                                className="w-5 h-5 rounded border-2 border-zinc-700 bg-zinc-900 checked:bg-indigo-600 checked:border-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 cursor-pointer transition-all"
                              />
                              <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                Include in final video
                              </span>
                              {selectedTransitions.has(transition.id) && (
                                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px] ml-auto">
                                  Selected
                                </Badge>
                              )}
                            </label>
                          </div>
                      
                          <Button
                            onClick={() => {
                              if (confirm('Start over with different product?')) {
                                resetTransition(transition.id);
                              }
                            }}
                            variant="outline"
                            className="w-full border-zinc-800 hover:bg-zinc-900 text-zinc-400"
                          >
                            Try Different Product
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Final Video Section - Show when ANY transitions are complete */}
            {transitions.some(t => t.generated_video_path) && (
              <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30 backdrop-blur-sm overflow-hidden mt-8">
                <CardContent className="p-8 sm:p-12">
                  <div className="text-center space-y-6">
                    {/* Status Badge */}
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
                        {selectedTransitions.size} Ad{selectedTransitions.size !== 1 ? 's' : ''} Selected
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">
                        Create Final Video
                      </h3>
                      <p className="text-zinc-400 max-w-2xl mx-auto text-sm">
                        Selected ads will be stitched into your original video at the transition points.
                      </p>
                    </div>

                    {/* Selection Summary */}
                    {selectedTransitions.size > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {transitions
                          .filter(t => selectedTransitions.has(t.id))
                          .map((t) => {
                            const index = transitions.indexOf(t);
                            return (
                              <Badge
                                key={t.id}
                                className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                              >
                                Transition #{index + 1}
                              </Badge>
                            );
                          })}
                      </div>
                    )}

                    {/* Stitch Button / Progress / Final Video */}
                    {!stitching && !finalVideoUrl ? (
                      <Button
                        onClick={stitchFinalVideo}
                        disabled={selectedTransitions.size === 0}
                        size="lg"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-12 h-14 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Sparkles className="w-5 h-5 mr-2 fill-current" />
                        Stitch {selectedTransitions.size} Ad{selectedTransitions.size !== 1 ? 's' : ''} into Video
                      </Button>
                    ) : stitching ? (
                      // Progress UI
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                          <span className="text-sm font-medium text-zinc-400">
                            {stitchStatus}
                          </span>
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                          <Progress value={stitchProgress} className="h-3 bg-zinc-800" />
                          <p className="text-xs text-zinc-500 text-center">
                            {stitchProgress}% complete
                          </p>
                        </div>
                      </div>
                    ) : finalVideoUrl ? (
                      // Final Video Preview
                      <div className="space-y-4">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-4 py-2">
                          <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                          Final Video Ready
                        </Badge>
                        <div className="max-w-4xl mx-auto">
                          <VideoPreview 
                            videoUrl={finalVideoUrl}
                            title="Final Video with Ads"
                          />
                        </div>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => {
                              // Create download link
                              const link = document.createElement('a');
                              link.href = finalVideoUrl;
                              link.download = `final_video_${project.id}.mp4`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="bg-blue-600 hover:bg-blue-500"
                          >
                            Download Video
                          </Button>
                          <Button
                            onClick={() => {
                              setFinalVideoUrl(null);
                              setStitchProgress(0);
                              setStitchStatus('');
                              // Re-select all completed transitions
                              setSelectedTransitions(new Set(
                                transitions
                                  .filter(t => t.generated_video_path)
                                  .map(t => t.id)
                              ));
                            }}
                            variant="outline"
                            className="border-zinc-800 hover:bg-zinc-900"
                          >
                            Create Different Version
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-900/40 rounded-3xl border border-dashed border-white/10">
            <Video className="w-20 h-20 text-zinc-800 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">No Transitions Found</h3>
            <p className="text-zinc-400 max-w-sm mx-auto text-sm">
              Need at least two scene changes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function formatTimeSimple(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}