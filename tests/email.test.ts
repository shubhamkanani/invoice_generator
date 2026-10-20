import nodemailer, { type Transporter } from "nodemailer";
import { describe, expect, it } from "vitest";
import { EmailRejectedError, getMailConfig, resolveRecipient, sendEmail, smtpTransportOptions } from "@/lib/email/mailer";
import { defaultEmailSubject, renderInvoiceEmail } from "@/lib/email/render-invoice-email";
import type { InvoiceRecord } from "@/lib/invoice/types";
import { checkInput } from "./fixtures";

const record: InvoiceRecord = {
  ...checkInput,
  id: "x",
  status: "draft",
  sentAt: null,
  totals: { subtotalCents: 10000, discountCents: 1000, taxCents: 900, totalCents: 9900 },
  createdAt: "",
  updatedAt: "",
  notes: "<script>alert(1)</script>",
  customFields: [
    { id: "a", label: "PO #", value: "7781", visible: true },
    { id: "b", label: "Project code", value: "NW-ACME-12", visible: false },
  ],
};

describe("renderInvoiceEmail", () => {
  const { html, text } = renderInvoiceEmail(record, { message: "Thanks!\nSee below." });

  it("shows the amount due in both versions", () => {
    expect(html).toContain("$99.00");
    expect(text).toContain("$99.00");
  });

  it("escapes user-entered text", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes visible custom fields only", () => {
    expect(html).toContain("7781");
    expect(html).not.toContain("NW-ACME-12");
    expect(text).not.toContain("NW-ACME-12");
  });

  it("keeps the sender's line breaks", () => {
    expect(html).toContain("Thanks!<br>See below.");
  });

  it("notes a demo redirect", () => {
    expect(renderInvoiceEmail(record, { intendedRecipient: "ap@example.com" }).html).toContain(
      "originally addressed to ap@example.com",
    );
  });

  it("builds the default subject", () => {
    expect(defaultEmailSubject(record)).toBe("Invoice INV-0042 from Northwind Studio");
  });
});

describe("mailer", () => {
  it("redirects every email when MAIL_REDIRECT_TO is set", () => {
    expect(resolveRecipient("ap@example.com", { MAIL_REDIRECT_TO: "me@example.org" })).toEqual({
      deliveredTo: "me@example.org",
      redirectedFrom: "ap@example.com",
    });
    expect(resolveRecipient("ap@example.com", {})).toEqual({ deliveredTo: "ap@example.com" });
  });

  it("reports missing SMTP settings", () => {
    expect(getMailConfig({})).toBeNull();
    expect(getMailConfig({ SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", MAIL_FROM: "a@example.com" })).toMatchObject({
      host: "smtp.example.com",
      port: 465,
      secure: true,
    });
  });

  it("hands the message to the transport", async () => {
    await expect(
      sendEmail(
        { to: "a@example.com", subject: "s", html: "<p>h</p>", text: "t" },
        nodemailer.createTransport({ jsonTransport: true }),
      ),
    ).resolves.toBeUndefined();
  });

  const message = { to: "typo@example.com", subject: "s", html: "<p>h</p>", text: "t" };
  // Stand-in for an SMTP transport; only sendMail is used.
  const transportThat = (sendMail: () => Promise<unknown>) => ({ sendMail }) as unknown as Transporter;

  it("treats a recipient the server accepted the message for but rejected as a failure", async () => {
    const transport = transportThat(async () => ({ accepted: [], rejected: ["typo@example.com"] }));
    const error = await sendEmail(message, transport).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailRejectedError);
    expect((error as EmailRejectedError).recipients).toEqual(["typo@example.com"]);
  });

  it("reports a recipient refused during the SMTP conversation as rejected", async () => {
    const refused = Object.assign(new Error("Can't send mail - all recipients were rejected"), {
      code: "EENVELOPE",
      rejected: ["typo@example.com"],
    });
    const transport = transportThat(async () => {
      throw refused;
    });
    await expect(sendEmail(message, transport)).rejects.toBeInstanceOf(EmailRejectedError);
  });

  it("gives up on an unresponsive mail server within seconds", () => {
    const config = getMailConfig({ SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", MAIL_FROM: "a@example.com" })!;
    const options = smtpTransportOptions(config);
    // Nodemailer's defaults wait up to two minutes; the Send dialog shouldn't.
    expect(options.connectionTimeout).toBeLessThanOrEqual(15_000);
    expect(options.greetingTimeout).toBeLessThanOrEqual(15_000);
    expect(options.socketTimeout).toBeLessThanOrEqual(30_000);
    expect(options).toMatchObject({ host: "smtp.example.com", port: 587, secure: false });
  });

  it("passes other SMTP failures through unchanged", async () => {
    const offline = Object.assign(new Error("connect ECONNREFUSED"), { code: "ESOCKET" });
    const transport = transportThat(async () => {
      throw offline;
    });
    await expect(sendEmail(message, transport)).rejects.toBe(offline);
  });
});
