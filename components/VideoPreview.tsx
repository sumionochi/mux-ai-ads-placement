'use client';

import { useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface VideoPreviewProps {
  videoUrl: string;
  title?: string;
}

export function VideoPreview({ videoUrl, title }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (!videoRef) return;
    
    if (isPlaying) {
      videoRef.pause();
    } else {
      videoRef.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef) return;
    videoRef.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-950">
      <video
        ref={setVideoRef}
        src={videoUrl}
        className="w-full aspect-video object-cover"
        loop
        muted={isMuted}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePlay}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleMute}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          {title && (
            <span className="text-xs text-white font-medium">
              {title}
            </span>
          )}
        </div>
      </div>

      {/* Play button overlay when not playing */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-indigo-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}