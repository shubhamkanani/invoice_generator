import { describe, expect, it } from "vitest";
import { calculateTotals, centsToInput, formatCents, formatQuantity, formatRate, lineTotalCents, parseDecimal } from "@/lib/money";

describe("calculateTotals", () => {
  it("matches the reference check: 2 × $50 − $10 + 10% tax = $99.00", () => {
    expect(calculateTotals({ lineItems: [{ quantity: 2, unitPriceCents: 5000 }], discountCents: 1000, taxRate: 10 })).toEqual({
      lineTotalsCents: [10000],
      subtotalCents: 10000,
      discountCents: 1000,
      taxableCents: 9000,
      taxCents: 900,
      totalCents: 9900,
    });
  });

  it("rounds each line to the cent before summing", () => {
    const lines = [
      { quantity: 0.5, unitPriceCents: 1 },
      { quantity: 0.5, unitPriceCents: 1 },
    ];
    expect(calculateTotals({ lineItems: lines, discountCents: 0, taxRate: 0 }).subtotalCents).toBe(2);
  });

  it("rounds tax to the cent, halves away from zero", () => {
    expect(calculateTotals({ lineItems: [{ quantity: 1, unitPriceCents: 1005 }], discountCents: 0, taxRate: 8.875 }).taxCents).toBe(89);
    expect(calculateTotals({ lineItems: [{ quantity: 1, unitPriceCents: 10 }], discountCents: 0, taxRate: 5 }).taxCents).toBe(1);
  });

  it("adds cents without floating-point drift", () => {
    const lines = [
      { quantity: 1, unitPriceCents: 10 },
      { quantity: 1, unitPriceCents: 20 },
    ];
    expect(calculateTotals({ lineItems: lines, discountCents: 0, taxRate: 0 }).subtotalCents).toBe(30);
  });

  it("stays exact at the largest allowed line", () => {
    const totals = calculateTotals({ lineItems: [{ quantity: 100000, unitPriceCents: 100000000 }], discountCents: 0, taxRate: 100 });
    expect(totals.totalCents).toBe(2e13); // 1e13¢ line + 100% tax
  });

  it("does not throw when the discount exceeds the subtotal", () => {
    const totals = calculateTotals({ lineItems: [{ quantity: 1, unitPriceCents: 800 }], discountCents: 1000, taxRate: 10 });
    expect(totals).toMatchObject({ taxableCents: -200, taxCents: -20, totalCents: -220 });
  });
});

describe("lineTotalCents", () => {
  it("rounds half a cent up", () => {
    expect(lineTotalCents(1.5, 3333)).toBe(5000); // 49.995 → 50.00
    expect(lineTotalCents(0.5, 1)).toBe(1);
  });
});

describe("parseDecimal", () => {
  it("parses plain and formatted amounts into scaled integers", () => {
    expect(parseDecimal("50", 2)).toEqual({ ok: true, scaled: 5000 });
    expect(parseDecimal("50.5", 2)).toEqual({ ok: true, scaled: 5050 });
    expect(parseDecimal("$1,234.56", 2)).toEqual({ ok: true, scaled: 123456 });
    expect(parseDecimal(" 12 ", 2)).toEqual({ ok: true, scaled: 1200 });
    expect(parseDecimal(".5", 2)).toEqual({ ok: true, scaled: 50 });
    expect(parseDecimal("5.", 2)).toEqual({ ok: true, scaled: 500 });
    expect(parseDecimal("8.875", 3)).toEqual({ ok: true, scaled: 8875 });
  });

  it("reports any minus sign as negative", () => {
    expect(parseDecimal("-5", 2)).toEqual({ ok: false, reason: "negative" });
    expect(parseDecimal("-0", 2)).toEqual({ ok: false, reason: "negative" });
  });

  it("reports too many decimal places", () => {
    expect(parseDecimal("1.234", 2)).toEqual({ ok: false, reason: "precision" });
  });

  it("rejects exponents, comma decimals and garbage instead of guessing", () => {
    for (const bad of ["1e3", "1,5", "abc", "1.2.3", "."]) {
      expect(parseDecimal(bad, 2)).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("rejects comma groups that read like a European decimal", () => {
    // "0,500" means 0.5 in much of Europe; never read it as 500.
    for (const ambiguous of ["0,500", "0,750", "00,500"]) {
      expect(parseDecimal(ambiguous, 2)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(parseDecimal("1,000", 2)).toEqual({ ok: true, scaled: 100000 });
    expect(parseDecimal("12,345.6", 2)).toEqual({ ok: true, scaled: 1234560 });
  });

  it("reports blank input as empty", () => {
    expect(parseDecimal("  ", 2)).toEqual({ ok: false, reason: "empty" });
  });
});

describe("formatting", () => {
  it("formats cents as US dollars", () => {
    expect(formatCents(9900)).toBe("$99.00");
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("formats cents for an input field", () => {
    expect(centsToInput(5000)).toBe("50.00");
    expect(centsToInput(5)).toBe("0.05");
  });

  it("formats quantities with grouping and no trailing zeros", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(1000)).toBe("1,000");
  });

  it("formats a tax rate without trailing zeros", () => {
    expect(formatRate(10)).toBe("10%");
    expect(formatRate(8.875)).toBe("8.875%");
  });
});
