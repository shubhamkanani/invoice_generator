import { ZodError } from "zod";
import { jsonError, serverError, zodFieldErrors } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { toDraftPath } from "@/lib/invoice/draft";
import { DuplicateInvoiceNumberError } from "./service";

/** The signed-in user's id for an API route, or null (the route answers 401). */
export async function getApiUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

/** Maps a failed invoice write to the JSON error the editor understands (field paths use the form's names). */
export function invoiceWriteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(422, "Please fix the highlighted fields", zodFieldErrors(error, toDraftPath));
  }
  if (error instanceof DuplicateInvoiceNumberError) return jsonError(409, error.message, { number: error.message });
  return serverError(error);
}
