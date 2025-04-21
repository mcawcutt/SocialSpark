import { useState, useEffect } from "react";
import { Facebook, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SocialConnectButtonProps {
  partnerId: number;
  platform: "facebook"; // Can add more platforms later
  onSuccess?: () => void;
}

// Facebook SDK initialization
function initFacebookSDK() {
  return new Promise<void>((resolve) => {
    // If the SDK is already loaded, resolve immediately
    if (window.FB) {
      resolve();
      return;
    }

    // Add the Facebook SDK
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Once the script loads, initialize the SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: "1401999351158118", // This is our Facebook App ID
        cookie: true,
        xfbml: true,
        version: "v18.0"
      });
      resolve();
    };
  });
}

export function SocialConnectButton({ partnerId, platform, onSuccess }: SocialConnectButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);

  // Initialize Facebook SDK on component mount
  useEffect(() => {
    if (platform === "facebook") {
      initFacebookSDK().then(() => {
        setIsSdkReady(true);
      }).catch(error => {
        console.error("Failed to initialize Facebook SDK:", error);
        toast({
          title: "Facebook SDK Error",
          description: "Failed to initialize Facebook integration. Please try again later.",
          variant: "destructive",
        });
      });
    }
  }, [platform, toast]);

  const handleFacebookConnect = async () => {
    if (!isSdkReady) {
      toast({
        title: "Facebook integration not ready",
        description: "Please wait for Facebook integration to initialize and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Trigger Facebook login
      window.FB.login(async (response) => {
        if (response.authResponse) {
          try {
            // Got Facebook auth response, now get extended permissions for pages
            const pagePermissionsResponse = await new Promise((resolve) => {
              window.FB.login((loginResponse) => {
                resolve(loginResponse);
              }, { 
                scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
                auth_type: 'rerequest'
              });
            });
            
            if (!pagePermissionsResponse.authResponse) {
              throw new Error("Failed to get page permissions");
            }
            
            // Get user profile info
            const profile = await new Promise((resolve, reject) => {
              window.FB.api('/me', (userRes) => {
                if (!userRes || userRes.error) {
                  reject(new Error("Failed to get user profile"));
                } else {
                  resolve(userRes);
                }
              });
            });
            
            // Store auth data temporarily in session
            await apiRequest('POST', '/api/social/store-facebook-auth', {
              profile,
              accessToken: response.authResponse.accessToken,
            });
            
            // Get user pages
            const pagesResponse = await new Promise((resolve, reject) => {
              window.FB.api('/me/accounts', (pagesRes) => {
                if (!pagesRes || pagesRes.error) {
                  reject(new Error("Failed to get pages"));
                } else {
                  resolve(pagesRes);
                }
              });
            });
            
            if (!pagesResponse.data || pagesResponse.data.length === 0) {
              throw new Error("No Facebook pages found. You need to have admin access to at least one Facebook page.");
            }
            
            // For this example, we'll use the first page
            // In a real app, you might show a selection UI
            const page = pagesResponse.data[0];
            
            // Create the social account in our system
            const newAccount = await apiRequest('POST', '/api/social-accounts', {
              partnerId,
              platform: "facebook",
              platformId: page.id,
              platformUsername: page.name,
              accessToken: page.access_token,
              status: "active",
              metadata: {
                scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
                expiresIn: response.authResponse.expiresIn,
                category: page.category
              }
            });
            
            toast({
              title: "Facebook page connected",
              description: `Successfully connected ${page.name} to this partner.`,
            });
            
            if (onSuccess) {
              onSuccess();
            }
            
          } catch (error) {
            console.error("Error during Facebook connection:", error);
            toast({
              title: "Connection failed",
              description: error.message || "Failed to connect Facebook account",
              variant: "destructive",
            });
          }
        } else {
          console.log('User cancelled login or did not fully authorize.');
          toast({
            title: "Facebook connection cancelled",
            description: "You cancelled the Facebook authorization or didn't provide the required permissions.",
          });
        }
        setIsLoading(false);
      }, { scope: 'email,public_profile' });
      
    } catch (error) {
      console.error("Facebook connection error:", error);
      toast({
        title: "Connection error",
        description: "An error occurred while connecting to Facebook. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (platform === "facebook") {
    return (
      <Button 
        onClick={handleFacebookConnect} 
        disabled={isLoading || !isSdkReady}
        variant="outline"
        className={isLoading ? "bg-gray-100" : ""}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
        )}
        Connect Facebook
      </Button>
    );
  }

  // Default fallback - should not happen
  return null;
}