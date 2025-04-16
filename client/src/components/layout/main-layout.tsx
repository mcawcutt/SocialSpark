import { ReactNode, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
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
        <div className="container mx-auto py-6">
          {children}
        </div>
      </main>
    </div>
  );
}