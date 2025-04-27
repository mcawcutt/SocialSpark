import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { SiFacebook, SiInstagram, SiGoogle } from 'react-icons/si';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from '../../../components/ui/image';
import Video from '../../../components/ui/video';

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
  const formattedDate = scheduledDate ? format(scheduledDate, 'MMM d, yyyy - h:mm a') : 'Not scheduled';

  return (
    <div className="bg-background rounded-lg border shadow-sm overflow-hidden p-4">
      {/* Mobile device frame */}
      <div className="max-w-[320px] mx-auto relative border-8 border-gray-800 rounded-[32px] shadow-xl overflow-hidden">
        {/* Phone Top Notch */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-black z-10 flex items-center justify-center">
          <div className="w-20 h-4 bg-black rounded-b-xl flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-600 mr-2"></div>
            <div className="w-10 h-1 rounded-full bg-gray-700"></div>
          </div>
        </div>
        
        {/* Phone content area */}
        <div className="p-2 pt-6 bg-white overflow-hidden">
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
              <Card className="border-0 shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={brandLogo} alt={brandName} />
                      <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">{brandName}</div>
                      <div className="text-xs text-muted-foreground">{formattedDate}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="text-sm space-y-2">
                    {title && <div className="font-medium">{title}</div>}
                    <p className="whitespace-pre-wrap text-xs">{description || "Write your post content here..."}</p>
                  </div>
                  
                  {/* Media content */}
                  {mediaUrl && (
                    <div className="rounded-lg overflow-hidden border">
                      {mediaType === 'video' ? (
                        <Video src={mediaUrl} className="w-full h-36 object-cover" />
                      ) : (
                        <Image src={mediaUrl} alt={title} className="w-full h-36 object-cover" />
                      )}
                    </div>
                  )}
                  
                  {/* Facebook engagement bar */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div>Like</div>
                    <div>Comment</div>
                    <div>Share</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Instagram Preview */}
            <TabsContent value="instagram">
              <Card className="border-0 shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={brandLogo} alt={brandName} />
                      <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-semibold text-sm">{brandName}</div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {/* Media content first for Instagram */}
                  {mediaUrl ? (
                    <div className="rounded-lg overflow-hidden border">
                      {mediaType === 'video' ? (
                        <Video src={mediaUrl} className="w-full h-36 object-cover" />
                      ) : (
                        <Image src={mediaUrl} alt={title} className="w-full h-36 object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border bg-muted h-36 flex items-center justify-center">
                      <div className="text-muted-foreground text-xs">Media required for Instagram</div>
                    </div>
                  )}
                  
                  {/* Caption */}
                  <div className="text-xs space-y-1">
                    <div className="flex gap-1">
                      <span className="font-semibold">{brandName}</span>
                      <span className="whitespace-pre-wrap">{description || "Write your caption here..."}</span>
                    </div>
                    {title && <div className="text-muted-foreground text-xs">#{title.replace(/\s+/g, '')}</div>}
                  </div>
                  
                  {/* Instagram engagement bar */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div>❤️ Like</div>
                    <div>💬 Comment</div>
                    <div>📤 Share</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Google Business Preview */}
            <TabsContent value="google">
              <Card className="border-0 shadow-none">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={brandLogo} alt={brandName} />
                      <AvatarFallback>{brandName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">{brandName}</div>
                      <div className="text-xs text-muted-foreground">Google Business</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {/* Title for Google */}
                  {title && <div className="font-medium text-blue-600 text-sm">{title}</div>}
                  
                  <div className="text-xs space-y-2">
                    <p className="whitespace-pre-wrap">{description || "Write your post content here..."}</p>
                  </div>
                  
                  {/* Media content */}
                  {mediaUrl && (
                    <div className="rounded-lg overflow-hidden border">
                      {mediaType === 'video' ? (
                        <Video src={mediaUrl} className="w-full h-36 object-cover" />
                      ) : (
                        <Image src={mediaUrl} alt={title} className="w-full h-36 object-cover" />
                      )}
                    </div>
                  )}
                  
                  {/* Google action button */}
                  <div className="pt-2">
                    <div className="inline-block bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      View on Google
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Bottom home pill */}
        <div className="bg-black h-8 flex items-center justify-center">
          <div className="h-1 w-1/3 bg-gray-600 rounded-full"></div>
        </div>
      </div>
      
      {/* Device side buttons - positioned absolutely from parent */}
      <div className="max-w-[320px] mx-auto relative">
        {/* Power button */}
        <div className="absolute -right-4 top-24 h-10 w-2 bg-gray-700 rounded-r-md"></div>
        
        {/* Volume buttons */}
        <div className="absolute -left-4 top-20 h-8 w-2 bg-gray-700 rounded-l-md"></div>
        <div className="absolute -left-4 top-32 h-8 w-2 bg-gray-700 rounded-l-md"></div>
      </div>
    </div>
  );
}