'use client';

import React, { useId, useRef, useState } from 'react';
import { Upload, Loader2, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ProductInputType = {
  type: 'image' | 'text';
  imageBase64?: string;
  description?: string;
};

interface ProductInputProps {
  onSubmit: (product: ProductInputType, mode: 'ai' | 'template') => void;
  isAnalyzing: boolean;
  imagePreview?: string;
  onImageChange?: (preview: string | null) => void;
}

export function ProductInput({
  onSubmit,
  isAnalyzing,
  imagePreview: externalPreview,
  onImageChange,
}: ProductInputProps) {
  const [inputType, setInputType] = useState<'image' | 'text'>('image');
  const [mode, setMode] = useState<'ai' | 'template'>('template'); // default template
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // ✅ unique per ProductInput instance (fixes wrong preview showing on other cards)
  const reactId = useId();
  const uploadInputId = `product-upload-${reactId}`;

  // ✅ prevents stale FileReader finishing late and overwriting state
  const latestPickRef = useRef(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow selecting the same file again
    e.target.value = '';

    setUploading(true);
    setProductImage(file);

    // ✅ instant preview via object URL (your parent already revokes old URLs)
    const objectUrl = URL.createObjectURL(file);
    onImageChange?.(objectUrl);

    const pickId = ++latestPickRef.current;

    // Convert to base64 for API
    const reader = new FileReader();
    reader.onload = () => {
      if (pickId !== latestPickRef.current) return; // ignore stale read
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.split(',')[1] ?? null;
      setImageBase64(base64);
      setUploading(false);
    };
    reader.onerror = () => {
      if (pickId !== latestPickRef.current) return;
      setUploading(false);
      alert('Failed to read image');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (inputType === 'image' && imageBase64) {
      console.log('📤 Submitting product image with mode:', mode);
      onSubmit(
        {
          type: 'image',
          imageBase64,
        },
        mode
      );
    } else if (inputType === 'text' && productDescription.trim()) {
      console.log('📤 Submitting product description');
      onSubmit(
        {
          type: 'text',
          description: productDescription.trim(),
        },
        mode
      );
    } else {
      alert('Please provide product information before submitting');
    }
  };

  const canSubmit =
    (inputType === 'image' && !!imageBase64) ||
    (inputType === 'text' && productDescription.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Prompt Generation Mode
          </label>
          <div className="flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 rounded-md">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase">
              {mode === 'template' ? 'Template' : 'AI Custom'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${
              mode === 'template'
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Template</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`px-4 py-3 rounded-md text-sm font-bold transition-all ${
              mode === 'ai'
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Custom</span>
            </div>
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {mode === 'template'
              ? '📋 Uses proven hardcoded prompt template. Only extracts product description and inserts it. Consistent, narrative-first results.'
              : '🤖 AI analyzes your frames and creates a custom prompt tailored to this specific transition. Adaptive to scene context.'}
          </p>
        </div>
      </div>

      {/* Input Type Toggle */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
          Product Input Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputType('image')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              inputType === 'image'
                ? 'bg-zinc-800 text-white border-2 border-indigo-500'
                : 'bg-zinc-900 text-zinc-400 border-2 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            📷 Upload Image
          </button>
          <button
            type="button"
            onClick={() => setInputType('text')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              inputType === 'text'
                ? 'bg-zinc-800 text-white border-2 border-indigo-500'
                : 'bg-zinc-900 text-zinc-400 border-2 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            ✍️ Text Description
          </button>
        </div>
      </div>

      {/* Image Upload */}
      {inputType === 'image' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 hover:border-indigo-500/50 transition-all bg-zinc-900/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id={uploadInputId} // ✅ unique id
              disabled={isAnalyzing || uploading}
            />
            <label
              htmlFor={uploadInputId} // ✅ unique htmlFor
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              {externalPreview ? (
                <div className="space-y-3 text-center">
                  <img
                    src={externalPreview}
                    alt="Product preview"
                    className="max-h-40 rounded-lg mx-auto border border-zinc-700"
                  />
                  <p className="text-sm text-zinc-400">Click to change image</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-sm font-bold text-zinc-400 mb-1">
                    Click to upload product image
                  </p>
                  <p className="text-xs text-zinc-600">PNG, JPG up to 10MB</p>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Text Description */}
      {inputType === 'text' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Product Description
          </label>
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe the product in detail: brand, model, colors, materials, features..."
            className="w-full h-32 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={isAnalyzing}
          />
          <p className="text-xs text-zinc-600">{productDescription.length} characters</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isAnalyzing}
        className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'template' ? 'Extracting Product Details...' : 'Analyzing Product & Frames...'}
          </>
        ) : uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Image...
          </>
        ) : mode === 'template' ? (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Use Template Prompt
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Prompt
          </>
        )}
      </Button>

      {/* Mode Info */}
      {mode === 'template' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-400">Template Mode Benefits:</p>
              <ul className="text-xs text-blue-300/80 space-y-1">
                <li>✓ Proven prompt structure</li>
                <li>✓ Consistent narrative-first results</li>
                <li>✓ Fast processing (single GPT-4V call)</li>
                <li>✓ No moderation issues</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
