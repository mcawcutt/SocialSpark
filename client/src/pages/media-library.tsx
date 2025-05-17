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
        
        console.log("Quick upload: Creating media item with data:", mediaItem);
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
      
      console.log(`Creating media item, posting to: ${url}`);
      
      // Use authenticated URL when possible, otherwise fallback to demo mode
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        console.error(`Failed to create media item: ${res.status} ${res.statusText}`);
        throw new Error(`Failed to add media item: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Successfully created media item:", data);
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
      console.error("Error saving media:", error);
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
                        placeholder="Enter a description (optional)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2 flex-wrap mb-2">
                  {form.watch("tags")?.map((tag) => (
                    <Badge key={tag} className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
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
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={createMediaMutation.isPending}>
                  {createMediaMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save to Library
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </form>
    </Form>
  );
};

export default function MediaLibrary() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: mediaItems, isLoading, refetch } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media"],
    queryFn: async () => {
      // For authenticated users, use their brand data
      // For unauthenticated users, use Dulux brand data for testing
      const url = user 
        ? "/api/media" 
        : "/api/media?demo=true&brand=dulux";
      
      console.log(`Fetching media items from: ${url}`);
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error(`Failed to fetch media items: ${res.status} ${res.statusText}`);
        throw new Error("Failed to fetch media items");
      }
      
      // Sort by createdAt date, most recent first
      const items = await res.json();
      console.log(`Received ${items.length} media items`);
      return items.sort((a: MediaLibraryItem, b: MediaLibraryItem) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      // Don't use demo=true to ensure proper authentication and brand isolation
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete media item");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media item deleted from library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
    onError: (error) => {
      console.error("Error deleting media:", error);
      toast({
        title: "Failed to delete media",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateMediaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<MediaLibraryItem> }) => {
      // Don't use demo=true to ensure proper authentication and brand isolation
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error("Failed to update media item");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media item updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
    onError: (error) => {
      console.error("Error updating media:", error);
      toast({
        title: "Failed to update media",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get unique tags from all media items
  const allTags = Array.from(
    new Set(
      mediaItems
        ?.flatMap((item) => item.tags || [])
        .filter(Boolean) || []
    )
  );

  // Filter media items based on search term and selected tags
  const filteredMediaItems = mediaItems?.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => item.tags?.includes(tag));

    return matchesSearch && matchesTags;
  });

  const handleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };
  
  // Handle drag events for global page
  const handlePageDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handlePageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handlePageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // If user holds Shift key when dropping, do quick upload
      if (e.shiftKey) {
        setIsQuickUploadOpen(true);
      } else {
        // Otherwise open normal dialog
        setIsAddDialogOpen(true);
      }
    }
  };

  // State for quick upload mode
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  
  // State for edit mode
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaLibraryItem | null>(null);
  
  // Track image dimensions
  const [imageDimensions, setImageDimensions] = useState<Record<number, { width: number, height: number }>>({});
  
  // Function to get image dimensions
  const getImageDimensions = (url: string, id: number) => {
    const img = document.createElement('img');
    img.onload = () => {
      setImageDimensions(prev => ({
        ...prev,
        [id]: { width: img.naturalWidth, height: img.naturalHeight }
      }));
    };
    img.src = url;
  };
  
  // Fetch dimensions for all images after they load
  useEffect(() => {
    if (mediaItems) {
      mediaItems.forEach(item => {
        if (item.fileType.startsWith('image/') && !imageDimensions[item.id]) {
          getImageDimensions(item.fileUrl, item.id);
        }
      });
    }
  }, [mediaItems, imageDimensions]);

  return (
    <div 
      className="" 
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
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
        <h1 className="text-3xl font-bold">Media Library</h1>
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
                <DialogTitle>Quick Upload</DialogTitle>
                <DialogDescription>
                  Upload files with automatically generated names. Perfect for bulk uploads. 
                  Names will be based on filenames.
                </DialogDescription>
              </DialogHeader>
              <FileUploadForm onSuccess={() => setIsQuickUploadOpen(false)} quickUploadMode={true} />
            </DialogContent>
          </Dialog>
          
          {/* Regular Upload Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add to Library
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add to Media Library</DialogTitle>
                <DialogDescription>
                  Upload new images or videos to your media library. Multiple files are supported.
                  All uploaded media will be available for use in your content posts.
                </DialogDescription>
              </DialogHeader>
              <FileUploadForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search media files..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:opacity-80"
                onClick={() => handleTagFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="text-xs h-6"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredMediaItems?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500 mb-4">No media items found</p>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add your first media item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add to Media Library</DialogTitle>
                <DialogDescription>
                  Upload new images or videos to your media library.
                </DialogDescription>
              </DialogHeader>
              <FileUploadForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {filteredMediaItems?.map((item) => {
            // Determine if the item is a video
            const isVideo = item.fileType.startsWith("video/");
            const isImage = item.fileType.startsWith("image/");
            
            // Determine a random height for the masonry layout based on item ID for consistency
            // This creates a visually interesting layout similar to the example image
            const itemHeight = item.id % 3 === 0 ? "h-64" : item.id % 2 === 0 ? "h-48" : "h-56";
            
            return (
              <div 
                key={item.id}
                className="break-inside-avoid mb-4 group relative cursor-pointer transition-all duration-200 hover:shadow-lg rounded-md overflow-hidden"
                onClick={() => {
                  setSelectedMedia(item);
                  setIsEditDialogOpen(true);
                }}
              >
                <div className={`relative bg-gray-100 dark:bg-gray-800 w-full ${isImage ? itemHeight : "h-40"} transition-all`}>
                  {isImage ? (
                    <img
                      src={item.fileUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onLoad={(e) => {
                        // This will record dimensions for already loaded images
                        const img = e.target as HTMLImageElement;
                        if (img.naturalWidth && img.naturalHeight) {
                          setImageDimensions(prev => ({
                            ...prev,
                            [item.id]: { width: img.naturalWidth, height: img.naturalHeight }
                          }));
                        }
                      }}
                    />
                  ) : isVideo ? (
                    <div className="relative flex items-center justify-center h-full bg-gray-900">
                      {/* Video thumbnail would go here - using placeholder for now */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                      {/* Video play button indicator */}
                      <div className="absolute w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-[#e03eb6] border-b-[6px] border-b-transparent ml-1"></div>
                        </div>
                      </div>
                      <span className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                        0:15
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Hover details overlay - shows information on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                    <div className="text-white text-sm font-medium truncate">{item.name}</div>
                    
                    {/* Description on hover */}
                    {item.description && (
                      <p className="text-white/80 text-xs line-clamp-2 mt-1">{item.description}</p>
                    )}
                    
                    {/* Image dimensions and date */}
                    <div className="flex items-center mt-2 text-[10px] text-white/80">
                      {isVideo && (
                        <span className="bg-black/30 rounded-sm px-1 py-0.5 backdrop-blur-sm">
                          Video
                        </span>
                      )}
                      {isImage && imageDimensions[item.id] && (
                        <span className="bg-black/30 rounded-sm px-1 py-0.5 backdrop-blur-sm">
                          {imageDimensions[item.id].width} × {imageDimensions[item.id].height}px
                        </span>
                      )}
                      <span className="mx-1 text-white/60">•</span>
                      <span className="text-[10px] text-white/80">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="bg-black/30 text-white/90 text-[10px] rounded-sm px-1 py-0.5 backdrop-blur-sm">
                          #{tag}
                        </span>
                      ))}
                      {(item.tags?.length || 0) > 3 && (
                        <span className="bg-black/30 text-white/90 text-[10px] rounded-sm px-1 py-0.5 backdrop-blur-sm">
                          +{item.tags!.length - 3}
                        </span>
                      )}
                    </div>
                    
                    {/* Quick actions on hover */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        className="bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.fileUrl);
                          toast({
                            title: "URL Copied",
                            description: "URL copied to clipboard",
                          });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                      <button 
                        className="bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Media Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update the details of your media item. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMedia && (
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                  {selectedMedia.fileType.startsWith("image/") ? (
                    <img 
                      src={selectedMedia.fileUrl} 
                      alt={selectedMedia.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">File details</p>
                  <p className="text-xs text-gray-500">{selectedMedia.fileType}</p>
                  <p className="text-xs text-gray-500">Uploaded on {new Date(selectedMedia.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={selectedMedia.name} 
                    onChange={(e) => setSelectedMedia({...selectedMedia, name: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={selectedMedia.description || ''} 
                    onChange={(e) => setSelectedMedia({...selectedMedia, description: e.target.value})}
                    placeholder="Add a description..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 border rounded-md p-2">
                    {selectedMedia.tags?.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            setSelectedMedia({
                              ...selectedMedia, 
                              tags: selectedMedia.tags ? selectedMedia.tags.filter(t => t !== tag) : []
                            });
                          }}
                        />
                      </Badge>
                    ))}
                    
                    {/* Tag input */}
                    <form 
                      className="flex-1 min-w-[100px]"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                        const tag = input.value.trim();
                        
                        if (tag && (!selectedMedia.tags?.includes(tag))) {
                          setSelectedMedia({
                            ...selectedMedia,
                            tags: [...(selectedMedia.tags || []), tag]
                          });
                          input.value = '';
                        }
                      }}
                    >
                      <Input 
                        placeholder="Add tag..." 
                        className="border-0 p-0 h-6 text-sm focus-visible:ring-0"
                      />
                    </form>
                  </div>
                  <p className="text-xs text-gray-500">Press Enter to add a tag</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateMediaMutation.mutate({
                      id: selectedMedia.id,
                      data: {
                        name: selectedMedia.name,
                        description: selectedMedia.description,
                        tags: selectedMedia.tags
                      }
                    });
                    setIsEditDialogOpen(false);
                  }}
                  disabled={updateMediaMutation.isPending}
                >
                  {updateMediaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Hidden file input for bulk upload feature */}
      <input 
        type="file"
        multiple
        accept="image/*,video/*"
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