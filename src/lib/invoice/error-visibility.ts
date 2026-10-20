/**
 * When the editor shows a field's error:
 * - after a save attempt or once the field has been left: always;
 * - while typing: problems in what's already there (a negative price, a
 *   discount above the subtotal) show at once, but an email address isn't
 *   flagged until it's finished, and empty required fields don't shout.
 */
export function isErrorVisible(path: string, rawValue: string, state: { submitted: boolean; touched: boolean }): boolean {
  if (state.submitted || state.touched) return true;
  if (rawValue.trim() === "") return false;
  return !path.endsWith(".email");
}
