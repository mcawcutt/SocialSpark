import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SiFacebook } from "react-icons/si";
import { Loader2 } from "lucide-react";

export default function FacebookConnectPage() {
  const [loading, setLoading] = useState(false);
  const [oauthUrl, setOauthUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Get the Facebook OAuth URL
    const fetchOauthUrl = async () => {
      try {
        const response = await fetch('/api/facebook-auth/oauth-url');
        
        if (!response.ok) {
          throw new Error(`Failed to get OAuth URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setOauthUrl(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error fetching OAuth URL');
        console.error('Error fetching OAuth URL:', err);
      }
    };

    fetchOauthUrl();
  }, []);

  const handleConnect = () => {
    if (!oauthUrl) return;
    
    setLoading(true);
    window.location.href = oauthUrl;
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-[#1877F2] w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <SiFacebook className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Connect Facebook Pages</CardTitle>
            <CardDescription>
              Connect your Facebook Pages to allow posting directly from our platform
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>This will give our app permission to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>View your Facebook Pages</li>
                  <li>Publish posts to your Pages</li>
                  <li>Read Page engagement metrics</li>
                  <li>Manage Instagram accounts connected to your Pages</li>
                </ul>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              className="w-full bg-[#1877F2] hover:bg-[#0d6efd] text-white"
              onClick={handleConnect}
              disabled={loading || !oauthUrl}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <SiFacebook className="mr-2 h-5 w-5" />
                  Continue with Facebook
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            You'll be redirected to Facebook to authorize this connection.
            <br />
            We never store your Facebook password.
          </p>
        </div>
      </div>
    </div>
  );
}