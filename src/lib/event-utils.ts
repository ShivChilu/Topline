/**
 * Utility functions for event dates and dynamic status resolution.
 */

export function isEventPast(eventDate: Date | string | null | undefined): boolean {
  if (!eventDate) return false;
  const d = new Date(eventDate);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDate = new Date(d);
  evDate.setHours(0, 0, 0, 0);
  return evDate.getTime() < today.getTime();
}

export function getEffectiveEventStatus(event: {
  date?: Date | string | null;
  status: string;
}): string {
  if (!event) return "CLOSED";
  if (event.status === "ARCHIVED") return "ARCHIVED";
  if (event.status === "DRAFT") return "DRAFT";
  if (isEventPast(event.date)) {
    return "COMPLETED";
  }
  return event.status;
}

/**
 * Returns a standardized YYYY-MM-DD date key in Indian Standard Time (Asia/Kolkata).
 */
export function getEventDateKey(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  try {
    const istFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return istFormatter.format(d);
  } catch {
    return d.toISOString().split("T")[0];
  }
}

/**
 * Checks if two event dates fall on the same calendar day (in IST or UTC).
 */
export function isSameEventDate(
  dateA: Date | string | null | undefined,
  dateB: Date | string | null | undefined
): boolean {
  if (!dateA || !dateB) return false;
  const keyA = getEventDateKey(dateA);
  const keyB = getEventDateKey(dateB);
  if (keyA && keyB && keyA === keyB) return true;

  try {
    const utcA = new Date(dateA).toISOString().split("T")[0];
    const utcB = new Date(dateB).toISOString().split("T")[0];
    return utcA === utcB;
  } catch {
    return false;
  }
}

/**
 * Returns formatted readable date string, e.g. "21 November 2026"
 */
export function formatEventDate(date: Date | string | null | undefined): string {
  if (!date) return "Event Date";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Event Date";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
