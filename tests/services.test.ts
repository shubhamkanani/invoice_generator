import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { UserModel } from "@/lib/db/models";
import {
  DuplicateInvoiceNumberError,
  createInvoice,
  deleteInvoice,
  getInvoice,
  getNewInvoiceDefaults,
  listInvoices,
  markInvoiceSent,
  updateInvoice,
} from "@/lib/invoices/service";
import { DEMO_USER, seedDemo } from "@/lib/seed/demo";
import { EmailTakenError, authenticateUser, createUser, getUserById } from "@/lib/users/service";
import { checkInput } from "./fixtures";
import { setupTestDatabase } from "./helpers/db";

setupTestDatabase();

const makeUser = (email = "ada@example.com") => createUser({ name: "Ada", email, password: "longenough" });

describe("users", () => {
  it("normalises the email and never stores the plain password", async () => {
    const user = await createUser({ name: " Ada ", email: "  Ada@Example.COM ", password: "longenough" });
    expect(user).toMatchObject({ name: "Ada", email: "ada@example.com" });
    const stored = await UserModel.findById(user.id).lean();
    expect(stored!.passwordHash).not.toContain("longenough");
  });

  it("rejects an email that is already registered", async () => {
    await makeUser();
    await expect(makeUser("ADA@example.com")).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("authenticates with any email casing and rejects a wrong password", async () => {
    const user = await makeUser();
    expect(await authenticateUser("ada@example.com", "wrong-pass")).toBeNull();
    expect(await authenticateUser("nobody@example.com", "longenough")).toBeNull();
    expect((await authenticateUser("ADA@example.com", "longenough"))!.id).toBe(user.id);
  });

  it("looks users up by id and tolerates malformed ids", async () => {
    const user = await makeUser();
    expect(await getUserById(user.id)).toEqual(user);
    expect(await getUserById("not-an-id")).toBeNull();
  });
});

describe("invoices", () => {
  it("stores totals calculated on the server, ignoring client totals", async () => {
    const user = await makeUser();
    const invoice = await createInvoice(user.id, { ...checkInput, totals: { totalCents: 1 } });
    expect(invoice.totals).toEqual({ subtotalCents: 10000, discountCents: 1000, taxCents: 900, totalCents: 9900 });
    expect(invoice).toMatchObject({ status: "draft", sentAt: null, number: "INV-0042" });
  });

  it("rejects invalid input", async () => {
    const user = await makeUser();
    await expect(createInvoice(user.id, { ...checkInput, discountCents: 20000 })).rejects.toBeInstanceOf(ZodError);
  });

  it("keeps invoice numbers unique per account only", async () => {
    const user = await makeUser();
    const other = await makeUser("bo@example.com");
    await createInvoice(user.id, checkInput);
    await expect(createInvoice(user.id, checkInput)).rejects.toBeInstanceOf(DuplicateInvoiceNumberError);
    await expect(createInvoice(other.id, checkInput)).resolves.toMatchObject({ number: "INV-0042" });
  });

  it("never exposes another account's invoice", async () => {
    const user = await makeUser();
    const other = await makeUser("bo@example.com");
    const invoice = await createInvoice(user.id, checkInput);
    expect(await getInvoice(other.id, invoice.id)).toBeNull();
    expect(await updateInvoice(other.id, invoice.id, checkInput)).toBeNull();
    expect(await markInvoiceSent(other.id, invoice.id)).toBeNull();
    expect(await deleteInvoice(other.id, invoice.id)).toBe(false);
    expect(await getInvoice(user.id, "not-an-id")).toBeNull();
    expect((await getInvoice(user.id, invoice.id))!.id).toBe(invoice.id);
  });

  it("recalculates on update and keeps a sent invoice sent", async () => {
    const user = await makeUser();
    const invoice = await createInvoice(user.id, checkInput);
    expect((await markInvoiceSent(user.id, invoice.id))!.status).toBe("sent");
    const updated = await updateInvoice(user.id, invoice.id, { ...checkInput, taxRate: 0 });
    expect(updated!.totals.totalCents).toBe(9000);
    expect(updated!.status).toBe("sent");
    expect(updated!.sentAt).not.toBeNull();
  });

  it("rejects renumbering onto an existing number", async () => {
    const user = await makeUser();
    await createInvoice(user.id, checkInput);
    const second = await createInvoice(user.id, { ...checkInput, number: "INV-0043" });
    await expect(updateInvoice(user.id, second.id, checkInput)).rejects.toBeInstanceOf(DuplicateInvoiceNumberError);
  });

  it("lists the account's invoices newest first", async () => {
    const user = await makeUser();
    await createInvoice(user.id, { ...checkInput, number: "INV-0001" });
    await createInvoice(user.id, { ...checkInput, number: "INV-0002" });
    const list = await listInvoices(user.id);
    expect(list.map((row) => row.number)).toEqual(["INV-0002", "INV-0001"]);
    expect(list[0]).toMatchObject({ customerName: "Acme Holdings Ltd.", totalCents: 9900, status: "draft" });
  });

  it("deletes an invoice", async () => {
    const user = await makeUser();
    const invoice = await createInvoice(user.id, checkInput);
    expect(await deleteInvoice(user.id, invoice.id)).toBe(true);
    expect(await getInvoice(user.id, invoice.id)).toBeNull();
  });

  it("suggests the next number, dates and the last business details", async () => {
    const user = await makeUser();
    await createInvoice(user.id, checkInput);
    expect(await getNewInvoiceDefaults(user.id, "2026-10-20")).toMatchObject({
      number: "INV-0043",
      issueDate: "2026-10-20",
      dueDate: "2026-11-19",
      business: { name: "Northwind Studio", email: "studio@example.com" },
      customer: { name: "", email: "", address: "" },
      lineItems: [],
      discountCents: 0,
      taxRate: 0,
    });
  });

  it("starts a new account at INV-0001 with blank business details", async () => {
    const user = await makeUser();
    expect(await getNewInvoiceDefaults(user.id, "2026-10-20")).toMatchObject({
      number: "INV-0001",
      business: { name: "", email: "", address: "" },
    });
  });
});

describe("seedDemo", () => {
  it("resets the demo account without touching other accounts", async () => {
    const other = await makeUser("bo@example.com");
    await createInvoice(other.id, checkInput);

    await seedDemo("2026-10-20");
    const { userId, invoiceCount } = await seedDemo("2026-10-20");

    expect(invoiceCount).toBe(5);
    const invoices = await listInvoices(userId);
    expect(invoices).toHaveLength(5);
    expect(invoices[0]).toMatchObject({ number: "INV-0042", totalCents: 9900, status: "draft" });
    expect(invoices.filter((row) => row.status === "sent").map((row) => row.number).sort()).toEqual([
      "INV-0038",
      "INV-0040",
      "INV-0041",
    ]);
    expect(await UserModel.countDocuments({ email: DEMO_USER.email })).toBe(1);
    expect(await listInvoices(other.id)).toHaveLength(1);
    expect(await authenticateUser(DEMO_USER.email, DEMO_USER.password)).not.toBeNull();
  });

  it("keeps the reference invoice's hidden field out of the calculation", async () => {
    const { userId } = await seedDemo("2026-10-20");
    const reference = (await listInvoices(userId)).find((row) => row.number === "INV-0042")!;
    const invoice = await getInvoice(userId, reference.id);
    expect(invoice!.customFields).toEqual([
      expect.objectContaining({ label: "PO #", value: "7781", visible: true }),
      expect.objectContaining({ label: "Project code", value: "NW-ACME-12", visible: false }),
    ]);
    expect(invoice!.totals.totalCents).toBe(9900);
  });
});
