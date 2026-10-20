import { NextResponse } from "next/server";
import { SESSION_EXPIRED, jsonError, readJson, serverError, zodFieldErrors } from "@/lib/api";
import { EmailRejectedError, getMailConfig, resolveRecipient, sendEmail } from "@/lib/email/mailer";
import { renderInvoiceEmail } from "@/lib/email/render-invoice-email";
import { sendInvoiceSchema } from "@/lib/invoice/schema";
import { getApiUserId } from "@/lib/invoices/http";
import { getInvoice, markInvoiceSent } from "@/lib/invoices/service";

/** Emails the saved invoice (rendered here from stored data) and marks it Sent. */
export async function POST(request: Request, { params }: RouteContext<"/api/invoices/[id]/send">) {
  const userId = await getApiUserId();
  if (!userId) return jsonError(401, SESSION_EXPIRED);

  const parsed = sendInvoiceSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(422, "Please fix the highlighted fields", zodFieldErrors(parsed.error));

  try {
    const { id } = await params;
    const invoice = await getInvoice(userId, id);
    if (!invoice) return jsonError(404, "Invoice not found");
    if (!getMailConfig()) return jsonError(503, "Email isn't set up yet. Add your SMTP settings to .env.");

    const { deliveredTo, redirectedFrom } = resolveRecipient(parsed.data.to);
    const { html, text } = renderInvoiceEmail(invoice, { message: parsed.data.message, intendedRecipient: redirectedFrom });
    try {
      await sendEmail({
        to: deliveredTo,
        subject: parsed.data.subject,
        html,
        text,
        replyTo: invoice.business.email || undefined,
      });
    } catch (error) {
      if (error instanceof EmailRejectedError) {
        const message = `The mail server rejected ${deliveredTo}. Check the address and try again.`;
        return jsonError(422, message, redirectedFrom ? undefined : { to: message });
      }
      console.error("SMTP send failed:", error);
      return jsonError(502, "The email provider couldn't send this message. Please try again.");
    }

    const sent = await markInvoiceSent(userId, id);
    return NextResponse.json({ invoice: sent, deliveredTo, redirected: Boolean(redirectedFrom) });
  } catch (error) {
    return serverError(error);
  }
}
