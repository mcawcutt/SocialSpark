import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function DevFacebookConnect({ partnerId }: { partnerId?: number }) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState([
    {
      id: "123456789",
      name: "My Local Business",
      category: "Local Business",
      selected: true,
    },
    {
      id: "987654321",
      name: "Our Store",
      category: "Retail",
      selected: false,
    },
    {
      id: "456789123",
      name: "Example Brand Page",
      category: "Brand",
      selected: false,
    },
  ]);
  const [permissions, setPermissions] = useState([
    { id: "pages_show_list", name: "View Page List", selected: true },
    { id: "pages_read_engagement", name: "Read Page Engagement", selected: true },
    { id: "pages_manage_posts", name: "Create Posts on Pages", selected: true },
    { id: "pages_manage_metadata", name: "Manage Page Settings", selected: true },
    { id: "instagram_basic", name: "Basic Instagram Access", selected: true },
  ]);
  const [simulating, setSimulating] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleTogglePage = (id: string) => {
    setPages(
      pages.map((page) =>
        page.id === id ? { ...page, selected: !page.selected } : page
      )
    );
  };

  const handleTogglePermission = (id: string) => {
    setPermissions(
      permissions.map((perm) =>
        perm.id === id ? { ...perm, selected: !perm.selected } : perm
      )
    );
  };

  const handleConnect = async () => {
    setSimulating(true);
    
    // Simulate OAuth process with a delay
    setTimeout(async () => {
      try {
        // Get selected pages
        const selectedPages = pages.filter(page => page.selected);
        if (selectedPages.length === 0) {
          toast({
            title: "No pages selected",
            description: "Please select at least one page to connect",
            variant: "destructive",
          });
          setSimulating(false);
          return;
        }

        // If partner ID is provided, associate with this partner
        const url = partnerId 
          ? `/api/dev/facebook-accounts/${partnerId}` 
          : `/api/dev/facebook-accounts`;

        // Create social account entries in the database for each selected page
        await Promise.all(selectedPages.map(async (page) => {
          try {
            const mockTokenData = {
              accessToken: `mock_access_token_${page.id}`,
              pageId: page.id,
              pageName: page.name,
              userId: "dev_user_123",
              userName: "Development User",
              partnerId: partnerId || null,
            };

            await apiRequest("POST", url, {
              platform: "facebook",
              accountId: page.id,
              accountName: page.name,
              accessToken: mockTokenData.accessToken,
              status: "active",
              refreshToken: "mock_refresh_token",
              tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
              metadata: {
                category: page.category,
                permissions: permissions
                  .filter(p => p.selected)
                  .map(p => p.id),
              }
            });
          } catch (error) {
            console.error(`Error creating social account for page ${page.name}:`, error);
            throw error;
          }
        }));

        // Update UI and invalidate queries to refresh data
        setSuccess(true);
        if (partnerId) {
          queryClient.invalidateQueries({ queryKey: [`/api/retail-partners/${partnerId}/social-accounts`] });
        }
        
        toast({
          title: "Connection successful",
          description: `Connected ${selectedPages.length} Facebook page(s) successfully`,
        });
        
        // Close dialog after 2 seconds of showing success
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setSimulating(false);
        }, 2000);
        
      } catch (error) {
        console.error("Error in Facebook connection:", error);
        toast({
          title: "Connection failed",
          description: error instanceof Error ? error.message : "An error occurred during connection",
          variant: "destructive",
        });
        setSimulating(false);
      }
    }, 2000); // 2 second delay to simulate OAuth process
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#1877F2] hover:bg-[#0b5fce] text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="24"
            height="24"
            className="mr-2"
          >
            <path
              fill="#fff"
              d="M24 5a19 19 0 1 0 0 38 19 19 0 0 0 0-38zm0 7.5c1.7 0 3 .7 3.9 1.8.7.7 1.2 1.8 1.4 3h-3.3v3.8h5.4l-.1 5.5h-5.3v11.2h-4v-11.2h-3.6v-5.5h3.6v-3.3l-.1-1c0-1.3 1-2.3 2.1-2.3z"
            />
          </svg>
          Connect with Facebook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  width="28"
                  height="28"
                  className="mr-2"
                >
                  <path
                    fill="#1877F2"
                    d="M24 5a19 19 0 1 0 0 38 19 19 0 0 0 0-38zm4 19.5h-2.6v9.3h-3.8v-9.3h-2v-3.6h2v-2.1c0-1.9.6-5 4-5h3v3.2h-2c-.4 0-.8.4-.8 1v2.8h3l-.3 3.7z"
                  />
                </svg>
                Connect Facebook Pages
              </DialogTitle>
              <DialogDescription>
                This is a development simulation. Select the pages you want to connect
                and the permissions you'd like to grant.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <h3 className="mb-2 text-lg font-medium">Available Pages</h3>
                <div className="space-y-2">
                  {pages.map((page) => (
                    <Card key={page.id} className="overflow-hidden">
                      <div className="flex items-center p-4">
                        <Checkbox
                          id={`page-${page.id}`}
                          checked={page.selected}
                          onCheckedChange={() => handleTogglePage(page.id)}
                          className="mr-4"
                        />
                        <div className="flex items-center flex-1 space-x-4">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-white">
                              {page.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{page.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {page.category} · Page
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-lg font-medium">Permissions</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  These permissions are required to manage posts on your Facebook Pages.
                </p>
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={permission.selected}
                        onCheckedChange={() =>
                          handleTogglePermission(permission.id)
                        }
                      />
                      <Label
                        htmlFor={`permission-${permission.id}`}
                        className="text-sm"
                      >
                        {permission.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleConnect}
                disabled={simulating}
                className="bg-[#1877F2] hover:bg-[#0b5fce] text-white"
              >
                {simulating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-8 w-8 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connection Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your Facebook pages have been successfully connected.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}