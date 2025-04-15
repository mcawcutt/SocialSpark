import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type AIContentGeneratorProps = {
  onContentGenerated: (title: string, description: string) => void;
  contentType?: "regular" | "evergreen";
  className?: string;
};

export function AIContentGenerator({ 
  onContentGenerated, 
  contentType = "regular",
  className = ""
}: AIContentGeneratorProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiRequest("POST", "/api/generate-content", {
        prompt,
        category,
        platform,
        contentType: contentType === "evergreen" ? "evergreen" : "promotional"
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      
      onContentGenerated(data.title, data.description);
      
      toast({
        title: "Content generated!",
        description: "AI has created content based on your prompt.",
      });
      
      // Clear the prompt after successful generation
      setPrompt("");
      
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Content Generator
        </CardTitle>
        <CardDescription>
          {contentType === "evergreen" 
            ? "Create timeless evergreen content with AI assistance" 
            : "Generate engaging social media content with AI"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="w-2/3">
            <Input 
              placeholder="Content category (e.g., 'promotions', 'tips', 'announcements')" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="w-1/3">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google">Google Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Textarea
            placeholder="Describe what you want to post about..."
            className="min-h-[120px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => setPrompt(prompt + " Include a seasonal promotion")}>
            Seasonal Promotion
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => setPrompt(prompt + " Highlight product benefits")}>
            Product Benefits
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => setPrompt(prompt + " Create a customer testimonial")}>
            Testimonial
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => setPrompt(prompt + " Make it humorous")}>
            Humorous
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => setPrompt(prompt + " Add hashtags")}>
            With Hashtags
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}