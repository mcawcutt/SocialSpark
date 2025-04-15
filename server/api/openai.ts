import { Express, Request, Response } from "express";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function setupOpenAIRoutes(app: Express) {
  // Endpoint for generating content based on a prompt
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      // Extract parameters from request
      const { prompt, category, platform, contentType } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      // Build a system message based on content type and platform
      let systemMessage = "You are a skilled content creator for social media.";
      
      if (contentType === "evergreen") {
        systemMessage += " Create evergreen content that will remain relevant over time.";
      } else if (contentType === "promotional") {
        systemMessage += " Create promotional content that drives engagement and conversions.";
      }
      
      if (platform) {
        const platforms = Array.isArray(platform) ? platform : [platform];
        
        if (platforms.includes("facebook")) {
          systemMessage += " For Facebook, focus on engaging and shareable content.";
        }
        
        if (platforms.includes("instagram")) {
          systemMessage += " For Instagram, create visually descriptive and trendy content with relevant hashtags.";
        }
        
        if (platforms.includes("google")) {
          systemMessage += " For Google Business, focus on informative and locally relevant content.";
        }
      }
      
      if (category) {
        systemMessage += ` The content category is "${category}".`;
      }
      
      systemMessage += " Provide a title and description for the post. Format your response as JSON with 'title' and 'description' keys.";
      
      // Call OpenAI API to generate content
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Extract the generated content
      const generatedContent = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Return the generated content
      res.json({
        title: generatedContent.title || "Generated Title",
        description: generatedContent.description || "Generated Description",
        prompt,
        metadata: {
          category,
          generatedWith: "AI",
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error("Error generating content:", error.message);
      res.status(500).json({ 
        error: "Failed to generate content", 
        details: error.message 
      });
    }
  });
}