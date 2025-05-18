import { useState } from "react";
import { publishToFacebook } from "@/utils/facebook-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { SiFacebook } from "react-icons/si";

interface PostToFacebookButtonProps {
  postId: number;
  postTitle: string;
  postDescription: string;
  postImageUrl?: string;
  disabled?: boolean;
}

export function PostToFacebookButton({ 
  postId, 
  postTitle, 
  postDescription, 
  postImageUrl,
  disabled 
}: PostToFacebookButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const { user } = useAuth();
  
  // Fetch connected Facebook pages if available
  const { data: connectedPages, isLoading: isLoadingPages } = useQuery({
    queryKey: ["/api/facebook/pages"], 
    queryFn: async () => {
      const response = await fetch("/api/facebook/pages");
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: false, // Initially disabled since we need proper connection first
  });
  
  const handlePost = async () => {
    if (!pageId || !accessToken) {
      alert("Please provide a Facebook Page ID and Access Token");
      return;
    }
    
    setIsPosting(true);
    
    try {
      await publishToFacebook(
        {
          description: postDescription,
          imageUrl: postImageUrl
        },
        {
          id: pageId,
          accessToken,
          name: "Facebook Page" // This is a placeholder as we don't know the page name
        }
      );
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error publishing to Facebook:", error);
      alert("Failed to post to Facebook. Please check your credentials and try again.");
    } finally {
      setIsPosting(false);
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5"
      >
        <SiFacebook className="h-4 w-4 text-blue-600" />
        <span>Post to Facebook</span>
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Post to Facebook</DialogTitle>
            <DialogDescription>
              Enter your Facebook Page ID and Access Token to post this content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Post Preview</h3>
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-sm font-medium">
                  {postTitle || "Untitled Post"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {postDescription.length > 100 
                    ? `${postDescription.substring(0, 100)}...` 
                    : postDescription}
                </p>
                {postImageUrl && (
                  <div className="mt-2 rounded-md overflow-hidden w-full max-w-[180px] border">
                    <img 
                      src={postImageUrl} 
                      alt="Post preview" 
                      className="w-full h-auto object-cover" 
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Facebook Page ID</label>
              <Input 
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="Enter your Facebook Page ID"
              />
              <p className="text-xs text-muted-foreground">
                You can find your Page ID in your Facebook Page's About section.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Token</label>
              <Input 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                type="password"
                placeholder="Enter your Page Access Token"
              />
              <p className="text-xs text-muted-foreground">
                Generate a Page Access Token from the Facebook Developer dashboard.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePost} 
              disabled={!pageId || !accessToken || isPosting}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}