/**
 * Shared shape for `useActionState` results across the admin area's server
 * actions (upload, re-index, delete, save settings, resolve escalation).
 * Kept as a plain (non "use server") module so it can be imported from both
 * client components and "use server" action files.
 */
export interface ActionState {
  status: 'idle' | 'success' | 'error'
  message?: string
}

export const initialActionState: ActionState = { status: 'idle' }
