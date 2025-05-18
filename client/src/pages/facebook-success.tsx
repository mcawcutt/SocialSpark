import { Button } from "@/components/ui/button";
import { Check, Facebook } from "lucide-react";
import { Link } from "wouter";

export default function FacebookSuccess() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center">Facebook Connected Successfully!</h1>
        
        <p className="text-center text-muted-foreground">
          Your Facebook account has been connected successfully. You can now post to your Facebook pages directly from the platform.
        </p>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button asChild variant="default" className="bg-[#1877F2] hover:bg-[#0d6efd]">
            <Link href="/retail-partners">
              <Facebook className="mr-2 h-4 w-4" />
              Manage Connected Pages
            </Link>
          </Button>
          
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}