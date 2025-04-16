import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Create forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "brand",
      planType: "standard",
    },
  });

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/");
    }
    
    // Debug code to check session
    fetch('/api/debug', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        console.log('Debug endpoint response:', data);
      })
      .catch(error => {
        console.error('Debug endpoint error:', error);
      });
  }, [user, navigate]);

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Handle registration form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remove the confirmPassword field before sending to API
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Hero section */}
        <div className="hidden lg:flex flex-col justify-center p-8 bg-gray-900 text-white rounded-l-lg shadow-md">
          <div>
            <div className="mb-6">
              <img 
                src="/assets/IGNYT_Logo White Web.png" 
                alt="Ignyt Logo" 
                className="h-16" 
              />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">Empower Your Brand Network</h2>
            <p className="text-lg mb-8 text-white font-medium">
              Connect with your retail partners and schedule branded content across multiple social media channels. Ignyt helps you maintain brand consistency while enabling local personalization.
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mr-2 w-6 h-6 rounded-full bg-white text-primary-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-white font-medium">Seamlessly schedule content to multiple retail partners</p>
              </div>
              <div className="flex items-start">
                <div className="mr-2 w-6 h-6 rounded-full bg-white text-primary-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-white font-medium">Localize messages while maintaining brand consistency</p>
              </div>
              <div className="flex items-start">
                <div className="mr-2 w-6 h-6 rounded-full bg-white text-primary-600 flex items-center justify-center font-bold">✓</div>
                <p className="text-white font-medium">Track performance across your entire retail network</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auth forms */}
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="mb-2">
                <img 
                  src="/assets/IGNYT_Logo Black Web.png" 
                  alt="Ignyt Logo" 
                  className="h-12 mx-auto" 
                />
              </div>
              <p className="text-gray-500 text-sm text-center">
                Your B2B2C Social Media Management Platform
              </p>
            </div>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-800 font-medium">Username</FormLabel>
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
                          <FormLabel className="text-gray-800 font-medium">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-gray-800 border p-2 rounded bg-gray-100">
                    For demo purposes, use username: <strong className="text-primary-600">demo</strong> and password: <strong className="text-primary-600">password</strong>
                  </p>
                  <button 
                    className="text-primary-600 font-medium hover:underline mt-2"
                    onClick={() => {
                      console.log('Attempting quick login...');
                      fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: 'demo', password: 'password' }),
                        credentials: 'include'
                      })
                      .then(async res => {
                        console.log('Login response status:', res.status);
                        if (res.ok) {
                          const user = await res.json();
                          console.log('Login successful:', user);
                          window.location.href = '/';
                        } else {
                          console.error('Login failed:', await res.text());
                        }
                      })
                      .catch(error => console.error('Login error:', error));
                    }}
                  >
                    Quick Login
                  </button>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-800 font-medium">Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your company name" {...field} />
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
                          <FormLabel className="text-gray-800 font-medium">Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
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
                          <FormLabel className="text-gray-800 font-medium">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-800 font-medium">Password</FormLabel>
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
                            <FormLabel className="text-gray-800 font-medium">Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
