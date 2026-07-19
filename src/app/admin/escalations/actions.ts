'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionState } from '../_lib/action-state'

export async function resolveEscalation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'Admin access required.' }
  }

  const escalationId = String(formData.get('escalationId') ?? '')
  const resolution = String(formData.get('resolution') ?? '').trim()

  if (!escalationId) return { status: 'error', message: 'Missing escalation id.' }
  if (!resolution) {
    return { status: 'error', message: 'Enter a resolution before marking this resolved.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('escalations')
    .update({ status: 'resolved', resolution })
    .eq('id', escalationId)

  if (error) {
    return { status: 'error', message: `Could not resolve: ${error.message}` }
  }

  revalidatePath('/admin/escalations')
  revalidatePath('/admin')
  return { status: 'success', message: 'Escalation resolved.' }
}
