/**
 * Pure "is this message newly appended" predicate for `MessageList`'s entrance
 * animation (DESIGN.md Motion: state only, never page-load choreography).
 *
 * A message is "new" (gets `.pp-enter`) only when it was organically appended
 * to the array the component already had — i.e. the previous render's
 * messages are a same-order-by-id prefix of the current ones. Everything
 * else (the very first render of a mounted `MessageList`, or a full
 * replacement of the array such as a session switch/history load) is treated
 * as a baseline and resets the new-id set to empty:
 *
 * - `prevMessages === null` — component mount. Whatever is already present is
 *   the baseline for this view (mirrors "no page-load choreography"), not a
 *   "new message arriving" event.
 * - Same ids/order, equal length — a streaming content update to an existing
 *   message (new array reference, same identity). The set is returned
 *   unchanged (no new ids to add, previously-flagged ids are kept).
 * - Same ids/order, `messages` longer — an organic append (user sent a
 *   message, or the assistant's reply was appended). The newly appended ids
 *   are added to the returned set.
 * - Anything else (different ids, or the array shrank) — a full replace
 *   (session switch, "New chat"). Resets to an empty set.
 */
export interface NoveltyMessage {
  id: string
}

export function computeNewMessageIds<T extends NoveltyMessage>(
  prevMessages: T[] | null,
  messages: T[],
  prevNewIds: Set<string>,
): Set<string> {
  if (prevMessages === null) return new Set()

  const isOrganicUpdate =
    prevMessages.length <= messages.length &&
    prevMessages.every((message, index) => messages[index]?.id === message.id)

  if (!isOrganicUpdate) return new Set()

  if (prevMessages.length === messages.length) return prevNewIds

  const next = new Set(prevNewIds)
  for (let i = prevMessages.length; i < messages.length; i++) {
    next.add(messages[i].id)
  }
  return next
}
