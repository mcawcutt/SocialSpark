import { ContentPost } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Facebook, Instagram, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpcomingPostsProps {
  posts: ContentPost[];
  loading?: boolean;
}

export function UpcomingPosts({ posts, loading = false }: UpcomingPostsProps) {
  // Function to render platform icons
  const renderPlatformIcons = (platforms: string[]) => {
    return (
      <div className="flex space-x-1">
        {platforms.includes('facebook') && <Facebook className="h-4 w-4 text-blue-600" />}
        {platforms.includes('instagram') && <Instagram className="h-4 w-4 text-pink-600" />}
        {platforms.includes('google') && <Globe className="h-4 w-4 text-yellow-600" />}
      </div>
    );
  };
  
  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    let colorClass = "";
    
    switch (status) {
      case "scheduled":
        colorClass = "bg-green-100 text-green-800";
        break;
      case "draft":
        colorClass = "bg-yellow-100 text-yellow-800";
        break;
      case "automated":
        colorClass = "bg-blue-100 text-blue-800";
        break;
      case "published":
        colorClass = "bg-gray-100 text-gray-800";
        break;
      default:
        colorClass = "bg-gray-100 text-gray-800";
    }
    
    return (
      <span className={`px-2 py-1 ${colorClass} rounded-full text-xs font-medium capitalize`}>
        {status}
      </span>
    );
  };
  
  // Function to format date
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return (
      <>
        {formattedDate}<br />
        <span className="text-sm">{formattedTime}</span>
      </>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b border-gray-200 flex justify-between items-center">
          <CardTitle>Upcoming Posts</CardTitle>
          <Button variant="link" className="text-primary-500">View Calendar</Button>
        </CardHeader>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 border-b border-gray-100" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100 flex">
              <div className="w-10 h-10 bg-gray-300 rounded mr-3" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 flex justify-between items-center p-6">
        <CardTitle>Upcoming Posts</CardTitle>
        <Button variant="link" className="text-primary-500 hover:text-primary-600 text-sm font-medium p-0">
          View Calendar
        </Button>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-gray-500 text-sm">
              <th className="px-6 py-3 bg-gray-50 font-medium">Post</th>
              <th className="px-6 py-3 bg-gray-50 font-medium">Date</th>
              <th className="px-6 py-3 bg-gray-50 font-medium">Platforms</th>
              <th className="px-6 py-3 bg-gray-50 font-medium">Partners</th>
              <th className="px-6 py-3 bg-gray-50 font-medium">Status</th>
              <th className="px-6 py-3 bg-gray-50 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex-shrink-0 rounded bg-gray-200"></div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-800">{post.title}</p>
                      <p className="text-gray-500 text-sm">{post.description.substring(0, 30)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {formatDate(post.scheduledDate)}
                </td>
                <td className="px-6 py-4">
                  {renderPlatformIcons(post.platforms)}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  All (24)
                </td>
                <td className="px-6 py-4">
                  {renderStatusBadge(post.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-gray-500">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
