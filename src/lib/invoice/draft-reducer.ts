import { newCustomField, newLineItemDraft } from "./draft";
import type { CustomField, Party } from "./schema";
import type { InvoiceDraft, LineItemDraft } from "./types";

type TextField = "number" | "issueDate" | "dueDate" | "discount" | "taxRate" | "notes";

/** Every edit the invoice editor can make. Ids are passed in so the reducer stays pure. */
export type DraftAction =
  | { type: "set"; field: TextField; value: string }
  | { type: "setParty"; party: "business" | "customer"; field: keyof Party; value: string }
  | { type: "addLine"; id: string }
  | { type: "updateLine"; id: string; patch: Partial<Omit<LineItemDraft, "id">> }
  | { type: "removeLine"; id: string }
  | { type: "addCustomField"; id: string }
  | { type: "updateCustomField"; id: string; patch: Partial<Omit<CustomField, "id">> }
  | { type: "removeCustomField"; id: string }
  | { type: "replace"; draft: InvoiceDraft };

export function draftReducer(state: InvoiceDraft, action: DraftAction): InvoiceDraft {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value };
    case "setParty":
      return { ...state, [action.party]: { ...state[action.party], [action.field]: action.value } };
    case "addLine":
      return { ...state, lineItems: [...state.lineItems, newLineItemDraft(action.id)] };
    case "updateLine":
      return {
        ...state,
        lineItems: state.lineItems.map((line) => (line.id === action.id ? { ...line, ...action.patch } : line)),
      };
    case "removeLine":
      return { ...state, lineItems: state.lineItems.filter((line) => line.id !== action.id) };
    case "addCustomField":
      return { ...state, customFields: [...state.customFields, newCustomField(action.id)] };
    case "updateCustomField":
      return {
        ...state,
        customFields: state.customFields.map((field) =>
          field.id === action.id ? { ...field, ...action.patch } : field,
        ),
      };
    case "removeCustomField":
      return { ...state, customFields: state.customFields.filter((field) => field.id !== action.id) };
    case "replace":
      return action.draft;
  }
}
