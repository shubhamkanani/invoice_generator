# Remit

A small-business invoicing site with a calm, private-bank look. You can draft an invoice, watch it take shape in a live preview, save it, print it or save it as a PDF, and email it to your customer. All money is calculated to the cent.

![Invoice editor with live preview](docs/screenshots/editor.png)

| Invoices | Phone preview | Log in |
| --- | --- | --- |
| ![Invoice list](docs/screenshots/invoices.png) | ![Phone preview](docs/screenshots/mobile-preview.png) | ![Login](docs/screenshots/login.png) |

## Features

- **Invoice editor:** business and customer details, invoice number, issue and due dates, and notes. Line items have a description, quantity and unit price, and you can add, edit and remove them.
- **Exact USD totals:** each line is rounded to the cent, the lines are summed, a fixed discount is subtracted, and tax is then calculated and rounded. 2 × $50 − $10 discount + 10% tax = **$99.00**.
- **Custom fields:** add any label and value, edit it, hide or show it, or remove it. Visible fields appear on the invoice; hidden ones stay in the editor only. Custom fields never affect totals.
- **Live preview and printing:** the invoice sheet updates as you type. **Print** uses the browser's print or save-as-PDF dialog and outputs only the invoice: no controls and no hidden fields. This works from a phone too.
- **Saving:** a **Save** button or Ctrl/Cmd+S, a "Saved at 11:42 AM" indicator, and a warning before you leave with unsaved changes. Invoice numbers are suggested automatically (INV-0042 → INV-0043) and must be unique within an account.
- **Email:** **Send** emails the full invoice as a styled HTML email with a plain-text alternative, through any SMTP provider. The invoice is then marked **Sent**. If sending fails, for example because the mail server refuses the address, you get an error toast and the invoice stays a draft.
- **Accounts:** sign up, log in and log out. Each account sees only its own invoices.
- **Validation:** negative quantities, prices, discounts and tax rates are rejected. The discount can't exceed the subtotal, a tax rate above 100% is rejected, and the due date can't be before the issue date. Messages appear next to the field, and the server enforces the same rules.
- **Responsive and accessible:** a two-column editor on desktop, an Edit/Preview switch with a sticky amount-due bar on phones, and a table/cards invoice list. Every control is labelled and keyboard-reachable, focus rings are visible, and text meets WCAG AA contrast.

## Tech stack

Next.js 16 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · shadcn/ui (Radix), restyled · MongoDB with Mongoose · Zod · jose (session JWT) · bcryptjs · Nodemailer · Vitest with mongodb-memory-server.

## Getting started

**Requirements:** Node.js 22.12 or newer, and npm.

```bash
npm install
cp .env.example .env        # then fill it in (see below)
npm run seed                # creates the demo account with 5 invoices
npm run dev                 # http://localhost:3000
```

Demo login: **demo@example.com** / **remit-demo-2026**. The login page also has a "Use demo account" button.

### Environment variables

All configuration is read on the server only. `.env` is git-ignored; `.env.example` lists every variable with placeholders.

| Variable | Required | What it is |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string (Atlas or local) |
| `AUTH_SECRET` | yes | 32+ random characters used to sign session cookies |
| `SMTP_HOST`, `SMTP_PORT` | for email | Your SMTP server. Port 587 uses STARTTLS; port 465 uses implicit TLS. |
| `SMTP_USER`, `SMTP_PASS` | for email | SMTP credentials or API key |
| `MAIL_FROM` | for email | Sender, e.g. `"Remit <invoices@yourdomain.com>"` |
| `MAIL_REDIRECT_TO` | no | When set, **every** email goes to this address instead, with a note naming the intended recipient. Use it for safe demos. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Database: MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Under **Database Access**, add a database user. Under **Network Access**, allow your IP address.
3. Click **Connect → Drivers** and copy the connection string. Add a database name, then put it in `.env`:
   `MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/remit?retryWrites=true&w=majority"`

The app creates its collections and indexes on first use.

**Seeing `querySrv ECONNREFUSED`?** Your machine's DNS refuses the SRV lookup that `mongodb+srv://` strings need. Use the standard connection format instead: `mongodb://USER:PASSWORD@host-00:27017,host-01:27017,host-02:27017/remit?tls=true&authSource=admin&replicaSet=...`. Atlas shows it when you pick an older driver version in the Connect dialog.

**No Atlas account?** Run `npm run db:local` in a second terminal. It starts a local MongoDB on port 27017, downloading the binary on first run and keeping its data in `.data/`. Then use `MONGODB_URI="mongodb://127.0.0.1:27017/remit"`.

### Email: any SMTP provider

