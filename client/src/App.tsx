import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import Dashboard from "@/pages/dashboard";
import ContentCalendar from "@/pages/content-calendar";
import RetailPartners from "@/pages/retail-partners";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import EvergreenContent from "@/pages/evergreen-content";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/calendar" component={ContentCalendar} />
      <ProtectedRoute path="/partners" component={RetailPartners} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/evergreen" component={EvergreenContent} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
