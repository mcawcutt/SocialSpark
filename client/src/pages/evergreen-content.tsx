import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentPost, InsertContentPost } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

  // Fetch evergreen content
  const { data: evergreenPosts, isLoading } = useQuery<ContentPost[]>({
    queryKey: ["/api/content-posts/evergreen", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/content-posts/evergreen?brandId=${user?.id}`);
      return await res.json();
    },
    enabled: !!user?.id,
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
        imageUrl: data.imageUrl || "https://placehold.co/600x400",
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
      form.reset();
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

  // Form submission handler
  const onSubmit = (data: EvergreenContentFormValues) => {
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Evergreen Content Library</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage content that can be randomly selected for your retail partners' social media.
          </p>
        </div>
        <Button onClick={() => setIsAddContentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Content
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
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
          <SelectTrigger className="w-[200px]">
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
            form.reset();
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
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
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
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
          <Button variant="ghost" size="icon">
            <PencilIcon className="h-4 w-4" />
          </Button>
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