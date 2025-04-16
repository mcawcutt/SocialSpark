import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function DeploymentError() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Database Connection Error</CardTitle>
          <CardDescription>
            The application cannot connect to the database in deployment mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="space-y-2">
            <p>This is likely because:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The DATABASE_URL environment variable is not set in the deployment environment</li>
              <li>The database server might be unreachable from this deployment</li>
              <li>Database credentials might be incorrect</li>
            </ul>
          </div>
          
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="font-medium">To fix this issue:</p>
            <p className="mt-1">1. Go to your Replit Dashboard</p>
            <p className="mt-1">2. Open the deployment settings for this application</p>
            <p className="mt-1">3. Add the same DATABASE_URL you're using in development to your deployment secrets</p>
            <p className="mt-1">4. Redeploy the application</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth">
              Try Again
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}