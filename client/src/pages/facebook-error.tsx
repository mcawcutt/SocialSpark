import { Button } from "@/components/ui/button";
import { AlertCircle, Facebook } from "lucide-react";
import { Link } from "wouter";

export default function FacebookError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center">Facebook Connection Error</h1>
        
        <p className="text-center text-muted-foreground">
          We encountered an error while connecting to Facebook. This might be because:
        </p>
        
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>The Facebook App is not properly configured</li>
          <li>Required permissions were declined</li>
          <li>The connection timed out</li>
        </ul>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button asChild variant="default" className="bg-[#1877F2] hover:bg-[#0d6efd]">
            <Link href="/facebook-connect">
              <Facebook className="mr-2 h-4 w-4" />
              Try Again
            </Link>
          </Button>
          
          <Button asChild variant="outline">
            <Link href="/retail-partners">
              Return to Partners
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}