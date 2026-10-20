const DEFAULT_DESTINATION = "/invoices";

/**
 * Where to go after logging in. Only same-site destinations are allowed (no
 * open redirects): the value is resolved the way the browser would resolve it,
 * which also catches tricks like "/\evil.example" or "/\t/evil.example" that
 * URL parsing turns into another host.
 */
export function safeNext(next: string | undefined, origin: string): string {
  if (!next) return DEFAULT_DESTINATION;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_DESTINATION;
  } catch {
    return DEFAULT_DESTINATION;
  }
}
