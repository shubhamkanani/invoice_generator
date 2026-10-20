import { describe, expect, it } from "vitest";
import { draftReducer } from "@/lib/invoice/draft-reducer";
import { checkDraft } from "./fixtures";

const withCustom = {
  ...checkDraft,
  customFields: [{ id: "c1", label: "PO #", value: "7781", visible: true }],
};

describe("draftReducer", () => {
  it("sets a top-level field", () => {
    expect(draftReducer(checkDraft, { type: "set", field: "notes", value: "Thanks" }).notes).toBe("Thanks");
  });

  it("sets a business or customer field", () => {
    expect(draftReducer(checkDraft, { type: "setParty", party: "customer", field: "name", value: "Bluebird" }).customer.name).toBe(
      "Bluebird",
    );
  });

  it("appends a blank line item with the given id", () => {
    const next = draftReducer(checkDraft, { type: "addLine", id: "l2" });
    expect(next.lineItems.map((l) => l.id)).toEqual([checkDraft.lineItems[0].id, "l2"]);
    expect(next.lineItems[1]).toEqual({ id: "l2", description: "", quantity: "1", unitPrice: "" });
  });

  it("updates and removes a line item by id", () => {
    const updated = draftReducer(checkDraft, { type: "updateLine", id: "l1", patch: { quantity: "3" } });
    expect(updated.lineItems[0].quantity).toBe("3");
    expect(draftReducer(updated, { type: "removeLine", id: "l1" }).lineItems).toEqual([]);
  });

  it("adds, toggles and removes custom fields", () => {
    const added = draftReducer(checkDraft, { type: "addCustomField", id: "c9" });
    expect(added.customFields).toEqual([{ id: "c9", label: "", value: "", visible: true }]);
    expect(draftReducer(withCustom, { type: "updateCustomField", id: "c1", patch: { visible: false } }).customFields[0].visible).toBe(
      false,
    );
    expect(draftReducer(withCustom, { type: "removeCustomField", id: "c1" }).customFields).toEqual([]);
  });

  it("replaces the whole draft", () => {
    const other = { ...checkDraft, number: "INV-9" };
    expect(draftReducer(checkDraft, { type: "replace", draft: other })).toBe(other);
  });

  it("never mutates the previous state", () => {
    const before = JSON.stringify(checkDraft);
    draftReducer(checkDraft, { type: "updateLine", id: "l1", patch: { description: "x" } });
    expect(JSON.stringify(checkDraft)).toBe(before);
  });
});
