import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, BarChart3, UsersRound, Store, FileText, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// Sample data for charts
const monthlyData = [
  { name: 'Jan', revenue: 5000, partners: 15, posts: 42 },
  { name: 'Feb', revenue: 7500, partners: 18, posts: 56 },
  { name: 'Mar', revenue: 9000, partners: 22, posts: 68 },
  { name: 'Apr', revenue: 12500, partners: 26, posts: 85 },
  { name: 'May', revenue: 15000, partners: 32, posts: 92 },
  { name: 'Jun', revenue: 15250, partners: 35, posts: 104 },
];

const engagementData = [
  { platform: 'Facebook', engagement: 65 },
  { platform: 'Instagram', engagement: 82 },
  { platform: 'Google Business', engagement: 45 },
];

export default function AdminAnalytics() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState("6months");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch admin stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch admin stats');
      return res.json();
    },
  });

  // Handle refresh button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Refreshed",
        description: "Analytics data has been refreshed."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh analytics data.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <div className="flex gap-2">
          <Select 
            value={timeframe} 
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard 
              title="Total Brands" 
              value={stats?.totalBrands || 0} 
              description={`${stats?.activeBrands || 0} active brands`}
              icon={<Store className="h-5 w-5 text-blue-600" />} 
              trend={'+12%'} 
            />
            <MetricCard 
              title="Retail Partners" 
              value={stats?.totalRetailPartners || 0} 
              description={`${stats?.activeRetailPartners || 0} active partners`}
              icon={<UsersRound className="h-5 w-5 text-green-600" />} 
              trend={'+8%'} 
            />
            <MetricCard 
              title="Content Posts" 
              value={stats?.totalPosts || 0} 
              description="Published content items"
              icon={<FileText className="h-5 w-5 text-purple-600" />} 
              trend={'+15%'} 
            />
            <MetricCard 
              title="Social Accounts" 
              value={stats?.totalSocialAccounts || 0} 
              description="Connected accounts"
              icon={<TrendingUp className="h-5 w-5 text-pink-600" />} 
              trend={'+4%'} 
            />
          </div>

          {/* Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Revenue Growth
                </CardTitle>
                <CardDescription>Monthly revenue from platform subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  Platform Growth
                </CardTitle>
                <CardDescription>Brands, partners and content growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="partners" fill="#3b82f6" />
                      <Bar dataKey="posts" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Engagement */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                Platform Engagement by Channel
              </CardTitle>
              <CardDescription>Average engagement rates across social platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagementData.map((item) => (
                  <div key={item.platform} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.platform}</span>
                      <span className="font-medium">{item.engagement}%</span>
                    </div>
                    <Progress value={item.engagement} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend: string;
}

function MetricCard({ title, value, description, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex flex-col items-end">
            {icon}
            <span className={`text-xs font-medium mt-2 ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}