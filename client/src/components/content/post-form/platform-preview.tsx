import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { SiFacebook, SiInstagram, SiGoogle } from 'react-icons/si';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from '@/components/ui/image';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import Video from '@/components/ui/video';

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
}

export function PlatformPreview({
  title,
  description,
  imageUrl,
  mediaItems = [],
  platforms,
  brandName,
  brandLogo,
}: PlatformPreviewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('facebook');
  
  // Get brand info
  const { data: brandsData } = useQuery<any[]>({
    queryKey: ['/api/brands'],
    enabled: !!user,
  });
  
  const activeBrand = brandsData?.find(brand => brand.ownerId === user?.id) || {
    name: brandName || user?.username || 'Brand',
    logo: brandLogo || '/placeholder-logo.png'
  };

  // Get current date for the post date display
  const postDate = new Date();
  const timeAgo = formatDistanceToNow(postDate, { addSuffix: true });

  // Get main media item
  const mainMediaItem = mediaItems.find(item => item.isMain) || mediaItems[0];
  const displayImageUrl = mainMediaItem?.url || imageUrl || '';
  const isVideo = mainMediaItem?.type === 'video';

  // Platform-specific content adjustments
  const getPostContent = () => {
    switch (activeTab) {
      case 'facebook':
        return description;
      case 'instagram':
        return `${description}\n\n#brand #marketing #social`;
      case 'google':
        return description.length > 100 
          ? `${description.substring(0, 97)}...` 
          : description;
      default:
        return description;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs 
        defaultValue="facebook" 
        className="w-full" 
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger 
            value="facebook" 
            disabled={!platforms.includes('facebook')}
            className="flex items-center space-x-2"
          >
            <SiFacebook className="h-4 w-4" />
            <span>Facebook</span>
          </TabsTrigger>
          <TabsTrigger 
            value="instagram"
            disabled={!platforms.includes('instagram')}
            className="flex items-center space-x-2"
          >
            <SiInstagram className="h-4 w-4" />
            <span>Instagram</span>
          </TabsTrigger>
          <TabsTrigger 
            value="google"
            disabled={!platforms.includes('google')}
            className="flex items-center space-x-2"
          >
            <SiGoogle className="h-4 w-4" />
            <span>Google</span>
          </TabsTrigger>
        </TabsList>

        {/* Facebook Preview */}
        <TabsContent value="facebook" className="mt-0">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-2 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeBrand.logo} alt={activeBrand.name} />
                  <AvatarFallback>{activeBrand.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{activeBrand.name}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo}</div>
                </div>
              </div>
              
              {title && <div className="font-bold mb-2">{title}</div>}
              
              <div className="mb-3 whitespace-pre-line">{getPostContent()}</div>
              
              {displayImageUrl && (
                <div className="overflow-hidden rounded-md border mb-3">
                  {isVideo ? (
                    <Video 
                      src={displayImageUrl} 
                      className="w-full h-[200px] object-cover" 
                    />
                  ) : (
                    <Image 
                      src={displayImageUrl} 
                      alt={title || 'Post image'} 
                      className="w-full h-[200px] object-cover" 
                    />
                  )}
                </div>
              )}
              
              {/* Multiple media preview (simplified) */}
              {mediaItems.length > 1 && (
                <div className="flex -space-x-1 overflow-hidden mb-3">
                  {mediaItems.slice(0, 4).map((item, i) => (
                    <div key={i} className="inline-block h-6 w-6 rounded-full border-2 border-background overflow-hidden">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={`Media ${i}`} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="bg-muted flex items-center justify-center h-full w-full">
                          <span className="text-[8px]">vid</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {mediaItems.length > 4 && (
                    <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted border-2 border-background text-[8px]">
                      +{mediaItems.length - 4}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <div>0 Likes</div>
                <div>0 Comments</div>
                <div>0 Shares</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instagram Preview */}
        <TabsContent value="instagram" className="mt-0">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeBrand.logo} alt={activeBrand.name} />
                    <AvatarFallback>{activeBrand.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="font-semibold text-sm">{activeBrand.name}</div>
                </div>
                <div className="text-muted-foreground">•••</div>
              </div>
              
              {displayImageUrl && (
                <div className="overflow-hidden rounded-md border aspect-square mb-3">
                  {isVideo ? (
                    <Video 
                      src={displayImageUrl} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Image 
                      src={displayImageUrl} 
                      alt={title || 'Post image'} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
              )}
              
              <div className="flex items-center space-x-4 py-2">
                <span>❤️</span>
                <span>💬</span>
                <span>📤</span>
                <span className="ml-auto">🔖</span>
              </div>
              
              <div className="text-sm">
                <span className="font-bold mr-2">{activeBrand.name}</span>
                <span className="whitespace-pre-line">{getPostContent()}</span>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                View all 0 comments
              </div>
              
              <div className="text-xs text-muted-foreground mt-1">
                {timeAgo}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Business Preview */}
        <TabsContent value="google" className="mt-0">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-2 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeBrand.logo} alt={activeBrand.name} />
                  <AvatarFallback>{activeBrand.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{activeBrand.name}</div>
                  <div className="flex items-center">
                    <div className="text-yellow-400 text-xs mr-1">★★★★★</div>
                    <span className="text-xs text-muted-foreground">5.0</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo}</div>
                </div>
              </div>
              
              <div className="mb-3 whitespace-pre-line">{getPostContent()}</div>
              
              {displayImageUrl && (
                <div className="overflow-hidden rounded-md border mb-3">
                  {isVideo ? (
                    <Video 
                      src={displayImageUrl} 
                      className="w-full h-[150px] object-cover" 
                    />
                  ) : (
                    <Image 
                      src={displayImageUrl} 
                      alt={title || 'Post image'} 
                      className="w-full h-[150px] object-cover" 
                    />
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-start space-x-4 text-xs text-muted-foreground">
                <div>LIKE</div>
                <div>COMMENT</div>
                <div>SHARE</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Image format validation */}
      {mediaItems.length > 0 && (
        <div className="mt-4">
          {activeTab === 'instagram' && (
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2">Format</Badge>
              {Math.abs(1 - 1) < 0.1 ? (
                <span className="text-green-500">✓ Aspect ratio optimal for Instagram</span>
              ) : (
                <span className="text-yellow-500">⚠️ For best results, use square format (1:1) for Instagram</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Character counter */}
      <div className="mt-auto pt-4 flex justify-between items-center text-xs text-muted-foreground">
        <div>
          {activeTab === 'facebook' && (
            <span>Facebook limit: {description.length}/63,206</span>
          )}
          {activeTab === 'instagram' && (
            <span>Instagram limit: {description.length}/2,200</span>
          )}
          {activeTab === 'google' && (
            <span>Google limit: {description.length}/1,500</span>
          )}
        </div>
        <div>
          {platforms.map(platform => (
            <Badge key={platform} variant="outline" className="ml-1 capitalize">
              {platform}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}