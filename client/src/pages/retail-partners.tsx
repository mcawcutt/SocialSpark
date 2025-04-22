import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailPartner } from "@shared/schema";
import { Link } from "wouter";
import * as XLSX from 'xlsx';
import { AddPartnerForm } from "@/components/retail-partners/add-partner-form";
import { 
  PlusIcon, 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Facebook, 
  Instagram, 
  Globe,
  Upload,
  FileText,
  Loader2
} from "lucide-react";
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

// Define schema for CSV import
const csvImportSchema = z.object({
  file: z.instanceof(File, { message: "A CSV file is required" })
});

type CSVImportFormValues = z.infer<typeof csvImportSchema>;

export default function RetailPartners() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<RetailPartner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Import useAuth hook to check if user is authenticated
  const { user } = useAuth();
  
  // Determine which endpoint to use based on authentication status
  const partnersEndpoint = user ? "/api/retail-partners" : "/api/demo/retail-partners";
  const tagsEndpoint = user ? "/api/retail-partners/tags" : "/api/demo/retail-partners/tags";
  
  console.log(`[RetailPartners] Using endpoint: ${partnersEndpoint}, user: ${user?.username || 'not authenticated'}`);
  
  // Fetch retail partners
  const { data: partners, isLoading } = useQuery({
    queryKey: [partnersEndpoint],
  });
  
  // Fetch all available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: [tagsEndpoint],
  });

  // Create a new retail partner
  const createPartnerMutation = useMutation({
    mutationFn: async (data: NewPartnerFormValues) => {
      // Determine which endpoint to use based on authentication
      const endpoint = user 
        ? "/api/retail-partners" 
        : "/api/demo/retail-partners/bulk";
      
      // Format data differently based on endpoint
      const requestData = user
        ? { 
            ...data, 
            brandId: user.brandId || user.id,
            metadata: { tags: data.tags || [] } 
          }
        : { partners: [{ ...data, metadata: { tags: data.tags || [] } }] };
      
      console.log(`[CreatePartner] Using endpoint: ${endpoint}, user: ${user?.username || 'not authenticated'}`);
      
      const res = await apiRequest("POST", endpoint, requestData);
      
      // Check if the response is ok before parsing as JSON
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response from server:", errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      try {
        return await res.json();
      } catch (err) {
        console.error("Error parsing response as JSON:", err);
        throw new Error("Could not parse server response as JSON");
      }
    },
    onSuccess: (data) => {
      // Invalidate both query keys to ensure data is fresh
      queryClient.invalidateQueries({queryKey: [partnersEndpoint]});
      queryClient.invalidateQueries({queryKey: [tagsEndpoint]});
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
      // Determine endpoint based on authentication status
      const baseEndpoint = user 
        ? "/api/retail-partners" 
        : "/api/demo/retail-partners";
      
      console.log(`[UpdateStatus] Using endpoint: ${baseEndpoint}/${id}, user: ${user?.username || 'not authenticated'}`);
      
      const res = await apiRequest("PATCH", `${baseEndpoint}/${id}`, { status });
      
      // Check if the response is ok before parsing as JSON
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response from server:", errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      try {
        return await res.json();
      } catch (err) {
        console.error("Error parsing response as JSON:", err);
        throw new Error("Could not parse server response as JSON");
      }
    },
    onSuccess: () => {
      // Invalidate both query keys to ensure data is fresh
      queryClient.invalidateQueries({queryKey: [partnersEndpoint]});
      queryClient.invalidateQueries({queryKey: [tagsEndpoint]});
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
      // Determine endpoint based on authentication status
      const baseEndpoint = user 
        ? "/api/retail-partners" 
        : "/api/demo/retail-partners";
      
      console.log(`[UpdatePartner] Using endpoint: ${baseEndpoint}/${id}, user: ${user?.username || 'not authenticated'}`);
      
      const res = await apiRequest("PATCH", `${baseEndpoint}/${id}`, data);
      
      // Check if the response is ok before parsing as JSON
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response from server:", errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      try {
        return await res.json();
      } catch (err) {
        console.error("Error parsing response as JSON:", err);
        throw new Error("Could not parse server response as JSON");
      }
    },
    onSuccess: () => {
      // Invalidate both query keys to ensure data is fresh
      queryClient.invalidateQueries({queryKey: [partnersEndpoint]});
      queryClient.invalidateQueries({queryKey: [tagsEndpoint]});
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
      try {
        // Prepare the metadata separately
        const metadata = {
          ...((selectedPartner.metadata || {}) as object), // Cast to object to avoid TypeScript errors
          tags: data.tags || []
        };
        
        // Ensure we're sending a clean object with expected properties
        const updatedData = {
          name: data.name,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone || "",
          address: data.address || "",
          status: data.status,
          footerTemplate: data.footerTemplate || "",
          metadata
        };
        
        console.log("Submitting updated partner data:", updatedData);
        
        updatePartnerMutation.mutate({ 
          id: selectedPartner.id, 
          data: updatedData
        });
      } catch (err) {
        console.error("Error preparing data for submission:", err);
        toast({
          title: "Submission Error",
          description: "There was a problem preparing your data for submission.",
          variant: "destructive"
        });
      }
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
  
  // Parse file and create preview data
  const handleFilePreview = async (file: File) => {
    try {
      let partners = [];

      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        // Handle CSV file
        partners = await parseCSVFile(file);
      } else if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Handle Excel file
        partners = await parseExcelFile(file);
      } else {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV or Excel (.xlsx) file",
          variant: "destructive"
        });
        return;
      }
      
      setPreviewData(partners);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "File parsing error",
        description: error.message || "There was an error parsing the file",
        variant: "destructive"
      });
    }
  };

  // Parse CSV file
  const parseCSVFile = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const rows = text.split('\n');
    
    // Skip header row
    if (rows.length < 2) {
      throw new Error("The file must contain a header row and at least one data row");
    }
    
    const header = rows[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = header.indexOf('name');
    const emailIndex = header.indexOf('email');
    const phoneIndex = header.indexOf('phone');
    const addressIndex = header.indexOf('address');
    const tagsIndex = header.indexOf('tags');
    
    if (nameIndex === -1 || emailIndex === -1) {
      throw new Error("The file must contain 'Name' and 'Email' columns");
    }
    
    const partners = [];
    
    // Start from index 1 to skip header
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      // Handle quoted values with commas inside
      const processRow = (row: string) => {
        const result = [];
        let insideQuote = false;
        let currentValue = '';
        
        for (let j = 0; j < row.length; j++) {
          const char = row[j];
          
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            result.push(currentValue);
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Add the last value
        result.push(currentValue);
        return result;
      };
      
      const values = processRow(rows[i]);
      
      // Extract tags if they exist
      let tags: string[] = [];
      if (tagsIndex !== -1 && values[tagsIndex]) {
        const tagString = values[tagsIndex].replace(/"/g, '').trim();
        tags = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
      }
      
      const partner = {
        name: values[nameIndex].replace(/"/g, '').trim(),
        contactEmail: values[emailIndex].replace(/"/g, '').trim(),
        contactPhone: phoneIndex !== -1 ? values[phoneIndex].replace(/"/g, '').trim() : '',
        address: addressIndex !== -1 ? values[addressIndex].replace(/"/g, '').trim() : '',
        status: 'pending',
        metadata: { tags }
      };
      
      // Validate partner data
      if (partner.name && partner.contactEmail.includes('@')) {
        partners.push(partner);
      }
    }
    
    return partners;
  };

  // Parse Excel file
  const parseExcelFile = async (file: File): Promise<any[]> => {
    // Use xlsx library to read the Excel file
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length < 2) {
      throw new Error("The Excel file must contain a header row and at least one data row");
    }
    
    // Get header row and find column indexes
    const header = (rows[0] as string[]).map(h => h.toString().trim().toLowerCase());
    const nameIndex = header.indexOf('name');
    const emailIndex = header.indexOf('email');
    const phoneIndex = header.indexOf('phone');
    const addressIndex = header.indexOf('address');
    const tagsIndex = header.indexOf('tags');
    
    if (nameIndex === -1 || emailIndex === -1) {
      throw new Error("The Excel file must contain 'Name' and 'Email' columns");
    }
    
    const partners = [];
    
    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      if (!row || row.length === 0) continue; // Skip empty rows
      
      // Extract tags if they exist
      let tags: string[] = [];
      if (tagsIndex !== -1 && row[tagsIndex]) {
        const tagString = row[tagsIndex].toString().trim();
        tags = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
      }
      
      const partner = {
        name: row[nameIndex]?.toString().trim() || '',
        contactEmail: row[emailIndex]?.toString().trim() || '',
        contactPhone: phoneIndex !== -1 && row[phoneIndex] ? row[phoneIndex].toString().trim() : '',
        address: addressIndex !== -1 && row[addressIndex] ? row[addressIndex].toString().trim() : '',
        status: 'pending',
        metadata: { tags }
      };
      
      // Validate partner data
      if (partner.name && partner.contactEmail.includes('@')) {
        partners.push(partner);
      }
    }
    
    return partners;
  };
  
  // Create bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (partners: any[]) => {
      // Determine endpoint based on authentication status
      const bulkEndpoint = user 
        ? "/api/retail-partners/bulk" 
        : "/api/demo/retail-partners/bulk";
      
      console.log(`[BulkImport] Using endpoint: ${bulkEndpoint}, user: ${user?.username || 'not authenticated'}`);
      
      // Add brandId to each partner if authenticated to ensure they're assigned to the right brand
      const partnersWithBrandId = partners.map(partner => {
        if (user) {
          // Use either the impersonated brandId or the user's id as the brand
          return {
            ...partner,
            brandId: user.brandId || user.id
          };
        }
        return partner;
      });
      
      const res = await apiRequest("POST", bulkEndpoint, { partners: partnersWithBrandId });
      
      // Check if the response is ok before parsing as JSON
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response from server:", errorText);
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      try {
        return await res.json();
      } catch (err) {
        console.error("Error parsing response as JSON:", err);
        throw new Error("Could not parse server response as JSON");
      }
    },
    onSuccess: () => {
      // Invalidate the correct queries based on authentication
      queryClient.invalidateQueries({queryKey: [partnersEndpoint]});
      queryClient.invalidateQueries({queryKey: [tagsEndpoint]});
      toast({
        title: "Partners imported",
        description: `${previewData.length} retail partners have been imported successfully.`,
      });
      setIsBulkDialogOpen(false);
      setCsvFile(null);
      setPreviewData([]);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle bulk import button click
  const handleBulkImport = async () => {
    if (previewData.length === 0) return;
    
    setIsUploading(true);
    try {
      await bulkImportMutation.mutateAsync(previewData);
    } catch (error) {
      console.error("Error importing partners:", error);
    } finally {
      setIsUploading(false);
    }
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
              <AddPartnerForm />
              
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Bulk Import Retail Partners</DialogTitle>
                    <DialogDescription>
                      Upload a CSV or Excel (.xlsx) file with retail partner information to add multiple partners at once.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex flex-col gap-4 py-4">
                    <div 
                      className={`relative border-2 border-dashed rounded-lg p-8 transition-colors text-center ${
                        isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
                      }`}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        
                        const file = e.dataTransfer.files[0];
                        if (file && (file.type === 'text/csv' || file.name.endsWith('.csv') || 
                                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                                    file.name.endsWith('.xlsx'))) {
                          setCsvFile(file);
                          handleFilePreview(file);
                        } else {
                          toast({
                            title: "Invalid file format",
                            description: "Please upload a CSV or Excel (.xlsx) file",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <input
                        type="file"
                        id="csv-upload"
                        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCsvFile(file);
                            handleFilePreview(file);
                          }
                        }}
                      />
                      
                      {csvFile ? (
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <FileText className="h-10 w-10 text-primary" />
                          </div>
                          <p className="text-lg font-medium">{csvFile.name}</p>
                          <p className="text-sm text-gray-500">{Math.round(csvFile.size / 1024)} KB</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setCsvFile(null);
                              setPreviewData([]);
                            }}
                            className="mt-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {isDragging ? "Drop your file here" : "Upload a CSV or Excel file"}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Drag and drop or click to browse
                          </p>
                          <p className="mt-2 text-xs text-gray-400">
                            Required columns: name, email (optional: phone, address, tags)
                          </p>
                          <div className="mt-2 flex flex-col xs:flex-row justify-center gap-2 text-xs">
                            <a
                              href="#"
                              className="text-primary font-medium inline-block"
                              onClick={(e) => {
                                e.preventDefault();
                                const csvContent = "Name,Email,Phone,Address,Tags\nExample Store,store@example.com,555-123-4567,\"123 Main St, City, State\",\"retail,downtown,example\"";
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'partner_import_template.csv';
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              }}
                            >
                              Download CSV template
                            </a>
                            <a
                              href="#"
                              className="text-primary font-medium inline-block"
                              onClick={(e) => {
                                e.preventDefault();
                                // Create a workbook with a worksheet
                                const wb = XLSX.utils.book_new();
                                const wsData = [
                                  ['Name', 'Email', 'Phone', 'Address', 'Tags'],
                                  ['Example Store', 'store@example.com', '555-123-4567', '123 Main St, City, State', 'retail,downtown,example']
                                ];
                                const ws = XLSX.utils.aoa_to_sheet(wsData);
                                XLSX.utils.book_append_sheet(wb, ws, 'Partners');
                                
                                // Generate Excel file and trigger download
                                XLSX.writeFile(wb, 'partner_import_template.xlsx');
                              }}
                            >
                              Download Excel template
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {previewData.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium text-sm mb-2">Preview ({previewData.length} partners)</h3>
                        <div className="border rounded-md overflow-auto max-h-[200px]">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.slice(0, 5).map((row, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 text-xs">{row.name || '-'}</td>
                                  <td className="px-3 py-2 text-xs">{row.contactEmail || '-'}</td>
                                  <td className="px-3 py-2 text-xs">{row.contactPhone || '-'}</td>
                                </tr>
                              ))}
                              {previewData.length > 5 && (
                                <tr>
                                  <td colSpan={3} className="px-3 py-2 text-xs text-center text-gray-500">
                                    ...and {previewData.length - 5} more
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsBulkDialogOpen(false);
                          setCsvFile(null);
                          setPreviewData([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="bg-[#e03eb6] hover:bg-[#e03eb6]/90 border-[#e03eb6]"
                        disabled={!csvFile || isUploading || previewData.length === 0}
                        onClick={handleBulkImport}
                      >
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import {previewData.length} Partners
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
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
                                          
                                          // Invalidate tags cache if adding a new tag that doesn't exist
                                          if (!availableTags.includes(value)) {
                                            queryClient.invalidateQueries({queryKey: ["/api/demo/retail-partners/tags"]});
                                          }
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
                                      
                                      // Invalidate tags cache if adding a new tag that doesn't exist
                                      if (!availableTags.includes(value)) {
                                        queryClient.invalidateQueries({queryKey: ["/api/demo/retail-partners/tags"]});
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                              
                              {/* Show existing tags from other partners as suggestions */}
                              {availableTags.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {availableTags
                                      .filter(tag => {
                                        const currentTags = field.value || [];
                                        return !currentTags.includes(tag);
                                      })
                                      .map((tag, i) => (
                                        <Badge 
                                          key={i} 
                                          variant="outline"
                                          className="cursor-pointer hover:bg-gray-100"
                                          onClick={() => {
                                            const currentTags = field.value || [];
                                            field.onChange([...currentTags, tag]);
                                          }}
                                        >
                                          + {tag}
                                        </Badge>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                              
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
                                    <Link href={`/retail-partners/${partner.id}`}>
                                      <p className="font-medium text-gray-800 hover:text-primary hover:underline cursor-pointer">{partner.name}</p>
                                    </Link>
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
                                    <Link href={`/retail-partners/${partner.id}`}>
                                      <DropdownMenuItem>
                                        View Details
                                      </DropdownMenuItem>
                                    </Link>
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
                                  
                                  // Invalidate tags cache if adding a new tag that doesn't exist
                                  if (!availableTags.includes(value)) {
                                    queryClient.invalidateQueries({queryKey: ["/api/demo/retail-partners/tags"]});
                                  }
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
                              
                              // Invalidate tags cache if adding a new tag that doesn't exist
                              if (!availableTags.includes(value)) {
                                queryClient.invalidateQueries({queryKey: ["/api/demo/retail-partners/tags"]});
                              }
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      
                      {/* Show existing tags from other partners as suggestions */}
                      {availableTags.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {availableTags
                              .filter(tag => {
                                const currentTags = field.value || [];
                                return !currentTags.includes(tag);
                              })
                              .map((tag, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline"
                                  className="cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    const currentTags = field.value || [];
                                    field.onChange([...currentTags, tag]);
                                  }}
                                >
                                  + {tag}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
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
