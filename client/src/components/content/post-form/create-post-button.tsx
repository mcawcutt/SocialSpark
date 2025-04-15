import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { ContentPostForm } from "./content-post-form";
import { PlusIcon } from "lucide-react";

interface CreatePostButtonProps extends ButtonProps {
  isEvergreen?: boolean;
  label?: string;
  scheduledDate?: Date;
}

export function CreatePostButton({ 
  isEvergreen = false, 
  label,
  scheduledDate,
  ...props 
}: CreatePostButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsFormOpen(true)} 
        className="flex items-center"
        {...props}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        {label || (isEvergreen ? "Add Evergreen Content" : "Create Post")}
      </Button>

      <ContentPostForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        isEvergreen={isEvergreen}
        initialData={scheduledDate ? { scheduledDate } : undefined}
      />
    </>
  );
}