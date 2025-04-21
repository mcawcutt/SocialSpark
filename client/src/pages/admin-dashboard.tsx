import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Link } from "wouter";
import { PlusIcon, Search, UserPlus, MoreHorizontal, Building, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const newBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planType: z.string().default("standard"),
  logo: z.string().optional(),
});

type NewBrandFormValues = z.infer<typeof newBrandSchema>;

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanType, setSelectedPlanType] = useState("all");

  // Redirect if not admin
  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6">You do not have permission to access the admin dashboard.</p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all brands
  const { data: brands, isLoading } = useQuery({
    queryKey: ["/api/admin/brands"],
    queryFn: async () => {
      // If we're not an admin, don't make the request
      if (user?.role !== "admin") return [];
      
      const res = await apiRequest("GET", "/api/admin/brands");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch brands: ${errorText}`);
      }
      return await res.json();
    },
    enabled: !!user && user.role === "admin"
  });

  // Create a new brand
  const createBrandMutation = useMutation({
    mutationFn: async (data: NewBrandFormValues) => {
      const res = await apiRequest("POST", "/api/admin/brands", data);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to create brand: ${errorText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/brands"]});
      toast({
        title: "Brand created",
        description: "The brand has been created successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create brand",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update brand status
  const updateBrandStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/brands/${id}`, { active });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update brand: ${errorText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/brands"]});
      toast({
        title: "Brand updated",
        description: "The brand status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update brand",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating a new brand
  const form = useForm<NewBrandFormValues>({
    resolver: zodResolver(newBrandSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      planType: "standard",
      logo: "",
    },
  });

  // Handle form submission
  const onSubmit = (data: NewBrandFormValues) => {
    createBrandMutation.mutate(data);
  };

  // Filter brands by search term and plan type
  const filteredBrands = brands?.filter((brand: User) => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      brand.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlanType = selectedPlanType === 'all' || brand.planType === selectedPlanType;
    
    return matchesSearch && matchesPlanType;
  }) || [];

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Ignyt Admin Dashboard</h1>
              <p className="text-gray-500">Manage brands and platform settings</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search brands..." 
                  className="pl-10 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6] text-white">
                    <Building className="mr-2 h-4 w-4" />
                    Create Brand
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Brand</DialogTitle>
                    <DialogDescription>
                      Add a new brand to the platform.
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
                              <Input placeholder="Enter brand name" {...field} />
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
                              <Input placeholder="brand@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="brandname" {...field} />
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
                      
                      <FormField
                        control={form.control}
                        name="planType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Type</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]"
                          disabled={createBrandMutation.isPending}
                        >
                          {createBrandMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Brand
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Tabs and Content */}
          <Tabs defaultValue="brands">
            <TabsList className="mb-4">
              <TabsTrigger value="brands">Brands</TabsTrigger>
              <TabsTrigger value="platform">Platform Settings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            {/* Brands Tab */}
            <TabsContent value="brands">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>All Brands</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant={selectedPlanType === 'all' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedPlanType('all')}
                      >
                        All
                      </Button>
                      <Button 
                        variant={selectedPlanType === 'standard' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedPlanType('standard')}
                      >
                        Standard
                      </Button>
                      <Button 
                        variant={selectedPlanType === 'premium' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedPlanType('premium')}
                      >
                        Premium
                      </Button>
                      <Button 
                        variant={selectedPlanType === 'enterprise' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setSelectedPlanType('enterprise')}
                      >
                        Enterprise
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-10">
                      <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-800">No brands found</h3>
                      <p className="text-gray-500 mt-1">Try adjusting your search or create a new brand.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-left">
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                              Brand
                            </th>
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                              Plan
                            </th>
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredBrands.map((brand: User) => (
                            <tr key={brand.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                                    {brand.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="ml-3">
                                    <Link href={`/admin/brands/${brand.id}`}>
                                      <p className="font-medium text-gray-800 hover:text-primary hover:underline cursor-pointer">{brand.name}</p>
                                    </Link>
                                    <p className="text-gray-500 text-sm">@{brand.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500">{brand.email}</td>
                              <td className="px-6 py-4">
                                <Badge variant={
                                  brand.planType === 'premium' ? 'default' : 
                                  brand.planType === 'enterprise' ? 'secondary' : 'outline'
                                }>
                                  {brand.planType}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {formatDate(brand.createdAt?.toString())}
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant={
                                  brand.active ? 'success' : 'destructive'
                                }>
                                  {brand.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Link href={`/admin/brands/${brand.id}`}>View Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateBrandStatusMutation.mutate({ id: brand.id, active: !brand.active })}>
                                      {brand.active ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Reset Password</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Platform Settings Tab */}
            <TabsContent value="platform">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-500">Platform settings coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-500">Platform analytics coming soon</p>
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