import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailPartner } from "@shared/schema";
import { PlusIcon, Search, UserPlus, MoreHorizontal, Facebook, Instagram, Globe, Upload, FileUp } from "lucide-react";
import { BulkUploadDialog } from "@/components/retail-partner/bulk-upload-dialog";
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

// Form schema for adding a new retail partner
const newPartnerSchema = z.object({
  name: z.string().min(1, "Partner name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.string().default("pending"),
  tags: z.array(z.string()).optional(),
});

// Form schema for editing a retail partner
const editPartnerSchema = z.object({
  name: z.string().min(1, "Partner name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.string(),
  footerTemplate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type NewPartnerFormValues = z.infer<typeof newPartnerSchema>;
type EditPartnerFormValues = z.infer<typeof editPartnerSchema>;

export default function RetailPartners() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<RetailPartner | null>(null);
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
  
  // Update a retail partner
  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EditPartnerFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/retail-partners/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/retail-partners"]});
      toast({
        title: "Partner updated",
        description: "The retail partner has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update partner",
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
      tags: [],
    },
  });

  // Create form for editing partner
  const editForm = useForm<EditPartnerFormValues>({
    resolver: zodResolver(editPartnerSchema),
    defaultValues: {
      name: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      status: "",
      footerTemplate: "",
      tags: [],
    },
  });

  // Reset and initialize edit form when selected partner changes
  useEffect(() => {
    if (selectedPartner) {
      // Extract tags from metadata if available
      const tags = selectedPartner.metadata?.tags || [];
      
      editForm.reset({
        name: selectedPartner.name,
        contactEmail: selectedPartner.contactEmail,
        contactPhone: selectedPartner.contactPhone || "",
        address: selectedPartner.address || "",
        status: selectedPartner.status,
        footerTemplate: selectedPartner.footerTemplate || "",
        tags: Array.isArray(tags) ? tags : [],
      });
    }
  }, [selectedPartner, editForm]);

  // Handle new partner form submission
  const onSubmit = (data: NewPartnerFormValues) => {
    // Ensure tags are properly structured in metadata
    const partnerData = {
      ...data,
      metadata: {
        tags: data.tags || []
      }
    };
    createPartnerMutation.mutate(partnerData);
  };
  
  // Handle edit partner form submission
  const onEditSubmit = (data: EditPartnerFormValues) => {
    if (selectedPartner) {
      // Preserve existing metadata and update tags
      const updatedData = {
        ...data,
        metadata: {
          ...selectedPartner.metadata,
          tags: data.tags || []
        }
      };
      updatePartnerMutation.mutate({ 
        id: selectedPartner.id, 
        data: updatedData
      });
    }
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
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
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
                  <Button className="flex items-center bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6] text-white">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Partner
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                      
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input 
                                    placeholder="e.g. outdoor, premium, large" 
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const value = e.currentTarget.value.trim();
                                        const currentTags = field.value || [];
                                        if (value && !currentTags.includes(value)) {
                                          field.onChange([...currentTags, value]);
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </FormControl>
                                <Button 
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const input = document.querySelector('input[placeholder="e.g. outdoor, premium, large"]') as HTMLInputElement;
                                    const value = input?.value.trim();
                                    const currentTags = field.value || [];
                                    if (value && !currentTags.includes(value)) {
                                      field.onChange([...currentTags, value]);
                                      if (input) input.value = '';
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                              
                              {field.value && field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {field.value.map((tag) => (
                                    <div key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-800 py-1 px-2 rounded-md text-sm">
                                      {tag}
                                      <button
                                        type="button" 
                                        onClick={() => {
                                          const newTags = field.value ? field.value.filter((t) => t !== tag) : [];
                                          field.onChange(newTags);
                                        }}
                                        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs text-gray-500 hover:text-gray-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <FormDescription>
                                Press Enter to add multiple tags. These will be used for content targeting.
                              </FormDescription>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createPartnerMutation.isPending}
                          className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]"
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
                                    {partner.metadata?.tags && partner.metadata.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {partner.metadata.tags.map((tag: string) => (
                                          <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
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
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedPartner(partner);
                                      setIsEditDialogOpen(true);
                                    }}>
                                      Edit Partner
                                    </DropdownMenuItem>
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
      
      {/* Edit Partner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Retail Partner</DialogTitle>
            <DialogDescription>
              Update the details for this retail partner.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
              
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="needs_attention">Needs Attention</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="footerTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Footer Template</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter custom footer message that will be added to all content posts shared with this partner. Example: Visit us at 123 Main St or call (555) 555-5555."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      This template will be automatically appended to all content posts shared with this partner.
                    </p>
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="e.g. outdoor, premium, large" 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                const currentTags = field.value || [];
                                if (value && !currentTags.includes(value)) {
                                  field.onChange([...currentTags, value]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const inputs = document.querySelectorAll('input[placeholder="e.g. outdoor, premium, large"]');
                            const input = inputs[inputs.length - 1] as HTMLInputElement;
                            const value = input?.value.trim();
                            const currentTags = field.value || [];
                            if (value && !currentTags.includes(value)) {
                              field.onChange([...currentTags, value]);
                              if (input) input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((tag) => (
                            <div key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-800 py-1 px-2 rounded-md text-sm">
                              {tag}
                              <button
                                type="button" 
                                onClick={() => {
                                  const newTags = field.value ? field.value.filter((t) => t !== tag) : [];
                                  field.onChange(newTags);
                                }}
                                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs text-gray-500 hover:text-gray-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormDescription>
                        Press Enter to add multiple tags. These will be used for content targeting.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updatePartnerMutation.isPending}
                  className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]"
                >
                  {updatePartnerMutation.isPending ? "Saving Changes..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
