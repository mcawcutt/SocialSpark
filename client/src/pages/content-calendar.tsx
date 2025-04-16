import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CreatePostButton } from "@/components/content/post-form/create-post-button";
import { ContentPostForm } from "@/components/content/post-form/content-post-form";
import { useAuth } from "@/hooks/use-auth";
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
  console.log("All posts:", posts);
  
  const currentMonthPosts = posts?.filter((post: any) => {
    if (!post.scheduledDate) return false;
    const postDate = new Date(post.scheduledDate);
    console.log(`Post date: ${postDate}, Month: ${postDate.getMonth()}, Current Month: ${currentMonth}`);
    return postDate.getMonth() === currentMonth && postDate.getFullYear() === currentYear;
  }) || [];
  
  console.log("Current month posts:", currentMonthPosts);

  // Find posts for a specific day
  const getPostsForDay = (day: number) => {
    return currentMonthPosts.filter((post: any) => {
      const postDate = new Date(post.scheduledDate);
      return postDate.getDate() === day;
    });
  };

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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "automated": return "bg-blue-100 text-blue-800";
      case "published": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // State for new post dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isNewPostDialogOpen, setIsNewPostDialogOpen] = useState(false);
  
  // Handle day click to open new post dialog
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
    setIsNewPostDialogOpen(true);
  };
  
  // Close the new post dialog
  const handleCloseNewPostDialog = () => {
    setIsNewPostDialogOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileNav />
      <Sidebar />
      
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
                <>
                  {/* Day names (header) */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="text-center text-sm text-gray-500 font-medium py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="h-24 lg:h-32 border border-gray-100 bg-gray-50"></div>;
                      }
                      
                      const dayPosts = getPostsForDay(day);
                      const isToday = new Date().getDate() === day && 
                                      new Date().getMonth() === currentMonth && 
                                      new Date().getFullYear() === currentYear;
                      
                      return (
                        <div 
                          key={`day-${day}`} 
                          className={cn(
                            "h-24 lg:h-32 border border-gray-200 p-1 overflow-hidden cursor-pointer",
                            isToday ? "bg-primary-50 border-primary-200" : "bg-white"
                          )}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className="flex justify-between items-start">
                            <span className={cn(
                              "text-sm font-medium p-1",
                              isToday ? "bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""
                            )}>
                              {day}
                            </span>
                            {dayPosts.length > 0 && (
                              <span className="text-xs text-gray-500">{dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}</span>
                            )}
                          </div>
                          
                          <div className="mt-1 space-y-1 max-h-[80%] overflow-hidden">
                            {dayPosts.slice(0, 3).map((post: any, i: number) => (
                              <div 
                                key={`post-${i}`} 
                                className={cn(
                                  "text-xs p-1 rounded truncate border-l-2",
                                  post.status === 'scheduled' && "border-l-green-500 bg-green-50",
                                  post.status === 'draft' && "border-l-yellow-500 bg-yellow-50",
                                  post.status === 'automated' && "border-l-blue-500 bg-blue-50",
                                  post.status === 'published' && "border-l-gray-500 bg-gray-50"
                                )}
                              >
                                <div className="flex justify-between">
                                  <span className="truncate">{post.title}</span>
                                  {renderPlatformIcons(post.platforms)}
                                </div>
                              </div>
                            ))}
                            {dayPosts.length > 3 && (
                              <div className="text-xs text-center text-gray-500">
                                +{dayPosts.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
                      <div key={post.id} className="flex items-center py-3 border-b border-gray-100 text-sm hover:bg-gray-50 rounded-md p-2">
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
                            <div className="font-medium text-gray-800">{post.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-sm">
                              {post.description}
                            </div>
                          </div>
                        </div>
                        <div className="w-24 flex justify-center">
                          {renderPlatformIcons(post.platforms)}
                        </div>
                        <div className="w-28 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(post.status)}`}>
                            {post.status}
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
    </div>
  );
}
