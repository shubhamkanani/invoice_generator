import { hashPassword } from "@/lib/auth/password";
import { addDaysISO, todayISO } from "@/lib/dates";
import { connectToDatabase } from "@/lib/db/connect";
import { InvoiceModel, UserModel } from "@/lib/db/models";
import type { InvoiceInput } from "@/lib/invoice/schema";
import { createInvoice } from "@/lib/invoices/service";

/** Fictional demo account. Every address and email here is made up. */
export const DEMO_USER = {
  name: "Northwind Studio",
  email: "demo@example.com",
  password: "remit-demo-2026",
} as const;

const studio = {
  name: "Northwind Studio",
  email: "studio@example.com",
  address: "418 Larkspur Lane\nPortland, OR 97205",
};

const paymentNote =
  "Please pay by bank transfer to Northwind Studio, account 000123456, routing 110000000.\nThank you for your business!";

/** Five invoices, oldest first. INV-0042 is the reference check: 2 × $50 − $10 + 10% tax = $99.00. */
export function demoInvoices(today: string): InvoiceInput[] {
  const issued = (daysAgo: number, termDays = 30) => {
    const issueDate = addDaysISO(today, -daysAgo);
    return { issueDate, dueDate: addDaysISO(issueDate, termDays) };
  };

  return [
    {
      number: "INV-0038",
      ...issued(52),
      business: studio,
      customer: {
        name: "Oakline Logistics",
        email: "finance@example.org",
        address: "2200 Harbor Freight Way, Suite 410\nTacoma, WA 98421",
      },
      lineItems: [
        {
          id: "oak-1",
          description:
            "Annual report design, including data visualisation for twelve regional performance dashboards and a print-ready export for the board pack",
          quantity: 1,
          unitPriceCents: 480000,
        },
        { id: "oak-2", description: "Print production management (hours)", quantity: 6, unitPriceCents: 7500 },
      ],
      discountCents: 48000,
      taxRate: 6,
      customFields: [
        { id: "oak-c1", label: "Payment terms", value: "Net 30", visible: true },
        { id: "oak-c2", label: "Internal ref", value: "OAK-AR-2026", visible: false },
      ],
      notes: paymentNote,
    },
    {
      number: "INV-0039",
      ...issued(38),
      business: studio,
      customer: {
        name: "Meridian Health Collective",
        email: "accounts@example.org",
        address: "77 Alder Court\nBoise, ID 83702",
      },
      lineItems: [
        { id: "mer-1", description: "Monthly design retainer", quantity: 1, unitPriceCents: 320000 },
        { id: "mer-2", description: "Additional support hours", quantity: 1.5, unitPriceCents: 3333 },
      ],
      discountCents: 0,
      taxRate: 7.25,
      customFields: [],
      notes: paymentNote,
    },
    {
      number: "INV-0040",
      ...issued(24, 14),
      business: studio,
      customer: {
        name: "Harbor & Pine Architects",
        email: "studio@example.org",
        address: "5 Wharf Street\nAstoria, OR 97103",
      },
      lineItems: [
        { id: "hp-1", description: "Architectural photography, half-day shoot", quantity: 1, unitPriceCents: 65000 },
        { id: "hp-2", description: "Retouching (per image)", quantity: 18, unitPriceCents: 1250 },
      ],
      discountCents: 0,
      taxRate: 0,
      customFields: [{ id: "hp-c1", label: "Project", value: "Riverside Library", visible: true }],
      notes: paymentNote,
    },
    {
      number: "INV-0041",
      ...issued(12),
      business: studio,
      customer: {
        name: "Bluebird Coffee Co.",
        email: "hello@example.com",
        address: "310 Division Street\nPortland, OR 97202",
      },
      lineItems: [
        { id: "bb-1", description: "Discovery and research (hours)", quantity: 12, unitPriceCents: 8500 },
        { id: "bb-2", description: "Visual design, six page templates", quantity: 6, unitPriceCents: 24000 },
        { id: "bb-3", description: "Front-end build (hours)", quantity: 22.5, unitPriceCents: 9500 },
      ],
      discountCents: 15000,
      taxRate: 8.875,
      customFields: [{ id: "bb-c1", label: "Project", value: "Spring launch website", visible: true }],
      notes: paymentNote,
    },
    {
      number: "INV-0042",
      ...issued(0),
      business: studio,
      customer: {
        name: "Acme Holdings Ltd.",
        email: "accounts@example.com",
        address: "1 Market Street\nSan Francisco, CA 94105",
      },
      lineItems: [{ id: "acme-1", description: "Brand strategy workshop", quantity: 2, unitPriceCents: 5000 }],
      discountCents: 1000,
      taxRate: 10,
      customFields: [
        { id: "acme-c1", label: "PO #", value: "7781", visible: true },
        { id: "acme-c2", label: "Project code", value: "NW-ACME-12", visible: false },
      ],
      notes: paymentNote,
    },
  ];
}

const SENT_NUMBERS = ["INV-0038", "INV-0040", "INV-0041"];

/**
 * Creates (or resets) the demo account and its invoices. Safe to run again:
 * the user is upserted by email and only the demo account's invoices are replaced.
 */
export async function seedDemo(today: string = todayISO()): Promise<{ userId: string; invoiceCount: number }> {
  await connectToDatabase();
  const user = await UserModel.findOneAndUpdate(
    { email: DEMO_USER.email },
    { $set: { name: DEMO_USER.name, passwordHash: await hashPassword(DEMO_USER.password) } },
    { upsert: true, returnDocument: "after" },
  );
  const userId = user!._id.toString();

  await InvoiceModel.deleteMany({ userId: user!._id });
  const invoices = demoInvoices(today);
  for (const invoice of invoices) await createInvoice(userId, invoice); // sequential: keeps newest-first order

  for (const invoice of invoices.filter((inv) => SENT_NUMBERS.includes(inv.number))) {
    await InvoiceModel.updateOne(
      { userId: user!._id, number: invoice.number },
      { $set: { status: "sent", sentAt: new Date(`${invoice.issueDate}T17:00:00Z`) } },
    );
  }
  return { userId, invoiceCount: invoices.length };
}
