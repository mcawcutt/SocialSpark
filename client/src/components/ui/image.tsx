import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export default function Image({ 
  src, 
  alt, 
  className, 
  fallback = '/placeholder-image.png', 
  ...props 
}: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      <img
        src={error ? fallback : src}
        alt={alt || "Image"}
        className={cn(
          "w-full h-full transition-opacity", 
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        {...props}
      />
    </div>
  );
}