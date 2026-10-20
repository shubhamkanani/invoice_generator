"use client";

import { ArrowLeft, Eye, MoreHorizontal, PenLine, Printer, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { defaultEmailSubject } from "@/lib/email/render-invoice-email";
import { fieldId, previewFromDraft, validateDraft } from "@/lib/invoice/draft";
import { draftReducer, type DraftAction } from "@/lib/invoice/draft-reducer";
import { isErrorVisible } from "@/lib/invoice/error-visibility";
import type { Party, SendInvoiceInput } from "@/lib/invoice/schema";
import type { FieldErrors, InvoiceDraft, InvoiceRecord, InvoiceStatus } from "@/lib/invoice/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CustomFieldsEditor } from "./custom-fields-editor";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";
import { Affixed, Field, describedBy } from "./field";
import { InvoiceSheet } from "./invoice-sheet";
import { LineItemsEditor } from "./line-items-editor";
import { SendInvoiceDialog, type SendResult } from "./send-invoice-dialog";
import { StatusBadge } from "./status-badge";

type SaveState = "idle" | "saving" | "error";
type ApiBody = { invoice?: InvoiceRecord; error?: string; fieldErrors?: FieldErrors; deliveredTo?: string };

/**
 * The invoice editor: one draft in a reducer, a live preview derived from it,
 * and explicit saving (button or Ctrl/Cmd+S) so half-finished, invalid states
 * are never stored. Validation is the same shared schema the API uses.
 */
export function InvoiceEditor({
  initialDraft,
  invoiceId,
  initialStatus = "draft",
  initialSavedAt = null,
}: {
  initialDraft: InvoiceDraft;
  invoiceId?: string;
  initialStatus?: InvoiceStatus;
  initialSavedAt?: string | null;
}) {
  const router = useRouter();
  const [draft, dispatchDraft] = useReducer(draftReducer, initialDraft);
  const [id, setId] = useState(invoiceId);
  const [status, setStatus] = useState<InvoiceStatus>(initialStatus);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(invoiceId ? JSON.stringify(initialDraft) : null);
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendKey, setSendKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const saving = useRef(false);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const preview = useMemo(() => previewFromDraft(draft), [draft]);
  const dirty = savedSnapshot === null || JSON.stringify(draft) !== savedSnapshot;

  // Edits clear any server error on the field they touch (e.g. "number already used").
  const dispatch = useCallback((action: DraftAction) => {
    dispatchDraft(action);
    setServerErrors((current) => (Object.keys(current).length ? {} : current));
  }, []);

  /** Field errors, revealed on the rules in isErrorVisible. */
  const errorFor = useCallback(
    (path: string, rawValue: string) => {
      const message = serverErrors[path] ?? validation.errors[path];
      if (!message) return undefined;
      return isErrorVisible(path, rawValue, { submitted, touched: touched.has(path) }) ? message : undefined;
    },
    [serverErrors, validation.errors, submitted, touched],
  );
  const onBlurField = useCallback((path: string) => {
    setTouched((current) => (current.has(path) ? current : new Set(current).add(path)));
  }, []);

  /** Shows every error, switches phones to the form and focuses the first invalid field. */
  const revealErrors = useCallback((message: string) => {
    setSubmitted(true);
    setView("edit");
    toast.error(message);
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>("[data-editor] [aria-invalid='true']");
      first?.focus();
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, []);

  /** Saves the draft; returns the invoice id, or null when nothing was saved. */
  const save = useCallback(async (): Promise<string | null> => {
    if (saving.current) return null; // a double click must not create two invoices
    const { input } = validateDraft(draft);
    if (!input) {
      revealErrors("Fix the highlighted fields to save.");
      return null;
    }
    saving.current = true;
    setSaveState("saving");
    const sentDraft = draft;
    try {
      const response = await fetch(id ? `/api/invoices/${id}` : "/api/invoices", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.invoice) {
        setSaveState("error");
        if (response.status === 401) {
          toast.error(body.error ?? "Your session has expired. Log in again.", {
            description: "Your changes are still here. Log in in a new tab, then save again.",
            action: { label: "Log in", onClick: () => window.open("/login", "_blank") },
          });
        } else if (body.fieldErrors) {
          setServerErrors(body.fieldErrors);
          revealErrors(body.error ?? "Fix the highlighted fields to save.");
        } else {
          toast.error(body.error ?? "Couldn't save the invoice. Please try again.");
        }
        return null;
      }
      const record = body.invoice;
      setSavedSnapshot(JSON.stringify(sentDraft));
      setSavedAt(record.updatedAt);
      setStatus(record.status);
      setSaveState("idle");
      if (!id) {
        setId(record.id);
        window.history.replaceState(null, "", `/invoices/${record.id}`);
        toast.success(`Invoice ${record.number} created`);
      } else {
        toast.success("Changes saved");
      }
      return record.id;
    } catch {
      setSaveState("error");
      toast.error("Couldn't reach the server. Your changes are still here; try again.");
      return null;
    } finally {
      saving.current = false;
    }
  }, [draft, id, revealErrors]);

  // Ctrl/Cmd+S saves.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function openSend() {
    if (!validation.input) {
      revealErrors("Fix the highlighted fields before sending.");
      return;
    }
    setSendKey((key) => key + 1); // fresh To/Subject from the current draft
    setSendOpen(true);
  }

  async function send(values: SendInvoiceInput): Promise<SendResult> {
    // Failures show in the dialog and as a toast, so they can't be missed.
    const fail = (error: string, fieldErrors?: FieldErrors): SendResult => {
      toast.error("Invoice not sent", { description: error });
      return { error, fieldErrors };
    };

    let targetId = id ?? null;
    if (!targetId || dirty) {
      targetId = await save(); // the email is built from the saved invoice, so save first
      if (!targetId) return fail("The invoice couldn't be saved, so it wasn't sent.");
    }
    try {
      const response = await fetch(`/api/invoices/${targetId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok) return fail(body.error ?? "Couldn't send the invoice.", body.fieldErrors);
      setStatus("sent");
      toast.success(`Invoice sent to ${body.deliveredTo}`);
      return null;
    } catch {
      return fail("Couldn't reach the server. Try again.");
    }
  }

  const statusText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Couldn't save"
        : !id
          ? "Not saved yet"
          : dirty
            ? "Unsaved changes"
            : savedAt
              ? `Saved at ${new Date(savedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
              : "Saved";

  const amountDue = formatCents(preview.totals.totalCents);
  const isSaving = saveState === "saving";

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/invoices"
            onClick={(event) => {
              if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) event.preventDefault();
            }}
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Invoices
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate font-display text-2xl leading-none">
              {id ? "Invoice" : "New invoice"}{" "}
              <span className="text-muted-foreground">{draft.number.trim()}</span>
            </h1>
            <StatusBadge status={status} />
          </div>
          <p aria-live="polite" className="text-xs text-muted-foreground" suppressHydrationWarning>
            {statusText}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              <span className="max-sm:sr-only">Print</span>
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void save()} disabled={isSaving} className="max-lg:hidden">
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" onClick={openSend}>
              <Send aria-hidden="true" />
              Send
            </Button>
            {id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 aria-hidden="true" />
                    Delete invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 pt-6 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-10 lg:px-8 lg:pb-16 print:block print:p-0">
        {/* Phones: switch between the form and the preview */}
        <div role="group" aria-label="View" className="inline-flex h-12 w-full gap-1 rounded-full bg-muted p-1 lg:hidden print:hidden">
          {(["edit", "preview"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                view === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {option === "edit" ? <PenLine aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              {option === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>

        <form
          data-editor
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className={cn("grid content-start gap-5 print:hidden", view === "preview" && "max-lg:hidden")}
        >
          <Section title="Invoice details">
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField path="number" label="Invoice number" value={draft.number} errorFor={errorFor} onBlurField={onBlurField} onChange={(value) => dispatch({ type: "set", field: "number", value })} />
              <TextField path="issueDate" label="Issue date" type="date" value={draft.issueDate} errorFor={errorFor} onBlurField={onBlurField} onChange={(value) => dispatch({ type: "set", field: "issueDate", value })} />
              <TextField path="dueDate" label="Due date" type="date" value={draft.dueDate} errorFor={errorFor} onBlurField={onBlurField} onChange={(value) => dispatch({ type: "set", field: "dueDate", value })} />
            </div>
          </Section>

          <div className="grid gap-5 xl:grid-cols-2">
            <PartySection title="From" party="business" nameLabel="Business name" value={draft.business} errorFor={errorFor} onBlurField={onBlurField} dispatch={dispatch} />
            <PartySection title="Bill to" party="customer" nameLabel="Customer name" value={draft.customer} errorFor={errorFor} onBlurField={onBlurField} dispatch={dispatch} />
          </div>

          <Section title="Line items">
            <LineItemsEditor
              lines={draft.lineItems}
              lineTotalsCents={preview.totals.lineTotalsCents}
              errorFor={errorFor}
              dispatch={dispatch}
              onBlurField={onBlurField}
            />
          </Section>

          <Section title="Discount and tax" description="The discount is a fixed amount taken off the subtotal; tax is then calculated on what remains.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                path="discount"
                label="Discount"
                prefix="$"
                inputMode="decimal"
                placeholder="0.00"
                hint={`Up to ${formatCents(Math.max(preview.totals.subtotalCents, 0))}`}
                value={draft.discount}
                errorFor={errorFor}
                onBlurField={onBlurField}
                onChange={(value) => dispatch({ type: "set", field: "discount", value })}
              />
              <TextField
                path="taxRate"
                label="Tax rate"
                suffix="%"
                inputMode="decimal"
                placeholder="0"
                value={draft.taxRate}
                errorFor={errorFor}
                onBlurField={onBlurField}
                onChange={(value) => dispatch({ type: "set", field: "taxRate", value })}
              />
            </div>
          </Section>

          <Section title="Custom fields" description="Visible fields appear on the invoice. Hidden ones stay here only. Neither affects the totals.">
            <CustomFieldsEditor fields={draft.customFields} errorFor={errorFor} dispatch={dispatch} onBlurField={onBlurField} />
          </Section>

          <Section title="Notes">
            <Field label="Notes for the customer" htmlFor={fieldId("notes")} error={errorFor("notes", draft.notes)} hint="Payment instructions, thanks, terms.">
              <Textarea
                id={fieldId("notes")}
                rows={3}
                value={draft.notes}
                onChange={(event) => dispatch({ type: "set", field: "notes", value: event.target.value })}
                onBlur={() => onBlurField("notes")}
                aria-describedby={describedBy(fieldId("notes"), errorFor("notes", draft.notes), "hint")}
              />
            </Field>
          </Section>

          {/* Lets Enter in a text field submit (save) the form */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>

        <aside aria-label="Invoice preview" className={cn("print-show", view === "edit" && "max-lg:hidden")}>
          <div className="lg:sticky lg:top-36">
            <div className="mb-3 flex items-center justify-between print:hidden">
              <p className="eyebrow text-brass-ink">Live preview</p>
              <p className="text-xs text-muted-foreground">Prints exactly like this</p>
            </div>
            <InvoiceSheet invoice={preview.invoice} totals={preview.totals} />
          </div>
        </aside>
      </div>

      {/* Phones: amount due and Save always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-brass-ink">Amount due</p>
            <p className="font-display text-xl leading-tight tabular-nums">{amountDue}</p>
          </div>
          <Button type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <SendInvoiceDialog
        key={sendKey}
        open={sendOpen}
        onOpenChange={setSendOpen}
        defaultTo={draft.customer.email.trim()}
        defaultSubject={defaultEmailSubject({ number: draft.number.trim(), business: draft.business })}
        replyTo={draft.business.email.trim()}
        onSend={send}
      />
      {id && (
        <DeleteInvoiceDialog
          invoiceId={id}
          number={draft.number}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => {
            setSavedSnapshot(JSON.stringify(draft)); // nothing left to warn about
            router.push("/invoices");
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const headingId = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 id={headingId} className="font-display text-lg leading-none">
        {title}
      </h2>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

type ErrorFor = (path: string, rawValue: string) => string | undefined;

function TextField({
  path,
  label,
  value,
  onChange,
  errorFor,
  onBlurField,
  hint,
  prefix,
  suffix,
  type = "text",
  inputMode,
  placeholder,
  autoComplete,
}: {
  path: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errorFor: ErrorFor;
  onBlurField: (path: string) => void;
  hint?: string;
  prefix?: string;
  suffix?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = fieldId(path);
  const error = errorFor(path, value);
  const input = (
    <Input
      id={id}
      type={type}
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      autoComplete={autoComplete ?? "off"}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onBlurField(path)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={cn(prefix && "pl-7", suffix && "pr-8", inputMode === "decimal" && "tabular-nums")}
    />
  );
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      {prefix || suffix ? (
        <Affixed prefix={prefix} suffix={suffix}>
          {input}
        </Affixed>
      ) : (
        input
      )}
    </Field>
  );
}

function PartySection({
  title,
  party,
  nameLabel,
  value,
  errorFor,
  onBlurField,
  dispatch,
}: {
  title: string;
  party: "business" | "customer";
  nameLabel: string;
  value: Party;
  errorFor: ErrorFor;
  onBlurField: (path: string) => void;
  dispatch: (action: DraftAction) => void;
}) {
  const set = (field: keyof Party) => (next: string) => dispatch({ type: "setParty", party, field, value: next });
  const addressId = fieldId(`${party}.address`);
  const addressError = errorFor(`${party}.address`, value.address);
  return (
    <Section title={title}>
      <div className="grid gap-4">
        <TextField path={`${party}.name`} label={nameLabel} value={value.name} autoComplete={party === "business" ? "organization" : "off"} errorFor={errorFor} onBlurField={onBlurField} onChange={set("name")} />
        <TextField path={`${party}.email`} label="Email" type="email" inputMode="email" value={value.email} errorFor={errorFor} onBlurField={onBlurField} onChange={set("email")} />
        <Field label="Address" htmlFor={addressId} error={addressError}>
          <Textarea
            id={addressId}
            rows={2}
            value={value.address}
            onChange={(event) => set("address")(event.target.value)}
            onBlur={() => onBlurField(`${party}.address`)}
            aria-invalid={addressError ? true : undefined}
            aria-describedby={describedBy(addressId, addressError)}
          />
        </Field>
      </div>
    </Section>
  );
}
