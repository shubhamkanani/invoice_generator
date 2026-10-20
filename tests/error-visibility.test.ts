import { describe, expect, it } from "vitest";
import { isErrorVisible } from "@/lib/invoice/error-visibility";

const fresh = { submitted: false, touched: false };

describe("isErrorVisible", () => {
  it("shows problems in typed numbers right away", () => {
    expect(isErrorVisible("lineItems.0.quantity", "-1", fresh)).toBe(true);
    expect(isErrorVisible("discount", "150", fresh)).toBe(true);
  });

  it("waits for blur or a save attempt before asking for a required field", () => {
    expect(isErrorVisible("business.name", "", fresh)).toBe(false);
    expect(isErrorVisible("business.name", "", { submitted: false, touched: true })).toBe(true);
    expect(isErrorVisible("business.name", "", { submitted: true, touched: false })).toBe(true);
  });

  it("doesn't flag an email address while it is still being typed", () => {
    expect(isErrorVisible("customer.email", "a", fresh)).toBe(false);
    expect(isErrorVisible("customer.email", "a", { submitted: false, touched: true })).toBe(true);
    expect(isErrorVisible("customer.email", "a", { submitted: true, touched: false })).toBe(true);
  });
});
