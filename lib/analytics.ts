import type { Booking, BookingStatus } from "@/types/database";

export type BookingForAnalytics = Pick<
  Booking,
  "status" | "booking_date" | "start_time" | "client_id" | "barber_id" | "service_id" | "rescheduled_count"
> & {
  price?: number;
  duration_minutes?: number;
};

/** Sum of prices for completed bookings. */
export function calculateLTV(
  bookings: Array<{ status: BookingStatus; price: number }>
): number {
  return bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.price), 0);
}

/**
 * Average days between consecutive completed bookings (sorted by date).
 * Returns null when fewer than 2 completed bookings.
 */
export function calculateAvgInterval(
  bookings: Array<{ status: BookingStatus; booking_date: string }>
): number | null {
  const dates = bookings
    .filter((b) => b.status === "completed")
    .map((b) => b.booking_date)
    .sort();

  if (dates.length < 2) return null;

  let total = 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    total += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
  }
  return Math.round(total / (dates.length - 1));
}

/** no_show / (completed + no_show + cancelled). Returns 0 if denominator is 0. */
export function calculateNoShowRate(
  bookings: Array<{ status: BookingStatus }>
): number {
  const relevant = bookings.filter((b) =>
    ["completed", "no_show", "cancelled"].includes(b.status)
  );
  if (relevant.length === 0) return 0;
  const noShows = relevant.filter((b) => b.status === "no_show").length;
  return noShows / relevant.length;
}

/** price / (durationMinutes / 60) */
export function calculateRevenuePerHour(
  price: number,
  durationMinutes: number
): number {
  if (!durationMinutes || durationMinutes <= 0) return 0;
  return Number(price) / (durationMinutes / 60);
}
