/**
 * Utility Functions
 *
 * Common utility functions used throughout the application.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind CSS merge support.
 * Uses clsx for conditional classes and twMerge for Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
