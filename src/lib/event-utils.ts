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