/**
 * Pure decision function for whether a controlled form should reset itself in
 * response to a new `useActionState` result.
 *
 * Comparing only `status` strings misses a real transition: two consecutive
 * successful submissions both report `status: 'success'`, so a plain
 * `prevStatus !== status` check never fires on the second one and the
 * controlled Title field (plus its "touched" flag) goes stale. Each server
 * action return is a fresh object literal, though, so comparing the state
 * object's *identity* reliably distinguishes "the same completed action,
 * re-rendered for an unrelated reason" from "a brand new action result" —
 * even when two results happen to carry an identical status/message.
 */
export function shouldResetForm(
  prev: { seen: unknown },
  next: { state: unknown; status: string },
): boolean {
  if (next.status !== 'success') return false
  return prev.seen !== next.state
}
