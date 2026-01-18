/**
 * Utility functions for the web app
 */

/**
 * Conditionally joins class names together.
 * Filters out falsy values (false, null, undefined, 0, '').
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
