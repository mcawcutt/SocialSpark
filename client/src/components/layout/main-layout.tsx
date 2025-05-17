import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { DemoBanner } from "@/components/ui/demo-banner";
import { ImpersonationBanner } from "@/components/ui/impersonation-banner";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isImpersonating, setIsImpersonating] = useState(false);
  
  // Check if user is being impersonated
  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch('/api/debug');
        const data = await response.json();
        setIsImpersonating(!!data.session?.isImpersonated);
      } catch (error) {
        console.error('Failed to check impersonation status:', error);
      }
    };
    
    if (user) {
      checkImpersonation();
    }
  }, [user]);
  
  // Handle redirects based on auth state
  useEffect(() => {
    // Skip if still loading or at the auth page already
    if (isLoading || location === "/auth") return;
    
    // Check if we should redirect to auth
    const isPreviewMode = window.location.host.includes('replit.dev') || window.location.search.includes('demo=true');
    if (!user && !isPreviewMode && location !== '/auth') {
      console.log('No user detected, redirecting to auth page');
      setLocation('/auth');
    }
  }, [user, isLoading, location, setLocation]);
  
  // Don't show sidebar on auth page
  if (location === "/auth" || !user) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">
          {isImpersonating && <ImpersonationBanner />}
          <DemoBanner />
          {children}
        </div>
      </main>
    </div>
  );
}