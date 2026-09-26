export function formatEuro(amount: number): string {
  return `€${Number(amount).toFixed(2)}`;
}

export function formatEuroGrouped(amount: number): string {
  const n = Number(amount);
  const [whole, frac] = n.toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `€${withCommas}.${frac}`;
}

export function formatDateDDMMYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export function formatDateDDMM(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}.${m}`;
}

export function formatTimeHHMM(time: string): string {
  return time.slice(0, 5);
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function formatScheduleTitle(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export function addMinutesToTime(time: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(time) + durationMinutes);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  return as < be && bs < ae;
}

export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 19 * 60;
export const SLOT_PX = 20;
export const SLOTS_PER_DAY = (DAY_END_MIN - DAY_START_MIN) / 15;
