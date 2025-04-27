import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Volume2, VolumeX } from 'lucide-react';

interface VideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  fallback?: string;
}

/**
 * Enhanced Video component with fallback and loading state
 */
export default function Video({
  src,
  className,
  fallback = '/uploads/demo-logo.png',
  controls = true,
  autoPlay = false,
  muted = true,
  loop = false,
  ...props
}: VideoProps) {
  const [videoSrc, setVideoSrc] = useState<string | undefined>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Reset states when src changes
  useEffect(() => {
    setVideoSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Handle video error with fallback
  const handleError = () => {
    // Try to fix common path issues before using fallback
    if (videoSrc) {
      if (videoSrc.includes('/uploads/')) {
        // Try attached_assets path
        const fileName = videoSrc.split('/').pop();
        setVideoSrc(`/attached_assets/${fileName}`);
        return;
      } else if (videoSrc.includes('/attached_assets/')) {
        // Try uploads path
        const fileName = videoSrc.split('/').pop();
        setVideoSrc(`/uploads/${fileName}`);
        return;
      } else if (!videoSrc.startsWith('/') && !videoSrc.startsWith('http')) {
        // Add leading slash
        setVideoSrc(`/${videoSrc}`);
        return;
      }
    }

    // Mark as error
    setHasError(true);
    setIsLoading(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-md flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-muted-foreground border-t-transparent animate-spin" />
        </div>
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-xs">Video unavailable</span>
        </div>
      )}
      
      {/* Custom play/pause overlay */}
      {!controls && !hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlay}
        >
          <button 
            className="h-12 w-12 rounded-full bg-primary/80 flex items-center justify-center text-white"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {isPlaying ? (
              <span className="h-5 w-5 border-l-2 border-r-2 border-white" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </button>
        </div>
      )}
      
      {/* Custom controls */}
      {!controls && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-2">
            <button
              className="text-white"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      )}
      
      {/* The actual video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className={cn(
          "w-full h-full transition-opacity duration-300 object-cover",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        onLoadedData={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
        {...props}
      />
    </div>
  );
}