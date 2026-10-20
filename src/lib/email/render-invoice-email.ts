import { formatDateISO } from "@/lib/dates";
import type { InvoiceInput } from "@/lib/invoice/schema";
import { calculateTotals, formatCents, formatQuantity, formatRate } from "@/lib/money";

/*
 * The invoice email, built on the server from the saved invoice (never from
 * HTML sent by the browser). Email clients ignore stylesheets and web fonts, so
 * the layout is tables with inline styles and a system sans-serif stack.
 * Every piece of user text is escaped. Pure functions with no Node-only
 * imports, so the editor can reuse defaultEmailSubject.
 */

const C = {
  paper: "#F4F1EA",
  sheet: "#FFFFFF",
  ink: "#1C2B24",
  forest: "#1F3D2F",
  brass: "#A9844A",
  brassInk: "#7D5F2E",
  brassSoft: "#C9B48A",
  muted: "#5F6B63",
  hairline: "#E3DCCB",
};
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

type EmailInvoice = Pick<
  InvoiceInput,
  "number" | "issueDate" | "dueDate" | "business" | "customer" | "lineItems" | "discountCents" | "taxRate" | "customFields" | "notes"
>;

export function defaultEmailSubject(invoice: Pick<InvoiceInput, "number" | "business">): string {
  return `Invoice ${invoice.number} from ${invoice.business.name}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escaped, with line breaks kept. */
const multiline = (value: string) => escapeHtml(value).replaceAll("\n", "<br>");

const eyebrow = (label: string, color = C.brassInk) =>
  `<div style="font:600 10px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${color};">${escapeHtml(label)}</div>`;

export function renderInvoiceEmail(
  invoice: EmailInvoice,
  options: { message?: string; intendedRecipient?: string } = {},
): { html: string; text: string } {
  const totals = calculateTotals(invoice);
  const due = formatDateISO(invoice.dueDate);
  const amountDue = formatCents(totals.totalCents);
  const visibleFields = invoice.customFields.filter((field) => field.visible);
  const message = options.message?.trim();

  const detailRows = [
    ["Invoice no.", invoice.number],
    ["Issued", formatDateISO(invoice.issueDate)],
    ["Due", due],
    ...visibleFields.map((field) => [field.label, field.value]),
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:2px 12px 2px 0;font:12px/1.5 ${SANS};color:${C.muted};">${escapeHtml(label)}</td><td style="padding:2px 0;font:12px/1.5 ${SANS};color:${C.ink};text-align:right;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const lineRows = invoice.lineItems
    .map(
      (line, index) => `<tr>
        <td style="padding:10px 8px 10px 0;border-bottom:1px solid ${C.hairline};font:13px/1.45 ${SANS};color:${C.ink};">${escapeHtml(line.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${C.hairline};font:13px/1.45 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;">${formatQuantity(line.quantity)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${C.hairline};font:13px/1.45 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;">${formatCents(line.unitPriceCents)}</td>
        <td style="padding:10px 0 10px 8px;border-bottom:1px solid ${C.hairline};font:13px/1.45 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;">${formatCents(totals.lineTotalsCents[index])}</td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string) =>
    `<tr><td style="padding:3px 0;font:13px/1.5 ${SANS};color:${C.muted};">${label}</td><td style="padding:3px 0;font:13px/1.5 ${SANS};color:${C.ink};text-align:right;">${value}</td></tr>`;
  const totalRows = [
    totalRow("Subtotal", formatCents(totals.subtotalCents)),
    totals.discountCents > 0 ? totalRow("Discount", `&minus;${formatCents(totals.discountCents)}`) : "",
    invoice.taxRate > 0 ? totalRow(`Tax (${formatRate(invoice.taxRate)})`, formatCents(totals.taxCents)) : "",
  ].join("");

  const party = (p: InvoiceInput["business"]) =>
    [p.email, p.address].filter(Boolean).map(multiline).join("<br>");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(defaultEmailSubject(invoice))}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(`${amountDue} due ${due} · Invoice ${invoice.number} from ${invoice.business.name}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
${
  options.intendedRecipient
    ? `<tr><td style="padding:0 0 16px;"><div style="border:1px solid ${C.brass};border-radius:4px;padding:10px 14px;font:12px/1.5 ${SANS};color:${C.brassInk};">Demo redirect &mdash; originally addressed to ${escapeHtml(options.intendedRecipient)}</div></td></tr>`
    : ""
}
<tr><td style="padding:0 4px 24px;font:15px/1.6 ${SANS};color:${C.ink};">
  <p style="margin:0 0 12px;">${escapeHtml(invoice.business.name)} sent you invoice <strong>${escapeHtml(invoice.number)}</strong> for <strong>${amountDue}</strong>, due ${escapeHtml(due)}.</p>
  ${message ? `<p style="margin:0;color:${C.ink};">${multiline(message)}</p>` : ""}
</td></tr>
<tr><td style="background:${C.sheet};border:1px solid ${C.hairline};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:32px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;">
          <div style="font:600 26px/1.2 ${SANS};letter-spacing:-.02em;color:${C.ink};">${escapeHtml(invoice.business.name)}</div>
          <div style="margin-top:6px;font:12px/1.5 ${SANS};color:${C.muted};">${party(invoice.business)}</div>
        </td>
        <td style="vertical-align:top;text-align:right;">${eyebrow("Invoice")}<div style="margin-top:4px;font:14px/1.4 ${SANS};color:${C.ink};">${escapeHtml(invoice.number)}</div></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;width:55%;">
          ${eyebrow("Billed to")}
          <div style="margin-top:6px;font:600 14px/1.4 ${SANS};color:${C.ink};">${escapeHtml(invoice.customer.name)}</div>
          <div style="margin-top:2px;font:12px/1.5 ${SANS};color:${C.muted};">${party(invoice.customer)}</div>
        </td>
        <td style="vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 8px 8px 0;border-bottom:1px solid ${C.ink};">${eyebrow("Description", C.muted)}</td>
          <td style="padding:0 8px 8px;border-bottom:1px solid ${C.ink};text-align:right;">${eyebrow("Qty", C.muted)}</td>
          <td style="padding:0 8px 8px;border-bottom:1px solid ${C.ink};text-align:right;">${eyebrow("Unit price", C.muted)}</td>
          <td style="padding:0 0 8px 8px;border-bottom:1px solid ${C.ink};text-align:right;">${eyebrow("Amount", C.muted)}</td>
        </tr>
        ${lineRows}
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;">
      <table role="presentation" width="55%" align="right" cellpadding="0" cellspacing="0">${totalRows}</table>
    </td></tr>
    <tr><td style="background:${C.forest};padding:18px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;">${eyebrow("Amount due", C.brassSoft)}<div style="margin-top:4px;font:12px/1.4 ${SANS};color:${C.paper};">Due ${escapeHtml(due)}</div></td>
        <td style="vertical-align:middle;text-align:right;font:600 30px/1 ${SANS};letter-spacing:-.02em;color:${C.paper};">${amountDue}</td>
      </tr></table>
    </td></tr>
    ${
      invoice.notes.trim()
        ? `<tr><td style="padding:24px 32px 32px;">${eyebrow("Notes")}<div style="margin-top:6px;font:13px/1.6 ${SANS};color:${C.ink};">${multiline(invoice.notes.trim())}</div></td></tr>`
        : ""
    }
  </table>
</td></tr>
<tr><td style="padding:20px 4px 0;font:11px/1.5 ${SANS};color:${C.muted};text-align:center;">Sent with Remit</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const lines = [
    `${invoice.business.name} sent you invoice ${invoice.number} for ${amountDue}, due ${due}.`,
    ...(options.intendedRecipient ? ["", `(Demo redirect: originally addressed to ${options.intendedRecipient})`] : []),
    ...(message ? ["", message] : []),
    "",
    `Billed to: ${invoice.customer.name}`,
    `Issued: ${formatDateISO(invoice.issueDate)}`,
    `Due: ${due}`,
    ...visibleFields.map((field) => `${field.label}: ${field.value}`),
    "",
    "Items",
    ...invoice.lineItems.map(
      (line, index) =>
        `- ${line.description}: ${formatQuantity(line.quantity)} × ${formatCents(line.unitPriceCents)} = ${formatCents(totals.lineTotalsCents[index])}`,
    ),
    "",
    `Subtotal: ${formatCents(totals.subtotalCents)}`,
    ...(totals.discountCents > 0 ? [`Discount: -${formatCents(totals.discountCents)}`] : []),
    ...(invoice.taxRate > 0 ? [`Tax (${formatRate(invoice.taxRate)}): ${formatCents(totals.taxCents)}`] : []),
    `Amount due: ${amountDue}`,
    ...(invoice.notes.trim() ? ["", "Notes", invoice.notes.trim()] : []),
  ];

  return { html, text: lines.join("\n") };
}
