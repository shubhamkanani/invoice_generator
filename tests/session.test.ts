import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";

describe("session tokens", () => {
  it("round-trips the user id", async () => {
    const token = await signSession({ userId: "abc" });
    expect(await verifySession(token)).toEqual({ userId: "abc" });
  });

  it("rejects a tampered token", async () => {
    const token = await signSession({ userId: "abc" });
    const tampered = token.slice(0, -2) + (token.endsWith("xx") ? "yy" : "xx");
    expect(await verifySession(tampered)).toBeNull();
  });

  it("rejects missing and malformed tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
  });
});
