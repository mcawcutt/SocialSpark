import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { DatabaseNotice } from "@/components/ui/database-notice";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Don't show sidebar on auth page
  if (location === "/auth" || !user) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6">
          <DatabaseNotice />
          {children}
        </div>
      </main>
    </div>
  );
}