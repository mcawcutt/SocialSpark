import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form validation schema for registration
const registerFormSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Form validation schema for login
const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function AcceptInvitePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/accept-invite");
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<{
    isVerified: boolean;
    message: string;
    invitation?: {
      name: string;
      email: string;
      brandId: number;
    };
  } | null>(null);
  
  // Parse the token from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setVerification({
        isVerified: false,
        message: "No invitation token provided"
      });
      setLoading(false);
    }
  }, []);
  
  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // Verify the invitation token
  const { isLoading: isVerifying } = useQuery({
    queryKey: ["/api/invites/verify", token],
    queryFn: async () => {
      if (!token) return null;
      
      try {
        const response = await fetch(`/api/invites/verify?token=${token}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setVerification({
            isVerified: true,
            message: "Invitation verified successfully",
            invitation: data.invitation
          });
        } else {
          setVerification({
            isVerified: false,
            message: data.message || "Invalid or expired invitation"
          });
        }
      } catch (error) {
        setVerification({
          isVerified: false,
          message: "Failed to verify invitation"
        });
      }
      
      setLoading(false);
      return null;
    },
    enabled: !!token,
  });
  
  // Register form definition
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: verification?.invitation?.name || "",
      email: verification?.invitation?.email || "",
    },
  });
  
  // Login form definition
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Update default values when verification data is loaded
  useEffect(() => {
    if (verification?.invitation) {
      registerForm.setValue("name", verification.invitation.name);
      registerForm.setValue("email", verification.invitation.email);
    }
  }, [verification, registerForm]);
  
  // Accept invitation after registration/login
  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No invitation token provided");
      
      const response = await apiRequest("POST", "/api/invites/accept", { token });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: "You have successfully joined the brand network.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "There was an error accepting the invitation.",
        variant: "destructive",
      });
    },
  });
  
  // Handle registration submission
  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    // Create a special partner registration object
    // Note: brandId will be linked in the backend using the retail partner relationship
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      name: data.name,
      email: data.email,
      role: "partner", // Set role to partner
    }, {
      onSuccess: () => {
        // After successful registration, accept the invitation
        acceptInviteMutation.mutate();
      },
    });
  };
  
  // Handle login submission
  const handleLoginSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // After successful login, accept the invitation
        acceptInviteMutation.mutate();
      },
    });
  };
  
  // Display loading state while verifying token
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Verifying Invitation</h1>
          <p className="text-gray-500">Please wait while we verify your invitation...</p>
        </div>
      </div>
    );
  }
  
  // Display error message if verification failed
  if (!verification?.isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-gray-500 mb-6">{verification?.message || "This invitation is invalid or has expired."}</p>
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Display the registration/login form if verification succeeded
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand section */}
      <div className="bg-[#e03eb6] text-white p-8 md:w-1/2 flex flex-col justify-center">
        <div className="max-w-lg mx-auto py-12">
          <img
            src="/assets/IGNYT_Logo White Web.png"
            alt="Ignyt Logo"
            className="h-12 mb-8"
          />
          <h1 className="text-3xl font-bold mb-4">
            Join Your Brand Partner Network
          </h1>
          <p className="text-xl mb-6">
            You've been invited to join a brand network on Ignyt, the platform that
            connects brands with their retail partners for social media content distribution.
          </p>
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <div className="flex items-start mb-4">
              <CheckCircle className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
              <p>Share brand-approved content on your social media channels</p>
            </div>
            <div className="flex items-start mb-4">
              <CheckCircle className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
              <p>Customize content for your local audience</p>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
              <p>Track performance and engagement metrics</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form section */}
      <div className="p-8 md:w-1/2 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Accept Invitation</h2>
            <p className="text-gray-500">
              Create an account or sign in to accept the invitation from {verification?.invitation?.name}.
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            </TabsList>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6 bg-[#e03eb6] hover:bg-[#e03eb6]/90"
                    disabled={registerMutation.isPending || acceptInviteMutation.isPending}
                  >
                    {(registerMutation.isPending || acceptInviteMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Account & Accept Invitation
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6 bg-[#e03eb6] hover:bg-[#e03eb6]/90"
                    disabled={loginMutation.isPending || acceptInviteMutation.isPending}
                  >
                    {(loginMutation.isPending || acceptInviteMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Sign In & Accept Invitation
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}