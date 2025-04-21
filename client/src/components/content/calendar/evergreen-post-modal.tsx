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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

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
  
  // State for partner distribution and selection
  const [partnerDistribution, setPartnerDistribution] = useState<"all" | "byTag">("all");
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
  const [selectedPartnerTags, setSelectedPartnerTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Get retail partners
  const { data: partners = [] } = useQuery<any[]>({
    queryKey: ["/api/retail-partners", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // First try the regular API endpoint
      try {
        const res = await fetch(`/api/retail-partners?brandId=${user.id}`);
        if (res.ok) return res.json();
      } catch (e) {
        console.error("Error fetching from regular API:", e);
      }
      
      // Fall back to demo data for the demo user
      try {
        const demoRes = await fetch('/api/demo/retail-partners');
        if (demoRes.ok) return demoRes.json();
      } catch (e) {
        console.error("Error fetching from demo API:", e);
      }
      
      // If both fail, return empty array
      return [];
    },
    enabled: isOpen && !!user,
  });
  
  // Fetch partner tags from the dedicated endpoint
  const { data: tagData } = useQuery<string[]>({
    queryKey: ['/api/demo/retail-partners/tags'],
    enabled: isOpen
  });
  
  // Update available tags when tag data changes
  useEffect(() => {
    if (tagData && tagData.length > 0) {
      console.log('Fetched partner tags from API:', tagData);
      setAvailableTags(tagData);
    } else if (partners && partners.length > 0) {
      // Extract tags from partners as fallback
      const allTags: string[] = [];
      
      partners.forEach(partner => {
        if (partner.metadata && typeof partner.metadata === 'object') {
          const metadata = partner.metadata as { tags?: string[] };
          if (metadata.tags && Array.isArray(metadata.tags)) {
            allTags.push(...metadata.tags.filter(tag => typeof tag === 'string'));
          }
        }
      });
      
      // Get unique tags only
      const uniqueTagsSet = new Set<string>();
      allTags.forEach(tag => uniqueTagsSet.add(tag));
      
      const tagsArray = Array.from(uniqueTagsSet);
      console.log('Available partner tags (extracted):', tagsArray);
      setAvailableTags(tagsArray);
    }
  }, [tagData, partners]);
  
  // Set all partner IDs when partners data changes
  useEffect(() => {
    if (partnerDistribution === "all" && partners && partners.length > 0) {
      setSelectedPartnerIds(partners.map(p => p.id));
    }
  }, [partners, partnerDistribution]);
  
  // Get evergreen posts
  const { data: evergreenPosts = [], isLoading: isLoadingPosts } = useQuery<any[]>({
    queryKey: ["/api/content-posts/evergreen", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const res = await fetch(`/api/content-posts/evergreen?brandId=${user.id}`);
        if (res.ok) return res.json();
      } catch (e) {
        console.error("Error fetching evergreen posts:", e);
      }
      
      // Always default to the demo evergreen posts
      return fetch('/api/content-posts/evergreen')
        .then(res => res.json())
        .catch(err => {
          console.error("Failed to fetch even demo evergreen posts:", err);
          return [];
        });
    },
    enabled: isOpen && !!user,
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
      partnerIds: number[];
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
    
    // Make sure we have partners selected
    if (selectedPartnerIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one retail partner.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the evergreen post scheduling request
    createEvergreenScheduleMutation.mutate({
      scheduledDate: finalDate,
      platforms: platformSelection,
      brandId,
      partnerIds: selectedPartnerIds,
    });
  };
  
  // Validate before submission
  const isValid = platformSelection.length > 0 && selectedPartnerIds.length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Schedule Evergreen Posts</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">About evergreen posts</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] p-3">
                  <p className="text-sm">
                    <strong>What are evergreen posts?</strong><br/>
                    Evergreen posts are reusable content that stays relevant over time. They're automatically rotated to ensure the same partner doesn't receive identical content in consecutive scheduling cycles.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
          
          {/* Partner Distribution Section */}
          <div className="grid grid-cols-4 items-start gap-4 mt-4">
            <Label className="text-right pt-2">Partners</Label>
            <div className="col-span-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Partner Distribution</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Partner distribution help</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] p-3">
                        <p className="text-sm">
                          Control which retail partners will receive evergreen content posts at this scheduled time.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup 
                  defaultValue="all"
                  onValueChange={(value) => {
                    if (value === "all") {
                      // Set all partner IDs when "all" is selected
                      setSelectedPartnerIds(partners.map(p => p.id));
                    } else {
                      // Clear selection when switching to "byTag"
                      setSelectedPartnerIds([]);
                    }
                    setPartnerDistribution(value as "all" | "byTag");
                  }}
                  value={partnerDistribution}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all-partners" />
                    <Label htmlFor="all-partners" className="font-normal cursor-pointer">
                      All Retail Partners
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">All partners help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] p-3">
                          <p className="text-sm">
                            Distribute evergreen posts to all retail partners. Each partner will receive a randomly selected post from your evergreen content.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="byTag" id="by-tag" />
                    <Label htmlFor="by-tag" className="font-normal cursor-pointer">
                      Target Partners by Tag
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Target by tag help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] p-3">
                          <p className="text-sm">
                            Select specific tags to target only those retail partners that match at least one of the selected tags.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </RadioGroup>
              </div>
              
              {partnerDistribution === "byTag" && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Partner Tags</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Tag selection help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] p-3">
                          <p className="text-sm">
                            Select one or more tags to filter partners. Only partners with at least one matching tag will receive the evergreen content.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      const currentTags = selectedPartnerTags;
                      if (!currentTags.includes(value)) {
                        setSelectedPartnerTags([...currentTags, value]);
                        // Update selected partner IDs based on the selected tags
                        const taggedPartners = partners.filter(partner => {
                          if (!partner.metadata || typeof partner.metadata !== 'object') return false;
                          const metadata = partner.metadata as { tags?: string[] };
                          if (!metadata.tags || !Array.isArray(metadata.tags)) return false;
                          return [...currentTags, value].some(tag => metadata.tags!.includes(tag));
                        });
                        setSelectedPartnerIds(taggedPartners.map(p => p.id));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select partner tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.length > 0 ? (
                        availableTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          Loading tags...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected tags list with delete option */}
                  {selectedPartnerTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedPartnerTags.map(tag => (
                        <div
                          key={tag}
                          className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
                        >
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 rounded-full"
                            onClick={() => {
                              const newTags = selectedPartnerTags.filter(t => t !== tag);
                              setSelectedPartnerTags(newTags);
                              // Update selected partner IDs based on the remaining tags
                              if (newTags.length === 0) {
                                setSelectedPartnerIds([]);
                              } else {
                                const taggedPartners = partners.filter(partner => {
                                  if (!partner.metadata || typeof partner.metadata !== 'object') return false;
                                  const metadata = partner.metadata as { tags?: string[] };
                                  if (!metadata.tags || !Array.isArray(metadata.tags)) return false;
                                  return newTags.some(t => metadata.tags!.includes(t));
                                });
                                setSelectedPartnerIds(taggedPartners.map(p => p.id));
                              }
                            }}
                          >
                            <span className="sr-only">Remove</span>
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display partners that will receive this post */}
                  {partnerDistribution === "byTag" && selectedPartnerTags.length > 0 && (
                    <div className="mt-4 border rounded-md p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium">Partners receiving this content:</h4>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                <span className="sr-only">Partners list help</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] p-3">
                              <p className="text-sm">
                                This list shows all retail partners that match at least one of your selected tags. Each partner listed will receive an evergreen post.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {selectedPartnerIds.length > 0 ? (
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {partners
                            .filter(p => selectedPartnerIds.includes(p.id))
                            .map(partner => (
                              <div key={partner.id} className="text-sm flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                {partner.name}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No partners match the selected tags.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
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