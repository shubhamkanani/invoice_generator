import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safe-next";

const origin = "http://localhost:3000";

describe("safeNext", () => {
  it("defaults to the invoice list", () => {
    expect(safeNext(undefined, origin)).toBe("/invoices");
    expect(safeNext("", origin)).toBe("/invoices");
  });

  it("keeps same-site paths with their query and hash", () => {
    expect(safeNext("/invoices/abc?x=1#y", origin)).toBe("/invoices/abc?x=1#y");
  });

  it("refuses anything that resolves to another site", () => {
    // Backslashes and tabs are normalised by URL parsing into "//host" (protocol-relative).
    for (const evil of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example/x", "javascript:alert(1)"]) {
      expect(safeNext(evil, origin)).toBe("/invoices");
    }
  });
});
