import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export function DatabaseNotice() {
  const [showNotice, setShowNotice] = useState(false);
  
  useEffect(() => {
    // Check if the app is running without proper database
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => {
        if (data.databaseStatus === 'fallback') {
          setShowNotice(true);
        }
      })
      .catch(err => {
        console.error("Failed to check database status:", err);
      });
  }, []);

  if (!showNotice) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Database Connection Issue</AlertTitle>
      <AlertDescription>
        The application is running in fallback mode without a proper database connection.
        Any changes made will not be permanently saved. Contact your administrator to fix this issue.
      </AlertDescription>
    </Alert>
  );
}