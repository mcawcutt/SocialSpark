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
    },
  });
  
  // Mutation to send invitation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const response = await apiRequest("POST", "/api/invites", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The partner has been invited successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
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