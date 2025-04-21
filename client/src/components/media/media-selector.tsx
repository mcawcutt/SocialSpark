import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaLibraryItem } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, FolderOpen, Search, Image, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaSelectorProps {
  onSelect: (mediaItem: MediaLibraryItem) => void;
  triggerText?: string;
}

export function MediaSelector({ onSelect, triggerText = "Choose from Media Library" }: MediaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaLibraryItem | null>(null);
  const { toast } = useToast();

  // Using the authenticated user's media items
  const { data: mediaItems, isLoading, error } = useQuery<MediaLibraryItem[]>({
    queryKey: ["/api/media"],
    enabled: isOpen, // Only fetch when the dialog is open
  });
  
  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('MediaSelector dialog opened, fetching media items');
      if (mediaItems) {
        console.log(`MediaSelector: Received ${mediaItems.length} media items`);
        console.log('First media item:', mediaItems[0]);
      }
      if (error) {
        console.error('MediaSelector: Error fetching media:', error);
      }
    }
  }, [isOpen, mediaItems, error]);

  // Reset selected item when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
    }
  }, [isOpen]);

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

  const handleClickMedia = (item: MediaLibraryItem) => {
    console.log('MediaSelector: selecting item:', item.name, item.fileUrl); 
    setSelectedItem(item);
  };

  const handleConfirmSelection = () => {
    if (!selectedItem) return;
    
    try {
      console.log('MediaSelector: Confirming selection of item:', selectedItem);
      
      // Make a copy of the selected item with a simple path to avoid issues
      const cleanItem = { 
        ...selectedItem,
        // Ensure the fileUrl is absolute and correctly formatted
        fileUrl: selectedItem.fileUrl.startsWith('/') 
          ? selectedItem.fileUrl 
          : `/${selectedItem.fileUrl.replace(/^\/+/, '')}`
      };
      
      console.log('MediaSelector: Sending cleaned item to parent:', cleanItem);
      
      // Call the callback with the cleaned item
      onSelect(cleanItem);
      
      // Then close the dialog and show confirmation
      setIsOpen(false);
      
      toast({
        title: "Media selected",
        description: `"${selectedItem.name}" has been attached to your post.`,
      });
    } catch (error) {
      console.error('Error selecting media:', error);
      toast({
        title: "Error selecting media",
        description: "There was a problem attaching this media item",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select from Media Library</DialogTitle>
          <DialogDescription>
            Choose an image or video from your media library to use in your content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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

          <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredMediaItems?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No media items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredMediaItems?.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      selectedItem?.id === item.id 
                        ? "ring-2 ring-primary" 
                        : "hover:ring-2 hover:ring-primary/50"
                    }`}
                    onClick={() => handleClickMedia(item)}
                  >
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
                      
                      {selectedItem?.id === item.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleConfirmSelection}
            disabled={!selectedItem}
          >
            {selectedItem ? `Select "${selectedItem.name}"` : "Select Media"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}