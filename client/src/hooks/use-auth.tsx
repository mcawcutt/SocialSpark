import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isBrand: boolean;
  isPartner: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
};

type LoginData = {
  username: string;
  password: string;
};

// Define hooks separate from the provider to prevent recreation on each render
function useUserQuery() {
  // Primary query to get the authenticated user
  const userQuery = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    // Don't show "unauthorized" errors when not logged in
    throwOnError: false,
    // Return undefined instead of erroring, which we'll convert to null
    refetchOnWindowFocus: true,
  });
  
  // Fallback query for demo user (useful for preview pane)
  const demoUserQuery = useQuery<User>({
    queryKey: ["/api/demo-user"],
    enabled: !userQuery.data && (window.location.host.includes('replit.dev') || window.location.search.includes('demo=true')),
    refetchOnWindowFocus: true,
  });
  
  // Use the demo user data if the main query fails and we're in the preview pane
  return {
    ...userQuery,
    data: userQuery.data || demoUserQuery.data,
  };
}

function useLoginMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return await response.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/demo-user"] });
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useRegisterMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (userData: Partial<InsertUser>) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      
      return await response.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useLogoutMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      // First attempt regular logout
      const response = await fetch("/api/logout", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      
      // In preview mode, also clear the demo user state
      if (window.location.host.includes('replit.dev') || window.location.search.includes('demo=true')) {
        try {
          await fetch("/api/clear-demo-user", {
            method: "POST",
          });
          console.log("Demo user state cleared");
        } catch (error) {
          console.error("Failed to clear demo user state:", error);
          // Continue anyway, this is just a cleanup step
        }
      }
    },
    onSuccess: () => {
      // Clear both the regular user and demo user data
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/demo-user"], null);
      
      // Invalidate both queries to trigger a complete refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demo-user"] });
      
      // Force a page refresh to clear any cached components
      if (window.location.host.includes('replit.dev') || window.location.search.includes('demo=true')) {
        setTimeout(() => window.location.reload(), 500);
      }
      
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useUserQuery();
  
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();
  
  // Determine role flags
  const isAdmin = !!user && user.role === "admin";
  const isBrand = !!user && user.role === "brand";
  const isPartner = !!user && user.role === "partner";

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAdmin,
        isBrand,
        isPartner,
        error: error as Error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}