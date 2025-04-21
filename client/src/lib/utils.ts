import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for combining Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string into a human-readable format
 * @param dateString The date string to format
 * @param options Optional formatting options
 * @returns Formatted date string
 */
export function formatDate(
  dateString?: string | null, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  if (!dateString) return 'Not available';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (err) {
    console.error("Error formatting date:", err);
    return 'Error formatting date';
  }
}

/**
 * Truncate a string to a specified length and append an ellipsis
 * @param str The string to truncate
 * @param length Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, length: number = 50): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}

/**
 * Format a number for display (e.g., 1234 -> 1,234)
 * @param num The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Generates initials from a name
 * @param name The full name
 * @param maxLength Maximum number of initials
 * @returns Initials string
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .filter(char => char.length > 0)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

/**
 * Capitalize the first letter of each word in a string
 * @param str The input string
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}