import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  fallback?: string;
}

export default function Video({
  src,
  className,
  fallback = '/placeholder-video.png',
  ...props
}: VideoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className={cn("relative group", className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {error ? (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Video failed to load</span>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            className={cn(
              "w-full h-full object-cover transition-opacity",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
            muted={isMuted}
            loop
            playsInline
            {...props}
          />
          
          {/* Video controls overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="p-2 bg-black/50 rounded-full text-white"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={toggleMute}
                className="p-2 bg-black/50 rounded-full text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}