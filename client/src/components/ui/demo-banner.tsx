import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DemoBanner() {
  const { user } = useAuth();
  
  // Only show the banner for demo users
  if (!(user as any)?.isDemoUser) {
    return null;
  }
  
  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Demo Mode</AlertTitle>
      <AlertDescription className="text-yellow-700">
        You are viewing demo data. To access all features, please log in with valid credentials.
      </AlertDescription>
    </Alert>
  );
}