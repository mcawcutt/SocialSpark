import { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Leaf } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EvergreenPostIconProps {
  index: number;
}

export function EvergreenPostIcon({ index }: EvergreenPostIconProps) {
  console.log("[EvergreenPostIcon] Rendering at index:", index);
  return (
    <Draggable draggableId="evergreen-post" index={index}>
      {(provided, snapshot) => {
        console.log("[EvergreenPostIcon] Draggable state:", { 
          isDragging: snapshot.isDragging, 
          draggingOver: snapshot.draggingOver 
        });
        
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center bg-green-100 hover:bg-green-200 transition-colors cursor-grab",
              snapshot.isDragging && "shadow-lg cursor-grabbing bg-green-300"
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-green-700" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Drag to schedule an evergreen post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      }}
    </Draggable>
  );
}