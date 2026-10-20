"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/auth/safe-next";

type Mode = "login" | "signup";
type FieldName = "name" | "email" | "password";

const COPY = {
  login: { submit: "Log in", pending: "Logging in…", endpoint: "/api/auth/login" },
  signup: { submit: "Create account", pending: "Creating account…", endpoint: "/api/auth/signup" },
} as const;

export function AuthForm({ mode, next, demo }: { mode: Mode; next?: string; demo?: { email: string; password: string } }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const body = mode === "signup" ? values : { email: values.email, password: values.password };
      const response = await fetch(COPY[mode].endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        router.replace(safeNext(next, window.location.origin));
        router.refresh();
        return; // keep the button in its pending state while the next page loads
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string> };
      setFieldErrors(data.fieldErrors ?? {});
      if (!data.fieldErrors || response.status === 401) setFormError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  const field = (name: FieldName, label: string, props: React.ComponentProps<typeof Input>, hint?: string) => {
    const error = fieldErrors[name];
    const describedBy = [error && `${name}-error`, hint && `${name}-hint`].filter(Boolean).join(" ") || undefined;
    return (
      <div className="grid gap-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          value={values[name]}
          onChange={update(name)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required
          {...props}
        />
        {hint && !error && (
          <p id={`${name}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${name}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-display text-4xl leading-none">
        {mode === "login" ? "Welcome back" : "Open your ledger"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "login" ? "Log in to draft, preview and send your invoices." : "Create an account to start invoicing in minutes."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5">
        {formError && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {formError}
          </div>
        )}
        {mode === "signup" && field("name", "Your name", { autoComplete: "name" })}
        {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
        {field(
          "password",
          "Password",
          { type: "password", autoComplete: mode === "login" ? "current-password" : "new-password" },
          mode === "signup" ? "At least 8 characters." : undefined,
        )}
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? COPY[mode].pending : COPY[mode].submit}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "login" ? "New to Remit? " : "Already have an account? "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-brass-ink underline underline-offset-4 hover:text-foreground"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>

      {demo && (
        <div className="mt-10 rounded-md border border-border bg-card p-4 text-sm">
          <p className="eyebrow text-brass-ink">Just looking?</p>
          <p className="mt-2 text-muted-foreground">
            Try the demo account: <span className="font-medium text-foreground">{demo.email}</span> /{" "}
            <span className="font-medium whitespace-nowrap text-foreground">{demo.password}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setValues((current) => ({ ...current, email: demo.email, password: demo.password }));
              setFieldErrors({});
            }}
          >
            Use demo account
          </Button>
        </div>
      )}
    </div>
  );
}
