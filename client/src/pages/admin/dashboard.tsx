import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building, Users, LayoutDashboard, RefreshCw, Plus, UserRound } from "lucide-react";
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Brands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.totalBrands || 0
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Active brands: {statsLoading ? "..." : stats?.activeBrands || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Retail Partners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.totalRetailPartners || 0
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Connected partners: {statsLoading ? "..." : stats?.activeRetailPartners || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Content Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {statsLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats?.totalPosts || 0
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Social accounts: {statsLoading ? "..." : stats?.totalSocialAccounts || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity and system health would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                View the latest activity across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Activity tracking will be added in a future update.
              </p>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                This section will be implemented in a future update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The user management interface will allow administrators to view and manage
                all users across the platform, including partners and brand admins.
              </p>
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