/**
 * Invoice dates are calendar dates ("2026-11-19"), not instants. They are kept as
 * YYYY-MM-DD strings and only ever turned into Date objects in UTC, so a US time
 * zone can never shift them to the previous day (new Date("2026-11-19") would).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split("-").map(Number);
  return [year, month, day];
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = parts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Today's date in the local time zone of whoever runs this. */
export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = parts(iso);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const displayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-19" → "Nov 19, 2026". Blank or invalid input gives "" so a half-edited form still renders. */
export function formatDateISO(iso: string): string {
  if (!isValidISODate(iso)) return "";
  const [year, month, day] = parts(iso);
  return displayFormat.format(new Date(Date.UTC(year, month - 1, day)));
}
