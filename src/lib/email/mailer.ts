import nodemailer, { type Transporter } from "nodemailer";

/*
 * Plain SMTP via Nodemailer, so any provider works (Resend, Brevo, Mailtrap,
 * Gmail app passwords, SES...). Credentials are read from the server's
 * environment only and never reach the browser.
 */

type Env = Record<string, string | undefined>;

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email isn't set up yet. Add your SMTP settings to .env.");
    this.name = "EmailNotConfiguredError";
  }
}

/** SMTP settings from the environment, or null when the required ones are missing. */
export function getMailConfig(env: Env = process.env): MailConfig | null {
  const host = env.SMTP_HOST?.trim();
  const from = env.MAIL_FROM?.trim();
  const port = Number(env.SMTP_PORT?.trim() || 587);
  if (!host || !from || !Number.isInteger(port)) return null;
  return {
    host,
    port,
    secure: port === 465, // 465 is implicit TLS; 587 upgrades with STARTTLS
    user: env.SMTP_USER?.trim() || undefined,
    pass: env.SMTP_PASS || undefined,
    from,
  };
}

/**
 * Safety valve for demos: with MAIL_REDIRECT_TO set, every email goes to that
 * inbox instead, and the caller notes who it was meant for.
 */
export function resolveRecipient(to: string, env: Env = process.env): { deliveredTo: string; redirectedFrom?: string } {
  const redirect = env.MAIL_REDIRECT_TO?.trim();
  return redirect ? { deliveredTo: redirect, redirectedFrom: to } : { deliveredTo: to };
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * The mail server refused the recipient. Note that most servers (Gmail
 * included) accept any well-formed address and report a mistyped one later
 * with a bounce email to the sender, so only immediate refusals land here.
 */
export class EmailRejectedError extends Error {
  constructor(readonly recipients: string[]) {
    super(`The mail server rejected ${recipients.join(", ")}`);
    this.name = "EmailRejectedError";
  }
}

type SmtpFailure = { code?: string; rejected?: string[] };

/**
 * Connection settings for the SMTP transport. The timeouts replace Nodemailer's
 * two-minute defaults so an unreachable server fails while the person is still
 * looking at the Send dialog.
 */
export function smtpTransportOptions(config: MailConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

/** Sends through SMTP, or through `transport` when one is given (tests). */
export async function sendEmail(email: OutgoingEmail, transport?: Transporter): Promise<void> {
  const config = getMailConfig();
  let mailer = transport;
  if (!mailer) {
    if (!config) throw new EmailNotConfiguredError();
    mailer = nodemailer.createTransport(smtpTransportOptions(config));
  }
  let info: { rejected?: unknown[] };
  try {
    info = await mailer.sendMail({ from: config?.from ?? "Remit <invoices@example.com>", ...email });
  } catch (error) {
    // Every recipient refused mid-conversation (e.g. "550 no such user").
    const { code, rejected } = (error ?? {}) as SmtpFailure;
    if (code === "EENVELOPE" && rejected?.length) throw new EmailRejectedError(rejected.map(String));
    throw error;
  }
  // Accepted for some recipients but refused for others: still not delivered.
  if (info.rejected?.length) throw new EmailRejectedError(info.rejected.map(String));
}
