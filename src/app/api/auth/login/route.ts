import { NextResponse } from "next/server";
import { jsonError, readJson, serverError, zodFieldErrors } from "@/lib/api";
import { loginSchema } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { authenticateUser } from "@/lib/users/service";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(422, "Please fix the highlighted fields", zodFieldErrors(parsed.error));

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    // Same message for an unknown email and a wrong password, so accounts can't be probed.
    if (!user) return jsonError(401, "Incorrect email or password");
    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return serverError(error);
  }
}
