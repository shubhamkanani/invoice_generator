import { NextResponse } from "next/server";
import type { FieldErrors } from "@/lib/invoice/types";

export { zodFieldErrors } from "@/lib/field-errors";

/* Small helpers that give every API route the same JSON error shape:
   { error: string, fieldErrors?: { "<field path>": "<message>" } } */

export const SESSION_EXPIRED = "Your session has expired. Log in again.";

export function jsonError(status: number, error: string, fieldErrors?: FieldErrors): NextResponse {
  return NextResponse.json(fieldErrors ? { error, fieldErrors } : { error }, { status });
}

/** The parsed JSON body, or undefined when the body isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Logs the real error server-side and returns a generic 500 to the browser. */
export function serverError(error: unknown): NextResponse {
  console.error(error);
  return jsonError(500, "Something went wrong on our side. Please try again.");
}
