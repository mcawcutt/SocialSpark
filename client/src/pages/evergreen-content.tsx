import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentPost, InsertContentPost } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AIContentGenerator } from "@/components/content/ai-content-generator";
import { CreatePostButton } from "@/components/content/post-form/create-post-button";
import { ContentPostForm } from "@/components/content/post-form/content-post-form";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckIcon, ImageIcon, PencilIcon, Trash2Icon, FilterIcon, Plus } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Define validation schema for new evergreen content
const evergreenContentSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  imageUrl: z.string().optional(),
  platforms: z.array(z.string()).min(1, { message: "Select at least one platform" }),
  tags: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" })
});

type EvergreenContentFormValues = z.infer<typeof evergreenContentSchema>;

export default function EvergreenContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch evergreen content
  const { data: evergreenPosts, isLoading } = useQuery<ContentPost[]>({
    queryKey: ["/api/content-posts/evergreen", user?.id],
    queryFn: async () => {
      // If no user is authenticated, use the demo endpoint
      const endpoint = user ? `/api/content-posts/evergreen?brandId=${user.id}` : "/api/content-posts/evergreen?demo=true";
      console.log(`[EvergreenContent] Fetching from: ${endpoint}`);
      
      const res = await apiRequest("GET", endpoint);
      const data = await res.json();
      console.log(`[EvergreenContent] Received ${data.length} evergreen posts`);
      return data;
    },
    // Enable the query even if user is not authenticated, to support demo mode
    enabled: true,
  });

  // Fetch categories (in a real app, this would come from the backend)
  const { data: categories } = useQuery<string[]>({
    queryKey: ["/api/content-categories"],
    queryFn: async () => {
      // In a production app, this would be an API call
      return ["Tips & Advice", "Promotions", "Seasonal", "Product Highlights", "Industry News"];
    },
  });

  // Form setup
  const form = useForm<EvergreenContentFormValues>({
    resolver: zodResolver(evergreenContentSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      platforms: ["facebook", "instagram"],
      tags: "",
      category: ""
    }
  });

  // Create evergreen content mutation
  const createEvergreenMutation = useMutation({
    mutationFn: async (data: EvergreenContentFormValues) => {
      // Prepare the data for the API
      const contentPost: Partial<InsertContentPost> = {
        brandId: user!.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        platforms: data.platforms,
        status: "draft",
        isEvergreen: true
      };

      // Add additional metadata for the evergreen content
      const postWithMetadata = {
        ...contentPost,
        metadata: {
          tags: data.tags?.split(",").map(tag => tag.trim()),
          category: data.category
        }
      };

      const res = await apiRequest("POST", "/api/content-posts", postWithMetadata);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content created",
        description: "Your evergreen content has been added to the library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
      resetForm();
      setIsAddContentOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete content mutation
  const deleteEvergreenMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/content-posts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Content deleted",
        description: "The evergreen content has been removed from your library.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Update the form with the uploaded image URL
      form.setValue('imageUrl', data.file.url);
      setImagePreview(data.file.url);
      setUploadingImage(false);
      const isVideo = selectedFile?.type.startsWith('video/');
      toast({
        title: isVideo ? "Video uploaded" : "Image uploaded",
        description: `Your ${isVideo ? 'video' : 'image'} has been uploaded successfully.`,
      });
    },
    onError: (error: Error) => {
      setUploadingImage(false);
      const isVideo = selectedFile?.type.startsWith('video/');
      toast({
        title: `Error uploading ${isVideo ? 'video' : 'image'}`,
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create a preview URL
      const fileUrl = URL.createObjectURL(file);
      setImagePreview(fileUrl);
      
      // Upload the file
      setUploadingImage(true);
      uploadImageMutation.mutate(file);
    }
  };

  // Reset form when dialog closes
  const resetForm = () => {
    form.reset();
    setSelectedFile(null);
    setImagePreview(null);
  };
  
  // Handle AI-generated content
  const handleAIContentGenerated = (title: string, description: string) => {
    form.setValue('title', title);
    form.setValue('description', description);
    
    toast({
      title: "Content inserted",
      description: "AI-generated content has been added to the form.",
    });
  };

  // Form submission handler
  const onSubmit = (data: EvergreenContentFormValues) => {
    // Make sure we have the most up-to-date imageUrl from the uploaded file
    if (imagePreview && !data.imageUrl) {
      data.imageUrl = imagePreview;
    }
    
    createEvergreenMutation.mutate(data);
  };

  // Filter posts based on category and search query
  const filteredPosts = evergreenPosts?.filter(post => {
    const metadata = post.metadata as { tags?: string[], category?: string } | null | undefined;
    
    const matchesCategory = selectedCategory === "all" || 
      (metadata && metadata.category === selectedCategory);
    
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Organize posts by category for the "By Category" tab view
  const getPostsByCategory = () => {
    const categorized: Record<string, ContentPost[]> = {};
    
    if (evergreenPosts) {
      evergreenPosts.forEach(post => {
        const metadata = post.metadata as { tags?: string[], category?: string } | null | undefined;
        const category = metadata?.category || "Uncategorized";
        
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(post);
      });
    }
    
    return categorized;
  };

  const postsByCategory = getPostsByCategory();

  return (
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Evergreen Content Library</h1>
              <p className="text-gray-500">Create and manage content that can be randomly selected for your retail partners' social media.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <CreatePostButton 
                isEvergreen={true}
                label="Add Evergreen Content"
                className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6] text-white"
              />
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground">
                <FilterIcon className="h-4 w-4" />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="grid">
            <TabsList className="mb-6">
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="categories">By Category</TabsTrigger>
            </TabsList>

            <TabsContent value="grid">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPosts && filteredPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map((post) => (
                    <EvergreenContentCard 
                      key={post.id} 
                      post={{
                        ...post,
                        metadata: post.metadata as { tags?: string[], category?: string } | null | undefined
                      }} 
                      onDelete={() => deleteEvergreenMutation.mutate(post.id)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <p className="text-lg text-muted-foreground">
                    {evergreenPosts?.length === 0 ? 
                      "Your evergreen content library is empty. Add your first piece of content!" : 
                      "No content matches your search filters."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="categories">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : Object.keys(postsByCategory).length > 0 ? (
                <div className="space-y-8">
                  {Object.entries(postsByCategory).map(([category, posts]) => (
                    <div key={category}>
                      <h2 className="text-xl font-semibold mb-4">{category}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post) => (
                          <EvergreenContentCard 
                            key={post.id} 
                            post={{
                              ...post,
                              metadata: post.metadata as { tags?: string[], category?: string } | null | undefined
                            }} 
                            onDelete={() => deleteEvergreenMutation.mutate(post.id)} 
                          />
                        ))}
                      </div>
                      <Separator className="mt-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <p className="text-lg text-muted-foreground">
                    Your evergreen content library is empty. Add your first piece of content!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Add New Evergreen Content Dialog */}
          <Dialog 
            open={isAddContentOpen} 
            onOpenChange={(open) => {
              setIsAddContentOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Evergreen Content</DialogTitle>
                <DialogDescription>
                  Create content that can be randomly selected when scheduling posts
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter a title for this content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Write the post content here..." 
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media</FormLabel>
                          <div className="space-y-3">
                            {imagePreview && (
                              <div className="relative w-full h-32 rounded-md overflow-hidden border">
                                {selectedFile?.type.startsWith('video/') ? (
                                  <video 
                                    src={imagePreview} 
                                    className="w-full h-full object-cover"
                                    controls
                                  />
                                ) : (
                                  <img 
                                    src={imagePreview} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            )}
                            <input
                              type="hidden"
                              {...field}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="relative"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                              >
                                {uploadingImage ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    {imagePreview ? "Change Media" : "Upload Image/Video"}
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*, video/*"
                                  ref={fileInputRef}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={handleFileChange}
                                />
                              </Button>
                              {imagePreview && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setImagePreview(null);
                                    field.onChange("");
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="product, sale, tip, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platforms"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Platforms</FormLabel>
                        </div>
                        <div className="flex gap-4">
                          <FormField
                            control={form.control}
                            name="platforms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("facebook")}
                                    onCheckedChange={(checked) => {
                                      const updatedPlatforms = checked 
                                        ? [...field.value, "facebook"] 
                                        : field.value.filter(platform => platform !== "facebook");
                                      field.onChange(updatedPlatforms);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">Facebook</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="platforms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("instagram")}
                                    onCheckedChange={(checked) => {
                                      const updatedPlatforms = checked 
                                        ? [...field.value, "instagram"] 
                                        : field.value.filter(platform => platform !== "instagram");
                                      field.onChange(updatedPlatforms);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">Instagram</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="platforms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("google")}
                                    onCheckedChange={(checked) => {
                                      const updatedPlatforms = checked 
                                        ? [...field.value, "google"] 
                                        : field.value.filter(platform => platform !== "google");
                                      field.onChange(updatedPlatforms);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">Google Business</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* AI Content Generator */}
                  <Separator className="my-4" />
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Need content ideas? Generate with AI</h3>
                    <AIContentGenerator 
                      onContentGenerated={handleAIContentGenerated}
                      contentType="evergreen"
                    />
                  </div>
                  <Separator className="my-4" />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddContentOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createEvergreenMutation.isPending}
                    >
                      {createEvergreenMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Add to Library"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

// Evergreen content card component
interface EvergreenContentCardProps {
  post: ContentPost & { 
    metadata?: { 
      tags?: string[], 
      category?: string 
    } | null | undefined
  };
  onDelete: () => void;
}

function EvergreenContentCard({ post, onDelete }: EvergreenContentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Import ContentPostForm at the top of the file
  // Function to close the edit dialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">{post.title}</CardTitle>
        <div className="flex gap-2 mt-1">
          {post.platforms.map((platform) => (
            <Badge key={platform} variant="outline" className="capitalize">
              {platform}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="w-full h-40 bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden"
        >
          {post.imageUrl ? (
            post.imageUrl.endsWith('.mp4') || post.imageUrl.endsWith('.webm') || post.imageUrl.endsWith('.mov') ? (
              <video 
                src={post.imageUrl} 
                className="w-full h-full object-cover" 
                controls
              />
            ) : (
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground/60" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{post.description}</p>
        
        {post.metadata?.tags && post.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.metadata.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-1 flex justify-between">
        <div className="text-xs text-muted-foreground">
          {post.metadata?.category && (
            <span>Category: {post.metadata.category}</span>
          )}
        </div>
        <div className="flex gap-2">
          {/* Edit button with proper onClick handler */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsEditDialogOpen(true)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          
          {/* ContentPostForm for editing */}
          <ContentPostForm
            isOpen={isEditDialogOpen}
            onClose={handleCloseEditDialog}
            initialData={post}
            isEvergreen={true}
          />
          
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Content?</DialogTitle>
                <DialogDescription>
                  This will permanently remove this content from your evergreen library.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardFooter>
    </Card>
  );
}