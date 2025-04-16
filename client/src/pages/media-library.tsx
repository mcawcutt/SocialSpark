import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import { Loader2, X, Upload, Edit, Trash2, Image, FolderPlus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaLibraryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileType: z.string().min(1, "File type is required"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type MediaUploadFormValues = z.infer<typeof formSchema>;

const FileUploadForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // For now, we'll just handle the first file 
    // (multiple file support needs more UI changes)
    const file = files[0];
    
    setIsUploading(true);

    const formData = new FormData();
    formData.append("media", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      // Check if we got back the file information with URL
      if (result && result.file && result.file.url) {
        setUploadedFileUrl(result.file.url);
        setUploadedFileName(file.name);
        setUploadedFileType(file.type);
        
        // Set form values
        form.setValue("fileUrl", result.file.url);
        form.setValue("fileType", file.type);
        form.setValue("name", file.name);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createMediaMutation = useMutation({
    mutationFn: async (data: MediaUploadFormValues) => {
      const res = await apiRequest("POST", "/api/media", data);
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
              <div className="flex flex-col items-center justify-center py-4">
                <Label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="text-sm">Click to upload</span>
                      <span className="text-xs text-gray-500">
                        SVG, PNG, JPG, GIF or MP4 (max. 20MB)
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Supports multiple files
                      </span>
                    </>
                  )}
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
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
        </div>

        <DialogFooter>
          <Button type="submit" disabled={createMediaMutation.isPending}>
            {createMediaMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save to Library
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function MediaLibrary() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: mediaItems, isLoading } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media"],
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/media/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media item deleted from library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete media",
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

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Media Library</h1>
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
                Upload a new image or video to your media library. This will be available
                for use in your content posts.
              </DialogDescription>
            </DialogHeader>
            <FileUploadForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMediaItems?.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                {item.fileType.startsWith("image/") ? (
                  <img
                    src={item.fileUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base truncate">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Copy the URL to clipboard
                    navigator.clipboard.writeText(item.fileUrl);
                    toast({
                      title: "URL copied",
                      description: "The media URL has been copied to your clipboard",
                    });
                  }}
                >
                  Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this media item?")) {
                      deleteMediaMutation.mutate(item.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}