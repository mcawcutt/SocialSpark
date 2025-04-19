import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Form validation schema
const inviteFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  message: z.string().optional(),
  brandId: z.number().optional().default(1), // Default to 1 for demo purposes
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InvitePartnerFormProps {
  onSuccess?: () => void;
}

export function InvitePartnerForm({ onSuccess }: InvitePartnerFormProps) {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState(false);
  
  // Form definition
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
      brandId: 1, // Default brandId for demo purposes
    },
  });
  
  // Mutation to send invitation (using test endpoint for demo)
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      // Using test endpoint to bypass authentication for demo purposes
      const response = await apiRequest("POST", "/api/test-invites/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        // If email was sent successfully
        toast({
          title: "Invitation sent",
          description: "The partner has been invited successfully and an email has been sent."
        });
      } else {
        // If there was an error sending the email
        toast({
          title: "Invitation created",
          description: "The invitation was created, but the email could not be sent. You can use the URL below for testing.",
          variant: "destructive",
          duration: 10000 // Show the toast longer
        });
        
        // Display the invitation URL in a toast for easy access
        toast({
          title: "Invitation URL (Copy this)",
          description: data.inviteUrl,
          duration: 15000,
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(data.inviteUrl);
                toast({
                  title: "URL copied",
                  description: "The invitation URL has been copied to your clipboard."
                });
              }}
            >
              Copy URL
            </Button>
          ),
        });
      }
      
      // Log the invitation URL for testing
      console.log("Test invitation URL:", data.inviteUrl);
      
      // Invalidate the test invites list query
      queryClient.invalidateQueries({ queryKey: ["/api/test-invites/list"] });
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending invitation",
        description: error.message || "There was an error sending the invitation.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (data: InviteFormValues) => {
    if (!customMessage) {
      // If user didn't expand the custom message section, don't send an empty message
      data.message = undefined;
    }
    
    inviteMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Partner Name</FormLabel>
              <FormControl>
                <Input placeholder="ABC Retail" {...field} />
              </FormControl>
              <FormDescription>
                Enter the name of the retail partner
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="partner@example.com" type="email" {...field} />
              </FormControl>
              <FormDescription>
                The invitation will be sent to this email address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!customMessage && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setCustomMessage(true)}
            className="w-full mt-2"
          >
            Add Custom Message (Optional)
          </Button>
        )}
        
        {customMessage && (
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Message (Optional)</FormLabel>
                <FormControl>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="We'd like to invite you to join our branded content network..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Add a personalized message to the invitation email
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send Invitation
          </Button>
        </div>
      </form>
    </Form>
  );
}