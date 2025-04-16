import { useState } from 'react';
import { Calendar, Clock, Facebook, Globe, Instagram, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SocialMediaPreviewProps {
  imageUrl?: string;
  title: string;
  description: string;
  scheduledDate?: Date | string;
  platforms: string[];
}

export function SocialMediaPreview({
  imageUrl,
  title,
  description,
  scheduledDate,
  platforms
}: SocialMediaPreviewProps) {
  const [activeTab, setActiveTab] = useState<string>(platforms[0] || 'facebook');

  // Format the date for display
  const formattedDate = scheduledDate ? format(new Date(scheduledDate), 'MMM d, yyyy') : '';
  const formattedTime = scheduledDate ? format(new Date(scheduledDate), 'h:mm a') : '';

  return (
    <div className="w-full">
      <h3 className="text-md font-medium mb-2">Preview</h3>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${platforms.length}, minmax(0, 1fr))` }}>
          {platforms.includes('facebook') && (
            <TabsTrigger value="facebook" className="flex items-center gap-1">
              <Facebook className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Facebook</span>
            </TabsTrigger>
          )}
          {platforms.includes('instagram') && (
            <TabsTrigger value="instagram" className="flex items-center gap-1">
              <Instagram className="h-4 w-4 text-pink-600" />
              <span className="hidden sm:inline">Instagram</span>
            </TabsTrigger>
          )}
          {platforms.includes('google') && (
            <TabsTrigger value="google" className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-yellow-600" />
              <span className="hidden sm:inline">Google</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Facebook Preview */}
        {platforms.includes('facebook') && (
          <TabsContent value="facebook">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      B
                    </div>
                    <div>
                      <div className="font-semibold">Your Business</div>
                      <div className="flex items-center text-xs text-gray-500 gap-1">
                        {formattedDate && (
                          <>
                            <span>{formattedDate}</span>
                            <span>•</span>
                          </>
                        )}
                        <Globe className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="ml-auto">
                      <MoreHorizontal className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm">
                    {description}
                  </div>
                </div>
                
                {imageUrl && (
                  <div className="aspect-[1.91/1] relative overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-3 border-t border-gray-100 flex justify-between text-gray-500 text-sm">
                  <div className="flex gap-2">
                    <span>Like</span>
                    <span>Comment</span>
                    <span>Share</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Instagram Preview */}
        {platforms.includes('instagram') && (
          <TabsContent value="instagram">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold ring-2 ring-white">
                      B
                    </div>
                    <div className="font-semibold">your_business</div>
                    <div className="ml-auto">
                      <MoreHorizontal className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                </div>
                
                {imageUrl ? (
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400">
                    <span>No Image</span>
                  </div>
                )}
                
                <div className="p-3">
                  <div className="flex gap-4 text-gray-800 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </div>
                  
                  <div className="font-semibold text-sm">
                    your_business <span className="font-normal">{description}</span>
                  </div>
                  
                  <div className="text-gray-500 text-xs mt-1">
                    {formattedDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                        {formattedTime && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formattedTime}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Google Business Preview */}
        {platforms.includes('google') && (
          <TabsContent value="google">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="p-3 flex items-center gap-2 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200">
                    <div className="w-full h-full bg-gradient-to-b from-red-500 via-yellow-500 to-green-500 opacity-75"></div>
                  </div>
                  <div>
                    <div className="font-semibold">Your Business</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      {formattedDate} • Google Business
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="text-sm">
                    {description}
                  </div>
                </div>
                
                {imageUrl && (
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-3 border-t border-gray-100 flex gap-4 text-blue-600 text-sm">
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    Like
                  </div>
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    Comment
                  </div>
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}