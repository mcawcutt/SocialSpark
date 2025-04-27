import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { SiFacebook, SiInstagram, SiGoogle } from 'react-icons/si';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import Image from '../../../components/ui/image';
import Video from '../../../components/ui/video';
import { ChevronLeft, ChevronRight, MoreHorizontal, MessageCircle, ThumbsUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlatformPreviewProps {
  title: string;
  description: string;
  imageUrl?: string;
  mediaItems?: Array<{
    url: string;
    type: 'image' | 'video';
    isMain: boolean;
  }>;
  platforms: string[];
  brandName?: string;
  brandLogo?: string;
  scheduledDate?: Date;
}

export function PlatformPreview({
  title,
  description,
  imageUrl,
  mediaItems = [],
  platforms,
  brandName = 'Your Brand',
  brandLogo = '/uploads/demo-logo.png',
  scheduledDate
}: PlatformPreviewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0] || 'facebook');
  
  // State for media carousel
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const mediaScrollRef = useRef<HTMLDivElement>(null);
  
  // Create an array of all media items, ensuring the main one is first if it exists
  const allMediaItems = (() => {
    if (mediaItems.length === 0 && imageUrl) {
      // If no media items but we have an imageUrl, create a single item
      return [{
        url: imageUrl,
        type: imageUrl.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image',
        isMain: true
      }];
    }
    
    if (mediaItems.length > 0) {
      // Sort mediaItems to put the main one first
      const mainItem = mediaItems.find(item => item.isMain);
      if (mainItem) {
        return [
          mainItem,
          ...mediaItems.filter(item => !item.isMain)
        ];
      }
    }
    
    return mediaItems;
  })();
  
  // Format date for display
  const formattedDate = scheduledDate ? format(scheduledDate, 'dd MMM') : 'Today';

  // Functions to navigate media carousel
  const previousMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  const nextMedia = () => {
    if (currentMediaIndex < allMediaItems.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };
  
  // Scroll to the current media item when index changes
  useEffect(() => {
    if (mediaScrollRef.current && allMediaItems.length > 0) {
      const scrollElement = mediaScrollRef.current;
      const itemWidth = scrollElement.offsetWidth;
      scrollElement.scrollTo({
        left: currentMediaIndex * itemWidth,
        behavior: 'smooth'
      });
    }
  }, [currentMediaIndex]);

  // Current media item
  const currentMedia = allMediaItems[currentMediaIndex] || null;

  return (
    <div className="space-y-4 w-full max-w-[400px]">
      {/* Platform selector */}
      <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="facebook" 
            disabled={!platforms.includes('facebook')}
            className={cn(
              "flex items-center gap-1",
              platforms.includes('facebook') ? "opacity-100" : "opacity-50"
            )}
          >
            <SiFacebook className="h-4 w-4 text-blue-600" />
            <span>Facebook</span>
          </TabsTrigger>
          <TabsTrigger 
            value="instagram" 
            disabled={!platforms.includes('instagram')}
            className={cn(
              "flex items-center gap-1",
              platforms.includes('instagram') ? "opacity-100" : "opacity-50"
            )}
          >
            <SiInstagram className="h-4 w-4 text-pink-600" />
            <span>Instagram</span>
          </TabsTrigger>
          <TabsTrigger 
            value="google" 
            disabled={!platforms.includes('google')}
            className={cn(
              "flex items-center gap-1",
              platforms.includes('google') ? "opacity-100" : "opacity-50"
            )}
          >
            <SiGoogle className="h-4 w-4 text-red-600" />
            <span>Google</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Facebook Preview */}
        <TabsContent value="facebook">
          <Card className="overflow-hidden border shadow-sm w-full">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={brandLogo} alt={brandName} />
                  <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{brandName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {formattedDate} · <span className="text-xs">🌎</span>
                  </div>
                </div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Content */}
            <CardContent className="p-0">
              {/* Post text */}
              {(title || description) && (
                <div className="px-3 py-2">
                  {title && <div className="font-medium text-sm mb-1">{title}</div>}
                  <p className="text-sm whitespace-pre-wrap">{description || "Write your post content here..."}</p>
                </div>
              )}
              
              {/* Media content */}
              {allMediaItems.length > 0 && (
                <div className="relative w-full bg-gray-50">
                  {/* Media carousel */}
                  <div 
                    ref={mediaScrollRef}
                    className="w-full overflow-hidden"
                  >
                    <div 
                      className="w-full"
                      style={{
                        position: 'relative',
                        paddingBottom: '75%' // 4:3 aspect ratio
                      }}
                    >
                      {currentMedia.type === 'video' ? (
                        <Video 
                          src={currentMedia.url} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      ) : (
                        <Image 
                          src={currentMedia.url} 
                          alt={title || 'Post image'} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Media navigation controls */}
                  {allMediaItems.length > 1 && (
                    <>
                      {/* Navigation arrows */}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={previousMedia}
                        disabled={currentMediaIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={nextMedia}
                        disabled={currentMediaIndex === allMediaItems.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Indicators */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {allMediaItems.map((_, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              idx === currentMediaIndex 
                                ? "w-4 bg-primary" 
                                : "w-1.5 bg-gray-400/70"
                            )}
                            onClick={() => setCurrentMediaIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Engagement bar */}
              <div className="flex justify-between px-3 py-2 border-t mt-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <ThumbsUp className="h-4 w-4" />
                  <span>Like</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Instagram Preview */}
        <TabsContent value="instagram">
          <Card className="overflow-hidden border shadow-sm w-full">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                  <AvatarImage src={brandLogo} alt={brandName} />
                  <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="font-semibold text-sm">{brandName}</div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Media content first for Instagram */}
            <CardContent className="p-0">
              {allMediaItems.length > 0 ? (
                <div className="relative w-full bg-gray-50">
                  {/* Media carousel */}
                  <div 
                    ref={mediaScrollRef}
                    className="w-full overflow-hidden"
                  >
                    <div 
                      className="w-full"
                      style={{
                        position: 'relative',
                        paddingBottom: '100%' // 1:1 aspect ratio for Instagram
                      }}
                    >
                      {currentMedia.type === 'video' ? (
                        <Video 
                          src={currentMedia.url} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      ) : (
                        <Image 
                          src={currentMedia.url} 
                          alt={title || 'Post image'} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Media navigation controls */}
                  {allMediaItems.length > 1 && (
                    <>
                      {/* Navigation arrows */}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={previousMedia}
                        disabled={currentMediaIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={nextMedia}
                        disabled={currentMediaIndex === allMediaItems.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Indicators */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {allMediaItems.map((_, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              idx === currentMediaIndex 
                                ? "w-4 bg-primary" 
                                : "w-1.5 bg-gray-400/70"
                            )}
                            onClick={() => setCurrentMediaIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  className="bg-muted flex items-center justify-center" 
                  style={{ 
                    position: 'relative',
                    paddingBottom: '100%' // 1:1 aspect ratio for Instagram
                  }}
                >
                  <span className="absolute text-muted-foreground text-sm">Media required for Instagram</span>
                </div>
              )}
              
              {/* Instagram Actions */}
              <div className="px-3 py-2 flex justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">❤️</span>
                  <span className="text-xl">💬</span>
                  <span className="text-xl">📤</span>
                </div>
                <span className="text-xl">🔖</span>
              </div>
              
              {/* Caption */}
              <div className="px-3 pb-3">
                <div className="text-sm">
                  <span className="font-semibold">{brandName}</span>
                  <span className="ml-1 whitespace-pre-wrap">{description || "Write your caption here..."}</span>
                </div>
                {title && <div className="text-muted-foreground text-xs mt-1">#{title.replace(/\s+/g, '')}</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Google Business Preview */}
        <TabsContent value="google">
          <Card className="overflow-hidden border shadow-sm w-full">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={brandLogo} alt={brandName} />
                  <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{brandName}</div>
                  <div className="text-xs text-muted-foreground">Google Business Post</div>
                </div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Content */}
            <CardContent className="p-0">
              {/* Title and content */}
              <div className="px-3 py-2">
                {title && <div className="font-medium text-blue-600 text-sm mb-1">{title}</div>}
                <p className="text-sm whitespace-pre-wrap">{description || "Write your post content here..."}</p>
              </div>
              
              {/* Media content */}
              {allMediaItems.length > 0 && (
                <div className="relative w-full bg-gray-50">
                  {/* Media carousel */}
                  <div 
                    ref={mediaScrollRef}
                    className="w-full overflow-hidden"
                  >
                    <div 
                      className="w-full"
                      style={{
                        position: 'relative',
                        paddingBottom: '75%' // 4:3 aspect ratio
                      }}
                    >
                      {currentMedia.type === 'video' ? (
                        <Video 
                          src={currentMedia.url} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      ) : (
                        <Image 
                          src={currentMedia.url} 
                          alt={title || 'Post image'} 
                          className="absolute top-0 left-0 w-full h-full object-contain bg-gray-50" 
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Media navigation controls */}
                  {allMediaItems.length > 1 && (
                    <>
                      {/* Navigation arrows */}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={previousMedia}
                        disabled={currentMediaIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 bg-white/80"
                        onClick={nextMedia}
                        disabled={currentMediaIndex === allMediaItems.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Indicators */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {allMediaItems.map((_, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              idx === currentMediaIndex 
                                ? "w-4 bg-primary" 
                                : "w-1.5 bg-gray-400/70"
                            )}
                            onClick={() => setCurrentMediaIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Button */}
              <div className="px-3 py-3">
                <div className="inline-block bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-sm">
                  Learn more
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}