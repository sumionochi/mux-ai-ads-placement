'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, saveProject } from '@/lib/storage';
import { VideoProject, TransitionOpportunity } from '@/lib/types';
import { generateTransitionOpportunities } from '@/lib/frame-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Video, 
  Camera, 
  Zap, 
  Clock, 
  ChevronLeft,
  ScanSearch,
  Database,
  Terminal,
  Play
} from 'lucide-react';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [transitions, setTransitions] = useState<TransitionOpportunity[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(0);
  const [loading, setLoading] = useState(true);

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
          const limited = opportunities.slice(0, 5);
          setTransitions(limited);
          const updatedProject = { ...loaded, transitions: limited };
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

  const analyzeTransition = async (transition: TransitionOpportunity) => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameAUrl: transition.frame_a_url,
          frameBUrl: transition.frame_b_url,
          frameATime: transition.frame_a_time,
          frameBTime: transition.frame_b_time,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedTransitions = transitions.map(t =>
          t.id === transition.id
            ? { ...t, analysis: data.analysis, status: 'analyzed' as const }
            : t
        );
        setTransitions(updatedTransitions);
        if (project) {
          const updatedProject = { ...project, transitions: updatedTransitions };
          saveProject(updatedProject);
          setProject(updatedProject);
        }
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (error) {
      alert('Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeAll = async () => {
    setAnalyzing(true);
    setCurrentAnalysis(0);

    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      if (transition.status === 'pending') {
        setCurrentAnalysis(i + 1);
        await analyzeTransition(transition);
        if (i < transitions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    setAnalyzing(false);
    setCurrentAnalysis(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium tracking-widest text-xs uppercase italic">Syncing Production Suite...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md">
          <Database className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Project Manifest Not Found</h2>
          <p className="text-zinc-400 text-sm mb-6">The project ID does not exist in local storage or has been corrupted.</p>
          <Button variant="outline" onClick={() => router.push('/')} className="border-zinc-800 hover:bg-zinc-900">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Upload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
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
              MuxAI Studio
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-[10px] uppercase tracking-tighter text-zinc-400">
               Project: {project.id.split('_')[1]}
             </Badge>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12 sm:py-16">
        {/* Workspace Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]">
              <ScanSearch className="w-3.5 h-3.5" />
              Analysis Workbench
            </div>
            <h2 className="text-4xl font-extrabold tracking-tighter text-white">{project.title}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500 font-medium">
              <span className="flex items-center gap-1.5"><Play className="w-3 h-3" /> Mux ID: <span className="text-zinc-300 font-mono">{project.mux_asset_id?.slice(0, 8)}...</span></span>
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {transitions.length} Ops Found</span>
            </div>
          </div>
          
          {transitions.length > 0 && (
            <Button
              onClick={analyzeAll}
              disabled={analyzing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 h-12 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing {currentAnalysis}/{transitions.length}...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 fill-current" />
                  Analyze All Opportunities
                </>
              )}
            </Button>
          )}
        </div>

        {/* Transitions Grid */}
        {transitions.length > 0 ? (
          <div className="grid gap-8">
            {transitions.map((transition, idx) => (
              <Card 
                key={transition.id} 
                className="bg-zinc-900/40 border-white/5 backdrop-blur-sm overflow-hidden hover:border-indigo-500/30 transition-all duration-500 group"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    
                    {/* Visual Preview Side */}
                    <div className="p-8 lg:w-112.5 bg-zinc-950/50 flex flex-col justify-center gap-6 border-b lg:border-b-0 lg:border-r border-white/5">
                      <div className="flex items-center justify-between px-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Storyboard {idx + 1}</span>
                         <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[9px] uppercase border-none">
                           <Clock className="w-3 h-3 mr-1 inline" />
                           {Math.floor(transition.frame_b_time - transition.frame_a_time)}s Gap
                         </Badge>
                      </div>

                      <div className="relative flex items-center justify-center gap-4">
                        {/* Exit Frame */}
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                           <img src={transition.frame_a_url} alt="Before" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                           <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                             <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">Exit Frame</span>
                             <span className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                                {formatTimeSimple(transition.frame_a_time)}
                             </span>
                           </div>
                        </div>
                        
                        {/* Transition Arrow */}
                        <div className="absolute z-10 bg-indigo-600 p-2 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.6)] group-hover:rotate-12 transition-transform border-2 border-zinc-950">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>

                        {/* Entry Frame */}
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                           <img src={transition.frame_b_url} alt="After" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                             <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">Entry Frame</span>
                             <span className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                                {formatTimeSimple(transition.frame_b_time)}
                             </span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Analysis Side */}
                    <div className="flex-1 p-8 space-y-6">
                      {transition.status === 'pending' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-12">
                          <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                            <Terminal className="w-6 h-6 text-zinc-600" />
                          </div>
                          <p className="text-zinc-400 text-sm mb-6 max-w-60">AI models ready to analyze temporal markers for this sequence.</p>
                          <Button 
                            variant="secondary" 
                            onClick={() => analyzeTransition(transition)}
                            disabled={analyzing}
                            className="bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 text-xs font-bold uppercase tracking-widest px-6"
                          >
                            Execute Analysis
                          </Button>
                        </div>
                      ) : transition.analysis && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                               <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] uppercase font-black px-2 py-0.5">
                                 {transition.analysis.brand_category}
                               </Badge>
                            </div>
                            <h4 className="text-2xl font-bold text-white">{transition.analysis.product_opportunity}</h4>
                            <p className="text-sm text-zinc-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 py-1">
                              "{transition.analysis.transition_reason}"
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-zinc-600 block mb-1">Camera Op</span>
                              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Camera className="w-3 h-3 text-indigo-500" /> {transition.analysis.camera}</div>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-zinc-600 block mb-1">Lighting</span>
                              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-500" /> {transition.analysis.lighting}</div>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-zinc-600 block mb-1">Duration</span>
                              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Clock className="w-3 h-3 text-blue-500" /> {transition.analysis.duration}s</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-black text-zinc-600 tracking-widest flex items-center gap-2">
                              Veo 3.1 Prompt Engine
                              <span className="h-px bg-zinc-800 flex-1" />
                            </span>
                            <div className="bg-zinc-950 rounded-xl p-4 border border-white/10 font-mono text-xs text-indigo-300/80 leading-relaxed group-hover:border-indigo-500/20 transition-colors max-h-24 overflow-y-auto custom-scrollbar">
                               {transition.analysis.veo_prompt}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-900/40 rounded-3xl border border-dashed border-white/10">
            <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
               <Video className="w-10 h-10 text-zinc-800" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Insufficient Chapter Markers</h3>
            <p className="text-zinc-400 max-w-sm mx-auto text-sm">
              We need at least two distinct scene changes to calculate an ad placement transition. 
              Try a longer video or adjust your scene detection settings.
            </p>
          </div>
        )}
      </main>

      {/* Background Bottom Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-linear-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}

// Simple helper for formatting seconds into MM:SS
function formatTimeSimple(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}