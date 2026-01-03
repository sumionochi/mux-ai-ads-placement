'use client';

import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import { useRef, useState, useEffect } from 'react';

interface Chapter {
  startTime: number;
  title: string;
}

interface AdMarker {
  time: number;
  duration: number;
  label: string;
}

interface MuxPlayerWithMarkersProps {
  playbackId: string;
  title?: string;
  chapters?: Chapter[];
  adMarkers?: AdMarker[];
  thumbnailTime?: number;
  accentColor?: string;
  availableLanguages?: Array<{
    code: string;
    name: string;
    vttContent?: string;
  }>;
}

export function MuxPlayerWithMarkers({
  playbackId,
  title,
  chapters = [],
  adMarkers = [],
  thumbnailTime = 0,
  accentColor = '#6366F1',
  availableLanguages = [],
}: MuxPlayerWithMarkersProps) {
  const playerRef = useRef<MuxPlayerElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const handleLoadedMetadata = () => {
    if (!playerRef.current) return;
    
    const player = playerRef.current;
    setDuration(player.duration || 0);
    
    console.log('✅ Mux Player ready');
    console.log(`   Duration: ${player.duration}s`);
    console.log(`   Available languages: ${availableLanguages.length}`);
    
    // Add chapters
    if (chapters.length > 0) {
      player.addChapters(
        chapters.map(ch => ({
          startTime: ch.startTime,
          value: ch.title,
        }))
      );
      console.log(`✅ Added ${chapters.length} chapters`);
    }

    // Add ad markers
    if (adMarkers.length > 0) {
      player.addCuePoints(
        adMarkers.map(marker => ({
          startTime: marker.time,
          endTime: marker.time + marker.duration,
          value: {
            type: 'ad',
            label: marker.label,
            duration: marker.duration,
          },
        }))
      );
      
      // Debug: Log ad marker positions
      console.log('📊 Ad markers with durations:');
      adMarkers.forEach((marker, idx) => {
        const leftPercent = (marker.time / duration) * 100;
        const widthPercent = (marker.duration / duration) * 100;
        console.log(`  Ad ${idx + 1}: ${marker.duration}s at ${marker.time}s (${leftPercent.toFixed(1)}% - ${widthPercent.toFixed(2)}% width)`);
      });
    }
  };

  // ✅ NEW: Add translated captions as <track> elements
  useEffect(() => {
    if (!playerRef.current) return;
    
    const player = playerRef.current;
    const videoEl = player.media?.nativeEl;
    
    if (!videoEl || availableLanguages.length <= 1) return;

    console.log('🌍 Adding translated caption tracks...');

    // Add each translated language as a track
    availableLanguages.forEach((lang) => {
      if (lang.vttContent && lang.code !== 'en') {
        // Create blob URL from VTT content
        const blob = new Blob([lang.vttContent], { type: 'text/vtt' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Create track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = lang.name;
        track.srclang = lang.code;
        track.src = blobUrl;
        
        // Add to video element
        videoEl.appendChild(track);
        
        console.log(`✅ Added ${lang.name} captions (${lang.code})`);
      }
    });

    // Cleanup blob URLs on unmount
    return () => {
      availableLanguages.forEach((lang) => {
        if (lang.vttContent && lang.code !== 'en') {
          const tracks = videoEl.querySelectorAll('track');
          tracks.forEach(track => {
            if (track.src.startsWith('blob:')) {
              URL.revokeObjectURL(track.src);
            }
          });
        }
      });
    };
  }, [availableLanguages, playbackId]);

  const handleCuePointChange = (event: any) => {
    const activeCuePoint = event.detail;
    if (activeCuePoint && activeCuePoint.value?.type === 'ad') {
      console.log('📺 Ad marker reached:', activeCuePoint.value.label);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Video',
        }}
        streamType="on-demand"
        thumbnailTime={thumbnailTime}
        accentColor={accentColor}
        primaryColor="#FFFFFF"
        secondaryColor="#000000"
        onLoadedMetadata={handleLoadedMetadata}
        onCuePointChange={handleCuePointChange}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      />
      
      {/* Visual Ad Markers Overlay */}
      {duration > 0 && adMarkers.length > 0 && (
        <div 
          className={`absolute bottom-13 left-3 right-3 h-1 pointer-events-none z-100 transition-opacity duration-300 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {adMarkers.map((marker, idx) => {
            const leftPercent = (marker.time / duration) * 100;
            const widthPercent = (marker.duration / duration) * 100;

            return (
              <div
                key={idx}
                className="absolute h-full rounded-sm transition-all duration-200"
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 0.5)}%`,
                  backgroundColor: '#FFD700',
                  boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)',
                }}
                title={marker.label}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}