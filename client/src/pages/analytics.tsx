import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Download, TrendingUp, Users, Share2, Heart, MessageSquare, Calendar, BarChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

// Date ranges for analytics
const DATE_RANGES = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Year to Date", value: "ytd" },
  { label: "All Time", value: "all" },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30d");
  const [platform, setPlatform] = useState("all");
  const [partner, setPartner] = useState("all");

  // Fetch analytics data
  const { data, isLoading } = useQuery({
    queryKey: ["/api/analytics", { dateRange, platform, partner }],
  });

  // Mock data for charts (in a real application, this would come from the API)
  const engagementData = [
    { name: "Jan", facebook: 4000, instagram: 2400, google: 1400 },
    { name: "Feb", facebook: 3000, instagram: 1398, google: 2210 },
    { name: "Mar", facebook: 2000, instagram: 9800, google: 2290 },
    { name: "Apr", facebook: 2780, instagram: 3908, google: 2000 },
    { name: "May", facebook: 1890, instagram: 4800, google: 2181 },
    { name: "Jun", facebook: 2390, instagram: 3800, google: 2500 },
  ];

  const platformShareData = [
    { name: "Facebook", value: 45 },
    { name: "Instagram", value: 35 },
    { name: "Google", value: 20 },
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981"];

  const topPerformingContent = [
    { 
      title: "Summer Sale Announcement", 
      platform: "Instagram", 
      engagements: 1245, 
      clicks: 380, 
      shares: 87,
      likes: 432 
    },
    { 
      title: "New Product Launch", 
      platform: "Facebook", 
      engagements: 980, 
      clicks: 210, 
      shares: 56,
      likes: 345 
    },
    { 
      title: "Customer Testimonial", 
      platform: "Google", 
      engagements: 780, 
      clicks: 195, 
      shares: 42,
      likes: 287 
    },
  ];

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Get platform color
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return 'text-blue-600';
      case 'instagram': return 'text-pink-600';
      case 'google': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Platform icons
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <i className="ri-facebook-fill text-blue-600"></i>;
      case 'instagram': return <i className="ri-instagram-line text-pink-600"></i>;
      case 'google': return <i className="ri-google-fill text-yellow-600"></i>;
      default: return null;
    }
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
              <h1 className="text-2xl font-semibold text-gray-800">Analytics</h1>
              <p className="text-gray-500">Track performance across your network</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="google">Google Business</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={partner} onValueChange={setPartner}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  <SelectItem value="1">Riverside Cycles</SelectItem>
                  <SelectItem value="2">Outdoor Supply Co.</SelectItem>
                  <SelectItem value="3">Gear Shop Seattle</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm">Total Impressions</p>
                    <h3 className="text-2xl font-semibold">234.7K</h3>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-500 flex items-center">↑ 12%</span>
                  <span className="text-gray-500 ml-2">vs previous period</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm">Engagement Rate</p>
                    <h3 className="text-2xl font-semibold">4.8%</h3>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-500 flex items-center">↑ 2.1%</span>
                  <span className="text-gray-500 ml-2">vs previous period</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm">Click-through Rate</p>
                    <h3 className="text-2xl font-semibold">3.2%</h3>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg">
                    <Share2 className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-500 flex items-center">↑ 0.5%</span>
                  <span className="text-gray-500 ml-2">vs previous period</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm">Total Engagements</p>
                    <h3 className="text-2xl font-semibold">12.6K</h3>
                  </div>
                  <div className="bg-pink-50 p-2 rounded-lg">
                    <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-500 flex items-center">↑ 8.3%</span>
                  <span className="text-gray-500 ml-2">vs previous period</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">Content Performance</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="partners">Partner Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Engagement Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Over Time</CardTitle>
                  <CardDescription>Track total engagements across all platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={engagementData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="facebook" stroke="#3b82f6" name="Facebook" />
                        <Line type="monotone" dataKey="instagram" stroke="#8b5cf6" name="Instagram" />
                        <Line type="monotone" dataKey="google" stroke="#10b981" name="Google" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Platform Breakdown & Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Breakdown</CardTitle>
                    <CardDescription>Distribution of engagements by platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={platformShareData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {platformShareData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance by Metric</CardTitle>
                    <CardDescription>Engagement metrics breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Likes & Reactions</span>
                          <span className="text-gray-800 font-medium">7.5K</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Comments</span>
                          <span className="text-gray-800 font-medium">2.1K</span>
                        </div>
                        <Progress value={45} className="h-2" indicatorClassName="bg-purple-500" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Shares</span>
                          <span className="text-gray-800 font-medium">1.4K</span>
                        </div>
                        <Progress value={32} className="h-2" indicatorClassName="bg-green-500" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Clicks</span>
                          <span className="text-gray-800 font-medium">3.8K</span>
                        </div>
                        <Progress value={58} className="h-2" indicatorClassName="bg-amber-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-6">
              {/* Top Performing Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Content</CardTitle>
                  <CardDescription>Posts with highest engagement rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm">
                          <th className="px-6 py-3 bg-gray-50 font-medium">Post</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium">Platform</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium text-right">Engagements</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium text-right">Clicks</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium text-right">Shares</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium text-right">Likes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {topPerformingContent.map((post, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded bg-gray-200 mr-3"></div>
                                <div>
                                  <p className="font-medium text-gray-800">{post.title}</p>
                                  <div className="text-gray-500 text-sm flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>Posted on June 24, 2023</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`flex items-center ${getPlatformColor(post.platform)}`}>
                                {post.platform}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(post.engagements)}</td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(post.clicks)}</td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(post.shares)}</td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(post.likes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Content Engagement by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Engagement by Type</CardTitle>
                  <CardDescription>Compare engagement across different post types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Product', facebook: 1200, instagram: 2400, google: 800 },
                          { name: 'Promotion', facebook: 2800, instagram: 1800, google: 400 },
                          { name: 'Educational', facebook: 1400, instagram: 1200, google: 950 },
                          { name: 'Event', facebook: 1700, instagram: 2100, google: 300 },
                          { name: 'Testimonial', facebook: 2200, instagram: 1500, google: 1100 },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="facebook" name="Facebook" fill="#3b82f6" />
                        <Bar dataKey="instagram" name="Instagram" fill="#8b5cf6" />
                        <Bar dataKey="google" name="Google" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="audience">
              <Card>
                <CardHeader>
                  <CardTitle>Audience Growth</CardTitle>
                  <CardDescription>Track follower growth over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { name: 'Jan', facebook: 1200, instagram: 2400, google: 800 },
                          { name: 'Feb', facebook: 1300, instagram: 2600, google: 830 },
                          { name: 'Mar', facebook: 1450, instagram: 2900, google: 870 },
                          { name: 'Apr', facebook: 1600, instagram: 3300, google: 920 },
                          { name: 'May', facebook: 1800, instagram: 3800, google: 980 },
                          { name: 'Jun', facebook: 2100, instagram: 4200, google: 1050 },
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="facebook" stroke="#3b82f6" name="Facebook" />
                        <Line type="monotone" dataKey="instagram" stroke="#8b5cf6" name="Instagram" />
                        <Line type="monotone" dataKey="google" stroke="#10b981" name="Google" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="partners">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Partners</CardTitle>
                  <CardDescription>Retail partners with highest engagement rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={[
                          { name: 'Riverside Cycles', value: 8750 },
                          { name: 'Outdoor Supply Co.', value: 7200 },
                          { name: 'Gear Shop Seattle', value: 6800 },
                          { name: 'Mountain View Sports', value: 5450 },
                          { name: 'Urban Bikes & Gear', value: 4800 },
                        ]}
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Bar dataKey="value" name="Total Engagements" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
