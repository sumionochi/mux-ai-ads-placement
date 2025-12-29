'use client';

import { useRef, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { ProductInput as ProductInputType } from '@/types/smart-ad';

interface ProductInputProps {
  onSubmit: (product: ProductInputType) => void;
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
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const imagePreview = externalPreview;

  // ✅ Unique per component instance
  const inputId = useId();
  // ✅ Ref to the *correct* input for this specific card
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const previewUrl = URL.createObjectURL(file);

      // Notify parent of preview change
      onImageChange?.(previewUrl);

      setProductImage(file);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImageBase64(base64);
    } catch (error) {
      console.error('❌ Failed to process image:', error);
      alert('Failed to process image. Please try again.');
      clearImage();
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processImageFile(file);

    // Optional: lets user pick the same file again
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ prevents weird bubbling to other zones
    const file = e.dataTransfer.files?.[0];
    if (file) await processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    onImageChange?.(null);

    setProductImage(null);
    setImageBase64(null);
  };

  const handleSubmit = () => {
    if (inputType === 'image' && imageBase64) {
      onSubmit({ type: 'image', imageBase64 });
    } else if (inputType === 'text' && productDescription.trim()) {
      onSubmit({ type: 'text', description: productDescription.trim() });
    } else {
      alert('Please provide product information before submitting');
    }
  };

  const canSubmit =
    (inputType === 'image' && imageBase64 && !uploading) ||
    (inputType === 'text' && productDescription.trim().length > 10);

  return (
    <div className="space-y-6">
      {/* Input Type Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputType === 'image' ? 'default' : 'outline'}
          onClick={() => {
            setInputType('image');
            setProductDescription('');
          }}
          className={`flex-1 ${
            inputType === 'image'
              ? 'bg-indigo-600 hover:bg-indigo-500'
              : 'border-zinc-800 hover:bg-zinc-900'
          }`}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>

        <Button
          type="button"
          variant={inputType === 'text' ? 'default' : 'outline'}
          onClick={() => {
            setInputType('text');
            clearImage();
          }}
          className={`flex-1 ${
            inputType === 'text'
              ? 'bg-indigo-600 hover:bg-indigo-500'
              : 'border-zinc-800 hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Describe Product
        </Button>
      </div>

      {/* Image Upload Mode */}
      {inputType === 'image' && (
        <div className="space-y-3">
          {!imagePreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all group ${
                uploading
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-zinc-800 hover:border-indigo-500/50'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()} // ✅ FIX
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                  uploading ? 'bg-indigo-500/20' : 'bg-zinc-900 group-hover:bg-indigo-500/10'
                }`}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-zinc-600 group-hover:text-indigo-400" />
                )}
              </div>

              <p className="text-zinc-400 font-medium mb-1">
                {uploading ? 'Processing image...' : 'Drop product image here or click to browse'}
              </p>
              <p className="text-xs text-zinc-600">PNG, JPG, WebP up to 10MB</p>

              <input
                ref={fileInputRef}          // ✅ FIX
                id={inputId}                // ✅ unique id (not strictly needed now)
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 group">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-64 object-contain bg-zinc-900"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={clearImage}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <ImageIcon className="w-3 h-3" />
                    <span>{productImage?.name}</span>
                    <span>•</span>
                    <span>{((productImage?.size || 0) / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              </div>

              {imageBase64 && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Image ready for analysis ({(imageBase64.length / 1024).toFixed(0)} KB base64)
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text Description Mode */}
      {inputType === 'text' && (
        <div className="space-y-2">
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe your product in detail..."
            className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isAnalyzing}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-12 rounded-xl"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Product & Frames...
          </>
        ) : uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Image...
          </>
        ) : (
          <>🔍 Analyze & Generate Smart Settings</>
        )}
      </Button>
    </div>
  );
}
