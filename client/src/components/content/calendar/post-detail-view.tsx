import { ContentPost } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SocialPostActions } from "@/components/content/social-post-actions";
import { Facebook, Instagram, Globe, Clock, Calendar, Edit, Trash2 } from "lucide-react";
import { SiFacebook, SiInstagram, SiGoogle } from "react-icons/si";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface PostDetailViewProps {
  post: ContentPost;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (post: ContentPost) => void;
  onDelete: (postId: number) => void;
}

export function PostDetailView({
  post,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: PostDetailViewProps) {
  // Function to render platform icons
  const renderPlatformIcons = (platforms: string[]) => {
    return (
      <div className="flex space-x-1">
        {platforms.map(platform => {
          switch (platform) {
            case 'facebook':
              return <SiFacebook key="facebook" className="text-blue-600 h-4 w-4" />;
            case 'instagram':
              return <SiInstagram key="instagram" className="text-purple-600 h-4 w-4" />;
            case 'google':
              return <SiGoogle key="google" className="text-red-600 h-4 w-4" />;
            default:
              return <Globe key={platform} className="text-gray-600 h-4 w-4" />;
          }
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Post Details</span>
            {post.isEvergreen && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Evergreen
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <div className="flex items-center mt-1 space-x-2">
              {renderPlatformIcons(post.platforms)}
              <span className="text-sm text-muted-foreground">
                {post.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
              </span>
            </div>
          </div>
          
          {/* Scheduled date/time */}
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {post.scheduledDate 
                ? format(new Date(post.scheduledDate), "PPP") 
                : "Not scheduled"}
            </span>
            {post.scheduledDate && (
              <>
                <span className="mx-1">•</span>
                <Clock className="h-4 w-4" />
                <span>{format(new Date(post.scheduledDate), "p")}</span>
              </>
            )}
          </div>
          
          {/* Content */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Content</h3>
            <div className="bg-muted/30 rounded-md p-3 whitespace-pre-wrap text-sm">
              {post.description}
            </div>
          </div>
          
          {/* Media */}
          {post.imageUrl && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Media</h3>
              <div className="border rounded-md overflow-hidden max-w-xs">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
          
          {/* Partner distribution */}
          {post.metadata?.partnerDistribution && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Partner Distribution</h3>
              <div className="text-sm">
                {post.metadata.partnerDistribution === "all" ? (
                  <span>All retail partners</span>
                ) : (
                  <div>
                    <span>Partners with tags: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {post.metadata.partnerTags && Array.isArray(post.metadata.partnerTags) && 
                        post.metadata.partnerTags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Social Post Actions */}
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Actions</h3>
            <SocialPostActions post={post} />
          </div>
          
          {/* Bottom buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onEdit(post)}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}