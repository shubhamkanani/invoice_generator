/**
 * Money math for the whole app. Amounts are integer cents everywhere; products
 * are computed with BigInt so no floating-point drift (0.1 + 0.2) can creep in,
 * and every rounding is "half away from zero" to the nearest cent.
 *
 * Order of operations: round each line to the cent, sum the lines, subtract the
 * fixed discount, then calculate and round the tax on what's left.
 */

export interface Totals {
  lineTotalsCents: number[];
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
}

export interface TotalsInput {
  lineItems: { quantity: number; unitPriceCents: number }[];
  discountCents: number;
  taxRate: number; // percent, up to 3 decimals (8.875 means 8.875%)
}

/** numerator / denominator, rounded to the nearest integer with halves going away from zero. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const quotient = (magnitude * 2n + denominator) / (2n * denominator);
  return negative ? -quotient : quotient;
}

/** quantity × unit price, rounded to the cent. Quantities have at most 2 decimals. */
export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  const quantityHundredths = BigInt(Math.round(quantity * 100));
  return Number(divideRounded(quantityHundredths * BigInt(Math.round(unitPriceCents)), 100n));
}

/**
 * Never throws, even for a discount larger than the subtotal: the live preview
 * calls this with unvalidated input, and validation reports that case separately.
 */
export function calculateTotals(input: TotalsInput): Totals {
  const lineTotalsCents = input.lineItems.map((line) => lineTotalCents(line.quantity, line.unitPriceCents));
  const subtotalCents = lineTotalsCents.reduce((sum, cents) => sum + cents, 0);
  const discountCents = Math.round(input.discountCents);
  const taxableCents = subtotalCents - discountCents;
  // The rate in thousandths of a percent: 10% → 10000, so tax = taxable × rate / 100,000.
  const rateThousandths = BigInt(Math.round(input.taxRate * 1000));
  const taxCents = Number(divideRounded(BigInt(taxableCents) * rateThousandths, 100_000n));
  return {
    lineTotalsCents,
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

export type DecimalParse =
  | { ok: true; scaled: number }
  | { ok: false; reason: "empty" | "invalid" | "negative" | "precision" };

const PLAIN_DECIMAL = /^(\d*)(?:\.(\d*))?$/;
// The first group can't start with 0, so a European "0,500" (half) is rejected, not read as 500.
const THOUSANDS_GROUPED = /^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d*)?$/;

/**
 * Parses what a person typed ("$1,250.50", ".5", "8.875") into an integer scaled
 * by 10^maxDecimals — e.g. dollars into cents — using string arithmetic only.
 * Ambiguous input ("1,5", "1e3") is rejected rather than guessed at.
 */
export function parseDecimal(raw: string, maxDecimals: number): DecimalParse {
  let text = raw.replace(/\s+/g, "");
  if (text === "") return { ok: false, reason: "empty" };
  if (text.startsWith("-") || text.startsWith("$-")) return { ok: false, reason: "negative" };
  text = text.replace(/^\$/, "");

  if (text.includes(",")) {
    if (!THOUSANDS_GROUPED.test(text)) return { ok: false, reason: "invalid" };
    text = text.replaceAll(",", "");
  }

  const match = PLAIN_DECIMAL.exec(text);
  if (!match) return { ok: false, reason: "invalid" };
  const whole = match[1];
  const fraction = (match[2] ?? "").replace(/0+$/, ""); // "1.50" has 1 meaningful decimal
  if (whole === "" && (match[2] ?? "") === "") return { ok: false, reason: "invalid" }; // "." alone
  if (fraction.length > maxDecimals) return { ok: false, reason: "precision" };

  const scaled = Number(whole || "0") * 10 ** maxDecimals + Number(fraction.padEnd(maxDecimals, "0") || "0");
  return { ok: true, scaled };
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 123456 → "$1,234.56" */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

/** 5000 → "50.00", the form an amount takes inside an input field. */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const magnitude = Math.abs(Math.round(cents));
  return `${sign}${Math.trunc(magnitude / 100)}.${String(magnitude % 100).padStart(2, "0")}`;
}

const quantityFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** 1.5 → "1.5", 1000 → "1,000" */
export function formatQuantity(quantity: number): string {
  return quantityFormat.format(quantity);
}

/** 10 → "10%", 8.875 → "8.875%" */
export function formatRate(rate: number): string {
  return `${Number(rate.toFixed(3))}%`;
}
