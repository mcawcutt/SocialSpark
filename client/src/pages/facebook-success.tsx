import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function FacebookSuccess() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center">Facebook Connected Successfully!</h1>
        
        <p className="text-center text-muted-foreground">
          Your Facebook Pages are now connected and ready to receive posts from the platform.
        </p>
        
        <div className="p-4 border border-green-200 bg-green-50 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
          <ul className="list-disc pl-5 space-y-1 text-green-800">
            <li>You can now schedule and publish posts to your connected Facebook Pages</li>
            <li>Posts created on the platform will appear in your content calendar</li>
            <li>You can manage all your social media accounts from one dashboard</li>
          </ul>
        </div>
        
        <div className="flex flex-col space-y-3 pt-4">
          <Button onClick={() => setLocation("/")} variant="default">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}