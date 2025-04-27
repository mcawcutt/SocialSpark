import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Plus, Check, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

// Brand form schema
const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planType: z.enum(["standard", "premium", "enterprise"]).default("standard"),
});

type BrandFormValues = z.infer<typeof createBrandSchema>;

export default function AdminBrands() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewBrandDialogOpen, setIsNewBrandDialogOpen] = useState(false);
  
  // For testing, use the debug endpoint that doesn't require auth
  // IMPORTANT: In production, this should use /api/admin/brands
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['/api/debug/brands'],
    queryFn: async () => {
      const res = await fetch('/api/debug/brands');
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    },
  });
  
  // Form setup
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      planType: "standard",
    },
  });
  
  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      const res = await apiRequest("POST", "/api/admin/brands", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create brand");
      }
      return res.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      form.reset();
      setIsNewBrandDialogOpen(false);
      
      // Refresh brands list
      queryClient.invalidateQueries({ queryKey: ['/api/debug/brands'] });
      
      toast({
        title: "Brand Created",
        description: "The brand has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brand",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: BrandFormValues) => {
    createBrandMutation.mutate(data);
  };

  // Handle refresh button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/debug/brands'] });
      toast({
        title: "Refreshed",
        description: "Brand list has been refreshed."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh brand list.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle brand status toggle
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await apiRequest("PATCH", `/api/admin/brands/${id}`, {
        active: !currentStatus
      });
      
      if (!res.ok) throw new Error('Failed to update brand status');
      
      // Also invalidate our debug endpoint to refresh the brands list
      queryClient.invalidateQueries({ queryKey: ['/api/debug/brands'] });
      
      toast({
        title: "Status Updated",
        description: `Brand status has been ${!currentStatus ? 'activated' : 'deactivated'}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update brand status.",
        variant: "destructive"
      });
    }
  };

  // Handle brand impersonation
  const handleImpersonate = async (id: number, username?: string) => {
    try {
      console.log(`Impersonating brand ${id} with username ${username || "N/A"}`);
      // Always use the admin impersonation endpoint from the admin brands page
      const res = await apiRequest("POST", `/api/admin/impersonate/${id}`, {});
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Impersonation failed:", errorData);
        throw new Error(`Failed to impersonate brand: ${errorData.message || "Unknown error"}`);
      }
      
      const data = await res.json();
      console.log("Impersonation successful:", data);
      
      // Invalidate user data and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Redirect to brand dashboard
      window.location.href = '/';
      
      toast({
        title: "Impersonating Brand",
        description: data.message || `Successfully impersonating brand`
      });
    } catch (error) {
      console.error("Error during impersonation:", error);
      toast({
        title: "Error",
        description: "Failed to impersonate brand.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Brand Management</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isNewBrandDialogOpen} onOpenChange={setIsNewBrandDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]">
                <Plus className="h-4 w-4 mr-2" />
                New Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Brand</DialogTitle>
                <DialogDescription>
                  Add a new brand to the platform. The brand user will be created automatically.
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
                          <Input
                            placeholder="Dulux Paint"
                            {...field}
                          />
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
                          <Input
                            placeholder="dulux"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The username will be used for login
                        </FormDescription>
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
                          <Input
                            type="email"
                            placeholder="marketing@brand.com"
                            {...field}
                          />
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
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
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
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="plan-standard"
                              value="standard"
                              checked={field.value === "standard"}
                              onChange={() => field.onChange("standard")}
                              className="mr-2"
                            />
                            <label htmlFor="plan-standard">Standard</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="plan-premium"
                              value="premium"
                              checked={field.value === "premium"}
                              onChange={() => field.onChange("premium")}
                              className="mr-2"
                            />
                            <label htmlFor="plan-premium">Premium</label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="plan-enterprise"
                              value="enterprise"
                              checked={field.value === "enterprise"}
                              onChange={() => field.onChange("enterprise")}
                              className="mr-2"
                            />
                            <label htmlFor="plan-enterprise">Enterprise</label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewBrandDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createBrandMutation.isPending}
                      className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]"
                    >
                      {createBrandMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Brands</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <BrandsList 
            brands={brands} 
            isLoading={isLoading}
            onToggleStatus={handleToggleStatus}
            onImpersonate={handleImpersonate}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <BrandsList 
            brands={brands.filter(brand => brand.active !== false)} 
            isLoading={isLoading}
            onToggleStatus={handleToggleStatus}
            onImpersonate={handleImpersonate}
          />
        </TabsContent>
        
        <TabsContent value="inactive">
          <BrandsList 
            brands={brands.filter(brand => brand.active === false)} 
            isLoading={isLoading}
            onToggleStatus={handleToggleStatus}
            onImpersonate={handleImpersonate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Define a simplified brand type
interface Brand {
  id: number;
  name: string;
  email?: string;
  username?: string;
  logo?: string;
  active?: boolean;
  planType?: string;
}

interface BrandsListProps {
  brands: Brand[];
  isLoading: boolean;
  onToggleStatus: (id: number, active: boolean) => void;
  onImpersonate: (id: number, username?: string) => void;
}

function BrandsList({ brands, isLoading, onToggleStatus, onImpersonate }: BrandsListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading brands...</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No brands found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {brands.map((brand) => (
        <Card key={brand.id} className={brand.active === false ? 'opacity-75' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {brand.logo ? (
                    <AvatarImage src={brand.logo} alt={brand.name} />
                  ) : (
                    <AvatarFallback className="text-lg bg-primary/10">
                      {brand.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{brand.name}</h3>
                  <p className="text-sm text-muted-foreground">{brand.email}</p>
                </div>
                <Badge variant={brand.active === false ? 'outline' : 'secondary'} className="ml-4">
                  {brand.planType || 'Standard'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    id={`brand-active-${brand.id}`}
                    checked={brand.active !== false}
                    onCheckedChange={() => onToggleStatus(brand.id, brand.active !== false)}
                  />
                  <Label htmlFor={`brand-active-${brand.id}`} className="text-sm">
                    {brand.active !== false ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500">
                        <X className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </Label>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onImpersonate(brand.id, brand.username)}
                >
                  Login as Brand
                </Button>
                
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}