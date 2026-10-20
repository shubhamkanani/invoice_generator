/**
 * Suggests the next invoice number: one more than the highest trailing number
 * already used ("INV-0041" → "INV-0042"). Numbers people typed by hand still
 * count, and anything without trailing digits is ignored.
 */
export function nextInvoiceNumber(existing: string[]): string {
  let highest = 0;
  for (const number of existing) {
    const match = /(\d+)\s*$/.exec(number);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `INV-${String(highest + 1).padStart(4, "0")}`;
}
