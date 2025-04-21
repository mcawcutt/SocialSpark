import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
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

      // Use the demo mode to bypass authentication
      const response = await fetch("/api/upload?demo=true", {
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
      // Use direct fetch with demo mode for API call
      const res = await fetch("/api/media?demo=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error("Failed to add media item");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media item added to library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
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

  const { data: mediaItems, isLoading } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media"],
    queryFn: async () => {
      const res = await fetch("/api/media?demo=true");
      if (!res.ok) {
        throw new Error("Failed to fetch media items");
      }
      return res.json();
    }
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/media/${id}?demo=true`, {
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
      const res = await fetch(`/api/media/${id}?demo=true`, {
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

  return (
    <div 
      className="container py-8" 
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
          <DialogTrigger asChild>
            <Button variant="outline">Add your first media item</Button>
          </DialogTrigger>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMediaItems?.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden h-full group relative cursor-pointer"
              onClick={() => {
                setSelectedMedia(item);
                setIsEditDialogOpen(true);
              }}
            >
              <div 
                className="aspect-square bg-gray-100 dark:bg-gray-800 relative h-28 transition-all group-hover:opacity-90"
              >
                {item.fileType.startsWith("image/") ? (
                  <img
                    src={item.fileUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                
                {/* Edit overlay on hover */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardHeader className="p-2">
                <CardTitle className="text-xs font-medium truncate">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                  {(item.tags?.length || 0) > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      +{(item.tags?.length || 0) - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-2 pt-0 flex justify-between items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the edit dialog
                    // Copy the URL to clipboard
                    navigator.clipboard.writeText(item.fileUrl);
                    toast({
                      title: "URL Copied",
                      description: "URL copied to clipboard",
                    });
                  }}
                >
                  Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the edit dialog
                    deleteMediaMutation.mutate(item.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </CardFooter>
            </Card>
          ))}
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