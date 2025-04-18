import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { InvitePartnerForm } from "@/components/partners/invite-partner-form";
import { PendingInvitesList } from "@/components/partners/pending-invites-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PartnerInvitesPage() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partner Invitations</h1>
          <p className="text-gray-500 mt-1">
            Invite new retail partners to join your brand network
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0 bg-[#e03eb6] hover:bg-[#e03eb6]/90 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Invite a New Partner</DialogTitle>
              <DialogDescription>
                Send an invitation email to a retail partner to join your network on Ignyt.
              </DialogDescription>
            </DialogHeader>
            <InvitePartnerForm onSuccess={() => setIsInviteDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
          <TabsTrigger value="info">About Partner Invitations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-6">
          <PendingInvitesList />
        </TabsContent>
        
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>How Partner Invitations Work</CardTitle>
              <CardDescription>
                Understanding the invitation process for retail partners
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">1. Send an Invitation</h3>
                <p className="text-gray-600">
                  Use the "Invite Partner" button to send an email invitation to your retail partners.
                  The invitation contains a unique link that allows them to join your brand network.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">2. Partner Accepts</h3>
                <p className="text-gray-600">
                  When a partner receives the invitation email, they can click on the link to create an
                  account or connect their existing account to your brand network.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">3. Connected Partner</h3>
                <p className="text-gray-600">
                  Once a partner accepts the invitation, they'll appear in your Partners list.
                  You can then start sharing content with them for social media posting.
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-blue-800 font-medium mb-2">Important Notes</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Invitations expire after 7 days</li>
                  <li>You can cancel an invitation at any time before it's accepted</li>
                  <li>Partners will need to connect their social media accounts after joining</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}