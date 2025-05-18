import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Facebook, Image as ImageIcon, Send } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";

interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
}

export default function FacebookIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [postMessage, setPostMessage] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("connect");

  // Get Facebook authentication status
  const { data: facebookAuth, isLoading: isLoadingAuth, refetch: refetchAuth } = useQuery({
    queryKey: ['/api/facebook-auth/status'],
    queryFn: async () => {
      const response = await fetch('/api/facebook-auth/status');
      if (!response.ok) {
        if (response.status === 401) {
          return { authenticated: false };
        }
        throw new Error('Failed to check authentication status');
      }
      return response.json();
    },
  });

  // Get Facebook Pages if authenticated
  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/facebook-auth/pages'],
    queryFn: async () => {
      const response = await fetch('/api/facebook-auth/pages');
      if (!response.ok) {
        throw new Error('Failed to fetch Facebook pages');
      }
      return response.json();
    },
    enabled: !!facebookAuth?.authenticated,
  });

  // Connect to Facebook
  const connectMutation = useMutation({
    mutationFn: async () => {
      // Generate OAuth URL
      const response = await fetch('/api/facebook-auth/connect-url');
      if (!response.ok) {
        throw new Error('Failed to generate connection URL');
      }
      const data = await response.json();
      
      // Redirect to Facebook for authentication
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create Facebook post
  const postMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPageId || !postMessage) {
        throw new Error('Please select a page and enter a message');
      }

      const selectedPage = pages.find((page: FacebookPage) => page.id === selectedPageId);
      if (!selectedPage) {
        throw new Error('Selected page not found');
      }

      const formData = new FormData();
      formData.append('pageId', selectedPage.id);
      formData.append('accessToken', selectedPage.accessToken);
      formData.append('message', postMessage);
      
      if (postImage) {
        formData.append('image', postImage);
      }

      const response = await fetch('/api/facebook-auth/post', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Post Created",
        description: `Successfully posted to Facebook! Post ID: ${data.id}`,
      });
      setPostMessage("");
      setPostImage(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle image selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setPostImage(null);
    setPreviewUrl(null);
  };

  // Handle Facebook logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/facebook-auth/logout', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to logout');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchAuth();
      setSelectedPageId(null);
      toast({
        title: "Logged Out",
        description: "Successfully disconnected from Facebook",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Select the first page by default when pages are loaded
  useEffect(() => {
    if (pages && pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  // Show connected UI if authenticated
  const renderConnectedUI = () => {
    if (!facebookAuth?.authenticated) {
      return (
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <Facebook className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium mb-2">Connect to Facebook</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Connect your Facebook account to access your pages and post content directly to Facebook.
          </p>
          <Button 
            onClick={() => connectMutation.mutate()} 
            disabled={connectMutation.isPending}
            size="lg"
          >
            {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect with Facebook
          </Button>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">Connected to Facebook</h3>
            <p className="text-gray-500">You're connected as {facebookAuth.userName}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()} 
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect
          </Button>
        </div>

        {isLoadingPages ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-gray-500">Loading your Facebook pages...</p>
          </div>
        ) : pages && pages.length > 0 ? (
          <div>
            <h4 className="font-medium mb-3">Your Facebook Pages</h4>
            <RadioGroup 
              value={selectedPageId || ''} 
              onValueChange={setSelectedPageId}
              className="space-y-2"
            >
              {pages.map((page: FacebookPage) => (
                <div 
                  key={page.id} 
                  className="flex items-center space-x-2 p-3 rounded-md border hover:bg-gray-50"
                >
                  <RadioGroupItem value={page.id} id={`page-${page.id}`} />
                  <Label 
                    htmlFor={`page-${page.id}`}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{page.name}</span>
                      {page.category && (
                        <p className="text-xs text-gray-500">{page.category}</p>
                      )}
                    </div>
                    {selectedPageId === page.id && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Facebook Pages Found</AlertTitle>
            <AlertDescription>
              You need to have admin access to at least one Facebook page to post content.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Create post UI
  const renderCreatePostUI = () => {
    if (!facebookAuth?.authenticated) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Not Connected</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            You need to connect to Facebook first to create posts.
          </p>
          <Button onClick={() => setActiveTab("connect")}>
            Go to Connect Tab
          </Button>
        </div>
      );
    }

    if (!pages || pages.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Pages Available</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            You don't have any Facebook pages to post to. You need to have admin access to at least one Facebook page.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="pageSelect" className="mb-2 block">Select Page to Post To</Label>
          <RadioGroup 
            value={selectedPageId || ''} 
            onValueChange={setSelectedPageId}
            className="space-y-2"
          >
            {pages.map((page: FacebookPage) => (
              <div 
                key={page.id} 
                className="flex items-center space-x-2 p-3 rounded-md border hover:bg-gray-50"
              >
                <RadioGroupItem value={page.id} id={`post-page-${page.id}`} />
                <Label 
                  htmlFor={`post-page-${page.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {page.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="postMessage" className="mb-2 block">Post Message</Label>
          <Textarea
            id="postMessage"
            value={postMessage}
            onChange={(e) => setPostMessage(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px]"
          />
        </div>

        <div>
          <Label htmlFor="postImage" className="mb-2 block">Add Image (Optional)</Label>
          {previewUrl ? (
            <div className="mt-2 relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-[300px] rounded-md border object-contain" 
              />
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-2 right-2" 
                onClick={handleRemoveImage}
              >
                Remove Image
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Label
                htmlFor="postImage"
                className="cursor-pointer flex items-center gap-2 p-3 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                <ImageIcon className="h-5 w-5" />
                Select Image
              </Label>
              <Input
                id="postImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-sm text-gray-500">
                JPG, PNG, or GIF (max 10MB)
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={() => postMutation.mutate()}
          disabled={postMutation.isPending || !selectedPageId || !postMessage}
          className="w-full"
          size="lg"
        >
          {postMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Post to Facebook
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MobileNav />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Facebook Integration</h1>
              <p className="text-gray-500">Connect and post directly to your Facebook pages</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="mb-6">
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="create-post">Create Post</TabsTrigger>
            </TabsList>

            <TabsContent value="connect">
              <Card>
                <CardHeader>
                  <CardTitle>Connect to Facebook</CardTitle>
                  <CardDescription>
                    Connect your Facebook account to access your pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAuth ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                      <p className="mt-2 text-gray-500">Checking connection status...</p>
                    </div>
                  ) : (
                    renderConnectedUI()
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create-post">
              <Card>
                <CardHeader>
                  <CardTitle>Create Facebook Post</CardTitle>
                  <CardDescription>
                    Post directly to your Facebook pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderCreatePostUI()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}