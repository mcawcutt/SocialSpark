import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentPost } from "@shared/schema";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { Pencil, Trash2, MoreHorizontal, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentPostForm } from "../post-form/content-post-form";
import { Facebook, Instagram, Globe } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CalendarDayCellProps {
  day: number | null;
  currentMonth: number;
  currentYear: number;
  posts: ContentPost[];
  onDayClick: (day: number) => void;
  onPostClick?: (post: ContentPost) => void;
}

export function CalendarDayCell({ 
  day, 
  currentMonth, 
  currentYear, 
  posts, 
  onDayClick,
  onPostClick 
}: CalendarDayCellProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<ContentPost | null>(null);
  
  if (day === null) {
    return <div className="h-24 lg:h-32 border border-gray-100 bg-gray-50"></div>;
  }

  // Check if this day is today
  const isToday = new Date().getDate() === day && 
                  new Date().getMonth() === currentMonth && 
                  new Date().getFullYear() === currentYear;
  
  // Get droppable ID for this date
  const droppableId = `day-${currentYear}-${currentMonth}-${day}`;
  
  // Render platform icons
  const renderPlatformIcons = (platforms: string[]) => {
    return (
      <div className="flex space-x-1">
        {platforms.includes('facebook') && <Facebook className="h-3 w-3 text-blue-600" />}
        {platforms.includes('instagram') && <Instagram className="h-3 w-3 text-pink-600" />}
        {platforms.includes('google') && <Globe className="h-3 w-3 text-yellow-600" />}
      </div>
    );
  };
  
  // Handle edit post click
  const handleEditClick = (post: ContentPost, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day click handler
    setEditingPost(post);
  };
  
  // Handle delete post click
  const handleDeleteClick = (post: ContentPost, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day click handler
    setPostToDelete(post);
    setIsAlertOpen(true);
  };
  
  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/content-posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      return postId;
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "The post has been deleted successfully.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
      
      // Close alert dialog and clear post to delete
      setIsAlertOpen(false);
      setPostToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Confirm deletion handler
  const confirmDelete = () => {
    if (postToDelete) {
      deletePostMutation.mutate(postToDelete.id);
    }
  };
  
  return (
    <>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "h-24 lg:h-32 border border-gray-200 p-1 overflow-hidden relative",
              isToday ? "bg-primary-50 border-primary-200" : "bg-white",
              snapshot.isDraggingOver ? "bg-blue-50" : ""
            )}
            onClick={() => onDayClick(day)}
          >
            <div className="flex justify-between items-start">
              <span className={cn(
                "text-sm font-medium p-1",
                isToday ? "bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""
              )}>
                {day}
              </span>
              {posts.length > 0 && (
                <span className="text-xs text-gray-500">{posts.length} post{posts.length > 1 ? 's' : ''}</span>
              )}
            </div>
            
            <div className="mt-1 space-y-1 max-h-[80%] overflow-hidden">
              {posts.slice(0, 3).map((post, index) => (
                <Draggable 
                  key={post.id.toString()}
                  draggableId={post.id.toString()} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "text-xs p-1 rounded truncate border-l-2 relative group",
                        post.isEvergreen && "border-l-green-600 bg-green-50",
                        !post.isEvergreen && post.status === 'scheduled' && "border-l-blue-500 bg-blue-50",
                        post.status === 'draft' && "border-l-yellow-500 bg-yellow-50",
                        post.status === 'automated' && "border-l-blue-500 bg-blue-50",
                        post.status === 'published' && "border-l-gray-500 bg-gray-50",
                        snapshot.isDragging && "shadow-md"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center gap-1 truncate">
                          {post.isEvergreen && <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />}
                          <span className="truncate">{post.title}</span>
                        </div>
                        {renderPlatformIcons(post.platforms)}
                      </div>
                      
                      {/* Hover actions */}
                      <div className="absolute right-0 top-0 h-full opacity-0 group-hover:opacity-100 flex items-center pr-1 bg-gradient-to-l from-white/90 via-white/90 to-transparent">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-gray-200">
                              <MoreHorizontal className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditClick(post, e as any)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(post, e as any)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {posts.length > 3 && (
                <div className="text-xs text-center text-gray-500">
                  +{posts.length - 3} more
                </div>
              )}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
      
      {/* Edit post dialog */}
      {editingPost && (
        <ContentPostForm
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          initialData={editingPost}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}