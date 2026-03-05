import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Merge Tailwind CSS classes with clsx, resolving conflicts via tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string or Date into a human-readable date.
 *
 * @param date  - ISO string or Date object
 * @param style - "short" => "Jan 5, 2025"
 *                "long"  => "January 5, 2025 at 3:45 PM"
 *                "relative" => "3 hours ago"
 *                "iso"   => "2025-01-05"
 */
export function formatDate(
  date: string | Date,
  style: "short" | "long" | "relative" | "iso" = "short"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;

  switch (style) {
    case "short":
      return format(d, "MMM d, yyyy");
    case "long":
      return format(d, "MMMM d, yyyy 'at' h:mm a");
    case "relative":
      return formatDistanceToNow(d, { addSuffix: true });
    case "iso":
      return format(d, "yyyy-MM-dd");
    default:
      return format(d, "MMM d, yyyy");
  }
}

/**
 * Format a number as currency.
 *
 * @param amount   - The numeric value.
 * @param currency - ISO 4217 currency code (default "USD").
 * @param locale   - BCP 47 locale string (default "en-US").
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncate a string to `maxLength` characters, appending an ellipsis if truncated.
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "..."
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
