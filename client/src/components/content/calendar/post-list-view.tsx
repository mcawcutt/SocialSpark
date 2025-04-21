import { format } from "date-fns";
import { ImageIcon, Leaf } from "lucide-react";

interface PostListViewProps {
  posts: any[];
  onPostClick: (post: any) => void;
  getStatusColor: (status: string, isEvergreen: boolean) => string;
  renderPlatformIcons: (platforms: string[]) => React.ReactNode;
}

export function PostListView({
  posts,
  onPostClick,
  getStatusColor,
  renderPlatformIcons
}: PostListViewProps) {
  // Sort posts by date
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No posts scheduled for this month. Create a new post to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* List Header */}
      <div className="grid grid-cols-12 gap-4 border-b border-gray-200 pb-3 text-sm font-medium text-gray-500">
        <div className="col-span-2">Date</div>
        <div className="col-span-5">Post</div>
        <div className="col-span-2 text-center">Platforms</div>
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-2 text-center">Partners</div>
      </div>
      
      {/* List Content */}
      <div className="space-y-1 mt-2">
        {sortedPosts.map((post) => (
          <div 
            key={post.id} 
            className={`grid grid-cols-12 gap-4 py-3 border-b items-center text-sm hover:bg-gray-50 cursor-pointer rounded-md px-2 ${
              post.isEvergreen ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
            }`}
            onClick={() => onPostClick(post)}
          >
            {/* Date Column */}
            <div className="col-span-2 text-gray-600">
              {post.scheduledDate ? format(new Date(post.scheduledDate), 'MMM d, yyyy') : '-'}
              <div className="text-xs text-gray-500">
                {post.scheduledDate ? format(new Date(post.scheduledDate), 'h:mm a') : ''}
              </div>
            </div>
            
            {/* Post Content Column */}
            <div className="col-span-5 flex items-center">
              <div className="w-10 h-10 rounded overflow-hidden mr-3 flex-shrink-0 border border-gray-200">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  {post.isEvergreen && <Leaf className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  <div className="font-medium text-gray-800 truncate">{post.title}</div>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {post.description}
                </div>
              </div>
            </div>
            
            {/* Platforms Column */}
            <div className="col-span-2 flex justify-center">
              {renderPlatformIcons(post.platforms)}
            </div>
            
            {/* Status Column */}
            <div className="col-span-1 flex justify-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getStatusColor(post.status, post.isEvergreen)}`}>
                {post.isEvergreen ? "Evergreen" : post.status}
              </span>
            </div>
            
            {/* Partners Column */}
            <div className="col-span-2 text-center text-gray-600">
              {post.targetingType === 'tag' ? 'By Tag' : 'All Partners'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}