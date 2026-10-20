import type { ZodError } from "zod";
import type { FieldErrors } from "@/lib/invoice/types";

/** One message per field path (the first one zod reports). Safe to use in the browser and on the server. */
export function zodFieldErrors(error: ZodError, mapPath: (path: string) => string = (path) => path): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = mapPath(issue.path.join(".")) || "form";
    fieldErrors[path] ??= issue.message;
  }
  return fieldErrors;
}
