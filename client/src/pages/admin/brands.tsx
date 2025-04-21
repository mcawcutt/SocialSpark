import { useQuery } from "@tanstack/react-query";
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

export default function AdminBrands() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch brand data from admin endpoint
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['/api/admin/brands'],
    queryFn: async () => {
      const res = await fetch('/api/admin/brands');
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    },
  });

  // Handle refresh button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
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
      
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      
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
  const handleImpersonate = async (id: number) => {
    try {
      const res = await apiRequest("POST", `/api/admin/impersonate/${id}`, {});
      
      if (!res.ok) throw new Error('Failed to impersonate brand');
      
      const data = await res.json();
      
      // Invalidate user data and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Redirect to brand dashboard
      window.location.href = '/';
      
      toast({
        title: "Impersonating Brand",
        description: data.message
      });
    } catch (error) {
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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Brand
          </Button>
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

interface BrandsListProps {
  brands: any[];
  isLoading: boolean;
  onToggleStatus: (id: number, active: boolean) => void;
  onImpersonate: (id: number) => void;
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
                  onClick={() => onImpersonate(brand.id)}
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