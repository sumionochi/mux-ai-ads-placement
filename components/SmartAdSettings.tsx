'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartAdSettings as SmartAdSettingsType } from '@/types/smart-ad';
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Eye, 
  Lightbulb,
  Camera,
  Palette,
  Zap,
  Edit3,
  RotateCcw,
  FileText
} from 'lucide-react';

interface SmartAdSettingsProps {
  settings: SmartAdSettingsType;
  onGenerate: (additionalNotes: string, customPrompt?: string) => void;
  isGenerating: boolean;
}

export function SmartAdSettings({ 
  settings: initialSettings, 
  onGenerate,
  isGenerating 
}: SmartAdSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [showPrompt, setShowPrompt] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Prompt editing state
  const [promptEditMode, setPromptEditMode] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(initialSettings.enhancedPrompt);
  const [promptModified, setPromptModified] = useState(false);

  // Update edited prompt when settings change
  useEffect(() => {
    if (!promptModified) {
      setEditedPrompt(settings.enhancedPrompt);
    }
  }, [settings.enhancedPrompt, promptModified]);

  const handlePromptChange = (newPrompt: string) => {
    setEditedPrompt(newPrompt);
    setPromptModified(true);
  };

  const resetPromptToAI = () => {
    setEditedPrompt(settings.enhancedPrompt);
    setPromptModified(false);
    setPromptEditMode(false);
  };

  const handleGenerate = () => {
    if (promptEditMode && promptModified) {
      // Use custom edited prompt
      onGenerate(additionalNotes, editedPrompt);
    } else {
      // Use AI-generated prompt
      onGenerate(additionalNotes);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Reasoning Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Lightbulb className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-400 mb-1">
              AI Reasoning
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {settings.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Smart Settings Grid */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          AI-Suggested Settings
          <span className="text-zinc-700">(Click to edit)</span>
        </h4>

        <div className="grid gap-4">
          {/* Product Description (Read-only) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 block">
              Product Detected
            </label>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                {settings.productCategory}
              </Badge>
              <p className="text-sm text-zinc-300">{settings.productDescription}</p>
            </div>
          </div>

          {/* Ad Style */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
              <Camera className="w-3 h-3" />
              Ad Style
            </label>
            <select
              value={settings.adStyle}
              onChange={(e) => setSettings({
                ...settings,
                adStyle: e.target.value as any
              })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="UGC">UGC - User-Generated Content</option>
              <option value="Cinematic">Cinematic - Professional & Polished</option>
              <option value="Product Demo">Product Demo - Feature Showcase</option>
            </select>
          </div>

          {/* Integration Type */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
              <Eye className="w-3 h-3" />
              Integration Method
            </label>
            <select
              value={settings.integrationType}
              onChange={(e) => setSettings({
                ...settings,
                integrationType: e.target.value as any
              })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Reflection">Reflection - Glass/Mirror Surface</option>
              <option value="Background">Background - Billboard/Poster</option>
              <option value="Foreground">Foreground - On Desk/In Hand</option>
              <option value="Character Interaction">Character Interaction - Active Use</option>
            </select>
          </div>

          {/* Camera Movement */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
              <Camera className="w-3 h-3" />
              Camera Movement
            </label>
            <input
              type="text"
              value={settings.cameraMovement}
              onChange={(e) => setSettings({
                ...settings,
                cameraMovement: e.target.value
              })}
              placeholder="e.g., Smooth tracking shot following subject"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Lighting Approach */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2 block flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Lighting Approach
            </label>
            <input
              type="text"
              value={settings.lightingApproach}
              onChange={(e) => setSettings({
                ...settings,
                lightingApproach: e.target.value
              })}
              placeholder="e.g., Match natural daylight, warm tones"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Enhanced Sora Prompt - EDITABLE */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-900/50 p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
            >
              <Palette className="w-3 h-3" />
              Enhanced Sora Prompt
              {showPrompt ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {promptModified && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">
                Modified
              </Badge>
            )}
          </div>

          {showPrompt && (
            <div className="flex items-center gap-2">
              {!promptEditMode ? (
                <Button
                  onClick={() => setPromptEditMode(true)}
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
                    onClick={resetPromptToAI}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset to AI
                  </Button>
                  <Button
                    onClick={() => setPromptEditMode(false)}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {showPrompt && (
          <>
            {!promptEditMode ? (
              // Preview Mode - Read-only display
              <div className="bg-zinc-950 p-4 font-mono text-xs text-indigo-300/80 leading-relaxed max-h-96 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {editedPrompt}
              </div>
            ) : (
              // Edit Mode - Editable textarea
              <div className="bg-zinc-950 p-4">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="w-full h-96 bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-indigo-300 leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none custom-scrollbar"
                  placeholder="Edit the enhanced Sora prompt..."
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-zinc-600">
                    {editedPrompt.length} characters • Direct prompt sent to Sora 2.0
                  </p>
                  {promptModified && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[9px]">
                      ⚠️ Using custom edited prompt
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Additional Creative Notes */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
          💬 Additional Creative Direction (Optional)
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any specific tweaks? e.g., 'Make it feel more premium and modern' or 'Add subtle motion blur'"
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
        />
        {!promptEditMode && additionalNotes && (
          <p className="text-xs text-zinc-600">
            Note: Additional notes will be appended to the AI-generated prompt
          </p>
        )}
        {promptEditMode && promptModified && (
          <p className="text-xs text-yellow-600">
            ⚠️ You're using a custom prompt. Additional notes will still be appended.
          </p>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-14 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-5 h-5 mr-2 animate-spin" />
            Generating with Sora 2.0...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2 fill-current" />
            {promptModified ? 'Generate with Custom Prompt' : 'Generate Video with AI Settings'}
          </>
        )}
      </Button>

      {promptModified && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-xs text-yellow-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            You've edited the prompt manually. Sora will use your custom version instead of the AI-generated one.
          </p>
        </div>
      )}
    </div>
  );
}