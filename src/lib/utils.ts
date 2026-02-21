/**
 * General utility functions shared across the application.
 *
 * @module utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * Combines `clsx` (conditional class joining) with `tailwind-merge`
 * (resolves conflicting Tailwind classes, e.g., "p-2 p-4" → "p-4").
 *
 * @param inputs - Class names, arrays, or conditional objects
 * @returns Merged class name string
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-primary", "px-4")
 * // → "py-1 px-4 bg-primary" (px-4 wins over px-2)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
