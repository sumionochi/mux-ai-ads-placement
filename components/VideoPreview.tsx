'use client';

import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface VideoPreviewProps {
  videoUrl: string;
  title?: string;
  playbackId?: string;
}

export function VideoPreview({ videoUrl, title, playbackId }: VideoPreviewProps) {
  // If it's a Mux playback ID, use Mux Player
  if (playbackId) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
        <MuxPlayer
          playbackId={playbackId}
          metadata={{
            video_title: title || 'Video Preview',
          }}
          streamType="on-demand"
          accentColor="#6366F1"
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
          }}
        />
      </div>
    );
  }

  // Otherwise use regular HTML5 video for local files
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
      <video
        src={videoUrl}
        controls
        className="w-full aspect-video object-contain"
      >
        Your browser does not support video playback.
      </video>
      
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
          <p className="text-sm text-white font-medium">{title}</p>
        </div>
      )}
    </div>
  );
}