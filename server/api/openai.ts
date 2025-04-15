import { Express, Request, Response } from "express";
import OpenAI from "openai";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export function setupOpenAIRoutes(app: Express) {
  app.post("/api/generate-content", async (req: Request, res: Response) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key is not configured" });
      }

      const { prompt, contentType = "regular" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Adjust system instructions based on content type
      const systemPrompt = contentType === "evergreen" 
        ? "You are a creative marketing expert specializing in evergreen content that remains relevant over time. Generate timeless content that isn't tied to specific dates or events."
        : "You are a creative marketing expert specializing in engaging social media content. Your content should be concise, attention-grabbing, and appropriate for social platforms.";

      // Generate content using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest and most capable model
        messages: [
          {
            role: "system",
            content: `${systemPrompt} Provide a catchy title and compelling content for social media. Your response should be structured as JSON with 'title' and 'content' fields. Keep titles under 60 characters and content under 280 characters.`
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      // Extract and return the generated content
      const result = JSON.parse(completion.choices[0].message.content);
      
      return res.status(200).json({
        title: result.title,
        content: result.content,
        generatedWith: "gpt-4o",
        prompt
      });
    } catch (error) {
      console.error("Error generating content with OpenAI:", error);
      return res.status(500).json({ 
        error: "Failed to generate content", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}