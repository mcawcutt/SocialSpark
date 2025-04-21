import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EvergreenPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledDate: Date;
}

export function EvergreenPostModal({
  isOpen,
  onClose,
  scheduledDate,
}: EvergreenPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Combine the date from scheduledDate with the time from the time picker
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    const date = new Date(scheduledDate);
    date.setHours(12, 0, 0, 0); // Default to 12:00 PM
    return date;
  });
  
  const [platformSelection, setPlatformSelection] = useState<string[]>([
    "facebook",
    "instagram",
  ]);
  
  // Get retail partners
  const { data: partners = [] } = useQuery<any[]>({
    queryKey: ["/api/retail-partners", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/retail-partners?brandId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json();
    },
    enabled: isOpen && !!user,
  });
  
  // Get evergreen posts
  const { data: evergreenPosts = [], isLoading: isLoadingPosts } = useQuery<any[]>({
    queryKey: ["/api/content-posts/evergreen"],
    enabled: isOpen,
  });
  
  // Handle platform toggle
  const togglePlatform = (platform: string) => {
    if (platformSelection.includes(platform)) {
      setPlatformSelection(platformSelection.filter((p) => p !== platform));
    } else {
      setPlatformSelection([...platformSelection, platform]);
    }
  };
  
  // Creating an evergreen post schedule
  const createEvergreenScheduleMutation = useMutation({
    mutationFn: async (data: {
      scheduledDate: Date;
      platforms: string[];
      brandId: number;
    }) => {
      const response = await fetch("/api/content-posts/evergreen-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to schedule evergreen posts");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evergreen posts have been scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-posts"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not logged in.",
        variant: "destructive",
      });
      return;
    }
    
    // For demo purposes, we use user.id as brandId
    const brandId = user.id;
    
    // Combine date from scheduledDate with time from selectedTime
    const finalDate = new Date(scheduledDate);
    finalDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    
    createEvergreenScheduleMutation.mutate({
      scheduledDate: finalDate,
      platforms: platformSelection,
      brandId,
    });
  };
  
  // Validate before submission
  const isValid = platformSelection.length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Evergreen Posts</DialogTitle>
          <DialogDescription>
            Automatically assign random evergreen posts to your retail partners.
            Each partner will receive a different post.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="scheduledDate">
              Date
            </Label>
            <div className="col-span-3">
              <div className="p-2 border rounded-md bg-muted">
                {scheduledDate?.toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="time">
              Time
            </Label>
            <div className="col-span-3">
              <TimePicker
                value={selectedTime}
                onChange={setSelectedTime}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Platforms</Label>
            <div className="col-span-3 flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facebook"
                  checked={platformSelection.includes("facebook")}
                  onCheckedChange={() => togglePlatform("facebook")}
                />
                <Label htmlFor="facebook">Facebook</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instagram"
                  checked={platformSelection.includes("instagram")}
                  onCheckedChange={() => togglePlatform("instagram")}
                />
                <Label htmlFor="instagram">Instagram</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="google"
                  checked={platformSelection.includes("google")}
                  onCheckedChange={() => togglePlatform("google")}
                />
                <Label htmlFor="google">Google Business</Label>
              </div>
            </div>
          </div>
          
          {isLoadingPosts ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !evergreenPosts || evergreenPosts.length === 0 ? (
            <div className="rounded-md bg-amber-50 p-4 my-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    No evergreen posts available
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Please create evergreen posts first. Mark posts as
                      "Evergreen" in the post editor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : partners && partners.length === 0 ? (
            <div className="rounded-md bg-amber-50 p-4 my-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    No retail partners available
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Please add retail partners first before scheduling
                      evergreen posts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-green-50 p-4 my-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Ready to schedule
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      {evergreenPosts.length} evergreen posts will be randomly
                      assigned to {partners.length} retail partners.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !isValid ||
              createEvergreenScheduleMutation.isPending ||
              !evergreenPosts ||
              evergreenPosts.length === 0 ||
              !partners ||
              partners.length === 0
            }
          >
            {createEvergreenScheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Evergreen Posts"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}