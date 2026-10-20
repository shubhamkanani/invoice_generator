import { describe, expect, it } from "vitest";
import { nextInvoiceNumber } from "@/lib/invoice/numbering";

describe("nextInvoiceNumber", () => {
  it("starts at INV-0001", () => {
    expect(nextInvoiceNumber([])).toBe("INV-0001");
  });

  it("continues after the highest trailing number", () => {
    expect(nextInvoiceNumber(["INV-0001", "INV-0041", "Custom"])).toBe("INV-0042");
    expect(nextInvoiceNumber(["2026-007"])).toBe("INV-0008");
  });

  it("grows past four digits", () => {
    expect(nextInvoiceNumber(["INV-9999"])).toBe("INV-10000");
  });
});
