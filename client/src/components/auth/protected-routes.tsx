import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

interface RoleProtectedRouteProps extends ProtectedRouteProps {
  allowedRoles: ("admin" | "brand" | "partner")[];
}

/**
 * Base protected route - requires any authenticated user
 */
export function ProtectedRoute({
  component: Component,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route {...rest}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route {...rest}>
      <Component />
    </Route>
  );
}

/**
 * Role-specific protected route - requires users with specific roles
 */
export function RoleProtectedRoute({
  component: Component,
  allowedRoles,
  ...rest
}: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route {...rest}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user has an allowed role
  if (!allowedRoles.includes(user.role as any)) {
    return (
      <Route {...rest}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route {...rest}>
      <Component />
    </Route>
  );
}

/**
 * Admin-only route
 */
export function AdminRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute
      {...rest}
      component={Component}
      allowedRoles={["admin"]}
    />
  );
}

/**
 * Brand-only route (includes admins)
 */
export function BrandRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute
      {...rest}
      component={Component}
      allowedRoles={["brand", "admin"]}
    />
  );
}

/**
 * Partner-only route
 */
export function PartnerRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  return (
    <RoleProtectedRoute
      {...rest}
      component={Component}
      allowedRoles={["partner"]}
    />
  );
}