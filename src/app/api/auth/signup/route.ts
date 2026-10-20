import { NextResponse } from "next/server";
import { jsonError, readJson, serverError, zodFieldErrors } from "@/lib/api";
import { signupSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { EmailTakenError, createUser } from "@/lib/users/service";

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(422, "Please fix the highlighted fields", zodFieldErrors(parsed.error));

  try {
    const user = await createUser(parsed.data);
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) return jsonError(409, error.message, { email: error.message });
    return serverError(error);
  }
}
