'use client';

import { useState } from 'react';
import { Lightbulb, FileText, Package, Clock, Sparkles, Edit3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PromptEditorProps {
  productName: string;
  detailedProductDescription: string;
  integrationStrategy: string;
  reasoning: string;
  suggestedDuration: 5 | 10 | 12;
  initialPrompt: string;
  onGenerate: (finalPrompt: string, duration: 5 | 10 | 12) => void;
  isGenerating: boolean;
  mode?: 'ai' | 'template';  // ⬅️ ADD
}

export function PromptEditor({ 
  productName,
  detailedProductDescription,
  integrationStrategy,
  reasoning,
  suggestedDuration,
  initialPrompt,
  onGenerate,
  isGenerating,
  mode = 'template'  // ⬅️ DEFAULT
}: PromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);
  const [duration, setDuration] = useState<5 | 10 | 12>(suggestedDuration);
  const [hasModified, setHasModified] = useState(false);

  const handlePromptChange = (value: string) => {
    setEditedPrompt(value);
    setHasModified(value !== initialPrompt);
  };

  const handleReset = () => {
    setEditedPrompt(initialPrompt);
    setHasModified(false);
    setIsEditing(false);
  };

  const handleGenerate = () => {
    onGenerate(editedPrompt, duration);
  };

  const isTemplate = mode === 'template' || integrationStrategy.includes('Template');

  return (
    <div className="space-y-6">
      {/* AI Reasoning / Mode Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            {isTemplate ? (
              <FileText className="w-5 h-5 text-blue-400" />
            ) : (
              <Lightbulb className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-bold text-blue-400">
                  {isTemplate ? '📋 Template Mode' : '🤖 AI Custom Mode'}
                </h4>
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px]">
                  {integrationStrategy}
                </Badge>
              </div>
              <p className="text-sm font-medium text-zinc-300 mb-1">{productName}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {reasoning}
              </p>
            </div>

            {/* Product Description */}
            <div className="border-t border-blue-500/20 pt-3">
              <h5 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                <Package className="w-3 h-3" />
                Extracted Product Description
              </h5>
              <p className="text-xs text-zinc-400 leading-relaxed italic bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                "{detailedProductDescription}"
              </p>
            </div>

            {isTemplate && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                <p className="text-xs text-indigo-300">
                  ℹ️ This description was inserted into the hardcoded prompt template for consistent, narrative-first integration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duration Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Video Duration (Wan 2.5)
        </label>
        <div className="flex gap-2">
          {[4, 8, 12].map((d) => {
            const wanDuration = d <= 6 ? 5 : 10;
            return (
              <button
                key={d}
                onClick={() => setDuration(d as 5 | 10 | 12)}
                disabled={isGenerating}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                  duration === d
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <span>{d}s → {wanDuration}s</span>
                  {d === suggestedDuration && (
                    <span className="text-[9px] text-indigo-300 mt-1">✨ Suggested</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-zinc-600">
          {duration <= 6 && '⚡ Fast (~3-5 min) - Maps to 5 seconds in Wan 2.5'}
          {duration > 6 && '⏱️ Medium (~5-8 min) - Maps to 10 seconds in Wan 2.5'}
        </div>
      </div>

      {/* Prompt Preview/Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Generation Prompt
          </label>
          <div className="flex items-center gap-2">
            {hasModified && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">
                Modified
              </Badge>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              {isEditing ? (
                <>
                  <FileText className="w-3 h-3" />
                  Preview
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  Edit
                </>
              )}
            </button>
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="w-full h-64 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={isGenerating}
          />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono">
              {editedPrompt}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600">
            {editedPrompt.length} characters
          </span>
          {hasModified && (
            <button
              onClick={handleReset}
              className="text-zinc-500 hover:text-zinc-400 flex items-center gap-1"
              disabled={isGenerating}
            >
              <RotateCcw className="w-3 h-3" />
              Reset to AI
            </button>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
            Generating with Wan 2.5...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2 fill-current" />
            {hasModified ? 'Generate with Custom Prompt' : 'Generate Video'}
          </>
        )}
      </Button>
    </div>
  );
}