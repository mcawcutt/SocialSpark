import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailPartner } from "@shared/schema";
import { 
  ArrowLeft, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Calendar, 
  RefreshCw, 
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SocialAccounts } from "@/components/partners/social-accounts";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function PartnerDetail() {
  const [, params] = useRoute("/retail-partners/:id");
  const partnerId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  // Fetch partner details
  const { 
    data: partner, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/demo/retail-partners', partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/demo/retail-partners/${partnerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch partner details');
      }
      return response.json();
    },
    enabled: !!partnerId, // Only run if partner id exists
  });

  // Format date function
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return "Invalid date";
    }
  };

  // Get partner initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MobileNav />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center">
              <Link href="/retail-partners">
                <Button variant="ghost" size="icon" className="mr-4">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="ml-4 h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="flex min-h-screen flex-col">
        <MobileNav />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error Loading Partner</h2>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : "Failed to load partner details"}
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/retail-partners">
                  <Button>
                    Back to Partners
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MobileNav />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            <Link href="/retail-partners">
              <Button variant="ghost" size="icon" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {getInitials(partner.name)}
              </div>
              <h1 className="ml-3 text-xl font-bold">{partner.name}</h1>
            </div>
            <div className="ml-auto">
              <Link href={`/retail-partners/edit/${partner.id}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Partner
                </Button>
              </Link>
            </div>
          </div>

          {/* Main content */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Partner Info Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Partner Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Building className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Business Name</p>
                      <p className="font-medium">{partner.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{partner.contactEmail || "Not provided"}</p>
                    </div>
                  </div>
                  
                  {partner.contactPhone && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{partner.contactPhone}</p>
                      </div>
                    </div>
                  )}
                  
                  {partner.address && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{partner.address}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Connected Since</p>
                      <p className="font-medium">{formatDate(partner.connectionDate)}</p>
                    </div>
                  </div>
                  
                  {partner.metadata?.tags && partner.metadata.tags.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-gray-500 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {partner.metadata.tags.map((tag: string) => (
                          <span 
                            key={tag} 
                            className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Social Accounts */}
            <div>
              <SocialAccounts partner={partner} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}