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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Loader2, MessageSquare, Hash, Smile, AtSign } from "lucide-react";
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
  tags: z.string().optional(),
  category: z.string().min(1, { message: "Category is required" }),
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
      const postWithMetadata = {
        ...contentPost,
        metadata: {
          tags: data.tags?.split(",").map(tag => tag.trim()),
          category: data.category,
          // Store all media items in metadata
          mediaItems: data.mediaItems,
          // Add partner distribution data for non-evergreen posts
          ...((!data.isEvergreen) ? {
            partnerDistribution: data.partnerDistribution,
            partnerTags: data.partnerTags
          } : {})
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

      // Determine main image URL (for backward compatibility)
      // If we have media items, use the first one marked as main or the first one
      let mainImageUrl = data.imageUrl || "";
      
      if (data.mediaItems && data.mediaItems.length > 0) {
        const mainItem = data.mediaItems.find(item => item.isMain) || data.mediaItems[0];
        mainImageUrl = mainItem.url;
      }

      // Prepare the data for the API
      const contentPost: Partial<ContentPost> = {
        title: data.title,
        description: data.description,
        imageUrl: mainImageUrl, // Set primary image for backward compatibility
        platforms: data.platforms,
        scheduledDate: data.scheduledDate,
        status: data.scheduledDate ? "scheduled" : "draft",
        isEvergreen: data.isEvergreen,
        metadata: {
          tags: data.tags?.split(",").map(tag => tag.trim()),
          category: data.category,
          // Store all media items in metadata
          mediaItems: data.mediaItems,
          // Add partner distribution data for non-evergreen posts
          ...((!data.isEvergreen) ? {
            partnerDistribution: data.partnerDistribution,
            partnerTags: data.partnerTags
          } : {})
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

  // This function is no longer used - the upload is handled directly in handleFileChange
  // But we'll keep it as a reference or potential future use
  const uploadImage = async (file: File): Promise<string | null> => {
    console.log('⚠️ uploadImage should not be called directly anymore');
    return null;
  };

  // Media validation based on platform requirements
  const validateMediaFile = (file: File, platforms: string[]): { valid: boolean; error?: string } => {
    // Convert file size to MB for easier comparison
    const fileSizeMB = file.size / 1024 / 1024;
    
    // Check if Facebook or Instagram are selected platforms
    const needsFacebookValidation = platforms.includes('facebook');
    const needsInstagramValidation = platforms.includes('instagram');
    
    // Common file type validation
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { 
        valid: false, 
        error: "Only image and video files are supported."
      };
    }
    
    // Facebook requirements
    if (needsFacebookValidation) {
      // Images: JPG, PNG (up to 8MB)
      // Videos: MP4, MOV (up to 4GB, 240min)
      if (isImage) {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validImageTypes.includes(file.type)) {
          return { 
            valid: false, 
            error: "Facebook requires JPG or PNG images." 
          };
        }
        
        if (fileSizeMB > 8) {
          return { 
            valid: false, 
            error: "Facebook images must be under 8MB." 
          };
        }
      }
      
      if (isVideo) {
        const validVideoTypes = ['video/mp4', 'video/quicktime']; // quicktime = .mov
        if (!validVideoTypes.includes(file.type)) {
          return { 
            valid: false, 
            error: "Facebook requires MP4 or MOV video formats." 
          };
        }
        
        if (fileSizeMB > 4000) { // 4GB max
          return { 
            valid: false, 
            error: "Facebook videos must be under 4GB." 
          };
        }
      }
    }
    
    // Instagram requirements
    if (needsInstagramValidation) {
      // Images: JPG, PNG (aspect ratio between 4:5 and 1.91:1, up to 30MB)
      // Videos: MP4 (up to 100MB, 60sec)
      if (isImage) {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validImageTypes.includes(file.type)) {
          return { 
            valid: false, 
            error: "Instagram requires JPG or PNG images." 
          };
        }
        
        if (fileSizeMB > 30) {
          return { 
            valid: false, 
            error: "Instagram images must be under 30MB." 
          };
        }
      }
      
      if (isVideo) {
        if (file.type !== 'video/mp4') {
          return { 
            valid: false, 
            error: "Instagram only supports MP4 video format." 
          };
        }
        
        if (fileSizeMB > 100) {
          return { 
            valid: false, 
            error: "Instagram videos must be under 100MB." 
          };
        }
      }
    }
    
    return { valid: true };
  };

  // Completely refactored handleFileChange with explicit value setting
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

  // Removed AI content generation functionality

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
    
    if (selectedDistributionMethod === "all") {
      console.log('Distribution method is "all", returning all partners');
      return partners;
    }
    
    console.log('Calculating targeted partners for tags:', selectedPartnerTags);
    console.log('Available partners for matching:', partners.length);
    
    // Log all partners and their tags for debugging
    partners.forEach(partner => {
      console.log(`DEBUG - Partner ${partner.name} metadata:`, partner.metadata);
    });
    
    // If distribution method is by tag, find all partners that have any of the selected tags
    const filteredPartners = partners.filter(partner => {
      if (!partner.metadata || typeof partner.metadata !== 'object') {
        console.log(`Partner ${partner.name} has no metadata object`);
        return false;
      }
      
      // Type assertion to access metadata properties safely
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
                      {/* Display media grid for multiple items */}
                      {mediaItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Media Files ({mediaItems.length})</div>
                          <div className="grid grid-cols-2 gap-2">
                            {mediaItems.map((item, index) => (
                              <div 
                                key={index} 
                                className={`relative w-full h-28 rounded-md overflow-hidden border ${item.isMain ? 'ring-2 ring-primary' : ''}`}
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
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                  {/* Set as main image button */}
                                  <Button
                                    type="button"
                                    variant={item.isMain ? "default" : "secondary"}
                                    size="sm"
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
                                    size="sm"
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
                              isMain: true // Mark as main by default
                            };
                            
                            // Get current media items
                            const currentMediaItems = form.getValues('mediaItems') || [];
                            
                            // If we're adding a new main item, unmark existing items as main
                            if (currentMediaItems.length > 0) {
                              currentMediaItems.forEach(item => item.isMain = false);
                            }
                            
                            // Add the new item to the array
                            const updatedMediaItems = [...currentMediaItems, newMediaItem];
                            
                            // Update the mediaItems field in the form
                            form.setValue('mediaItems', updatedMediaItems, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true
                            });
                            
                            // Also update the legacy imageUrl field for backward compatibility
                            form.setValue('imageUrl', imageUrl, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true
                            });
                            
                            // Update component state
                            setMediaItems(updatedMediaItems);
                            
                            // Force a small delay before updating preview state
                            setTimeout(() => {
                              // Then update the preview state
                              setImagePreview(imageUrl);
                              
                              // Log confirmation
                              console.log('ContentPostForm: Media successfully attached');
                              console.log('Media items are now:', updatedMediaItems);
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
                
                {/* Partner Distribution Selection */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Partner Distribution</h3>
                  <FormField
                    control={form.control}
                    name="partnerDistribution"
                    render={({ field }) => (
                      <div className="space-y-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <input
                              type="radio"
                              checked={field.value === "all"}
                              onChange={() => field.onChange("all")}
                              className="h-4 w-4 text-primary border-muted-foreground" 
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            All Retail Partners
                          </FormLabel>
                        </FormItem>
                        
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <input
                              type="radio"
                              checked={field.value === "byTag"}
                              onChange={() => field.onChange("byTag")}
                              className="h-4 w-4 text-primary border-muted-foreground"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Target Partners by Tag
                          </FormLabel>
                        </FormItem>
                      </div>
                    )}
                  />
                  
                  {form.watch("partnerDistribution") === "byTag" && (
                    <FormField
                      control={form.control}
                      name="partnerTags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partner Tags</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const currentTags = field.value || [];
                              if (!currentTags.includes(value)) {
                                field.onChange([...currentTags, value]);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select partner tags" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableTags.length > 0 ? (
                                availableTags.map((tag) => (
                                  <SelectItem key={tag} value={tag}>
                                    {tag}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-tags" disabled>
                                  No partner tags available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          {/* Display selected tags */}
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((tag) => (
                                <Badge key={tag} className="flex items-center gap-1">
                                  {tag}
                                  <button
                                    type="button" 
                                    onClick={() => {
                                      const newTags = field.value ? field.value.filter((t) => t !== tag) : [];
                                      field.onChange(newTags);
                                    }}
                                    className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                          
                          {/* Display partners that will receive this post */}
                          {selectedDistributionMethod === "byTag" && selectedPartnerTags.length > 0 && (
                            <div className="mt-4 border rounded-md p-3 bg-muted/30">
                              <h4 className="text-sm font-medium mb-2">Partners receiving this content:</h4>
                              {targetedPartners.length > 0 ? (
                                <div className="space-y-1">
                                  {targetedPartners.map(partner => (
                                    <div key={partner.id} className="text-sm flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                                      {partner.name}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No partners match the selected tags.</p>
                              )}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </>
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
            
            {/* Social Media Preview Section */}
            <div className="mb-6">
              <SocialMediaPreview
                imageUrl={imagePreview || watchedImageUrl}
                title={watchedTitle}
                description={watchedDescription}
                scheduledDate={watchedScheduledDate}
                platforms={watchedPlatforms}
              />
            </div>

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