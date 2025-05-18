import { useState, useRef, ChangeEvent, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ContentPost, InsertContentPost, RetailPartner, MediaLibraryItem } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SocialMediaPreview } from "./social-media-preview";
import { PlatformPreview } from "./platform-preview";
import { EmojiPicker } from "@/components/ui/emoji-picker";

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Loader2, MessageSquare, Hash, Smile, AtSign, HelpCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Badge } from "@/components/ui/badge";
import { MediaSelector } from "@/components/media/media-selector";
import { FileUploader } from "@/components/media/file-uploader";
import { SiFacebook, SiInstagram, SiGoogle } from "react-icons/si";

// Define validation schema for new content
const contentPostSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  // Keep imageUrl for backward compatibility but make it optional
  imageUrl: z.string().optional(),
  // Add a new field for multiple media items
  mediaItems: z.array(z.object({
    url: z.string(),
    type: z.enum(["image", "video"]),
    isMain: z.boolean().default(false)
  })).optional().default([]),
  platforms: z.array(z.string()).min(1, { message: "Select at least one platform" }),
  scheduledDate: z.date().optional(),
  // Tags field removed as requested
  // Category field removed as requested
  isEvergreen: z.boolean().default(false),
  partnerDistribution: z.enum(["all", "byTag"]).default("all"),
  partnerTags: z.array(z.string()).optional()
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // State for multiple media items
  const [mediaItems, setMediaItems] = useState<Array<{
    url: string;
    type: "image" | "video";
    isMain: boolean;
  }>>((() => {
    // Try to extract mediaItems from metadata if it exists
    if (initialData?.metadata && typeof initialData.metadata === 'object') {
      const metadata = initialData.metadata as { mediaItems?: any[] };
      if (metadata.mediaItems && Array.isArray(metadata.mediaItems)) {
        // Ensure the data is properly typed
        return metadata.mediaItems.map(item => ({
          url: String(item.url || ''),
          type: item.type === 'video' ? 'video' as const : 'image' as const,
          isMain: Boolean(item.isMain)
        }));
      }
    }
    // If no media items in metadata but we have an imageUrl, create one item
    if (initialData?.imageUrl) {
      const isVideo = initialData.imageUrl.match(/\.(mp4|mov|webm)$/i);
      return [{
        url: initialData.imageUrl,
        type: isVideo ? 'video' as const : 'image' as const,
        isMain: true
      }];
    }
    // Otherwise return empty array
    return [];
  })());

  // Determine which endpoint to use based on authentication status
  const partnersEndpoint = user ? "/api/retail-partners" : "/api/demo/retail-partners";
  const tagsEndpoint = user ? "/api/retail-partners/tags" : "/api/demo/retail-partners/tags";
  
  console.log(`[ContentPostForm] Using endpoints: ${partnersEndpoint}, ${tagsEndpoint}, user: ${user?.username || 'not authenticated'}`);

  // Fetch retail partners
  const { data: partners } = useQuery<RetailPartner[]>({
    queryKey: [partnersEndpoint],
    enabled: isOpen && !isEvergreen
  });

  // Fetch partner tags from the dedicated endpoint
  const { data: tagData } = useQuery<string[]>({
    queryKey: [tagsEndpoint],
    enabled: isOpen && !isEvergreen
  });
  
  // Handle tag data changes
  useEffect(() => {
    if (tagData) {
      console.log('Fetched partner tags from API:', tagData);
      setAvailableTags(tagData);
    }
  }, [tagData]);
  
  // Extract tags from partners as fallback
  const extractTagsFromPartners = (partnersList: RetailPartner[]) => {
    const allTags: string[] = [];
    
    // Extract all tags from partners
    partnersList.forEach(partner => {
      console.log('Partner metadata:', partner.name, partner.metadata);
      if (partner.metadata && typeof partner.metadata === 'object') {
        // Type assertion to access tags property safely
        const metadata = partner.metadata as { tags?: string[] };
        if (metadata.tags && Array.isArray(metadata.tags)) {
          allTags.push(...metadata.tags.filter(tag => typeof tag === 'string'));
        }
      }
    });
    
    // Get unique tags only
    const uniqueTagsSet = new Set<string>();
    allTags.forEach(tag => uniqueTagsSet.add(tag));
    
    const tagsArray = Array.from(uniqueTagsSet);
    console.log('Available partner tags (extracted):', tagsArray);
    setAvailableTags(tagsArray);
  };
  
  // Log partners data
  useEffect(() => {
    if (partners) {
      console.log('Retail partners data:', partners);
      
      // Use this as a fallback if the tags API didn't return data
      if ((!tagData || tagData.length === 0) && partners.length > 0) {
        extractTagsFromPartners(partners);
      }
    }
  }, [partners, tagData]);

  // Fetch categories (in a real app, this would come from the backend)
  const categories = ["Tips & Advice", "Promotions", "Seasonal", "Product Highlights", "Industry News"];

  // Log when the dialog is opened/closed
  console.log('Dialog is open:', isOpen);
  
  // Create a date with the current local time if no date is provided
  const now = new Date();
  
  // Prepare default values with proper handling of scheduledDate and current local time
  const schedDate = initialData?.scheduledDate 
    ? (initialData.scheduledDate instanceof Date 
        ? initialData.scheduledDate 
        : new Date(initialData.scheduledDate)) 
    : now;
  
  // Keep track of selected date and time separately
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(schedDate);
  
  console.log('Using scheduledDate:', schedDate);

  // Enhanced Form setup with better validation mode and handling
  const form = useForm<ContentPostFormValues>({
    resolver: zodResolver(contentPostSchema),
    mode: "onChange", // Enable validation as values change
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      imageUrl: initialData?.imageUrl || "",
      // Initialize mediaItems from existing data or from the state
      mediaItems: (() => {
        // First check if there's media items in metadata
        if (initialData?.metadata?.mediaItems && Array.isArray(initialData.metadata.mediaItems)) {
          return initialData.metadata.mediaItems;
        }
        // If we have an existing single image, convert it to the new format
        else if (initialData?.imageUrl) {
          return [{
            url: initialData.imageUrl,
            type: initialData.imageUrl.match(/\.(mp4|mov|webm)$/i) ? "video" : "image",
            isMain: true
          }];
        }
        // Otherwise return an empty array
        return [];
      })(),
      platforms: initialData?.platforms || ["facebook", "instagram"],
      scheduledDate: schedDate,
      tags: (() => {
        if (initialData?.metadata && typeof initialData.metadata === 'object') {
          // Type assertion to access metadata properties safely
          const metadata = initialData.metadata as { tags?: string[] };
          if (metadata.tags && Array.isArray(metadata.tags)) {
            return metadata.tags.join(", ");
          }
        }
        return "";
      })(),
      category: (() => {
        if (initialData?.metadata && typeof initialData.metadata === 'object') {
          // Type assertion to access metadata properties safely
          const metadata = initialData.metadata as { category?: string };
          if (metadata.category && typeof metadata.category === 'string') {
            return metadata.category;
          }
        }
        return categories[0];
      })(),
      isEvergreen: initialData?.isEvergreen || isEvergreen,
      partnerDistribution: (() => {
        if (initialData?.metadata && typeof initialData.metadata === 'object') {
          // Type assertion to access metadata properties safely
          const metadata = initialData.metadata as { partnerDistribution?: "all" | "byTag" };
          if (metadata.partnerDistribution) {
            return metadata.partnerDistribution;
          }
        }
        return "all";
      })(),
      partnerTags: (() => {
        if (initialData?.metadata && typeof initialData.metadata === 'object') {
          // Type assertion to access metadata properties safely
          const metadata = initialData.metadata as { partnerTags?: string[] };
          if (metadata.partnerTags && Array.isArray(metadata.partnerTags)) {
            return metadata.partnerTags;
          }
        }
        return [];
      })()
    }
  });

  // Create content post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: ContentPostFormValues) => {
      // Determine main image URL (for backward compatibility)
      // If we have media items, use the first one marked as main or the first one
      let mainImageUrl = data.imageUrl || "";
      
      if (data.mediaItems && data.mediaItems.length > 0) {
        const mainItem = data.mediaItems.find(item => item.isMain) || data.mediaItems[0];
        mainImageUrl = mainItem.url;
      }
      
      // Prepare the data for the API with the proper brandId (from user.brandId if impersonated)
      const contentPost: Partial<InsertContentPost> = {
        brandId: user?.brandId || user!.id,
        creatorId: user!.id, // Set creator ID to current user's ID
        title: data.title,
        description: data.description,
        imageUrl: mainImageUrl, // Set primary image for backward compatibility
        platforms: data.platforms,
        scheduledDate: data.scheduledDate,
        status: data.scheduledDate ? "scheduled" : "draft",
        isEvergreen: data.isEvergreen
      };

      // Add additional metadata including partner distribution and media items
      const metadata: any = {
        // Convert tags from comma-separated string to array
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
        category: data.category,
        partnerDistribution: data.partnerDistribution,
        partnerTags: data.partnerTags || [],
        mediaItems: data.mediaItems || []
      };

      contentPost.metadata = metadata;

      if (user) {
        // Only include the API endpoint if we have a user (i.e. not in demo mode)
        const endpoint = data.isEvergreen 
          ? "/api/content-posts/evergreen" 
          : "/api/content-posts";
          
        const response = await apiRequest('POST', endpoint, contentPost);
        return await response.json();
      } else {
        // Demo mode
        // Just return the post with a fake ID for demo purposes
        return {
          ...contentPost,
          id: Math.floor(Math.random() * 1000),
          createdAt: new Date()
        };
      }
    },
    onSuccess: () => {
      onClose();
      form.reset();
      
      toast({
        title: "Success",
        description: isEvergreen 
          ? "Evergreen content created successfully" 
          : "Content post created successfully",
      });
      
      // Invalidate the relevant queries to refresh the UI
      if (isEvergreen) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
      }
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create content post. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update existing content post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (data: ContentPostFormValues) => {
      if (!initialData || !initialData.id) {
        throw new Error("Cannot update post without an ID");
      }
      
      // Similar to create logic but for updating
      let mainImageUrl = data.imageUrl || "";
      
      if (data.mediaItems && data.mediaItems.length > 0) {
        const mainItem = data.mediaItems.find(item => item.isMain) || data.mediaItems[0];
        mainImageUrl = mainItem.url;
      }
      
      const contentPost: Partial<ContentPost> = {
        id: initialData.id,
        title: data.title,
        description: data.description,
        imageUrl: mainImageUrl,
        platforms: data.platforms,
        scheduledDate: data.scheduledDate,
        status: data.scheduledDate ? "scheduled" : "draft",
        isEvergreen: data.isEvergreen
      };
      
      // Add metadata
      const metadata: any = {
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
        category: data.category,
        partnerDistribution: data.partnerDistribution,
        partnerTags: data.partnerTags || [],
        mediaItems: data.mediaItems || []
      };
      
      contentPost.metadata = metadata;
      
      if (user) {
        const endpoint = data.isEvergreen 
          ? `/api/content-posts/evergreen/${initialData.id}`
          : `/api/content-posts/${initialData.id}`;
          
        const response = await apiRequest('PATCH', endpoint, contentPost);
        return await response.json();
      } else {
        // Demo mode fallback
        return {
          ...contentPost,
          updatedAt: new Date()
        };
      }
    },
    onSuccess: () => {
      onClose();
      form.reset();
      
      toast({
        title: "Success",
        description: "Content post updated successfully",
      });
      
      // Invalidate queries
      if (isEvergreen) {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts/evergreen", user?.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
      }
    },
    onError: (error) => {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update content post. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Utility function to validate media files against platforms
  const validateMediaFile = (file: File, platforms: string[]) => {
    // Instagram requirements
    const isImageFile = file.type.startsWith('image/');
    const isVideoFile = file.type.startsWith('video/');
    
    if (!isImageFile && !isVideoFile) {
      return {
        valid: false,
        error: "File must be an image or video"
      };
    }
    
    if (platforms.includes('instagram')) {
      // Instagram has specific requirements
      const fileSizeMB = file.size / (1024 * 1024);
      if (isImageFile && fileSizeMB > 8) {
        return {
          valid: false,
          error: "Instagram images must be under 8MB"
        };
      }
      if (isVideoFile && fileSizeMB > 100) {
        return {
          valid: false,
          error: "Instagram videos must be under 100MB"
        };
      }
    }
    
    return { valid: true };
  };

  // File upload handler
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const platforms = form.getValues("platforms") || ["facebook", "instagram"];
    
    console.log('File selected:', file.name);
    
    // Validate the file against platform requirements
    const validation = validateMediaFile(file, platforms);
    
    if (!validation.valid) {
      toast({
        title: "Invalid media file",
        description: validation.error,
        variant: "destructive",
      });
      // Clear input value so the same file can be selected again
      e.target.value = '';
      return;
    }
    
    // Show a local preview immediately 
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);
    setSelectedFile(file);
    
    // Start upload
    setUploadingImage(true);
    
    try {
      // Create and prepare form data
      const formData = new FormData();
      formData.append('media', file);
      
      console.log('Uploading file...');
      
      // Direct fetch with minimal complexity
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      
      const result = await response.json();
      const fileUrl = result.file.url;
      
      console.log('✅ Upload successful, got URL:', fileUrl);
      
      // First release the object URL to prevent memory leaks
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      
      // Update the preview immediately
      setImagePreview(null); // Force a re-render by clearing first
      
      // Then use a small timeout to make sure all state updates happen in sequence
      setTimeout(() => {
        // Set the URL to the actual server file
        setImagePreview(fileUrl);
        
        // VERY explicitly set the form value
        form.setValue('imageUrl', fileUrl, { 
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true 
        });
        
        // Add this file to the mediaItems array
        const newMediaItem = {
          url: fileUrl,
          type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
          isMain: true // Mark as main by default
        };
        
        // Get current media items
        const currentMediaItems = form.getValues('mediaItems') || [];
        
        // If this is the first item, set it as main, otherwise unmark all items as main
        if (currentMediaItems.length > 0) {
          // If we're adding a new main item, unmark existing items as main
          currentMediaItems.forEach(item => item.isMain = false);
        }
        
        // Add the new item to the array
        const updatedMediaItems = [...currentMediaItems, newMediaItem];
        
        // Update form value
        form.setValue('mediaItems', updatedMediaItems, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        
        // Update component state
        setMediaItems(updatedMediaItems);
        
        console.log('Form imageUrl value is now:', form.getValues('imageUrl'));
        console.log('Media items now:', updatedMediaItems);
        console.log('Image preview set to:', fileUrl);
      }, 100);
      
      // Success toast
      toast({
        title: "Upload successful",
        description: "Your media has been uploaded and attached to this post.",
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      
      // Clear the preview on error
      setImagePreview(null);
      setSelectedFile(null);
    } finally {
      setUploadingImage(false);
      // Clear input 
      e.target.value = '';
    }
  };

  // Reset form when dialog closes
  const resetForm = () => {
    if (!initialData) {
      form.reset();
      setSelectedFile(null);
      setImagePreview(null);
      setSelectedDate(undefined); // Reset the date picker state
    }
  };

  // Enhanced form submission handler
  const onSubmit = async (data: ContentPostFormValues) => {
    console.log('Form submitting with data:', data);
    
    // If there's a selected file but upload is in progress, block submission
    if (uploadingImage) {
      toast({
        title: "Upload in progress",
        description: "Please wait for the upload to complete before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Final validation for image/media
    if (imagePreview && !data.imageUrl) {
      // Image preview exists but form value doesn't - fix this inconsistency
      console.log('Setting imageUrl from preview as last resort');
      data.imageUrl = imagePreview;
    }
    
    // Validate that we have an image if platforms requires it
    if (!data.imageUrl && (data.platforms.includes('instagram') || data.platforms.includes('facebook'))) {
      toast({
        title: "Media required",
        description: "Posts for Instagram and Facebook require an image or video",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Final form data being submitted:', {
      ...data,
      hasImage: !!data.imageUrl,
      imageUrl: data.imageUrl ? 'Present' : 'Missing'
    });
    
    // Submit form data based on whether we're creating or updating
    if (initialData && initialData.id) {
      updatePostMutation.mutate(data);
    } else {
      createPostMutation.mutate(data);
    }
  };

  const isPending = createPostMutation.isPending || updatePostMutation.isPending;
  
  // Watch form fields for preview and partner targeting
  const watchedTitle = form.watch("title");
  const watchedDescription = form.watch("description");
  const watchedImageUrl = form.watch("imageUrl");
  const watchedPlatforms = form.watch("platforms") || ["facebook"];
  const watchedScheduledDate = form.watch("scheduledDate");
  const selectedPartnerTags = form.watch("partnerTags") || [];
  const selectedDistributionMethod = form.watch("partnerDistribution");
  
  const targetedPartners = useMemo(() => {
    if (!partners || partners.length === 0) {
      console.log('No partners available for matching');
      return [];
    }
    
    // Handle distribution methods
    if (selectedDistributionMethod === "all") {
      console.log('Distribution method is "all", returning all partners');
      return partners;
    }
    
    // If byTag, filter by selected tags
    console.log('Distribution method is "byTag", filtering by tags:', selectedPartnerTags);
    
    const filteredPartners = partners.filter(partner => {
      // Safety check for metadata
      if (!partner.metadata || typeof partner.metadata !== 'object') {
        console.log(`Partner ${partner.name} has no metadata`);
        return false;
      }
      
      // Type assertion to access tags property safely
      const metadata = partner.metadata as { tags?: string[] };
      if (!metadata.tags) {
        console.log(`Partner ${partner.name} has metadata but no tags property`);
        return false;
      }
      
      const partnerTags = metadata.tags;
      if (!Array.isArray(partnerTags)) {
        console.log(`Partner ${partner.name} tags are not an array:`, partnerTags);
        return false;
      }
      
      // Only proceed if we have selected tags to match against
      if (selectedPartnerTags.length === 0) {
        console.log(`No tags selected for filtering`);
        return false;
      }
      
      // Check if any of the selected tags match this partner's tags
      const hasMatchingTag = selectedPartnerTags.some(tag => {
        const matchFound = partnerTags.includes(tag);
        console.log(`Checking if partner ${partner.name} has tag '${tag}': ${matchFound ? 'YES' : 'NO'}`);
        return matchFound;
      });
      
      console.log(`Partner ${partner.name} ${hasMatchingTag ? 'MATCHES' : 'DOES NOT match'} the selected tags`);
      return hasMatchingTag;
    });
    
    console.log('Final targeted partners count:', filteredPartners.length);
    console.log('Targeted partners:', filteredPartners.map(p => p.name));
    return filteredPartners;
  }, [partners, selectedDistributionMethod, selectedPartnerTags]);

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
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
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
            {/* Platform Quick Selector */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <FormField
                control={form.control}
                name="platforms"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value.includes("facebook") ? "default" : "outline"}
                      className={`flex items-center gap-2 ${field.value.includes("facebook") ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      onClick={() => {
                        const newValue = field.value.includes("facebook")
                          ? field.value.filter(p => p !== "facebook")
                          : [...field.value, "facebook"];
                        field.onChange(newValue.length ? newValue : ["facebook"]); // Ensure at least one platform is selected
                      }}
                    >
                      <SiFacebook className="h-4 w-4" />
                      <span>Facebook</span>
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value.includes("instagram") ? "default" : "outline"}
                      className={`flex items-center gap-2 ${field.value.includes("instagram") ? "bg-pink-600 hover:bg-pink-700" : ""}`}
                      onClick={() => {
                        const newValue = field.value.includes("instagram")
                          ? field.value.filter(p => p !== "instagram")
                          : [...field.value, "instagram"];
                        field.onChange(newValue.length ? newValue : ["instagram"]); // Ensure at least one platform is selected
                      }}
                    >
                      <SiInstagram className="h-4 w-4" />
                      <span>Instagram</span>
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value.includes("google") ? "default" : "outline"}
                      className={`flex items-center gap-2 ${field.value.includes("google") ? "bg-red-600 hover:bg-red-700" : ""}`}
                      onClick={() => {
                        const newValue = field.value.includes("google")
                          ? field.value.filter(p => p !== "google")
                          : [...field.value, "google"];
                        field.onChange(newValue.length ? newValue : ["google"]); // Ensure at least one platform is selected
                      }}
                    >
                      <SiGoogle className="h-4 w-4" />
                      <span>Google</span>
                    </Button>
                  </div>
                )}
              />
              
{/* Partner Distribution section moved to the bottom */}
            </div>

            {/* Split into two columns for editor and preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Editor */}
              <div className="space-y-4">
{/* Title field removed as requested */}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Content</span>
                        <div className="flex items-center text-xs text-muted-foreground">
                          {field.value.length} characters
                        </div>
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Write the post content here..." 
                            className="min-h-[200px] pr-10" 
                          />
                        </FormControl>
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                          <EmojiPicker 
                            onEmojiSelect={(emoji) => {
                              const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const newValue = field.value.substring(0, start) + emoji + field.value.substring(end);
                                field.onChange(newValue);
                                
                                // Set cursor position after the inserted emoji
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.selectionStart = start + emoji.length;
                                  textarea.selectionEnd = start + emoji.length;
                                }, 10);
                              } else {
                                field.onChange(field.value + emoji);
                              }
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const newValue = field.value.substring(0, start) + '#' + field.value.substring(end);
                                field.onChange(newValue);
                                
                                // Set cursor position after the inserted character
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.selectionStart = start + 1;
                                  textarea.selectionEnd = start + 1;
                                }, 10);
                              } else {
                                field.onChange(field.value + '#');
                              }
                            }}
                          >
                            <Hash className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const newValue = field.value.substring(0, start) + '@' + field.value.substring(end);
                                field.onChange(newValue);
                                
                                // Set cursor position after the inserted character
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.selectionStart = start + 1;
                                  textarea.selectionEnd = start + 1;
                                }, 10);
                              } else {
                                field.onChange(field.value + '@');
                              }
                            }}
                          >
                            <AtSign className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media</FormLabel>
                      <div className="space-y-3">
                        {/* Display media grid for multiple items */}
                        {mediaItems.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Media Files ({mediaItems.length})</div>
                            <div className="grid grid-cols-4 gap-2">
                              {mediaItems.map((item, index) => (
                                <div 
                                  key={index} 
                                  className={`relative w-16 h-16 rounded-md overflow-hidden border ${item.isMain ? 'ring-2 ring-primary' : ''}`}
                                >
                                  {item.type === 'video' || 
                                   (item.url && (item.url.endsWith('.mp4') || item.url.endsWith('.webm') || item.url.endsWith('.mov'))) ? (
                                    <video 
                                      src={item.url} 
                                      className="w-full h-full object-cover"
                                      controls
                                    />
                                  ) : (
                                    <img 
                                      src={item.url} 
                                      alt={`Media ${index + 1}`} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error('Error loading image preview', index);
                                        // Try fallback paths
                                        const imgElement = e.currentTarget;
                                        const currentSrc = imgElement.src;
                                        
                                        if (currentSrc.includes('/uploads/')) {
                                          const fileName = currentSrc.split('/').pop();
                                          imgElement.src = `/attached_assets/${fileName}`;
                                        } else if (currentSrc.includes('/attached_assets/')) {
                                          const fileName = currentSrc.split('/').pop();
                                          imgElement.src = `/uploads/${fileName}`;
                                        } else if (!currentSrc.startsWith('/')) {
                                          imgElement.src = `/${currentSrc}`;
                                        } else {
                                          imgElement.src = '/uploads/demo-logo.png';
                                        }
                                      }}
                                    />
                                  )}
                                  
                                  {/* Media item actions */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-1">
                                    {/* Set as main image button */}
                                    <Button
                                      type="button"
                                      variant={item.isMain ? "default" : "secondary"}
                                      size="xs"
                                      className="text-xs w-full"
                                      onClick={() => {
                                        // Update all items to be not main
                                        const updatedItems = mediaItems.map(mi => ({
                                          ...mi,
                                          isMain: mi === item // Set only this item as main
                                        }));
                                        
                                        form.setValue('mediaItems', updatedItems, {
                                          shouldDirty: true,
                                          shouldTouch: true
                                        });
                                        
                                        // Update the legacy imageUrl field for backward compatibility
                                        form.setValue('imageUrl', item.url, {
                                          shouldDirty: true,
                                          shouldTouch: true
                                        });
                                        
                                        setMediaItems(updatedItems);
                                        setImagePreview(item.url);
                                      }}
                                    >
                                      {item.isMain ? "Main" : "Make Main"}
                                    </Button>
                                    
                                    {/* Remove button */}
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="xs"
                                      className="text-xs w-full"
                                      onClick={() => {
                                        // Remove this item
                                        const updatedItems = mediaItems.filter((_, i) => i !== index);
                                        
                                        // If we removed the main item and have other items, set the first one as main
                                        if (item.isMain && updatedItems.length > 0) {
                                          updatedItems[0].isMain = true;
                                          // Update the legacy field
                                          form.setValue('imageUrl', updatedItems[0].url, {
                                            shouldDirty: true,
                                            shouldTouch: true
                                          });
                                          setImagePreview(updatedItems[0].url);
                                        } else if (updatedItems.length === 0) {
                                          // If no items left, clear the preview
                                          form.setValue('imageUrl', '', {
                                            shouldDirty: true,
                                            shouldTouch: true
                                          });
                                          setImagePreview(null);
                                        }
                                        
                                        form.setValue('mediaItems', updatedItems, {
                                          shouldDirty: true,
                                          shouldTouch: true
                                        });
                                        setMediaItems(updatedItems);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Legacy display for compatibility */}
                        {imagePreview && mediaItems.length === 0 && (
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
                                onLoad={() => console.log('Image loaded successfully:', imagePreview)}
                                onError={(e) => {
                                  console.error('Error loading image preview from:', imagePreview);
                                  // Try fallback paths
                                  const imgElement = e.currentTarget;
                                  const currentSrc = imgElement.src;
                                  
                                  if (currentSrc.includes('/uploads/')) {
                                    console.log('Trying alternate path with /attached_assets/');
                                    const fileName = currentSrc.split('/').pop();
                                    imgElement.src = `/attached_assets/${fileName}`;
                                  } else if (currentSrc.includes('/attached_assets/')) {
                                    console.log('Trying alternate path with /uploads/');
                                    const fileName = currentSrc.split('/').pop();
                                    imgElement.src = `/uploads/${fileName}`;
                                  } else if (!currentSrc.startsWith('/')) {
                                    console.log('Adding leading slash to path');
                                    imgElement.src = `/${currentSrc}`;
                                  } else {
                                    // Final fallback
                                    console.log('Using fallback image');
                                    imgElement.src = '/uploads/demo-logo.png';
                                  }
                                }}
                              />
                            )}
                          </div>
                        )}
                        
                        <input
                          type="hidden"
                          {...field}
                        />
                        <div className="flex items-center gap-2">
                          {/* New FileUploader component */}
                          <FileUploader 
                            multiple={true} // Enable multiple file selection
                            onFileUploaded={(fileUrl, fileType) => {
                              console.log('FileUploader: Upload complete, URL:', fileUrl, 'Type:', fileType);
                              
                              // Create new media item
                              const newMediaItem = {
                                url: fileUrl,
                                type: fileType?.startsWith('image/') ? 'image' as const : 'video' as const,
                                isMain: mediaItems.length === 0 // Only mark as main if it's the first item
                              };
                              
                              // Get current media items
                              const currentMediaItems = [...mediaItems];
                              
                              // If we're adding a main item and we already have items, unmark existing items as main
                              if (newMediaItem.isMain && currentMediaItems.length > 0) {
                                currentMediaItems.forEach(item => item.isMain = false);
                              }
                              
                              // Add the new item
                              const updatedItems = [...currentMediaItems, newMediaItem];
                              
                              // Update mediaItems in form and state
                              form.setValue('mediaItems', updatedItems, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                              
                              setMediaItems(updatedItems);
                              
                              // Still set legacy imageUrl for backward compatibility (using the main image)
                              if (newMediaItem.isMain) {
                                form.setValue('imageUrl', fileUrl, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true
                                });
                                
                                // Update preview to show the new image
                                setImagePreview(fileUrl);
                              }
                              
                              // Clear selected file
                              setSelectedFile(null);
                            }}
                          />
                          
                          <MediaSelector 
                            onSelect={(mediaItem) => {
                              console.log('ContentPostForm: Media selected from library:', mediaItem.name);
                              console.log('ContentPostForm: Media URL:', mediaItem.fileUrl);
                              
                              // Force the URL to be a string and correctly formatted
                              const imageUrl = String(mediaItem.fileUrl || '');
                              console.log('ContentPostForm: Formatted URL to use:', imageUrl);
                              
                              // Create new media item object
                              const newMediaItem = {
                                url: imageUrl,
                                type: mediaItem.fileType?.startsWith('image/') ? 'image' as const : 'video' as const,
                                isMain: mediaItems.length === 0 // Mark as main only if it's the first item
                              };
                              
                              // Get existing media items from current state
                              const existingItems = [...mediaItems];
                              
                              // If we're adding a main item, unmark existing items as main
                              if (newMediaItem.isMain && existingItems.length > 0) {
                                existingItems.forEach(item => item.isMain = false);
                              }
                              
                              // Add the new item
                              const updatedItems = [...existingItems, newMediaItem];
                              
                              // Update the form value
                              form.setValue('mediaItems', updatedItems, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                              
                              // Update the legacy imageUrl field if this is the main item
                              if (newMediaItem.isMain) {
                                form.setValue('imageUrl', imageUrl, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true
                                });
                                setImagePreview(imageUrl);
                              }
                              
                              // Update component state
                              setMediaItems(updatedItems);
                              console.log('Media items are now:', updatedItems);
                              
                              // Force a small delay before updating preview state
                              setTimeout(() => {
                                // Then update the preview state
                                setImagePreview(imageUrl);
                                
                                // Log confirmation
                                console.log('ContentPostForm: Media successfully attached');
                                console.log('Media items are now:', form.getValues('mediaItems'));
                                console.log('Form value is now:', form.getValues('imageUrl'));
                              }, 50);
                            }}
                          />
                          
                          {/* Only show clear button if we have media items or a preview */}
                          {(mediaItems.length > 0 || imagePreview) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('Clearing all media...');
                                // Clear everything related to media
                                setImagePreview(null);
                                setSelectedFile(null);
                                setMediaItems([]);
                                
                                // Clear form values
                                form.setValue('imageUrl', '', {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true
                                });
                                
                                form.setValue('mediaItems', [], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true
                                });
                              }}
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category dropdown removed as requested */}

{/* Tags field removed as requested */}
                </div>

                {!isEvergreen && (
                  <>
                    <div className="flex flex-col space-y-4">
                      <h3 className="font-medium">Schedule Post (optional)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
                              <DatePicker
                                date={field.value}
                                setDate={(date) => {
                                  if (date) {
                                    // Preserve the current time when changing the date
                                    const currentDate = field.value || new Date();
                                    date.setHours(currentDate.getHours());
                                    date.setMinutes(currentDate.getMinutes());
                                    field.onChange(date);
                                    setSelectedDate(date);
                                  } else {
                                    field.onChange(undefined);
                                    setSelectedDate(undefined);
                                  }
                                }}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Time</FormLabel>
                              <TimePicker
                                time={field.value}
                                setTime={(time) => {
                                  if (time) {
                                    // Preserve the current date when changing just the time
                                    if (field.value) {
                                      const newDate = new Date(field.value);
                                      newDate.setHours(time.getHours());
                                      newDate.setMinutes(time.getMinutes());
                                      field.onChange(newDate);
                                    } else {
                                      field.onChange(time);
                                    }
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Partner Distribution Options - moved to bottom as requested */}
                    {partners && partners.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">Partner Distribution</h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="sr-only">Partner distribution help</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[250px] p-3">
                                <p className="text-sm">
                                  Control which retail partners will receive this content post.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="partnerDistribution"
                          render={({ field }) => (
                            <RadioGroup 
                              value={field.value} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Clear partner tags when switching to "all"
                                if (value === "all") {
                                  form.setValue("partnerTags", []);
                                }
                              }}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all-partners" />
                                <Label htmlFor="all-partners" className="font-normal cursor-pointer">
                                  All Retail Partners
                                </Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[250px] p-3">
                                      <p className="text-sm">
                                        Send this post to all your retail partners.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="byTag" id="by-tag" />
                                <Label htmlFor="by-tag" className="font-normal cursor-pointer">
                                  Target Partners by Tag
                                </Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[250px] p-3">
                                      <p className="text-sm">
                                        Select specific tags to target only those retail partners that match at least one of the selected tags.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </RadioGroup>
                          )}
                        />
                        
                        {/* Tag Selection - only shown when byTag is selected */}
                        {form.watch("partnerDistribution") === "byTag" && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Partner Tags</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                      <span className="sr-only">Tag selection help</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[250px] p-3">
                                    <p className="text-sm">
                                      Select one or more tags to filter partners. Only partners with at least one matching tag will receive the content.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="partnerTags"
                              render={({ field }) => (
                                <Select
                                  onValueChange={(value) => {
                                    const currentTags = field.value || [];
                                    if (!currentTags.includes(value)) {
                                      field.onChange([...currentTags, value]);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select tags" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTags.length > 0 ? (
                                      availableTags.map((tag) => (
                                        <SelectItem key={tag} value={tag}>
                                          {tag}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="px-2 py-4 text-center">
                                        <p className="text-sm text-gray-500">No partner tags available</p>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            
                            {/* Selected tags */}
                            {form.watch("partnerTags")?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {form.watch("partnerTags")?.map((tag) => (
                                  <div key={tag} className="bg-muted rounded-full px-3 py-1 text-xs flex items-center gap-1">
                                    {tag}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 p-0 rounded-full hover:bg-background/50"
                                      onClick={() => {
                                        const currentTags = form.getValues("partnerTags") || [];
                                        form.setValue(
                                          "partnerTags",
                                          currentTags.filter((t) => t !== tag)
                                        );
                                      }}
                                    >
                                      <span className="sr-only">Remove</span>
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Display partners that will receive this post */}
                            {form.watch("partnerTags")?.length > 0 && targetedPartners.length > 0 && (
                              <div className="mt-4 border rounded-md p-3 bg-muted/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-sm font-medium">Partners receiving this content:</h4>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[250px] p-3">
                                        <p className="text-sm">
                                          These are the partners that match at least one of your selected tags.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                
                                <div className="max-h-40 overflow-y-auto">
                                  {targetedPartners.map((partner) => (
                                    <div key={partner.id} className="py-1.5 border-b border-border/50 last:border-0 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium">{partner.name[0]}</span>
                                        </div>
                                        <span className="text-sm">{partner.name}</span>
                                      </div>
                                      {partner.metadata?.tags && (
                                        <div className="flex gap-1 items-center">
                                          {(partner.metadata.tags as string[]).filter(tag => form.watch("partnerTags")?.includes(tag)).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs px-1.5">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right column: Preview */}
              <div className="space-y-4 border rounded-lg p-4 flex flex-col items-center">
                <h3 className="font-medium text-center mb-2">Post Preview</h3>
                <PlatformPreview
                  title={watchedTitle}
                  description={watchedDescription}
                  imageUrl={watchedImageUrl}
                  mediaItems={mediaItems}
                  platforms={watchedPlatforms}
                  brandName={user?.username || 'Your Brand'}
                  brandLogo={user?.logo || '/uploads/demo-logo.png'}
                />
              </div>
            </div>

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
                    <FormLabel>Evergreen Content</FormLabel>
                    <FormDescription>
                      Evergreen content can be reused in future automated posts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

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