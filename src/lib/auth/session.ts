import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/*
 * Sessions are a signed JWT (HS256) in an httpOnly cookie that carries only the
 * user id. Nothing secret is stored in it, the browser's JavaScript can't read
 * it, and SameSite=Lax keeps it off cross-site POSTs.
 */

export const SESSION_COOKIE = "remit_session";
const SESSION_DAYS = 7;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters — see .env.example");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ userId }: { userId: string }): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

/** The session in a token, or null if it is missing, expired or tampered with. */
export async function verifySession(token: string | undefined): Promise<{ userId: string } | null> {
  if (!token) return null;
  const key = secretKey(); // a missing secret is a configuration error, not a bad token
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await signSession({ userId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ userId: string } | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
