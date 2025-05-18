import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Facebook, Instagram, Globe, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { SocialAccount } from "@shared/schema";
import { FacebookInviteButton } from "./facebook-invite-button";

interface SocialAccountsProps {
  partnerId: number;
  partnerName: string;
}

export function SocialAccounts({ partnerId, partnerName }: SocialAccountsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<number | null>(null);

  // Query to fetch social accounts for the partner
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery<SocialAccount[]>({
    queryKey: ['/api/social-accounts', partnerId],
    queryFn: () => 
      fetch(`/api/social-accounts/${partnerId}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch social accounts");
          return res.json();
        }),
  });

  // Mutation to delete a social account
  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest('DELETE', `/api/social-accounts/${accountId}`);
    },
    onSuccess: () => {
      toast({
        title: "Account disconnected",
        description: "The social account has been disconnected successfully.",
      });
      // Invalidate the social accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/social-accounts', partnerId] });
      setIsConfirmingDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error disconnecting account",
        description: error.message || "There was an error disconnecting the account.",
        variant: "destructive",
      });
      setIsConfirmingDelete(null);
    },
  });

  // Helper for platform icons
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'google_business':
        return <Globe className="h-5 w-5 text-yellow-600" />;
      default:
        return <Globe className="h-5 w-5 text-gray-600" />;
    }
  };

  // Helper for platform colors
  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return 'bg-blue-100';
      case 'instagram':
        return 'bg-pink-100';
      case 'google_business':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Social Accounts</CardTitle>
          <CardDescription>Manage social media accounts for {partnerName}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Social Accounts</CardTitle>
          <CardDescription>Manage social media accounts for {partnerName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load social accounts: {error instanceof Error ? error.message : "Unknown error"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Social Accounts</CardTitle>
        <CardDescription>Manage social media accounts for {partnerName}</CardDescription>
      </CardHeader>
      <CardContent>
        {accounts && accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getPlatformColor(account.platform)} flex items-center justify-center`}>
                    {getPlatformIcon(account.platform)}
                  </div>
                  <div>
                    <p className="font-medium">{account.accountName}</p>
                    <p className="text-sm text-gray-500 capitalize">{account.platform.replace('_', ' ')}</p>
                  </div>
                </div>
                {isConfirmingDelete === account.id ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(account.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Confirm
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsConfirmingDelete(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsConfirmingDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove account</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-gray-500" />
              </div>
            </div>
            <div>
              <p className="font-medium">No social accounts connected</p>
              <p className="text-gray-500 text-sm">
                Use the buttons below to connect social accounts for this partner.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <FacebookInviteButton 
          partnerId={partnerId}
          partnerName={partnerName}
        />
        <Button variant="outline" disabled>
          <Instagram className="h-4 w-4 mr-2" /> 
          Connect Instagram
        </Button>
        <Button variant="outline" disabled>
          <Globe className="h-4 w-4 mr-2" /> 
          Connect Google Business
        </Button>
      </CardFooter>
    </Card>
  );
}