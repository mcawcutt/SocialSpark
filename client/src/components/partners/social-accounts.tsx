import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RetailPartner, SocialAccount } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FacebookConnectButton } from "./social-connect-button";
import { Facebook, Instagram, Trash2, Globe, AlertTriangle, RefreshCw, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SocialAccountsProps {
  partner: RetailPartner;
}

export function SocialAccounts({ partner }: SocialAccountsProps) {
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<SocialAccount | null>(null);
  const { toast } = useToast();

  // Fetch social accounts for this partner
  const { 
    data: socialAccounts, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/social-accounts', partner.id],
    queryFn: async () => {
      const response = await fetch(`/api/social-accounts/${partner.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch social accounts');
      }
      return response.json();
    },
    enabled: !!partner.id, // Only run if partner id exists
  });

  // Mutation to delete a social account
  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest('DELETE', `/api/social-accounts/${accountId}`);
      if (!response.ok) {
        throw new Error('Failed to delete social account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts', partner.id] });
      setConfirmDeleteAccount(null);
      toast({
        title: "Account Removed",
        description: "The social media account has been disconnected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Remove Account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to handle delete confirmation
  const handleDeleteConfirm = () => {
    if (confirmDeleteAccount) {
      deleteMutation.mutate(confirmDeleteAccount.id);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook size={20} className="text-blue-600" />;
      case 'instagram':
        return <Instagram size={20} className="text-pink-600" />;
      default:
        return <Globe size={20} className="text-gray-600" />;
    }
  };

  // Get account status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Social Media Accounts</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-4 text-center text-gray-500">
              <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-2" />
              <p>Loading accounts...</p>
            </div>
          ) : error ? (
            <div className="py-4 text-center text-red-500">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
              <p>Error loading social accounts</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : !socialAccounts || socialAccounts.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              <p className="mb-4">No social media accounts connected.</p>
              <div className="flex justify-center gap-3">
                <FacebookConnectButton 
                  partner={partner} 
                  onConnected={() => refetch()}
                />
                {/* Add buttons for other platforms like Instagram later */}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {socialAccounts.map((account: SocialAccount) => (
                  <div 
                    key={account.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <p className="font-medium">{account.platformUsername}</p>
                        <p className="text-sm text-gray-500">{account.platform}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(account.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteAccount(account)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center gap-3 pt-4">
                <FacebookConnectButton 
                  partner={partner} 
                  onConnected={() => refetch()}
                />
                {/* Add buttons for other platforms like Instagram later */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog for Deleting Account */}
      <Dialog open={!!confirmDeleteAccount} onOpenChange={(open) => !open && setConfirmDeleteAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Social Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this {confirmDeleteAccount?.platform} account? 
              Scheduled content will no longer be posted to this account.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteAccount(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Removing...
                </>
              ) : (
                <>Disconnect</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}