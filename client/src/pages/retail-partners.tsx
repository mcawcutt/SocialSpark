import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailPartner } from "@shared/schema";
import { PlusIcon, Search, UserPlus, MoreHorizontal, Facebook, Instagram, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Form schema for adding a new retail partner
const newPartnerSchema = z.object({
  name: z.string().min(1, "Partner name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.string().default("pending"),
});

type NewPartnerFormValues = z.infer<typeof newPartnerSchema>;

export default function RetailPartners() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch retail partners
  const { data: partners, isLoading } = useQuery({
    queryKey: ["/api/retail-partners"],
  });

  // Create a new retail partner
  const createPartnerMutation = useMutation({
    mutationFn: async (data: NewPartnerFormValues) => {
      const res = await apiRequest("POST", "/api/retail-partners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/retail-partners"]});
      toast({
        title: "Partner added",
        description: "The retail partner has been added successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to add partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update a retail partner status
  const updatePartnerStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/retail-partners/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/retail-partners"]});
      toast({
        title: "Status updated",
        description: "The partner status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create form for new partner
  const form = useForm<NewPartnerFormValues>({
    resolver: zodResolver(newPartnerSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      status: "pending",
    },
  });

  // Handle form submission
  const onSubmit = (data: NewPartnerFormValues) => {
    createPartnerMutation.mutate(data);
  };

  // Filter partners by search term and status
  const filteredPartners = partners?.filter((partner: RetailPartner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        partner.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || partner.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Get partners count by status
  const getStatusCount = (status: string) => {
    if (!partners) return 0;
    return partners.filter((partner: RetailPartner) => partner.status === status).length;
  };

  // Get initials from partner name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

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
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileNav />
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Retail Partners</h1>
              <p className="text-gray-500">Manage your connections with retail partners</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search partners..." 
                  className="pl-10 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Partner
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Retail Partner</DialogTitle>
                    <DialogDescription>
                      Add details for your new retail partner. They'll receive an invitation to connect.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Partner Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter retail partner name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter contact email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter contact phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createPartnerMutation.isPending}
                        >
                          {createPartnerMutation.isPending ? "Sending Invitation..." : "Send Invitation"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Partner Tabs */}
          <Tabs defaultValue="all" onValueChange={setFilterStatus}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all">
                All Partners <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{partners?.length || 0}</span>
              </TabsTrigger>
              <TabsTrigger value="active">
                Active <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{getStatusCount('active')}</span>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{getStatusCount('pending')}</span>
              </TabsTrigger>
              <TabsTrigger value="needs_attention">
                Needs Attention <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{getStatusCount('needs_attention')}</span>
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{getStatusCount('inactive')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filterStatus}>
              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle>Partner List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading partners...</div>
                  ) : filteredPartners.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm 
                        ? "No partners match your search criteria" 
                        : "No partners found. Invite a retail partner to get started."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-gray-500 text-sm">
                            <th className="px-6 py-3 bg-gray-50 font-medium">Partner</th>
                            <th className="px-6 py-3 bg-gray-50 font-medium">Contact</th>
                            <th className="px-6 py-3 bg-gray-50 font-medium">Connected Accounts</th>
                            <th className="px-6 py-3 bg-gray-50 font-medium">Status</th>
                            <th className="px-6 py-3 bg-gray-50 font-medium">Connection Date</th>
                            <th className="px-6 py-3 bg-gray-50 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPartners.map((partner: RetailPartner) => (
                            <tr key={partner.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                                    {getInitials(partner.name)}
                                  </div>
                                  <div className="ml-3">
                                    <p className="font-medium text-gray-800">{partner.name}</p>
                                    <p className="text-gray-500 text-sm">{partner.address || "No address provided"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-gray-800">{partner.contactEmail}</p>
                                <p className="text-gray-500 text-sm">{partner.contactPhone || "No phone provided"}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex space-x-2">
                                  {/* Placeholder for connected accounts - in real app, you'd dynamically render based on connected accounts */}
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Facebook className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                    <Instagram className="h-4 w-4 text-pink-600" />
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Globe className="h-4 w-4 text-yellow-600" />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    partner.status === 'active' ? 'bg-green-500' :
                                    partner.status === 'pending' ? 'bg-yellow-500' :
                                    partner.status === 'needs_attention' ? 'bg-red-500' :
                                    'bg-gray-300'
                                  }`}></div>
                                  <span className="capitalize">{partner.status.replace('_', ' ')}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {formatDate(partner.connectionDate?.toString())}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-5 w-5" />
                                      <span className="sr-only">Actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuItem>Edit Partner</DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updatePartnerStatusMutation.mutate({ 
                                        id: partner.id, 
                                        status: partner.status === 'active' ? 'inactive' : 'active' 
                                      })}
                                    >
                                      {partner.status === 'active' ? 'Deactivate' : 'Activate'} Partner
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Resend Invitation</DropdownMenuItem>
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}
