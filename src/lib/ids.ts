/** Random id for new line items and custom fields. randomUUID is missing on plain-http LAN addresses, hence the fallback. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
