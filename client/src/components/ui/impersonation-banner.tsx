import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ImpersonationBanner() {
  const { toast } = useToast();
  
  const endImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/end-impersonation", {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Could not end impersonation session");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Clear cached data and reset user state
      queryClient.setQueryData(["/api/user"], null);
      queryClient.refetchQueries({ queryKey: ["/api/user"] });
      
      // Navigate to admin dashboard
      window.location.href = "/admin/dashboard";
      
      toast({
        title: "Returned to admin account",
        description: "You are no longer impersonating a brand.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error ending impersonation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleEndImpersonation = () => {
    endImpersonationMutation.mutate();
  };
  
  return (
    <Alert variant="destructive" className="mb-4 border-red-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Admin Impersonation Mode</AlertTitle>
      <div className="flex justify-between items-center">
        <AlertDescription>
          You are currently impersonating this brand account.
        </AlertDescription>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleEndImpersonation}
          disabled={endImpersonationMutation.isPending}
        >
          {endImpersonationMutation.isPending ? "Returning..." : "Return to Admin"}
        </Button>
      </div>
    </Alert>
  );
}