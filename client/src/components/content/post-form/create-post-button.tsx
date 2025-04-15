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
  const buttonLabel = label || (isEvergreen ? "Add Evergreen Content" : "Create Post");
  
  const handleClick = () => {
    console.log("Opening post form dialog");
    setIsFormOpen(true);
  };
  
  const handleClose = () => {
    console.log("Closing post form dialog");
    setIsFormOpen(false);
  };

  // Prepare initial data if scheduledDate is provided
  const initialData = scheduledDate ? { 
    scheduledDate,
    // We can add any default values here
    title: "",
    description: "",
    platforms: ["facebook", "instagram"],
  } : undefined;
  
  // Add a special class if this is the dashboard "Create New Post" button
  const isCreateNewPost = buttonLabel === "Create New Post";
  const buttonClass = `flex items-center ${isCreateNewPost ? 'create-new-post-button' : ''}`;

  return (
    <>
      <Button 
        onClick={handleClick} 
        className={buttonClass}
        {...props}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <ContentPostForm
        isOpen={isFormOpen}
        onClose={handleClose}
        isEvergreen={isEvergreen}
        initialData={initialData}
      />
    </>
  );
}