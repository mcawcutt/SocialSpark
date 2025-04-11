import { FileText, UserPlus, CalendarPlus, BarChart2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  type: 'post_published' | 'partner_connected' | 'post_scheduled' | 'analytics_milestone';
  title: string;
  timestamp: Date | string;
  details: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  // Function to format the timestamp
  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInHours < 48) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  
  // Function to get the appropriate icon for each activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post_published':
        return <div className="bg-primary-50 p-2 rounded-full"><FileText className="h-4 w-4 text-primary-500" /></div>;
      case 'partner_connected':
        return <div className="bg-secondary-50 p-2 rounded-full"><UserPlus className="h-4 w-4 text-secondary-500" /></div>;
      case 'post_scheduled':
        return <div className="bg-accent-50 p-2 rounded-full"><CalendarPlus className="h-4 w-4 text-accent-500" /></div>;
      case 'analytics_milestone':
        return <div className="bg-gray-100 p-2 rounded-full"><BarChart2 className="h-4 w-4 text-gray-500" /></div>;
      default:
        return <div className="bg-gray-100 p-2 rounded-full"><FileText className="h-4 w-4 text-gray-500" /></div>;
    }
  };
  
  // Function to get the activity description
  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'post_published':
        return (
          <p className="text-gray-800">
            <span className="font-semibold">{activity.title}</span> was published to {activity.details.partnerCount} retail partners.
          </p>
        );
      case 'partner_connected':
        return (
          <p className="text-gray-800">
            <span className="font-semibold">{activity.title}</span> accepted your partnership invitation.
          </p>
        );
      case 'post_scheduled':
        return (
          <p className="text-gray-800">
            <span className="font-semibold">{activity.title}</span> has been scheduled for {new Date(activity.details.scheduledDate).toLocaleDateString()}.
          </p>
        );
      case 'analytics_milestone':
        return (
          <p className="text-gray-800">
            <span className="font-semibold">{activity.title}</span> campaign reached {activity.details.count.toLocaleString()}+ engagements.
          </p>
        );
      default:
        return <p className="text-gray-800">{activity.title}</p>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start">
              <div className="bg-gray-200 h-10 w-10 rounded-full animate-pulse" />
              <div className="ml-4 space-y-2 flex-1">
                <div className="bg-gray-200 h-4 w-3/4 rounded animate-pulse" />
                <div className="bg-gray-200 h-3 w-1/4 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start">
            {getActivityIcon(activity.type)}
            <div className="ml-4">
              {getActivityDescription(activity)}
              <p className="text-gray-500 text-sm mt-1">{formatTimestamp(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </CardContent>
      
      <CardFooter className="border-t border-gray-200 text-center">
        <a href="#" className="text-primary-500 hover:text-primary-600 text-sm font-medium w-full">
          View All Activity
        </a>
      </CardFooter>
    </Card>
  );
}
