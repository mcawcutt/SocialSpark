import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, DropResult, Droppable, resetServerContext } from "react-beautiful-dnd";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CreatePostButton } from "@/components/content/post-form/create-post-button";
import { ContentPostForm } from "@/components/content/post-form/content-post-form";
import { EvergreenPostIcon } from "@/components/content/calendar/evergreen-post-icon";
import { EvergreenPostModal } from "@/components/content/calendar/evergreen-post-modal";
import { PostListView } from "@/components/content/calendar/post-list-view";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, 
  PlusIcon, 
  ChevronLeft, 
  ChevronRight,
  Facebook,
  Instagram,
  Globe,
  Filter,
  Grid3X3,
  List,
  Leaf,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ContentPost } from "@shared/schema";
import type { ContentPost as ContentPostType } from "@shared/schema";
import { CalendarDayCell } from "@/components/content/calendar/calendar-day-cell";

// Reset server context for drag and drop
resetServerContext();

// Utility function to get days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Utility function to get day of week for first day of month
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export default function ContentCalendar() {
  // State for current date in calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for edit post dialog
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);

  // Query content posts with correct brandId
  const { data: posts, isLoading } = useQuery({
    queryKey: ["/api/content-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/content-posts?brandId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!user,
  });

  // Handle month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = format(currentDate, 'MMMM yyyy');

  // Calculate calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate calendar days array
  const calendarDays = Array.from({ length: daysInMonth + firstDayOfMonth }, (_, i) => {
    if (i < firstDayOfMonth) return null;
    return i - firstDayOfMonth + 1;
  });

  // Get abbreviated day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter posts for current month
  const currentMonthPosts = posts?.filter((post: ContentPost) => {
    if (!post.scheduledDate) return false;
    const postDate = new Date(post.scheduledDate);
    return postDate.getMonth() === currentMonth && postDate.getFullYear() === currentYear;
  }) || [];

  // Find posts for a specific day
  const getPostsForDay = (day: number) => {
    return currentMonthPosts.filter((post: ContentPost) => {
      if (!post.scheduledDate) return false;
      const postDate = new Date(post.scheduledDate);
      return postDate.getDate() === day;
    });
  };

  // Render platform icons (used in list view)
  const renderPlatformIcons = (platforms: string[]) => {
    return (
      <div className="flex space-x-1">
        {platforms.includes('facebook') && <Facebook className="h-3 w-3 text-blue-600" />}
        {platforms.includes('instagram') && <Instagram className="h-3 w-3 text-pink-600" />}
        {platforms.includes('google') && <Globe className="h-3 w-3 text-yellow-600" />}
      </div>
    );
  };

  // Get status badge color based on status and whether it's evergreen
  const getStatusColor = (status: string, isEvergreen: boolean = false) => {
    // For evergreen posts, use a distinct green style
    if (isEvergreen) {
      return "bg-green-100 text-green-800 border border-green-300";
    }
    
    // For regular posts
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "automated": return "bg-blue-100 text-blue-800";
      case "published": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // State for new post dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isNewPostDialogOpen, setIsNewPostDialogOpen] = useState(false);
  
  // State for evergreen post modal
  const [isEvergreenModalOpen, setIsEvergreenModalOpen] = useState(false);
  const [evergreenDate, setEvergreenDate] = useState<Date | null>(null);
  
  // Handle day click to open new post dialog
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
    
    // Don't allow scheduling in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate < today) {
      toast({
        title: "Cannot schedule in the past",
        description: "Please select today or a future date for scheduling posts.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if there are posts on this day
    const postsOnSelectedDay = getPostsForDay(day);
    
    if (postsOnSelectedDay.length > 0) {
      // If there's only one post, open it directly in edit mode
      if (postsOnSelectedDay.length === 1) {
        setEditingPost(postsOnSelectedDay[0]);
      } else {
        // If there are multiple posts, show a message with their count
        // and let the user click on individual posts from the calendar
        toast({
          title: `${postsOnSelectedDay.length} posts scheduled on ${clickedDate ? format(clickedDate, 'MMMM d, yyyy') : 'selected date'}`,
          description: "Click on a specific post to edit it, or click 'Create Post' to add a new one for this date.",
          duration: 5000
        });
      }
    } else {
      // No posts on this day, open the create new post dialog
      setIsNewPostDialogOpen(true);
    }
  };
  
  // Close the new post dialog
  const handleCloseNewPostDialog = () => {
    setIsNewPostDialogOpen(false);
    setSelectedDate(null);
  };
  
  // Close the edit post dialog
  const handleCloseEditDialog = () => {
    setEditingPost(null);
  };
  
  // Reschedule post mutation
  const reschedulePostMutation = useMutation({
    mutationFn: async ({ postId, newDate }: { postId: number, newDate: Date }) => {
      const response = await fetch(`/api/content-posts/${postId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newDate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reschedule post');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post rescheduled",
        description: "The post has been rescheduled successfully.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error rescheduling post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle drag end event
  const handleDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination, source } = result;
    
    // If dropped outside a droppable area, or dropped in the same spot, do nothing
    if (!destination || 
        (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }
    
    // Extract date from destination droppable ID
    // Format: day-YYYY-MM-DD
    const destParts = destination.droppableId.split('-');
    if (destParts.length !== 4) return;
    
    const destYear = parseInt(destParts[1]);
    const destMonth = parseInt(destParts[2]);
    const destDay = parseInt(destParts[3]);
    
    if (isNaN(destYear) || isNaN(destMonth) || isNaN(destDay)) return;
    
    // Check if this is an evergreen post icon being dropped
    if (draggableId === "evergreen-post") {
      // Set the date for the evergreen post modal
      const targetDate = new Date(destYear, destMonth, destDay);
      
      // Don't allow scheduling in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate < today) {
        toast({
          title: "Cannot schedule in the past",
          description: "Please select today or a future date for scheduling posts.",
          variant: "destructive"
        });
        return;
      }
      
      setEvergreenDate(targetDate);
      setIsEvergreenModalOpen(true);
      return;
    }
    
    // Handle regular post dragging
    // Extract post ID from draggable ID
    const postId = parseInt(draggableId);
    if (isNaN(postId)) return;
    
    // Find the original post to preserve its time
    const post = posts?.find((p: ContentPostType) => p.id === postId);
    
    // Create new date for the post that preserves the original time
    let newDate: Date;
    
    if (post?.scheduledDate) {
      // Get the original scheduled date
      const originalDate = new Date(post.scheduledDate);
      
      // Create a new date with the destination day but original time
      newDate = new Date(destYear, destMonth, destDay);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());
      newDate.setSeconds(originalDate.getSeconds());
      
      console.log('Rescheduling post:', {
        postId,
        originalDate: originalDate.toISOString(),
        newDate: newDate.toISOString(),
        preservedTime: `${originalDate.getHours()}:${originalDate.getMinutes()}`
      });
    } else {
      // If no original date (shouldn't happen), use today's date with current time
      newDate = new Date(destYear, destMonth, destDay);
    }
    
    // Reschedule the post
    reschedulePostMutation.mutate({ postId, newDate });
  }, [reschedulePostMutation, posts, toast, setEvergreenDate, setIsEvergreenModalOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Content Calendar</h1>
              <p className="text-gray-500">Schedule and manage your social media content</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button variant="outline" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Select defaultValue="all">
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="google">Google Business</SelectItem>
                </SelectContent>
              </Select>
              <CreatePostButton 
                scheduledDate={currentDate}
                label="New Post"
                className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6] text-white"
              />
            </div>
          </div>
          
          {/* New Post Dialog */}
          {selectedDate && (
            <ContentPostForm
              isOpen={isNewPostDialogOpen}
              onClose={handleCloseNewPostDialog}
              initialData={{
                scheduledDate: selectedDate,
                title: "",
                description: "",
                platforms: ["facebook", "instagram"],
              }}
            />
          )}
          
          {/* Edit Post Dialog */}
          {editingPost && (
            <ContentPostForm
              isOpen={!!editingPost}
              onClose={handleCloseEditDialog}
              initialData={editingPost}
            />
          )}

          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-lg font-semibold mx-4 min-w-36 text-center">{monthName}</h2>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant={viewMode === 'month' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setViewMode('month')}
                    className={`flex items-center ${viewMode === 'month' ? 'toggle-active' : ''}`}
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Month
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center ${viewMode === 'list' ? 'toggle-active' : ''}`}
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {viewMode === 'month' ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  {/* Day names (header) */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="text-center text-sm text-gray-500 font-medium py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Evergreen Post Icon */}
                  <div className="my-4 p-4 border border-dashed border-green-300 rounded-md bg-green-50">
                    <div className="flex items-center space-x-4">
                      <Droppable droppableId="evergreen-source" isDropDisabled={false}>
                        {(provided) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex-shrink-0"
                          >
                            <EvergreenPostIcon index={0} />
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-green-800">Evergreen Content</h3>
                        <p className="text-xs text-green-600">
                          Drag the tree icon to any date to schedule evergreen posts. Each retail partner will receive a different post from your evergreen content library.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="h-24 lg:h-32 border border-gray-100 bg-gray-50"></div>;
                      }
                      
                      const dayPosts = getPostsForDay(day);
                      
                      return (
                        <CalendarDayCell
                          key={`day-${day}`}
                          day={day}
                          currentMonth={currentMonth}
                          currentYear={currentYear}
                          posts={dayPosts}
                          onDayClick={handleDayClick}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Evergreen Post Modal */}
                  {evergreenDate && (
                    <EvergreenPostModal
                      isOpen={isEvergreenModalOpen}
                      onClose={() => {
                        setIsEvergreenModalOpen(false);
                        setEvergreenDate(null);
                      }}
                      scheduledDate={evergreenDate}
                    />
                  )}
                </DragDropContext>
              ) : (
                // List view
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm text-gray-500 border-b border-gray-200 pb-2 font-medium">
                    <div className="w-32">Date</div>
                    <div className="flex-1">Post</div>
                    <div className="w-24 text-center">Platforms</div>
                    <div className="w-28 text-center">Status</div>
                    <div className="w-28 text-center">Partners</div>
                  </div>
                  
                  {isLoading ? (
                    <div className="py-8 text-center text-gray-500">
                      Loading content posts...
                    </div>
                  ) : currentMonthPosts.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No posts scheduled for this month. Create a new post to get started.
                    </div>
                  ) : (
                    currentMonthPosts.sort((a: any, b: any) => {
                      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
                    }).map((post: any) => (
                      <div 
                        key={post.id} 
                        className={`flex items-center py-3 border-b text-sm hover:bg-gray-50 rounded-md p-2 ${
                          post.isEvergreen ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                        }`}
                      >
                        <div className="w-32 text-gray-600">
                          {post.scheduledDate ? format(new Date(post.scheduledDate), 'MMM d, yyyy') : '-'}
                          <div className="text-xs text-gray-500">
                            {post.scheduledDate ? format(new Date(post.scheduledDate), 'h:mm a') : ''}
                          </div>
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="w-8 h-8 rounded overflow-hidden mr-2">
                            {post.imageUrl ? (
                              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              {post.isEvergreen && <Leaf className="h-4 w-4 text-green-600 flex-shrink-0" />}
                              <div className="font-medium text-gray-800">{post.title}</div>
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-sm">
                              {post.description}
                            </div>
                          </div>
                        </div>
                        <div className="w-24 flex justify-center">
                          {renderPlatformIcons(post.platforms)}
                        </div>
                        <div className="w-28 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(post.status, post.isEvergreen)}`}>
                            {post.isEvergreen ? "Evergreen" : post.status}
                          </span>
                        </div>
                        <div className="w-28 text-center text-gray-600">
                          All Partners
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* New Post Dialog */}
      {isNewPostDialogOpen && selectedDate && (
        <ContentPostForm
          isOpen={isNewPostDialogOpen}
          onClose={handleCloseNewPostDialog}
          initialData={{
            scheduledDate: selectedDate,
            title: "",
            description: "",
            platforms: ["facebook", "instagram"]
          }}
        />
      )}
      
      {/* Edit Post Dialog */}
      {editingPost && (
        <ContentPostForm
          isOpen={!!editingPost}
          onClose={handleCloseEditDialog}
          initialData={editingPost}
        />
      )}
      
      {/* Evergreen Post Modal */}
      {evergreenDate && (
        <EvergreenPostModal
          isOpen={isEvergreenModalOpen}
          onClose={() => {
            setIsEvergreenModalOpen(false);
            setEvergreenDate(null);
          }}
          scheduledDate={evergreenDate}
        />
      )}
    </div>
  );
}
