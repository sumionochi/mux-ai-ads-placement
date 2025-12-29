'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Lightbulb, 
  Edit3, 
  RotateCcw, 
  FileText,
  Loader2, 
  Clock
} from 'lucide-react';

interface PromptEditorProps {
  productName: string;
  integrationStrategy: string;
  reasoning: string;
  initialPrompt: string;
  suggestedDuration: 4 | 8 | 12;
  onGenerate: (finalPrompt: string, duration: 4 | 8 | 12) => void;
  isGenerating: boolean;
}

export function PromptEditor({ 
  productName,
  integrationStrategy,
  reasoning,
  initialPrompt,
  suggestedDuration,
  onGenerate,
  isGenerating 
}: PromptEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [modified, setModified] = useState(false);
  const [duration, setDuration] = useState<4 | 8 | 12>(suggestedDuration);

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    setModified(newPrompt !== initialPrompt);
  };

  const resetToAI = () => {
    setPrompt(initialPrompt);
    setModified(false);
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* AI Reasoning */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Lightbulb className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-400 mb-1">
              AI Strategy
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                  {integrationStrategy}
                </Badge>
                <span className="text-sm text-zinc-300">{productName}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {reasoning}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sora Prompt */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-900/50 p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
              Sora 2.0 Generation Prompt
            </span>
            {modified && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">
                Modified
              </Badge>
            )}
          </div>

          {!editMode ? (
            <Button
              onClick={() => setEditMode(true)}
              size="sm"
              variant="ghost"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit Prompt
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={resetToAI}
                size="sm"
                variant="ghost"
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to AI
              </Button>
              <Button
                onClick={() => setEditMode(false)}
                size="sm"
                variant="ghost"
                className="text-xs text-green-400 hover:text-green-300"
              >
                Done Editing
              </Button>
            </div>
          )}
        </div>

        {!editMode ? (
          <div className="bg-zinc-950 p-4 font-mono text-xs text-indigo-300/80 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
            {prompt}
          </div>
        ) : (
          <div className="bg-zinc-950 p-4">
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full h-96 bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-indigo-300 leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Edit the Sora prompt..."
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-zinc-600">
                {prompt.length} characters
              </p>
              {modified && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">
                  ⚠️ Using custom edited prompt
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD: Duration Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Ad Duration
        </label>
        <div className="flex gap-2">
          {[4, 8, 12].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d as 4 | 8 | 12)}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                duration === d
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {d} seconds
              {d === suggestedDuration && (
                <span className="ml-1 text-[10px] opacity-60">✨ AI</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">
          {duration === 4 && 'Quick product reveal, simple integration'}
          {duration === 8 && 'Standard ad with product demonstration'}
          {duration === 12 && 'Story-driven ad with detailed narrative'}
        </p>
      </div>

      {/* Generate Button */}
      <Button
       onClick={() => onGenerate(prompt, duration)} 
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-14 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating with Sora 2.0...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2 fill-current" />
            {modified ? 'Generate with Custom Prompt' : 'Generate Video with AI Prompt'}
          </>
        )}
      </Button>

      {modified && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-xs text-yellow-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            You've edited the prompt. Sora will use your custom version.
          </p>
        </div>
      )}
    </div>
  );
}