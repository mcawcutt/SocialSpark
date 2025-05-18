import { useState } from "react";
import { ContentPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { PostToFacebookButton } from "@/components/facebook/post-to-facebook-button";
import { Calendar, Clock, Share2 } from "lucide-react";
import { format } from "date-fns";

interface SocialPostActionsProps {
  post: ContentPost;
}

export function SocialPostActions({ post }: SocialPostActionsProps) {
  return (
    <div className="flex flex-col gap-3 mt-2">
      <div className="flex items-center text-sm text-muted-foreground gap-1">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {post.scheduledDate ? format(new Date(post.scheduledDate), "PPP") : "Not scheduled"}
        </span>
        {post.scheduledDate && (
          <>
            <span className="mx-1">•</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{format(new Date(post.scheduledDate), "p")}</span>
          </>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <span className="text-xs text-muted-foreground">Publish now:</span>
        
        {post.platforms.includes("facebook") && (
          <PostToFacebookButton
            postId={post.id}
            postTitle={post.title}
            postDescription={post.description}
            postImageUrl={post.imageUrl}
          />
        )}
        
        {/* 
          Additional social media platform buttons can be added here
          For example: Instagram, Twitter, etc.
        */}
      </div>
    </div>
  );
}