| Provider | Host | Port | User / password |
| --- | --- | --- | --- |
| Resend | `smtp.resend.com` | 587 | `resend` / your API key |
| Brevo | `smtp-relay.brevo.com` | 587 | your SMTP login / SMTP key |
| Mailtrap (testing inbox) | `sandbox.smtp.mailtrap.io` | 587 | from your inbox settings |
| Gmail | `smtp.gmail.com` | 465 | your address / an [app password](https://support.google.com/accounts/answer/185833) |

`MAIL_FROM` must be an address your provider lets you send from. For a demo, set `MAIL_REDIRECT_TO` to your own inbox so the fictional `@example.com` customers never receive anything.

If SMTP isn't configured, **Send** shows "Email isn't set up yet" and nothing is marked as sent.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Unit and integration tests (Vitest, in-memory MongoDB) |
| `npm run lint` | ESLint |
| `npm run seed` | Create or reset the demo account and its invoices. Safe to re-run, and other accounts are untouched. |
| `npm run db:local` | Optional local MongoDB |

## How totals are calculated

All amounts are **integer cents**. The single module [`src/lib/money.ts`](src/lib/money.ts) is used by the editor, the preview, the API, the invoice list and the email:

1. Line total = quantity × unit price, rounded to the cent (halves round away from zero).
2. Subtotal = sum of line totals.
3. Discount = a fixed amount, from 0 up to the subtotal.
4. Tax = (subtotal − discount) × rate, rounded to the cent.
5. Amount due = subtotal − discount + tax.

Products use `BigInt`, so there is no floating-point drift. What people type ("$1,250.50", ".5") is parsed with string arithmetic. Ambiguous input such as "1,5" or "1e3" is rejected rather than guessed. The server **recalculates and stores** totals on every save and never trusts totals sent by the browser.

Example: 2 × $50.00 = $100.00, minus the $10.00 discount = $90.00, plus 10% tax ($9.00) = **$99.00**. This is covered in `tests/money.test.ts` and appears as INV-0042 in the demo data.

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup      Auth pages (split brand panel + form)
    (app)/invoices                   List, new, [id] editor (all require a session)
    api/auth/*                       signup, login, logout
    api/invoices/*                   REST API: list/create, read/update/delete, send
  components/
    invoice/                         Editor, live sheet, line items, custom fields, dialogs, list
    ui/                              shadcn/ui primitives restyled to the Remit palette
  lib/
    money.ts, dates.ts               Pure money and calendar-date helpers
    invoice/                         Zod schema, editor draft ⇄ stored invoice, reducer, numbering
    invoices/service.ts              Invoice data access, always scoped by user id
    users/service.ts, auth/*         Accounts, password hashing, JWT session cookie
    email/                           HTML/text email renderer and SMTP mailer
    seed/demo.ts                     Demo data used by `npm run seed`
  proxy.ts                           Sends signed-out visitors to /login
tests/                               Vitest unit and integration tests
scripts/                             seed and local-db entry points
```

## Decisions and trade-offs

- **One schema everywhere.** The same Zod schema validates the editor and every API write, so the browser and the server can't disagree. The editor keeps numbers as the raw strings people type and converts them only when validating, so inputs never fight the keyboard.
- **Calendar dates as `YYYY-MM-DD` strings,** not `Date` objects. Invoice dates are days, not instants. This avoids the classic bug where Nov 19 shows as Nov 18 in US time zones.
- **Explicit saving instead of autosave.** Half-finished, invalid invoices are never stored. Errors appear immediately for fields with content, such as a negative price or a discount above the subtotal. "Required" errors wait until you leave a field or try to save, so a new form isn't covered in red.
- **REST API plus a small service layer.** Route handlers only check the session, call a service function and map errors to JSON. The service functions take the user id explicitly and scope every query by it, which makes the "only your own invoices" rule easy to test.
- **Lightweight auth.** bcrypt password hashes and a signed JWT in an httpOnly, SameSite=Lax cookie, plus a proxy that redirects signed-out page visits. Login errors don't reveal whether an email exists. There are no extra auth services to configure.
- **The email is built on the server from the saved invoice.** Sending saves first if needed, and every user-entered value is HTML-escaped. `MAIL_REDIRECT_TO` makes demos safe.
- **Design:** the "Private Bank" palette uses warm paper, forest green and brass, set in Geist throughout (semibold, tightly tracked for headings and amounts), with tabular figures for money and hairline rules. shadcn/ui components were restyled through theme tokens rather than used with their defaults.

## Testing

```bash
npm test
```

The test suite covers:
- money rounding, including the $99.00 check, half-cent cases, large values and parsing of typed input;
- date handling in a US time zone;
- invoice validation and error messages;
- the editor reducer;
- sessions;
- email rendering and escaping;
- the data services against an in-memory MongoDB: ownership checks, unique numbers, server-side totals, and an idempotent seeder.

The main browser flows were also checked end to end with Playwright scripts that aren't part of this repository: sign-up and login, editing and validation, hiding fields, saving and reloading, a double-clicked Save creating exactly one invoice, printing from a phone, sending through a test SMTP inbox, and deleting.

## AI tools used

This project was built with **Claude Code** (Anthropic's Claude) as a coding assistant. It was used to explore visual directions, write the design notes and the plan, implement features with tests, and check the UI in a headless browser with screenshots.

## Time spent

About 2.5 hours.

## Unfinished work and next steps

- **Bounce tracking:** SMTP only confirms that the mail server accepted the message. A mistyped address that is still valid is accepted and bounces later to the sending mailbox, so the app can't flag it. A provider API with bounce webhooks (e.g. Resend or Postmark) would let it mark such invoices as undelivered.
- **PDF attachment on emails:** the email contains the full HTML invoice, and the browser's "Save as PDF" covers PDFs today.
- **Account extras:** password reset, email verification and rate limiting on login attempts.
- **Payment tracking:** a "Paid" status, overdue reminders and partial payments. There are no online payments.
- **Multi-currency** and per-customer saved details (an address book).
- **Today's date on a deployed server:** the default issue date for a new invoice is taken from the server's clock and time zone. That is fine locally, but a deployed server should use the browser's date.
- **Leaving with unsaved changes:** the warning covers closing the tab and the editor's back link, but not other in-app navigation.
