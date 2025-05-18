import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Facebook, Instagram } from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";

export default function PartnerConnectSuccess() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const partnerId = searchParams.get('pid');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Get the Facebook pages from the session
  const { data: facebookPages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/facebook-auth/pages'],
    queryFn: async () => {
      const response = await fetch('/api/facebook-auth/pages');
      if (!response.ok) {
        throw new Error('Failed to retrieve Facebook pages');
      }
      return response.json();
    },
  });

  // Get Instagram accounts linked to those pages
  const { data: instagramAccounts, isLoading: isLoadingInstagram } = useQuery({
    queryKey: ['/api/facebook-auth/instagram-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/facebook-auth/instagram-accounts');
      if (!response.ok) {
        throw new Error('Failed to retrieve Instagram accounts');
      }
      return response.json();
    },
    enabled: !!facebookPages && facebookPages.length > 0,
  });

  // Check for partner details
  const { data: partner, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['/api/retail-partners', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const response = await fetch(`/api/retail-partners/${partnerId}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve partner details');
      }
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Combined loading state
  const isLoading = isLoadingPages || isLoadingInstagram || isLoadingPartner;

  return (
    <div className="flex min-h-screen flex-col">
      <MobileNav />
      
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">Social Media Connection</h1>
          
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                {connectionError ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
                {connectionError ? 'Connection Error' : 'Connection Successful'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading connection details...</p>
                </div>
              ) : connectionError ? (
                <div className="text-center py-6">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Connection Error</h3>
                  <p className="text-gray-600 mb-4">{connectionError}</p>
                  <Button
                    onClick={() => window.location.href = '/partner-invites'}
                    variant="outline"
                  >
                    Back to Partner Dashboard
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      {partner?.name || 'Partner'} is now connected
                    </h3>
                    <p className="text-muted-foreground">
                      You've successfully connected your social media accounts. Your brand partner can now schedule and publish content to your pages.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Facebook Pages */}
                    {facebookPages && facebookPages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <SiFacebook className="text-blue-600 mr-2 h-4 w-4" />
                          Connected Facebook Pages
                        </h4>
                        <div className="space-y-2">
                          {facebookPages.map((page: any) => (
                            <div key={page.id} className="p-3 bg-muted/50 rounded-md flex items-center justify-between">
                              <div>
                                <p className="font-medium">{page.name}</p>
                                <p className="text-xs text-muted-foreground">{page.category || 'Facebook Page'}</p>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Instagram Accounts */}
                    {instagramAccounts && instagramAccounts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <SiInstagram className="text-purple-600 mr-2 h-4 w-4" />
                          Connected Instagram Accounts
                        </h4>
                        <div className="space-y-2">
                          {instagramAccounts.map((account: any) => (
                            <div key={account.id} className="p-3 bg-muted/50 rounded-md flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {account.profilePicture && (
                                  <img 
                                    src={account.profilePicture} 
                                    alt={account.username} 
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">@{account.username}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Linked to {account.linkedPageName || 'Facebook Page'}
                                  </p>
                                </div>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {facebookPages?.length === 0 && instagramAccounts?.length === 0 && (
                      <div className="text-center py-6 border border-dashed rounded-md">
                        <p className="text-muted-foreground">No social media accounts were connected.</p>
                      </div>
                    )}
                    
                    <div className="border-t pt-6 flex justify-center">
                      <Button
                        onClick={() => window.location.href = '/'}
                        variant="default"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}