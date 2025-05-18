import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiFacebook } from "react-icons/si";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  Loader2,
  Building,
  Tag,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialAccounts } from "@/components/partners/social-accounts";
import { RetailPartner } from "@shared/schema";
import { formatDate } from "@/lib/utils";

export default function PartnerDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const parsedId = parseInt(id);

  // Query for partner details
  const {
    data: partner,
    isLoading,
    error,
  } = useQuery<RetailPartner>({
    queryKey: [`/api/demo/retail-partners/${id}`],
    queryFn: () => 
      fetch(`/api/demo/retail-partners/${id}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch partner details");
          return res.json();
        }),
    enabled: !isNaN(parsedId),
  });

  // Redirect if ID is invalid
  useEffect(() => {
    if (isNaN(parsedId)) {
      navigate("/retail-partners");
    }
  }, [parsedId, navigate]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'needs_attention':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-3xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load partner details: {error instanceof Error ? error.message : "Partner not found"}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => navigate("/retail-partners")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button and header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <Button variant="ghost" className="mb-4 px-0" onClick={() => navigate("/retail-partners")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>
          <h1 className="text-3xl font-bold">{partner.name}</h1>
          <Badge className={`mt-2 ${getStatusColor(partner.status)}`}>
            {partner.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="mt-4 md:mt-0 space-x-2 flex items-center">
          <Button variant="outline">Edit Partner</Button>
          <Button variant="secondary">Schedule Content</Button>
          <Button 
            className="bg-[#1877F2] hover:bg-[#0d6efd] text-white flex items-center gap-1.5"
            onClick={() => setActiveTab("social")}
          >
            <SiFacebook className="h-4 w-4 text-white" />
            Connect Social Accounts
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="social">Social Accounts</TabsTrigger>
          <TabsTrigger value="content">Content History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Partner Information</CardTitle>
                <CardDescription>Basic information about the partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Contact Person</p>
                    <p className="text-gray-600">{partner.contactName || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">{partner.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">{partner.contactPhone || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">{partner.address || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Store Type</p>
                    <p className="text-gray-600">{partner.storeType || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Connected Since</p>
                    <p className="text-gray-600">{formatDate(partner.connectionDate?.toString())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
                <CardDescription>More information about this partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Tags</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {partner.metadata?.tags && partner.metadata.tags.length > 0 ? (
                        partner.metadata.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="font-normal">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-600">No tags</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Template */}
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Footer Template</p>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                      {partner.footerTemplate ? (
                        <p className="text-gray-600 whitespace-pre-line">{partner.footerTemplate}</p>
                      ) : (
                        <p className="text-gray-500 italic">No footer template specified</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      This template is automatically appended to content posts shared with this partner.
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Notes</p>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border min-h-[80px]">
                      {partner.notes ? (
                        <p className="text-gray-600 whitespace-pre-line">{partner.notes}</p>
                      ) : (
                        <p className="text-gray-500 italic">No notes</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Accounts Tab */}
        <TabsContent value="social">
          <SocialAccounts partnerId={partner.id} partnerName={partner.name} />
        </TabsContent>

        {/* Content History Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content History</CardTitle>
              <CardDescription>Posts scheduled or shared with this partner</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
                <p className="font-medium mt-3">No content history</p>
                <p className="text-gray-500">
                  This partner hasn't received any content yet.
                </p>
                <Button className="mt-4">Schedule Content</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Performance metrics for content shared with this partner</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-gray-500" />
                  </div>
                </div>
                <p className="font-medium mt-3">No analytics available</p>
                <p className="text-gray-500">
                  Analytics will be available once content has been shared.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}