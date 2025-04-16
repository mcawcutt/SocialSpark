import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import {
  ProtectedRoute,
  BrandRoute,
  AdminRoute,
  PartnerRoute
} from "@/components/auth/protected-routes";
import Dashboard from "@/pages/dashboard";
import ContentCalendar from "@/pages/content-calendar";
import RetailPartners from "@/pages/retail-partners";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import EvergreenContent from "@/pages/evergreen-content";
import MediaLibrary from "@/pages/media-library";
import TestUpload from "@/pages/test-upload";
import DeploymentError from "@/pages/deployment-error";
import { AuthProvider } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { useEffect, useState } from "react";

function Router() {
  return (
    <MainLayout>
      <Switch>
        {/* Common routes accessible to all authenticated users */}
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/content-calendar" component={ContentCalendar} />
        <ProtectedRoute path="/analytics" component={Analytics} />
        <ProtectedRoute path="/media-library" component={MediaLibrary} />
        <ProtectedRoute path="/settings" component={Settings} />
        
        {/* Brand & Admin only routes */}
        <BrandRoute path="/retail-partners" component={RetailPartners} />
        <BrandRoute path="/evergreen-content" component={EvergreenContent} />
        
        {/* Admin only routes */}
        <AdminRoute path="/admin/users" component={Settings} /> {/* Replace with UserManagement when created */}
        
        {/* Unauthenticated routes */}
        <Route path="/auth" component={AuthPage} />
        <Route path="/test-upload" component={TestUpload} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  const [dbError, setDbError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if we're in production with database issues
  useEffect(() => {
    const checkDeployment = async () => {
      try {
        const res = await fetch('/api/debug');
        const data = await res.json();
        
        // If this is a production deployment and database is in fallback mode
        const isProduction = window.location.hostname.includes('.replit.app');
        if (isProduction && data.databaseStatus === 'fallback') {
          setDbError(true);
        }
      } catch (err) {
        console.error('Failed to check deployment status:', err);
        // If we can't even reach the debug endpoint, show error in production
        if (window.location.hostname.includes('.replit.app')) {
          setDbError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkDeployment();
  }, []);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If database error in production, show error page
  if (dbError) {
    return <DeploymentError />;
  }
  
  // Normal app render
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
