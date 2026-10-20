import { describe, expect, it } from "vitest";
import { fieldId, inputToDraft, newLineItemDraft, previewFromDraft, toDraftPath, validateDraft } from "@/lib/invoice/draft";
import { checkDraft, checkInput, withLine, withParty } from "./fixtures";

describe("inputToDraft", () => {
  it("turns stored numbers into the strings the form edits", () => {
    const draft = inputToDraft(checkInput);
    expect(draft.lineItems[0]).toEqual({ id: "l1", description: "Brand strategy workshop", quantity: "2", unitPrice: "50.00" });
    expect(draft).toMatchObject({ discount: "10.00", taxRate: "10" });
  });

  it("leaves zero discount and tax blank so typing does not append to zeros", () => {
    const draft = inputToDraft({ ...checkInput, discountCents: 0, taxRate: 0 });
    expect(draft).toMatchObject({ discount: "", taxRate: "" });
  });
});

describe("newLineItemDraft", () => {
  it("starts with quantity 1 and a blank price", () => {
    expect(newLineItemDraft("l9")).toEqual({ id: "l9", description: "", quantity: "1", unitPrice: "" });
  });
});

describe("validateDraft", () => {
  it("converts a valid draft into cents and numbers", () => {
    const { input, errors } = validateDraft(checkDraft);
    expect(errors).toEqual({});
    expect(input!.lineItems[0]).toMatchObject({ quantity: 2, unitPriceCents: 5000 });
    expect(input!).toMatchObject({ discountCents: 1000, taxRate: 10 });
  });

  it("returns no input while any field has an error", () => {
    expect(validateDraft(withLine({ quantity: "-1" })).input).toBeNull();
  });

  it("rejects negative numbers with field-specific messages", () => {
    expect(validateDraft(withLine({ quantity: "-1" })).errors["lineItems.0.quantity"]).toBe("Quantity can't be negative");
    expect(validateDraft(withLine({ unitPrice: "-5" })).errors["lineItems.0.unitPrice"]).toBe("Price can't be negative");
    expect(validateDraft({ ...checkDraft, discount: "-1" }).errors.discount).toBe("Discount can't be negative");
    expect(validateDraft({ ...checkDraft, taxRate: "-2" }).errors.taxRate).toBe("Tax rate can't be negative");
  });

  it("rejects malformed and over-precise numbers", () => {
    expect(validateDraft(withLine({ unitPrice: "12.345" })).errors["lineItems.0.unitPrice"]).toBe("Use at most 2 decimal places");
    expect(validateDraft(withLine({ quantity: "abc" })).errors["lineItems.0.quantity"]).toBe("Enter a number");
    expect(validateDraft({ ...checkDraft, taxRate: "8.8755" }).errors.taxRate).toBe("Use at most 3 decimal places");
  });

  it("caps the tax rate at 100%", () => {
    expect(validateDraft({ ...checkDraft, taxRate: "101" }).errors.taxRate).toBe("Tax rate can't be more than 100%");
  });

  it("caps quantity and price", () => {
    expect(validateDraft(withLine({ quantity: "100001" })).errors["lineItems.0.quantity"]).toBe("Quantity is too large");
    expect(validateDraft(withLine({ unitPrice: "1000000.01" })).errors["lineItems.0.unitPrice"]).toBe("Price is too large");
  });

  it("treats a blank discount and tax rate as zero", () => {
    const { input, errors } = validateDraft({ ...checkDraft, discount: "", taxRate: "" });
    expect(errors).toEqual({});
    expect(input!).toMatchObject({ discountCents: 0, taxRate: 0 });
  });

  it("asks for a quantity and price when they are blank", () => {
    const { errors } = validateDraft(withLine({ quantity: "", unitPrice: "" }));
    expect(errors["lineItems.0.quantity"]).toBe("Enter a quantity");
    expect(errors["lineItems.0.unitPrice"]).toBe("Enter a price");
  });

  it("does not let the discount exceed the subtotal", () => {
    expect(validateDraft({ ...checkDraft, discount: "150" }).errors.discount).toBe(
      "Discount can't be more than the subtotal ($100.00)",
    );
  });

  it("flags the discount when removing lines drops the subtotal below it", () => {
    expect(validateDraft({ ...checkDraft, lineItems: [] }).errors).toMatchObject({
      lineItems: "Add at least one line item",
      discount: "Discount can't be more than the subtotal ($0.00)",
    });
  });

  it("requires the due date to be on or after the issue date", () => {
    expect(validateDraft({ ...checkDraft, dueDate: "2026-10-01" }).errors.dueDate).toBe(
      "Due date must be on or after the issue date",
    );
  });

  it("requires descriptions, names and a valid email", () => {
    expect(validateDraft(withLine({ description: " " })).errors["lineItems.0.description"]).toBe("Add a description");
    expect(validateDraft(withParty("business", { name: "" })).errors["business.name"]).toBe("Enter your business name");
    expect(validateDraft(withParty("customer", { name: "" })).errors["customer.name"]).toBe("Enter the customer's name");
    expect(validateDraft(withParty("customer", { email: "nope" })).errors["customer.email"]).toBe("Enter a valid email address");
    expect(validateDraft({ ...checkDraft, number: " " }).errors.number).toBe("Enter an invoice number");
  });

  it("requires a label and value on custom fields", () => {
    const { errors } = validateDraft({ ...checkDraft, customFields: [{ id: "c1", label: "", value: "", visible: true }] });
    expect(errors["customFields.0.label"]).toBe("Add a label");
    expect(errors["customFields.0.value"]).toBe("Add a value");
  });
});

describe("previewFromDraft", () => {
  it("ignores custom fields when calculating", () => {
    const draft = { ...checkDraft, customFields: [{ id: "c1", label: "PO", value: "7781", visible: false }] };
    expect(previewFromDraft(draft).totals.totalCents).toBe(9900);
  });

  it("renders unparsable numbers as zero instead of throwing", () => {
    expect(() => previewFromDraft(withLine({ quantity: "abc" }))).not.toThrow();
    expect(previewFromDraft(withLine({ quantity: "abc" })).totals.subtotalCents).toBe(0);
  });
});

describe("paths", () => {
  it("maps server field paths onto the form's field names", () => {
    expect(toDraftPath("lineItems.0.unitPriceCents")).toBe("lineItems.0.unitPrice");
    expect(toDraftPath("discountCents")).toBe("discount");
    expect(toDraftPath("customer.email")).toBe("customer.email");
  });

  it("builds DOM ids from field paths", () => {
    expect(fieldId("lineItems.0.unitPrice")).toBe("f-lineItems-0-unitPrice");
  });
});
