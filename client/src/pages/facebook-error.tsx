import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function FacebookError() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center">Facebook Connection Failed</h1>
        
        <p className="text-center text-muted-foreground">
          We couldn't connect to your Facebook account. This could be due to:
        </p>
        
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li>Permissions were not granted</li>
          <li>The connection timed out</li>
          <li>Facebook service issues</li>
          <li>The app may not be in "Live" mode</li>
        </ul>
        
        <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
          <h3 className="font-semibold text-amber-800 mb-2">App Configuration</h3>
          <p className="text-amber-800 text-sm">
            For the Facebook integration to work in production, make sure your domain
            is added to the Facebook App settings in the "App Domains" section 
            and that your app is in "Live" mode.
          </p>
          <div className="flex items-center mt-2 text-sm">
            <a 
              href="https://developers.facebook.com/apps/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              Facebook Developer Console <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button onClick={() => setLocation("/facebook-connect")} variant="default">
            Try Again
          </Button>
          
          <Button variant="outline" onClick={() => setLocation("/")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}