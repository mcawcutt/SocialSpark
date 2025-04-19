import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define character types with their associated styles and personalities
export type HelpCharacter = 'helper' | 'expert' | 'coach' | 'buddy';

interface CharacterConfig {
  name: string;
  color: string;
  emoji: string;
  tone: string;
}

const characterConfigs: Record<HelpCharacter, CharacterConfig> = {
  helper: {
    name: 'Ivy',
    color: 'bg-pink-100 border-pink-300 text-pink-900',
    emoji: '💁‍♀️',
    tone: 'friendly and helpful'
  },
  expert: {
    name: 'Prof',
    color: 'bg-blue-100 border-blue-300 text-blue-900',
    emoji: '🧠',
    tone: 'analytical and informative'
  },
  coach: {
    name: 'Coach',
    color: 'bg-green-100 border-green-300 text-green-900',
    emoji: '🏆',
    tone: 'motivational and encouraging'
  },
  buddy: {
    name: 'Buddy',
    color: 'bg-amber-100 border-amber-300 text-amber-900',
    emoji: '😊',
    tone: 'casual and friendly'
  }
};

interface HelpTooltipProps {
  tip: string;
  character?: HelpCharacter;
  className?: string;
  iconClassName?: string;
  animated?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function HelpTooltip({
  tip,
  character = 'helper',
  className,
  iconClassName,
  animated = false,
  side = 'right',
  showIcon = true,
  children
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = characterConfigs[character];
  
  // Format the tip with character personality
  const formattedTip = (
    <div className={cn("max-w-xs p-3 rounded-lg border-2", config.color)}>
      <div className="font-bold flex items-center gap-2 mb-1">
        <span>{config.emoji}</span>
        <span>{config.name} says:</span>
      </div>
      <div>{tip}</div>
    </div>
  );
  
  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {children || (showIcon && (
            <HelpCircle 
              className={cn(
                "h-5 w-5 text-muted-foreground cursor-help inline-flex ml-1",
                animated && "hover:animate-pulse",
                iconClassName
              )} 
            />
          ))}
        </TooltipTrigger>
        <TooltipContent side={side} className="p-0 border-none bg-transparent">
          {formattedTip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}