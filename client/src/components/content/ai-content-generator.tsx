import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

interface AIContentGeneratorProps {
  onContentGenerated: (title: string, description: string) => void;
  contentType?: "regular" | "evergreen";
}

export function AIContentGenerator({
  onContentGenerated,
  contentType = "regular",
}: AIContentGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();

  // Define the AI content generation mutation
  const generateContentMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/generate-content", {
        prompt,
        contentType
      });
      return await res.json();
    },
    onSuccess: (data) => {
      onContentGenerated(data.title, data.content);
      setPrompt("");
    },
    onError: (error: Error) => {
      toast({
        title: "AI generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateContent = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate content",
        variant: "destructive",
      });
      return;
    }
    
    generateContentMutation.mutate(prompt);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={
            contentType === "evergreen"
              ? "E.g., 'Tips for selecting the perfect perfume'"
              : "E.g., 'Announce our new summer collection'"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1"
          disabled={generateContentMutation.isPending}
        />
        <Button
          onClick={handleGenerateContent}
          disabled={generateContentMutation.isPending || !prompt.trim()}
          size="sm"
        >
          {generateContentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {contentType === "evergreen"
          ? "Create timeless, reusable content that's not tied to specific dates or events"
          : "Generate content for a specific post, event, or announcement"}
      </p>
    </div>
  );
}