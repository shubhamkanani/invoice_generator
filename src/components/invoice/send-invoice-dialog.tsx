"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodFieldErrors } from "@/lib/field-errors";
import { sendInvoiceSchema, type SendInvoiceInput } from "@/lib/invoice/schema";
import type { FieldErrors } from "@/lib/invoice/types";
import { Field, describedBy } from "./field";

export type SendResult = { error: string; fieldErrors?: FieldErrors } | null;

/** To / Subject / Message. `onSend` saves if needed, sends, and returns an error to show, or null. */
export function SendInvoiceDialog({
  open,
  onOpenChange,
  defaultTo,
  defaultSubject,
  replyTo,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo: string;
  defaultSubject: string;
  replyTo: string;
  onSend: (values: SendInvoiceInput) => Promise<SendResult>;
}) {
  const [values, setValues] = useState<SendInvoiceInput>({ to: defaultTo, subject: defaultSubject, message: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = sendInvoiceSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setPending(true);
    setFormError(null);
    const result = await onSend(parsed.data);
    setPending(false);
    if (result) {
      const fieldErrors = result.fieldErrors ?? {};
      // A problem tied to a field is shown there; the banner is for everything else.
      setFormError(Object.keys(fieldErrors).length ? null : result.error);
      setErrors(fieldErrors);
    } else {
      onOpenChange(false);
    }
  }

  const set = (field: keyof SendInvoiceInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Send invoice</DialogTitle>
          <DialogDescription>
            The email includes the full invoice. {replyTo ? `Replies go to ${replyTo}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form id="send-invoice-form" onSubmit={submit} noValidate className="grid gap-4">
          {formError && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {formError}
            </div>
          )}
          <Field label="To" htmlFor="send-to" error={errors.to || undefined}>
            <Input
              id="send-to"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.to}
              onChange={set("to")}
              aria-invalid={errors.to ? true : undefined}
              aria-describedby={describedBy("send-to", errors.to || undefined)}
            />
          </Field>
          <Field label="Subject" htmlFor="send-subject" error={errors.subject || undefined}>
            <Input
              id="send-subject"
              value={values.subject}
              onChange={set("subject")}
              aria-invalid={errors.subject ? true : undefined}
              aria-describedby={describedBy("send-subject", errors.subject || undefined)}
            />
          </Field>
          <Field label="Message (optional)" htmlFor="send-message" error={errors.message || undefined}>
            <Textarea
              id="send-message"
              rows={4}
              value={values.message}
              placeholder="A short note shown above the invoice"
              onChange={set("message")}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={describedBy("send-message", errors.message || undefined)}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="send-invoice-form" disabled={pending}>
            <Send aria-hidden="true" />
            {pending ? "Sending…" : "Send invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
