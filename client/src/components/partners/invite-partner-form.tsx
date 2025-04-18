import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter } from "@/components/ui/dialog";
import { Mail, Loader2 } from "lucide-react";

// Validation schema for partner invitation
const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(1, { message: "Name is required" }),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InvitePartnerFormProps {
  onSuccess?: () => void;
}

export function InvitePartnerForm({ onSuccess }: InvitePartnerFormProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  // Define the form with validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      name: "",
      message: "",
    },
  });

  // Create a mutation for sending invitations
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const response = await apiRequest("POST", "/api/invites", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The partner invitation has been sent successfully.",
      });
      
      // Reset the form
      form.reset();
      
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/retail-partners"] });
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending invitation",
        description: error.message || "There was an error sending the invitation. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  // Handle form submission
  const onSubmit = async (data: InviteFormValues) => {
    setIsSending(true);
    inviteMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input placeholder="partner@retailstore.com" {...field} />
              </FormControl>
              <FormDescription>
                The email address the invitation will be sent to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Partner name</FormLabel>
              <FormControl>
                <Input placeholder="Retail Store Name" {...field} />
              </FormControl>
              <FormDescription>
                The name of the retail store or partner.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal message (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a personal message to the invitation email..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add a personal note to the invitation email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}