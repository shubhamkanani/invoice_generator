import mongoose, { Schema, type Model, type Types } from "mongoose";

/* Mongoose models. Sub-documents carry our own string `id` (generated in the
   browser) instead of Mongo `_id`s, so the editor's keys survive a save. */

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PartyDoc {
  name: string;
  email: string;
  address: string;
}

export interface InvoiceDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  number: string;
  status: "draft" | "sent";
  sentAt: Date | null;
  issueDate: string; // calendar date, YYYY-MM-DD
  dueDate: string;
  business: PartyDoc;
  customer: PartyDoc;
  lineItems: { id: string; description: string; quantity: number; unitPriceCents: number }[];
  discountCents: number;
  taxRate: number;
  customFields: { id: string; label: string; value: string; visible: boolean }[];
  notes: string;
  totals: { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const subdocument = { _id: false, id: false } as const;

const partySchema = new Schema<PartyDoc>(
  { name: { type: String, default: "" }, email: { type: String, default: "" }, address: { type: String, default: "" } },
  subdocument,
);

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    number: { type: String, required: true },
    status: { type: String, enum: ["draft", "sent"], default: "draft" },
    sentAt: { type: Date, default: null },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    business: { type: partySchema, required: true },
    customer: { type: partySchema, required: true },
    lineItems: [
      new Schema(
        { id: String, description: String, quantity: Number, unitPriceCents: Number },
        subdocument,
      ),
    ],
    discountCents: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    customFields: [new Schema({ id: String, label: String, value: String, visible: Boolean }, subdocument)],
    notes: { type: String, default: "" },
    totals: {
      type: new Schema(
        { subtotalCents: Number, discountCents: Number, taxCents: Number, totalCents: Number },
        subdocument,
      ),
      required: true,
    },
  },
  { timestamps: true },
);

// Invoice numbers are unique per account, and the list reads newest first.
invoiceSchema.index({ userId: 1, number: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, createdAt: -1 });

// Reuse compiled models across dev hot reloads.
export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc> | undefined) ?? mongoose.model<UserDoc>("User", userSchema);
export const InvoiceModel: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc> | undefined) ?? mongoose.model<InvoiceDoc>("Invoice", invoiceSchema);

/** MongoDB reports unique-index violations as error code 11000. */
export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

/** Strict ObjectId check (mongoose's isValidObjectId also accepts any 12-character string). */
export function isObjectIdString(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
