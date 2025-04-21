import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Building, 
  Users, 
  LayoutDashboard, 
  RefreshCw, 
  Plus, 
  UserRound, 
  LineChart, 
  Zap, 
  CreditCard,
  Activity, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect } from "wouter";

// Create brand form schema
const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planType: z.string().default("standard"),
});

type BrandFormValues = z.infer<typeof createBrandSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ route: "/api/admin/stats" }),
  });

  // Fetch brands
  const { 
    data: brands, 
    isLoading: brandsLoading,
    refetch: refetchBrands
  } = useQuery({
    queryKey: ["/api/admin/brands"],
    queryFn: getQueryFn({ route: "/api/admin/brands" }),
  });

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      const res = await apiRequest("POST", "/api/admin/brands", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create brand");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Brand created",
        description: "New brand account has been created successfully.",
      });
      setCreateBrandOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle brand status mutation
  const toggleBrandStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/brands/${id}`, { active });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update brand status");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Brand status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Impersonate brand mutation
  const impersonateBrandMutation = useMutation({
    mutationFn: async (brandId: number) => {
      const res = await apiRequest("POST", `/api/admin/impersonate/${brandId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to impersonate brand");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Impersonation started",
        description: `You are now logged in as ${data.user.name}.`,
      });
      
      // Update user data in the auth context
      queryClient.setQueryData(["/api/user"], data.user);
      
      // Redirect to the brand dashboard
      window.location.href = '/'; // Redirect to the home/dashboard page
    },
    onError: (error: Error) => {
      toast({
        title: "Impersonation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Brand form
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      planType: "standard",
    },
  });

  const onSubmit = (data: BrandFormValues) => {
    createBrandMutation.mutate(data);
  };

  // Helper function for API calls
  function getQueryFn({ route }: { route: string }) {
    return async () => {
      const res = await apiRequest("GET", route);
      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }
      return res.json();
    };
  }

  // Format date helper
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleToggleStatus = (brand: any) => {
    toggleBrandStatusMutation.mutate({
      id: brand.id,
      active: !brand.active
    });
  };
  
  const handleImpersonateBrand = (brandId: number) => {
    impersonateBrandMutation.mutate(brandId);
  };

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchBrands();
              toast({
                title: "Refreshed",
                description: "Dashboard data has been refreshed.",
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateBrandOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Brand
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setSelectedTab} value={selectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="brands">
            <Building className="h-4 w-4 mr-2" />
            Brands
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-primary" />
                  Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  ${statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.monthlyRevenue || "15,250"
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-green-500">↑ 12%</span> vs last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl flex items-center">
                  <Building className="h-5 w-5 mr-2 text-primary" />
                  Active Brands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.activeBrands || 0
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-green-500">↑ 3</span> new this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${stats?.resourceUsage || 68}%`
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-amber-500">↑ 5%</span> vs last week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-1 text-xl font-bold text-green-500">
                  <CheckCircle className="h-5 w-5 mr-1" />
                  <span>Operational</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All services running normally
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Revenue by Subscription Level
                </CardTitle>
                <CardDescription>
                  Monthly recurring revenue breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Premium ($199/mo)</span>
                      <span className="text-sm font-medium">$7,960</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '52%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Standard ($99/mo)</span>
                      <span className="text-sm font-medium">$5,940</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '39%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Basic ($49/mo)</span>
                      <span className="text-sm font-medium">$1,350</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: '9%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Total MRR: <strong>$15,250</strong></p>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  System Resources
                </CardTitle>
                <CardDescription>
                  Resource usage by brand accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Storage Usage (20GB limit)</span>
                      <span className="text-sm font-medium">14.2GB / 20GB</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '71%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">API Calls (100k/day limit)</span>
                      <span className="text-sm font-medium">63.4k / 100k</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '63%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Database Connections (500 limit)</span>
                      <span className="text-sm font-medium">342 / 500</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 inline-block mr-1 text-amber-500" />
                  Storage approaching 75% threshold
                </p>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Platform Activity
                </CardTitle>
                <CardDescription>
                  System-wide activity and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="min-w-[56px] self-start">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                        <CheckCircle className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">System backup completed</p>
                      <p className="text-xs text-muted-foreground">Today at 3:45 PM</p>
                      <p className="text-sm mt-1">Daily automatic system backup completed successfully. All data has been preserved.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="min-w-[56px] self-start">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10 text-amber-500">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Storage usage alert</p>
                      <p className="text-xs text-muted-foreground">Today at 2:15 PM</p>
                      <p className="text-sm mt-1">Media storage usage has exceeded 70% of the allocated quota. Consider upgrading your plan.</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="min-w-[56px] self-start">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10 text-green-500">
                        <Building className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">New brand account created</p>
                      <p className="text-xs text-muted-foreground">Yesterday at 10:22 AM</p>
                      <p className="text-sm mt-1">Peak Outdoors has joined the platform on the Premium plan. Their account is now active.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="ml-auto">
                  View all activity
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Brand Management</CardTitle>
              <CardDescription>
                Manage all brand accounts on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : brands?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No brands found</p>
                  <Button onClick={() => setCreateBrandOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Brand
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands?.map((brand: any) => (
                        <TableRow key={brand.id}>
                          <TableCell className="font-medium">{brand.name}</TableCell>
                          <TableCell>{brand.username}</TableCell>
                          <TableCell>{brand.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {brand.planType || "standard"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={brand.active ? "outline" : "destructive"}>
                              {brand.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {brand.createdAt ? formatDate(brand.createdAt) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(brand)}
                              >
                                {brand.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                View
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleImpersonateBrand(brand.id)}
                                disabled={impersonateBrandMutation.isPending}
                              >
                                <UserRound className="h-4 w-4 mr-1" />
                                Login as Brand
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Subscription Settings
                </CardTitle>
                <CardDescription>
                  Manage subscription plans and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Premium Plan</h3>
                        <p className="text-sm text-muted-foreground">$199/month</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm"><span className="font-medium">Features:</span> Unlimited posts, 100 retail partners, priority support, white-labeling</p>
                      <p className="text-sm mt-1"><span className="font-medium">Active users:</span> 40</p>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Standard Plan</h3>
                        <p className="text-sm text-muted-foreground">$99/month</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm"><span className="font-medium">Features:</span> 50 posts/month, 25 retail partners, email support</p>
                      <p className="text-sm mt-1"><span className="font-medium">Active users:</span> 60</p>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Basic Plan</h3>
                        <p className="text-sm text-muted-foreground">$49/month</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm"><span className="font-medium">Features:</span> 20 posts/month, 10 retail partners, standard support</p>
                      <p className="text-sm mt-1"><span className="font-medium">Active users:</span> 28</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" className="ml-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Plan
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  User Activity
                </CardTitle>
                <CardDescription>
                  Recent user logins and account activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Sarah Johnson</p>
                        <p className="text-xs text-muted-foreground">Mountain Gear Inc.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Logged in</p>
                      <p className="text-xs text-muted-foreground">Today, 4:15 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Alex Chen</p>
                        <p className="text-xs text-muted-foreground">Bike World</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Updated profile</p>
                      <p className="text-xs text-muted-foreground">Today, 2:33 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Maria Rodriguez</p>
                        <p className="text-xs text-muted-foreground">Summit Sports</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Changed password</p>
                      <p className="text-xs text-muted-foreground">Today, 11:42 AM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">James Wilson</p>
                        <p className="text-xs text-muted-foreground">Trek Adventures</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">New registration</p>
                      <p className="text-xs text-muted-foreground">Yesterday, 3:20 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="ml-auto">
                  View all activity
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Admin User Management</CardTitle>
                <CardDescription>
                  Manage administrator accounts and permissions
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">Admin User</div>
                      <div className="text-xs text-muted-foreground">admin@ignyt.com</div>
                    </TableCell>
                    <TableCell>admin</TableCell>
                    <TableCell>Now</TableCell>
                    <TableCell>
                      <Badge>Super Admin</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">John Smith</div>
                      <div className="text-xs text-muted-foreground">john@ignyt.com</div>
                    </TableCell>
                    <TableCell>john</TableCell>
                    <TableCell>2 hours ago</TableCell>
                    <TableCell>
                      <Badge variant="outline">Support Admin</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">Emma Davis</div>
                      <div className="text-xs text-muted-foreground">emma@ignyt.com</div>
                    </TableCell>
                    <TableCell>emma</TableCell>
                    <TableCell>Yesterday</TableCell>
                    <TableCell>
                      <Badge variant="outline">Support Admin</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Brand Dialog */}
      <Dialog open={createBrandOpen} onOpenChange={setCreateBrandOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Brand</DialogTitle>
            <DialogDescription>
              Add a new brand account to the platform.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@acmecorp.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="acmecorp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="planType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the subscription plan for this brand.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setCreateBrandOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createBrandMutation.isPending}
                >
                  {createBrandMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Creating...
                    </>
                  ) : (
                    "Create Brand"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}