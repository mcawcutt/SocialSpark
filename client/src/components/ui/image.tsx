import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

/**
 * Enhanced Image component with fallback and loading state
 */
export default function Image({ 
  src, 
  alt = 'Image', 
  className, 
  fallback = '/uploads/demo-logo.png',
  ...props 
}: ImageProps) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Handle image load error with fallback paths
  const handleError = () => {
    // If we already tried the fallback, mark as error
    if (imgSrc === fallback) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Try to fix common path issues before using fallback
    if (imgSrc) {
      if (imgSrc.includes('/uploads/')) {
        // Try attached_assets path
        const fileName = imgSrc.split('/').pop();
        setImgSrc(`/attached_assets/${fileName}`);
        return;
      } else if (imgSrc.includes('/attached_assets/')) {
        // Try uploads path
        const fileName = imgSrc.split('/').pop();
        setImgSrc(`/uploads/${fileName}`);
        return;
      } else if (!imgSrc.startsWith('/') && !imgSrc.startsWith('http')) {
        // Add leading slash
        setImgSrc(`/${imgSrc}`);
        return;
      }
    }

    // Use fallback as last resort
    setImgSrc(fallback);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* If loading, show skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-md" />
      )}
      
      {/* If error, show placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-xs">Image unavailable</span>
        </div>
      )}
      
      {/* The actual image */}
      <img
        src={imgSrc}
        alt={alt}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
        {...props}
      />
    </div>
  );
}