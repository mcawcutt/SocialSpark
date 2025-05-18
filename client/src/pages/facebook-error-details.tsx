import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function FacebookErrorDetails() {
  // Get the current location which might include query parameters
  const [location] = useLocation();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1] || "");
  let message = params.get("message") || "Something went wrong with your Facebook connection.";
  
  // Try to clean up common Facebook error messages to make them more user-friendly
  if (message.includes("invalid_client") || message.includes("App ID")) {
    message = "The Facebook app configuration is invalid. Please contact support.";
  } else if (message.includes("access denied") || message.includes("declined")) {
    message = "You declined to provide the necessary permissions. Please try again and allow all requested permissions.";
  } else if (message.includes("expired")) {
    message = "The authentication session expired. Please try again.";
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center">Facebook Connection Failed</h1>
        
        <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-800">
          <p>{message}</p>
        </div>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button asChild variant="default">
            <a href="/facebook-connect">Try Again</a>
          </Button>
          
          <Button asChild variant="outline">
            <a href="/">Return to Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}