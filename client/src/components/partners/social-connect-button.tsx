import { useState, useEffect } from "react";
import { Facebook, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface SocialConnectButtonProps {
  partnerId: number;
  platform: "facebook"; // Can add more platforms later
  onSuccess?: () => void;
}

// Facebook SDK initialization
function initFacebookSDK() {
  return new Promise<void>((resolve, reject) => {
    try {
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
      script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
      document.body.appendChild(script);

      // Once the script loads, initialize the SDK
      window.fbAsyncInit = function() {
        try {
          window.FB.init({
            appId: "1401999351158118", // This is our Facebook App ID
            cookie: true,
            xfbml: true,
            version: "v18.0"
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      // Set a timeout in case the script never loads
      setTimeout(() => {
        if (!window.FB) {
          reject(new Error("Timed out waiting for Facebook SDK"));
        }
      }, 10000);
    } catch (error) {
      reject(error);
    }
  });
}

export function SocialConnectButton({ partnerId, platform, onSuccess }: SocialConnectButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const [isDemoConnecting, setIsDemoConnecting] = useState(false);
  const [isDemo] = useState(() => {
    // Check if we're in a demo/development environment
    return window.location.hostname.includes('replit.dev') || 
           window.location.hostname.includes('localhost') ||
           window.location.hostname.includes('127.0.0.1');
  });

  // Initialize Facebook SDK on component mount
  useEffect(() => {
    if (platform === "facebook" && !isDemo) {
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
    } else if (isDemo) {
      // In demo mode, we'll just pretend the SDK is ready
      setIsSdkReady(true);
    }
  }, [platform, toast, isDemo]);

  const handleFacebookConnect = async () => {
    if (isDemo) {
      setIsDemoDialogOpen(true);
      return;
    }

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

  // Handler for demo mode connection
  const handleDemoConnect = async () => {
    setIsDemoConnecting(true);
    
    try {
      // In demo mode, we create a fake social account
      setTimeout(async () => {
        try {
          const newAccount = await apiRequest('POST', '/api/social-accounts', {
            partnerId,
            platform: "facebook",
            platformId: "123456789012345",
            platformUsername: "Demo Facebook Page",
            accessToken: "DEMO_ACCESS_TOKEN_FOR_TESTING",
            status: "active",
            metadata: {
              scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
              expiresIn: 3600,
              category: "Retail"
            }
          });
          
          toast({
            title: "Facebook page connected",
            description: "Successfully connected Demo Facebook Page to this partner.",
          });
          
          if (onSuccess) {
            onSuccess();
          }
          
          setIsDemoDialogOpen(false);
          setIsDemoConnecting(false);
        } catch (error) {
          console.error("Error creating demo account:", error);
          toast({
            title: "Connection failed",
            description: "Failed to create demo social account. Please try again.",
            variant: "destructive",
          });
          setIsDemoConnecting(false);
        }
      }, 2000); // Simulate network delay
    } catch (error) {
      toast({
        title: "Connection error",
        description: "An error occurred while connecting. Please try again.",
        variant: "destructive",
      });
      setIsDemoDialogOpen(false);
      setIsDemoConnecting(false);
    }
  };

  if (platform === "facebook") {
    return (
      <>
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

        {/* Demo Mode Dialog */}
        <Dialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect to Facebook</DialogTitle>
              <DialogDescription>
                This is a demo environment. In a production environment, this would open a Facebook authorization dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-500 mb-4">
                Would you like to simulate connecting a Facebook page to this partner?
              </p>
              <p className="text-sm text-gray-500">
                This will create a demo account for testing purposes.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDemoDialogOpen(false)} disabled={isDemoConnecting}>
                Cancel
              </Button>
              <Button onClick={handleDemoConnect} disabled={isDemoConnecting}>
                {isDemoConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Demo Account'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default fallback - should not happen
  return null;
}