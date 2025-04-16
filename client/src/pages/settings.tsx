import { useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Mail,
  Building,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Database,
  Smartphone,
  FileText,
  Link,
  Facebook, 
  Instagram,
  LinkedinIcon,
  Globe
} from "lucide-react";

// Profile schema
const profileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  planType: z.string(),
  logo: z.string().optional(),
});

// Password schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Notification schema
const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  postPublished: z.boolean(),
  partnerConnected: z.boolean(),
  accountAlerts: z.boolean(),
  marketingEmails: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [imageCropperOpen, setImageCropperOpen] = useState(false);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      planType: user?.planType || "standard",
      logo: user?.logo || "",
    },
  });
  
  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Notification form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      postPublished: true,
      partnerConnected: true,
      accountAlerts: true,
      marketingEmails: false,
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Use the new dedicated endpoint instead of the general PATCH endpoint
      const res = await apiRequest("POST", "/api/update-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest("POST", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationFormValues) => {
      const res = await apiRequest("POST", "/api/notifications/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle profile form submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  // Handle password form submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };
  
  // Handle notification form submission
  const onNotificationSubmit = (data: NotificationFormValues) => {
    updateNotificationsMutation.mutate(data);
  };
  
  // Handle logo upload
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('media', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload logo');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update the form with the new logo URL
      profileForm.setValue('logo', data.file.url);
      
      // Save the profile immediately to persist the logo using our dedicated endpoint
      const profileData = profileForm.getValues();
      
      // Make a direct API call to update profile
      fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logo: data.file.url }),
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update profile with new logo');
        return res.json();
      })
      .then(() => {
        queryClient.invalidateQueries({queryKey: ["/api/user"]});
      })
      .catch(err => {
        console.error('Error updating profile with logo:', err);
      });
      
      toast({
        title: "Logo uploaded",
        description: "Your brand logo has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to upload logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle crop complete
  const handleCropComplete = (croppedImageUrl: string, file: File) => {
    uploadLogoMutation.mutate(file);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MobileNav />
      
      {/* Image Cropper */}
      <ImageCropper
        open={imageCropperOpen}
        onClose={() => setImageCropperOpen(false)}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
            <p className="text-gray-500">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <div className="flex overflow-x-auto pb-2">
              <TabsList className="inline-flex h-auto p-1 gap-2">
                <TabsTrigger value="account" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="connections" className="flex items-center">
                  <Link className="h-4 w-4 mr-2" />
                  Social Connections
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your account information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              This is the name that will be displayed on your account and shared with partners.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormDescription>
                              We'll use this email to contact you about your account.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="planType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subscription Plan</FormLabel>
                            <Select
                              disabled
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard Plan</SelectItem>
                                <SelectItem value="premium">Premium Plan</SelectItem>
                                <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Your current subscription plan. To upgrade, visit the Billing tab.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="logo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Logo</FormLabel>
                            <div className="flex flex-col space-y-3">
                              <div className="flex gap-2 items-start">
                                {field.value && (
                                  <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                                    <img 
                                      src={field.value} 
                                      alt="Brand Logo" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Replace with default if image fails to load
                                        e.currentTarget.src = "/assets/IGNYT_Icon Web.png";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setImageCropperOpen(true)}
                                  >
                                    {field.value ? 'Change Logo' : 'Upload Logo'}
                                  </Button>
                                  {field.value && (
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => field.onChange('')}
                                    >
                                      Remove Logo
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <FormDescription>
                                Upload a square logo image. It will appear next to your brand name in the sidebar.
                              </FormDescription>
                              <FormControl>
                                <Input 
                                  type="hidden"
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 mb-4">
                    Once you delete your account, there is no going back. All your data, including published content, partner relationships, and analytics will be permanently deleted.
                  </p>
                  <Button variant="destructive">Delete Account</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Password must be at least 6 characters long.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable 2FA</h3>
                      <p className="text-gray-500 text-sm">
                        Protect your account with two-factor authentication
                      </p>
                    </div>
                    <Switch id="2fa" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Session Management</CardTitle>
                  <CardDescription>
                    Manage your active sessions and devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-full mr-3">
                          <Smartphone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Current Session (Chrome)</p>
                          <p className="text-gray-500 text-sm">Last active: Just now</p>
                        </div>
                      </div>
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Active
                      </div>
                    </div>
                    
                    <Button variant="outline" onClick={() => logoutMutation.mutate()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out of All Devices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how and when you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <FormLabel className="text-base font-medium">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4 pl-6">
                        <FormField
                          control={notificationForm.control}
                          name="postPublished"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel className="text-base font-medium">Post Published</FormLabel>
                                <FormDescription>
                                  When a scheduled post is published
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!notificationForm.watch("emailNotifications")}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="partnerConnected"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel className="text-base font-medium">Partner Connected</FormLabel>
                                <FormDescription>
                                  When a retail partner accepts your invitation
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!notificationForm.watch("emailNotifications")}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="accountAlerts"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel className="text-base font-medium">Account Alerts</FormLabel>
                                <FormDescription>
                                  Security and account-related notifications
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!notificationForm.watch("emailNotifications")}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={notificationForm.control}
                        name="marketingEmails"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <FormLabel className="text-base font-medium">Marketing Emails</FormLabel>
                              <FormDescription>
                                Receive news, updates, and promotional offers
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={updateNotificationsMutation.isPending}
                      >
                        {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plan</CardTitle>
                  <CardDescription>
                    Manage your current plan and subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 border rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-lg capitalize">{user?.planType || "Standard"} Plan</h3>
                        <p className="text-gray-500">$49/month, billed monthly</p>
                      </div>
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Active
                      </div>
                    </div>
                    <div className="space-y-2 text-gray-500 mb-4">
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Up to 25 retail partners</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Unlimited scheduled posts</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Advanced analytics</span>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button>Upgrade Plan</Button>
                      <Button variant="outline">View All Plans</Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Payment Method</h3>
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="bg-gray-100 p-2 rounded-md mr-4">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-gray-500 text-sm">Expires 12/2025</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Update</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>
                    View your past invoices and payment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-gray-500 text-sm">
                          <th className="px-6 py-3 bg-gray-50 font-medium">Invoice</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium">Date</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium">Amount</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium">Status</th>
                          <th className="px-6 py-3 bg-gray-50 font-medium text-right">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 font-medium">INV-2023-06</td>
                          <td className="px-6 py-4">Jun 1, 2023</td>
                          <td className="px-6 py-4">$49.00</td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Paid</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-medium">INV-2023-05</td>
                          <td className="px-6 py-4">May 1, 2023</td>
                          <td className="px-6 py-4">$49.00</td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Paid</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="connections" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Connections</CardTitle>
                  <CardDescription>
                    Connect your brand's social media accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-md mr-4">
                          <Facebook className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Facebook</p>
                          <p className="text-gray-500 text-sm">Connect your Facebook Business account</p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="bg-pink-100 p-2 rounded-md mr-4">
                          <Instagram className="h-6 w-6 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium">Instagram</p>
                          <p className="text-gray-500 text-sm">Connect your Instagram Business account</p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center">
                        <div className="bg-yellow-100 p-2 rounded-md mr-4">
                          <Globe className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">Google Business</p>
                          <p className="text-gray-500 text-sm">Connect your Google Business account</p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-gray-500 text-sm">
                      These connections are for your brand's own accounts. Retail partners will connect their own accounts separately.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>API Integration</CardTitle>
                  <CardDescription>
                    Manage API keys and third-party integrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-md mb-4">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-md mr-4">
                        <Database className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">API Key</p>
                        <p className="text-gray-500 text-sm">For custom integrations</p>
                      </div>
                    </div>
                    <Button variant="outline">Generate Key</Button>
                  </div>
                  
                  <p className="text-gray-500 text-sm">
                    API documentation is available in our developer portal. API keys should be kept secret and never shared publicly.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
