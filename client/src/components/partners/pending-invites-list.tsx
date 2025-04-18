import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Trash2, 
  Clock, 
  RefreshCw, 
  Loader2, 
  ExternalLink, 
  UserPlus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface PendingInvite {
  token: string;
  email: string;
  name: string;
  expiresAt: string;
}

export function PendingInvitesList() {
  const { toast } = useToast();
  const [cancelToken, setCancelToken] = useState<string | null>(null);
  
  // Query to get all pending invitations
  const { data: invites, isLoading, error } = useQuery<PendingInvite[]>({
    queryKey: ["/api/invites"],
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Mutation to cancel an invitation
  const cancelInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      await apiRequest("DELETE", `/api/invites/${token}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling invitation",
        description: error.message || "There was an error cancelling the invitation.",
        variant: "destructive",
      });
    },
  });
  
  // Handle cancellation of an invitation
  const handleCancelInvite = (token: string) => {
    setCancelToken(null);
    cancelInviteMutation.mutate(token);
  };
  
  // Check if an invitation has expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500">Error loading invitations: {(error as Error).message}</p>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/invites"] })}
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  if (!invites || invites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <UserPlus className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <h3 className="text-lg font-medium">No pending invitations</h3>
        <p className="mt-2">When you invite new partners, they'll appear here.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Pending Invitations</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {invites.map((invite) => (
          <Card key={invite.token} className={isExpired(invite.expiresAt) ? "opacity-70" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{invite.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    <span className="block">{invite.email}</span>
                  </CardDescription>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-red-500"
                            onClick={() => setCancelToken(invite.token)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel the invitation sent to {invite.email}?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCancelToken(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleCancelInvite(invite.token)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Yes, cancel invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancel invitation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  {isExpired(invite.expiresAt) ? (
                    "Expired on "
                  ) : (
                    "Expires on "
                  )}
                  {format(new Date(invite.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2">
              <div className="flex justify-between items-center w-full">
                <Badge variant={isExpired(invite.expiresAt) ? "outline" : "default"}>
                  {isExpired(invite.expiresAt) ? "Expired" : "Pending"}
                </Badge>
                
                {!isExpired(invite.expiresAt) && (
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Resend
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}