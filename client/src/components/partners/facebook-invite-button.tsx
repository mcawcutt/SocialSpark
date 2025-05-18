import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiFacebook } from "react-icons/si";
import { Copy, ExternalLink, Loader2, Facebook } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FacebookInviteButtonProps {
  partnerId: number;
  partnerName: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FacebookInviteButton({ 
  partnerId, 
  partnerName,
  variant = "default",
  size = "default" 
}: FacebookInviteButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate the invite URL
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/facebook-auth/oauth-url/${partnerId}`);
      if (!response.ok) {
        throw new Error('Failed to generate invite URL');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setInviteUrl(data.url);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate invite URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Copy invite URL to clipboard
  const copyToClipboard = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
        .then(() => {
          toast({
            title: "Copied!",
            description: "Invite link copied to clipboard",
          });
        })
        .catch((err) => {
          console.error('Failed to copy:', err);
          toast({
            title: "Copy failed",
            description: "Could not copy to clipboard",
            variant: "destructive",
          });
        });
    }
  };

  // Open link in new tab
  const openInNewTab = () => {
    if (inviteUrl) {
      window.open(inviteUrl, '_blank');
    }
  };

  // Open dialog and generate invite URL
  const handleOpen = () => {
    setIsDialogOpen(true);
    if (!inviteUrl) {
      generateInviteMutation.mutate();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className="flex items-center gap-1.5"
      >
        <SiFacebook className="h-4 w-4 text-blue-500" />
        <span>Connect Facebook & Instagram</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect Partner Social Accounts</DialogTitle>
            <DialogDescription>
              Generate an invite link for {partnerName} to connect their Facebook Pages and Instagram Business accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                This link will allow the partner to authorize our app to publish posts to their Facebook Pages and Instagram Business accounts.
              </AlertDescription>
            </Alert>

            {generateInviteMutation.isPending ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Generating invite link...</span>
              </div>
            ) : inviteUrl ? (
              <div className="space-y-2">
                <Label htmlFor="invite-url">Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-url"
                    value={inviteUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openInNewTab}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Share this link with {partnerName} to authorize connection to their Facebook and Instagram accounts.
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                {generateInviteMutation.isError ? (
                  <p>Failed to generate invite link. Please try again.</p>
                ) : (
                  <p>Preparing invite link...</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            {generateInviteMutation.isError && (
              <Button 
                onClick={() => generateInviteMutation.mutate()}
                disabled={generateInviteMutation.isPending}
              >
                {generateInviteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}