import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names together, resolves Tailwind CSS conflicts
 * @example className={cn("text-red-500", "p-4")}
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}