import { useQuery } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingPosts } from "@/components/dashboard/upcoming-posts";
import { PartnerStatus } from "@/components/dashboard/partner-status";
import { PerformanceSnapshot } from "@/components/dashboard/performance-snapshot";
import { Button } from "@/components/ui/button";
import { FilterIcon, Loader2 } from "lucide-react";
import { CreatePostButton } from "@/components/content/post-form/create-post-button";

export default function Dashboard() {
  // Fetch dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard-stats"],
  });
  
  // Set up performance metrics data
  const performanceMetrics = data?.performanceMetrics ? [
    {
      name: "Engagement Rate",
      current: data.performanceMetrics.engagementRate.current,
      previous: data.performanceMetrics.engagementRate.previous,
      change: data.performanceMetrics.engagementRate.change,
      color: "bg-primary-500"
    },
    {
      name: "Click-through Rate",
      current: data.performanceMetrics.clickThroughRate.current,
      previous: data.performanceMetrics.clickThroughRate.previous,
      change: data.performanceMetrics.clickThroughRate.change,
      color: "bg-secondary-500"
    },
    {
      name: "Audience Growth",
      current: data.performanceMetrics.audienceGrowth.current,
      previous: data.performanceMetrics.audienceGrowth.previous,
      change: data.performanceMetrics.audienceGrowth.change,
      color: "bg-accent-500"
    }
  ] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
              <p className="text-gray-500">Manage your content and retail partners</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button variant="outline" className="flex items-center">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <CreatePostButton label="Create New Post" />
            </div>
          </div>

          {/* Quick Stats */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-gray-300 rounded" />
                      <div className="h-8 w-12 bg-gray-400 rounded" />
                    </div>
                    <div className="h-10 w-10 bg-gray-300 rounded-lg" />
                  </div>
                  <div className="mt-2 h-4 w-36 bg-gray-300 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Active Posts"
                value={data?.quickStats.activePosts || 0}
                icon={DocumentIcon}
                iconBackground="bg-primary-50"
                iconColor="text-primary-500"
                change={{
                  value: "12%",
                  label: "from last month",
                  increase: true
                }}
              />
              
              <StatsCard
                title="Retail Partners"
                value={data?.quickStats.partnerCount || 0}
                icon={StoreIcon}
                iconBackground="bg-secondary-50"
                iconColor="text-secondary-500"
                change={{
                  value: "3",
                  label: "new this week",
                  increase: true
                }}
              />
              
              <StatsCard
                title="Scheduled Posts"
                value={data?.quickStats.scheduledPosts || 0}
                icon={CalendarCheckIcon}
                iconBackground="bg-accent-50"
                iconColor="text-accent-500"
                change={{
                  value: "Next post in 2 hours",
                  label: "",
                  increase: true
                }}
              />
              
              <StatsCard
                title="Total Engagement"
                value={formatNumber(data?.quickStats.totalEngagements || 0)}
                icon={HeartIcon}
                iconBackground="bg-gray-100"
                iconColor="text-gray-500"
                change={{
                  value: "8%",
                  label: "from last week",
                  increase: true
                }}
              />
            </div>
          )}

          {/* Main Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <ActivityFeed 
                activities={data?.recentActivity || []} 
                loading={isLoading} 
              />
              
              <UpcomingPosts 
                posts={data?.upcomingPosts || []} 
                loading={isLoading} 
              />
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-1 space-y-6">
              <PartnerStatus 
                partners={data?.partnerStats || { active: 0, pending: 0, needs_attention: 0, inactive: 0 }} 
                recentPartners={data?.recentPartners || []} 
                loading={isLoading} 
              />
              
              <PerformanceSnapshot 
                metrics={performanceMetrics} 
                loading={isLoading} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to format numbers (e.g., 14200 -> 14.2K)
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Icons
function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );
}

function CalendarCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <path d="M9 16l2 2 4-4"></path>
    </svg>
  );
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );
}
