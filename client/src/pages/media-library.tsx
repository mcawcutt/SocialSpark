import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Upload, Edit, Trash2, Image, FolderPlus, Search, CheckCircle, XCircle, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MediaLibraryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  name: z.string().optional(),
  fileUrl: z.string().min(1, "File URL is required"),
  fileType: z.string().min(1, "File type is required"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type MediaUploadFormValues = z.infer<typeof formSchema>;

// File Upload Form Component
const FileUploadForm = ({ onSuccess, quickUploadMode = false }: { onSuccess: () => void, quickUploadMode?: boolean }) => {
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  // Get the refetch function from the parent component
  const { refetch } = useQuery({ queryKey: ["/api/media"] });

  const form = useForm<MediaUploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      fileUrl: "",
      fileType: "",
      description: "",
      tags: [],
    },
  });

  const addTag = () => {
    if (!tagInput.trim()) return;
    
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue("tags", [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tag)
    );
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    const fileId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
    
    try {
      const formData = new FormData();
      formData.append("media", file);

      // Use the demo mode to bypass authentication or use authenticated upload
      const uploadUrl = user ? "/api/upload" : "/api/upload?demo=true";
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      // If in quick upload mode, save the file immediately with auto-generated name
      if (quickUploadMode) {
        const fileName = data.file.originalname.split('.')[0].replace(/[^\w\s]/gi, '');
        const mediaItem = {
          name: fileName || `Media ${new Date().toISOString()}`,
          fileUrl: data.file.url,
          fileType: data.file.mimetype,
          description: "",
          tags: []
        };
        
        await createMediaMutation.mutateAsync(mediaItem);
        
        // Force a refetch to update the UI with new media
        setTimeout(() => {
          refetch();
        }, 500);
        
        return;
      }
      
      // Otherwise continue with normal upload flow
      setUploadedFileUrl(data.file.url);
      setUploadedFileName(data.file.originalname);
      setUploadedFileType(data.file.mimetype);
      form.setValue("fileUrl", data.file.url);
      form.setValue("fileType", data.file.mimetype);
      
      // If the file name doesn't contain illegal characters, use it as the default name
      const fileName = data.file.originalname.split('.')[0].replace(/[^\w\s]/gi, '');
      if (fileName && !form.getValues("name")) {
        form.setValue("name", fileName);
      }

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setUploadProgress(prev => ({ ...prev, [fileId]: -1 })); // Mark as failed
    } finally {
      if (!quickUploadMode) {
        setIsUploading(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Handle multiple files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await processFile(file);
    }
  };
  
  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle multiple files
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        await processFile(file);
      }
    }
  };

  const createMediaMutation = useMutation({
    mutationFn: async (data: MediaUploadFormValues) => {
      // Get proper URL based on auth status
      const url = user 
        ? "/api/media" 
        : "/api/media?demo=true&brand=dulux";
      
      // Use authenticated URL when possible, otherwise fallback to demo mode
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to add media item: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Media item added to library",
      });
      // Explicitly invalidate the cache AND force a refetch
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      // Manually refetch to ensure we get the latest data
      refetch();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to add media",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MediaUploadFormValues) => {
    createMediaMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {quickUploadMode ? (
            <div className="border rounded-md p-6 text-center">
              <div 
                className={`flex flex-col items-center justify-center py-4 ${isDragging ? 'bg-primary/10' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Label
                  htmlFor="file-upload-quick"
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${isDragging ? 'border-primary' : ''}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <span className="text-sm font-medium">Uploading files...</span>
                      <span className="text-xs text-gray-500 mt-1">Files will be added automatically with generated names</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mb-3" />
                      <span className="text-lg font-medium">{isDragging ? 'Drop files here' : 'Quick Upload'}</span>
                      <span className="text-sm text-gray-500 my-1">
                        Files will be added automatically
                      </span>
                      <span className="text-xs text-blue-500 font-medium">
                        Drop multiple files or click to select
                      </span>
                    </>
                  )}
                </Label>
                <Input
                  id="file-upload-quick"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  multiple
                />
              </div>
              
              {/* Show progress when uploading in quick mode */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4 text-left space-y-2">
                  <h4 className="text-sm font-medium">Upload Progress</h4>
                  {Object.entries(uploadProgress).map(([id, progress]) => (
                    <div key={id} className="flex items-center gap-2">
                      {progress === 100 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : progress === -1 ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Progress value={progress > 0 ? progress : 0} className="flex-1 h-2" />
                      <span className="text-xs">{progress === 100 ? 'Complete' : progress === -1 ? 'Failed' : `${progress}%`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="border rounded-md p-4">
                {uploadedFileUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        <span className="text-sm font-medium">{uploadedFileName}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFileUrl(null);
                          setUploadedFileName(null);
                          setUploadedFileType(null);
                          form.setValue("fileUrl", "");
                          form.setValue("fileType", "");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploadedFileUrl.endsWith(".jpg") || 
                     uploadedFileUrl.endsWith(".jpeg") || 
                     uploadedFileUrl.endsWith(".png") || 
                     uploadedFileUrl.endsWith(".gif") ? (
                      <div className="mt-2 relative aspect-video rounded-md overflow-hidden border">
                        <img
                          src={uploadedFileUrl}
                          alt="Preview"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div 
                    className={`flex flex-col items-center justify-center py-4 ${isDragging ? 'bg-primary/10' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${isDragging ? 'border-primary' : ''}`}
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mb-2" />
                          <span className="text-sm">{isDragging ? 'Drop files here' : 'Click or drag to upload'}</span>
                          <span className="text-xs text-gray-500">
                            SVG, PNG, JPG, GIF or MP4 (max. 20MB)
                          </span>
                          <span className="text-xs text-blue-500 font-medium">
                            Multiple files supported
                          </span>
                        </>
                      )}
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      multiple
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a name for this media" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a description for this media"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.getValues("tags")?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                      >
                        Add
                      </Button>
                    </div>
                    <FormDescription>
                      Tags help organize and find media items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {!quickUploadMode && (
          <DialogFooter>
            <Button
              type="submit"
              disabled={isUploading || !uploadedFileUrl}
              className="w-full sm:w-auto"
            >
              {createMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add to Library"
              )}
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );
};

// Main Media Library Page 
export default function MediaLibrary() {
  // State for image dimensions
  const [imageDimensions, setImageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaLibraryItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to get image dimensions for masonry layout
  const getImageDimensions = (url: string, id: number) => {
    if (!url.match(/\.(jpeg|jpg|png|gif)$/i)) return;
    
    const img = new Image();
    img.onload = () => {
      setImageDimensions(prev => ({
        ...prev,
        [id]: { width: img.width, height: img.height }
      }));
    };
    img.src = url;
  };

  // Page-level drag handlers for quick upload
  const handlePageDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handlePageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Only set isDragging to false if we've actually left the element
    // (not just entered a child element)
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };
  
  const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handlePageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Check for shift key to enable quick upload
    if (e.shiftKey && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsQuickUploadOpen(true);
    }
  };

  // Query for media items
  const { data: mediaItems = [], isLoading, refetch } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media"],
    queryFn: async () => {
      // Get correct URL based on auth status
      const url = user 
        ? "/api/media" 
        : "/api/media?demo=true&brand=dulux";
        
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch media items");
      }
      return res.json();
    },
  });
  
  // Transform tags from media items into a flat list of unique tags
  useEffect(() => {
    const tags = mediaItems.reduce<string[]>((acc, item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (!acc.includes(tag)) {
            acc.push(tag);
          }
        });
      }
      return acc;
    }, []);
    
    setAvailableTags(tags);
  }, [mediaItems]);

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      // Get correct URL based on auth status
      const url = user 
        ? `/api/media/${id}` 
        : `/api/media/${id}?demo=true&brand=dulux`;
        
      const res = await fetch(url, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete media item");
      }
      
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Media deleted",
        description: "Media item has been removed from library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update media mutation
  const updateMediaMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<MediaLibraryItem> }) => {
      // Get correct URL based on auth status
      const url = user 
        ? `/api/media/${data.id}` 
        : `/api/media/${data.id}?demo=true&brand=dulux`;
        
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data.updates),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update media item");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Media updated",
        description: "Media item has been updated in the library",
      });
      setEditingItem(null);
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate aspect ratio for masonry layout
  const getAspectRatio = (id: number) => {
    const dimensions = imageDimensions[id];
    if (!dimensions) return 1; // Default to square
    return dimensions.width / dimensions.height;
  };

  // Filter media items by search query and selected tags
  const filteredMediaItems = mediaItems.filter(item => {
    const matchesSearch = searchQuery === "" || 
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTags = selectedTags.length === 0 || 
      (item.tags && selectedTags.every(tag => item.tags.includes(tag)));
      
    return matchesSearch && matchesTags;
  });

  // Load dimensions for all media items
  useEffect(() => {
    if (mediaItems.length > 0) {
      mediaItems.forEach(item => {
        if (item.fileUrl && !imageDimensions[item.id]) {
          getImageDimensions(item.fileUrl, item.id);
        }
      });
    }
  }, [mediaItems, imageDimensions]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {isDragging && (
        <div className="fixed inset-0 bg-primary/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-background p-8 rounded-lg shadow-lg text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-bold">Drop Files to Upload</h3>
            <p className="text-gray-500">Drop your media files here to add them to the library</p>
            <p className="text-blue-500 text-sm mt-1">Multiple files supported!</p>
            <div className="mt-4 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <p className="font-medium text-primary">Pro Tip</p>
              <p className="text-gray-600 dark:text-gray-400">Hold <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Shift</kbd> while dropping to use quick upload mode</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
        <div className="flex gap-2">
          {/* Quick Upload Button */}
          <Dialog open={isQuickUploadOpen} onOpenChange={setIsQuickUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                Quick Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Quick Upload Media</DialogTitle>
                <DialogDescription>
                  Files will be uploaded and saved automatically with generated names.
                </DialogDescription>
              </DialogHeader>
              <FileUploadForm 
                onSuccess={() => setIsQuickUploadOpen(false)} 
                quickUploadMode={true} 
              />
            </DialogContent>
          </Dialog>
          
          {/* Add Media Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add to Media Library</DialogTitle>
                <DialogDescription>
                  Upload files to your media library to use in posts.
                </DialogDescription>
              </DialogHeader>
              <FileUploadForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search media..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 sm:flex-initial">
          <Tabs 
            defaultValue="all" 
            className="w-full"
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedTags([]);
              }
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All Media</TabsTrigger>
              <TabsTrigger value="tags" className="flex-1">Filter by Tags</TabsTrigger>
            </TabsList>
            <TabsContent value="tags" className="mt-2">
              <div className="flex flex-wrap gap-2 pt-2">
                {availableTags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) 
                          ? prev.filter(t => t !== tag) 
                          : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Media Dialog */}
      {editingItem && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Media</DialogTitle>
              <DialogDescription>
                Update information for this media item.
              </DialogDescription>
            </DialogHeader>
            <Form {...useForm({
              resolver: zodResolver(z.object({
                name: z.string().min(1, "Name is required"),
                description: z.string().optional(),
                tags: z.array(z.string()).optional(),
              })),
              defaultValues: {
                name: editingItem.name || "",
                description: editingItem.description || "",
                tags: editingItem.tags || [],
              },
            })}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const name = formData.get("name") as string;
                const description = formData.get("description") as string;
                const tagsInput = formData.get("tags") as string;
                const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
                
                updateMediaMutation.mutate({
                  id: editingItem.id,
                  updates: {
                    name,
                    description,
                    tags,
                  },
                });
              }} className="space-y-4">
                {editingItem.fileUrl && (editingItem.fileUrl.endsWith(".jpg") || 
                 editingItem.fileUrl.endsWith(".jpeg") || 
                 editingItem.fileUrl.endsWith(".png") || 
                 editingItem.fileUrl.endsWith(".gif")) && (
                  <div className="relative aspect-video rounded-md overflow-hidden border mb-4">
                    <img
                      src={editingItem.fileUrl}
                      alt={editingItem.name || "Preview"}
                      className="object-contain w-full h-full"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    defaultValue={editingItem.name || ""} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    rows={3} 
                    defaultValue={editingItem.description || ""} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input 
                    id="tags" 
                    name="tags" 
                    defaultValue={editingItem.tags?.join(", ") || ""} 
                  />
                  <p className="text-xs text-gray-500">
                    Separate tags with commas, e.g. "summer, promotion, product"
                  </p>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this media item?")) {
                        deleteMediaMutation.mutate(editingItem.id);
                        setIsEditDialogOpen(false);
                      }
                    }}
                    disabled={deleteMediaMutation.isPending}
                  >
                    {deleteMediaMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                  <Button type="submit" disabled={updateMediaMutation.isPending}>
                    {updateMediaMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Media Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMediaItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FolderPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No media found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedTags.length > 0 
              ? "Try adjusting your search or filters" 
              : "Upload media to get started"}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Add Media
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMediaItems.map((item) => {
            const isImage = item.fileUrl && (
              item.fileUrl.endsWith(".jpg") || 
              item.fileUrl.endsWith(".jpeg") || 
              item.fileUrl.endsWith(".png") || 
              item.fileUrl.endsWith(".gif")
            );
            
            const aspectRatio = getAspectRatio(item.id);
            // Determine grid row span based on aspect ratio
            let rowSpan = 1;
            if (aspectRatio < 0.7) rowSpan = 2; // Portrait/tall images
            
            return (
              <Card 
                key={item.id} 
                className={`overflow-hidden hover:shadow-md transition-shadow ${rowSpan > 1 ? 'md:row-span-2' : ''}`}
              >
                <div className="relative group">
                  {isImage ? (
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      <img
                        src={item.fileUrl}
                        alt={item.name || "Media"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          {item.fileUrl ? item.fileUrl.split(".").pop()?.toUpperCase() : "File"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay with edit button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-3">
                  <div className="line-clamp-1 font-medium">
                    {item.name || "Untitled"}
                  </div>
                  {item.description && (
                    <p className="text-gray-500 text-sm line-clamp-1 mt-1">
                      {item.description}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Hidden file input for drag-and-drop uploading */}
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setIsAddDialogOpen(true);
          }
        }}
      />
    </div>
  );
}