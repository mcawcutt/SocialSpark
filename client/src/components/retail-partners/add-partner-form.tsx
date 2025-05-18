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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function AddPartnerForm() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [partner, setPartner] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    status: "pending",
    metadata: { tags: [] as string[] },
    brandId: user?.brandId || user?.id || 3 // Use default brandId of 3 (Dulux) if not available
  });
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();

  // Fetch existing tags for suggestions
  const { data: existingTags = [] } = useQuery<string[]>({
    queryKey: ["/api/demo/retail-partners/tags"],
    enabled: open,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPartner((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setPartner((prev) => ({ ...prev, status: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !partner.metadata.tags.includes(newTag.trim())) {
      setPartner((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          tags: [...prev.metadata.tags, newTag.trim()],
        },
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setPartner((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: prev.metadata.tags.filter((t) => t !== tag),
      },
    }));
  };

  const handleSelectExistingTag = (tag: string) => {
    if (!partner.metadata.tags.includes(tag)) {
      setPartner((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          tags: [...prev.metadata.tags, tag],
        },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!partner.name || !partner.contactEmail) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/retail-partners", partner);
      
      toast({
        title: "Partner created",
        description: `${partner.name} has been added to your retail partners`,
      });
      
      // Reset form and close dialog
      setPartner({
        name: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        status: "pending",
        metadata: { tags: [] as string[] },
        brandId: user?.brandId || user?.id || 3
      });
      
      // Invalidate the retail partners query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/retail-partners"] });
      
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error creating partner",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Retail Partner</DialogTitle>
          <DialogDescription>
            Create a new retail partner for your brand. They'll receive an invitation
            to connect their social accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={partner.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="contactEmail"
                type="email"
                value={partner.contactEmail}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                name="contactPhone"
                value={partner.contactPhone}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Textarea
                id="address"
                name="address"
                value={partner.address}
                onChange={handleChange}
                className="col-span-3"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={partner.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="needs_attention">Needs Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Tags</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                
                {existingTags?.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Suggested tags:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {existingTags.filter(tag => !partner.metadata.tags.includes(tag))
                        .slice(0, 8)
                        .map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => handleSelectExistingTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                
                {partner.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {partner.metadata.tags.map((tag) => (
                      <Badge key={tag} className="gap-1 pl-2">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Partner</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}