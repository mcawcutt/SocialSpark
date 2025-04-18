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
import PartnerInvites from "@/pages/partner-invites";
import AcceptInvite from "@/pages/accept-invite";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import EvergreenContent from "@/pages/evergreen-content";
import MediaLibrary from "@/pages/media-library";
import TestUpload from "@/pages/test-upload";
import { AuthProvider } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";

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
        <BrandRoute path="/partner-invites" component={PartnerInvites} />
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
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
