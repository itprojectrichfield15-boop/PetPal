import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date for display.
 *
 * Returns an em dash rather than the string "Invalid Date" when handed a null,
 * empty or malformed value — several call sites pass values straight from the
 * database, where the column is nullable.
 */
export function formatDate(date: string | Date | null | undefined, fmt = "MMM d, yyyy") {
  if (!date) return "—"
  const d = new Date(date)
  return isValid(d) ? format(d, fmt) : "—"
}

/** "Today", "Yesterday", "3 days ago", then an absolute date. */
export function formatRelative(date: string | Date | null | undefined) {
  if (!date) return "—"
  const d = new Date(date)
  if (!isValid(d)) return "—"

  const diff = Date.now() - d.getTime()

  // A timestamp in the future (clock skew between browser and server) should
  // read as "Just now", not "-1 days ago".
  if (diff < 0) return "Just now"

  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  }
  return format(d, "MMM d, yyyy")
}
