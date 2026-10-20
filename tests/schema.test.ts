import { describe, expect, it } from "vitest";
import { invoiceInputSchema, sendInvoiceSchema } from "@/lib/invoice/schema";
import { checkInput } from "./fixtures";

describe("invoiceInputSchema", () => {
  it("accepts the reference invoice", () => {
    expect(invoiceInputSchema.safeParse(checkInput).success).toBe(true);
  });

  it("rejects a discount above the subtotal on the discount field", () => {
    const result = invoiceInputSchema.safeParse({ ...checkInput, discountCents: 10001 });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toEqual(["discountCents"]);
  });

  it("rejects negative quantities", () => {
    const line = checkInput.lineItems[0];
    expect(invoiceInputSchema.safeParse({ ...checkInput, lineItems: [{ ...line, quantity: -1 }] }).success).toBe(false);
  });

  it("rejects fractional cents", () => {
    const line = checkInput.lineItems[0];
    expect(invoiceInputSchema.safeParse({ ...checkInput, lineItems: [{ ...line, unitPriceCents: 10.5 }] }).success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(invoiceInputSchema.safeParse({ ...checkInput, issueDate: "2026-02-30" }).success).toBe(false);
  });

  it("drops client-supplied totals", () => {
    expect(invoiceInputSchema.parse({ ...checkInput, totals: { totalCents: 1 } })).not.toHaveProperty("totals");
  });
});

describe("sendInvoiceSchema", () => {
  it("accepts a normal message", () => {
    expect(sendInvoiceSchema.safeParse({ to: "a@example.com", subject: "Invoice INV-0042", message: "" }).success).toBe(true);
  });

  it("rejects header injection in the subject", () => {
    expect(sendInvoiceSchema.safeParse({ to: "a@example.com", subject: "Hi\r\nBcc: x@example.com", message: "" }).success).toBe(false);
  });

  it("rejects an invalid recipient", () => {
    expect(sendInvoiceSchema.safeParse({ to: "not-an-email", subject: "Hi", message: "" }).success).toBe(false);
  });
});
