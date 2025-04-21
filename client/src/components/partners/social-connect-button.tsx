import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RetailPartner } from "@shared/schema";

interface SocialConnectButtonProps {
  partner: RetailPartner;
  onConnected?: () => void;
}

export function FacebookConnectButton({ partner, onConnected }: SocialConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Function to initiate Facebook connection
  const handleConnectFacebook = () => {
    setIsConnecting(true);
    
    // Open Facebook OAuth in a popup window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Store the partner ID in sessionStorage for retrieval after auth
    sessionStorage.setItem('facebookConnectPartnerId', partner.id.toString());
    
    const popup = window.open(
      `/api/auth/facebook?returnTo=/auth/facebook/connect&partnerId=${partner.id}`,
      'facebook-connect',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setIsConnecting(false);
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site and try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Message listener for when the auth is complete
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our own domain
      if (event.origin !== window.location.origin) return;
      
      if (event.data && event.data.type === 'facebook-auth-complete') {
        setIsConnecting(false);
        window.removeEventListener('message', handleMessage);
        
        if (event.data.success) {
          toast({
            title: "Facebook Connected",
            description: `Successfully connected ${partner.name} to Facebook.`,
          });
          
          // Call the onConnected callback
          if (onConnected) onConnected();
        } else {
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect to Facebook.",
            variant: "destructive"
          });
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Timeout after 2 minutes
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      if (isConnecting) {
        setIsConnecting(false);
        toast({
          title: "Connection Timeout",
          description: "The Facebook connection process timed out. Please try again.",
          variant: "destructive"
        });
      }
    }, 120000); // 2 minutes
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      className="flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
      onClick={handleConnectFacebook}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <span className="animate-spin mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </span>
          Connecting...
        </>
      ) : (
        <>
          <Facebook size={16} />
          Connect Facebook
        </>
      )}
    </Button>
  );
}