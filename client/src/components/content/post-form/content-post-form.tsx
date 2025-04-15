import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentPost, InsertContentPost } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";

// Define validation schema for new content
const contentPostSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  imageUrl: z.string().optional(),
  platforms: z.array(z.string()).min(1, { message: "Select at least one platform" }),
  scheduledDate: z.date().optional(),
  tags: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
  isEvergreen: z.boolean().default(false)
});

type ContentPostFormValues = z.infer<typeof contentPostSchema>;

interface ContentPostFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ContentPost>;
  isEvergreen?: boolean;
}

export function ContentPostForm({ isOpen, onClose, initialData, isEvergreen = false }: ContentPostFormProps) {
  console.log('ContentPostForm initialData:', initialData);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories (in a real app, this would come from the backend)
  const categories = ["Tips & Advice", "Promotions", "Seasonal", "Product Highlights", "Industry News"];

  // Log when the dialog is opened/closed
  console.log('Dialog is open:', isOpen);
  
  // Prepare default values with proper handling of scheduledDate
  const schedDate = initialData?.scheduledDate 
    ? (initialData.scheduledDate instanceof Date 
        ? initialData.scheduledDate 
        : new Date(initialData.scheduledDate)) 
    : undefined;
  
  console.log('Using scheduledDate:', schedDate);

  // Form setup
  const form = useForm<ContentPostFormValues>({
    resolver: zodResolver(contentPostSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      imageUrl: initialData?.imageUrl || "",
      platforms: initialData?.platforms || ["facebook", "instagram"],
      scheduledDate: schedDate,
      tags: initialData?.metadata && typeof initialData.metadata === 'object' && 'tags' in initialData.metadata
        ? (initialData.metadata.tags as string[]).join(", ")
        : "",
      category: initialData?.metadata && typeof initialData.metadata === 'object' && 'category' in initialData.metadata
        ? initialData.metadata.category as string
        : categories[0],
      isEvergreen: initialData?.isEvergreen || isEvergreen
    }
  });

  // Create content post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: ContentPostFormValues) => {
      // Prepare the data for the API
      const contentPost: Partial<InsertContentPost> = {
        brandId: user!.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        platforms: data.platforms,
        scheduledDate: data.scheduledDate,
        status: data.scheduledDate ? "scheduled" : "draft",
        isEvergreen: data.isEvergreen
      };

      // Add additional metadata
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
        description: `Your ${isEvergreen ? "evergreen" : ""} content has been created successfully.`,
      });
      // Invalidate relevant queries
      if (isEvergreen) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/calendar"] });
      }
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update content post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (data: ContentPostFormValues) => {
      if (!initialData || !initialData.id) {
        throw new Error("Missing post ID for update");
      }

      // Prepare the data for the API
      const contentPost: Partial<ContentPost> = {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        platforms: data.platforms,
        scheduledDate: data.scheduledDate,
        status: data.scheduledDate ? "scheduled" : "draft",
        isEvergreen: data.isEvergreen,
        metadata: {
          tags: data.tags?.split(",").map(tag => tag.trim()),
          category: data.category
        }
      };

      const res = await apiRequest("PATCH", `/api/content-posts/${initialData.id}`, contentPost);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content updated",
        description: "Your content has been updated successfully.",
      });
      // Invalidate relevant queries
      if (isEvergreen) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/calendar"] });
      }
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload image function - completely rewritten for more direct handling
  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('media', file);
      
      console.log('[UPLOAD] Starting upload for file:', file.name, 'size:', file.size);
      
      // Use fetch API with direct handling
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[UPLOAD] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      console.log('[UPLOAD] Upload successful, got URL:', data.file.url);
      
      // CRITICAL: Directly set both the form value and state variables
      // This ensures all ways of accessing the image URL are updated
      form.setValue('imageUrl', data.file.url, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Show toast notification
      const isVideo = file.type.startsWith('video/');
      toast({
        title: isVideo ? "Video uploaded" : "Image uploaded",
        description: `Your ${isVideo ? 'video' : 'image'} has been uploaded successfully.`,
      });
      
      return data.file.url; // Return the URL so we can use it elsewhere if needed
      
    } catch (error) {
      console.error('[UPLOAD] Error uploading file:', error);
      
      // Show error notification
      const isVideo = file.type.startsWith('video/');
      toast({
        title: `Error uploading ${isVideo ? 'video' : 'image'}`,
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: "destructive",
      });
      
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Completely rewritten handleFileChange to fix upload issues
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        // Create a preview URL immediately for better UX
        const fileUrl = URL.createObjectURL(file);
        setImagePreview(fileUrl);  
        setSelectedFile(file);
        
        console.log('[FILE] File selected for upload:', file.name, 'type:', file.type);
        
        // Start the upload immediately and get the URL back
        const uploadedUrl = await uploadImage(file);
        
        // If upload was successful, update the preview with the real URL
        if (uploadedUrl) {
          console.log('[FILE] Upload successful, updating preview to server URL:', uploadedUrl);
          setImagePreview(uploadedUrl);
          
          // This is the key step: make sure the form knows about the upload
          form.setValue('imageUrl', uploadedUrl, { 
            shouldValidate: true, 
            shouldDirty: true,
            shouldTouch: true 
          });
        }
      } catch (error) {
        console.error('[FILE] Error in file selection/upload:', error);
        // Keep the preview even on error
      } finally {
        // Always clear the input value to ensure the same file can be selected again
        e.target.value = '';
      }
    }
  };

  // Reset form when dialog closes
  const resetForm = () => {
    if (!initialData) {
      form.reset();
      setSelectedFile(null);
      setImagePreview(null);
    }
  };

  // Removed AI content generation functionality

  // Form submission handler
  const onSubmit = async (data: ContentPostFormValues) => {
    // If there's a selected file but no imageUrl, it means the upload might not have completed
    // We should block submission until upload is complete
    if (uploadingImage) {
      toast({
        title: "Upload in progress",
        description: "Please wait for the upload to complete before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Make sure we have the most up-to-date imageUrl from the uploaded file
    if (imagePreview && !data.imageUrl) {
      data.imageUrl = imagePreview;
    }
    
    if (initialData && initialData.id) {
      updatePostMutation.mutate(data);
    } else {
      createPostMutation.mutate(data);
    }
  };

  const isPending = createPostMutation.isPending || updatePostMutation.isPending;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Content" : isEvergreen ? "Add New Evergreen Content" : "Create New Post"}
          </DialogTitle>
          <DialogDescription>
            {isEvergreen 
              ? "Create content that can be randomly selected when scheduling posts"
              : "Create a new post to share with your retail partners' social media"}
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
                          {selectedFile?.type.startsWith('video/') || 
                           (imagePreview && (imagePreview.endsWith('.mp4') || imagePreview.endsWith('.webm') || imagePreview.endsWith('.mov'))) ? (
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
                        {categories.map((category) => (
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

            {!isEvergreen && (
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Schedule Date (optional)</FormLabel>
                    <DatePicker
                      date={field.value}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!initialData && (
              <FormField
                control={form.control}
                name="isEvergreen"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Save as evergreen content
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This content will be available in your evergreen library for future use
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <Separator className="my-4" />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  initialData ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}