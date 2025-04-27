import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { SiFacebook, SiInstagram, SiGoogle } from 'react-icons/si';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import Image from '../../../components/ui/image';
import Video from '../../../components/ui/video';
import { MoreHorizontal, MessageCircle, ThumbsUp, Share2 } from 'lucide-react';

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
  
  // Get the main media item or fallback to imageUrl
  const mainMedia = mediaItems.find(item => item.isMain) || 
                   (mediaItems.length > 0 ? mediaItems[0] : null);
  
  const mediaUrl = mainMedia?.url || imageUrl;
  const mediaType = mainMedia?.type || (imageUrl?.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image');
  
  // Format date for display
  const formattedDate = scheduledDate ? format(scheduledDate, 'dd MMM') : 'Today';

  return (
    <div className="space-y-4">
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
          <Card className="overflow-hidden border shadow-sm max-w-sm mx-auto">
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
              {mediaUrl && (
                <div className="w-full">
                  {mediaType === 'video' ? (
                    <div className="relative pb-[56.25%] overflow-hidden">
                      <Video 
                        src={mediaUrl} 
                        className="absolute inset-0 w-full h-full object-contain bg-black" 
                      />
                    </div>
                  ) : (
                    <div className="relative bg-gray-100">
                      <div className="aspect-[4/3] flex items-center justify-center overflow-hidden">
                        <Image 
                          src={mediaUrl} 
                          alt={title || 'Post image'} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Engagement bar */}
              <div className="flex justify-between border-t mx-3 py-2 mt-1">
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
          <Card className="overflow-hidden border shadow-sm max-w-sm mx-auto">
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
              {mediaUrl ? (
                <div className="w-full">
                  {mediaType === 'video' ? (
                    <div className="relative pb-[100%] overflow-hidden">
                      <Video 
                        src={mediaUrl} 
                        className="absolute inset-0 w-full h-full object-cover bg-black" 
                      />
                    </div>
                  ) : (
                    <div className="relative bg-gray-100">
                      <div className="aspect-square flex items-center justify-center overflow-hidden">
                        <Image 
                          src={mediaUrl} 
                          alt={title || 'Post image'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Media required for Instagram</span>
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
          <Card className="overflow-hidden border shadow-sm max-w-sm mx-auto">
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
              {mediaUrl && (
                <div className="w-full">
                  {mediaType === 'video' ? (
                    <div className="relative pb-[56.25%] overflow-hidden">
                      <Video 
                        src={mediaUrl} 
                        className="absolute inset-0 w-full h-full object-contain bg-black" 
                      />
                    </div>
                  ) : (
                    <div className="relative bg-gray-100">
                      <div className="aspect-[4/3] flex items-center justify-center overflow-hidden">
                        <Image 
                          src={mediaUrl} 
                          alt={title || 'Post image'} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
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