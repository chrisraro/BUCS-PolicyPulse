'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { isAllowedSignupEmail, SIGNUP_DOMAIN_ERROR } from '@/lib/auth'

function loginRedirect(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString()
  redirect(`/login?${qs}`)
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    loginRedirect({ error: error.message })
  }

  redirect('/')
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()

  if (!isAllowedSignupEmail(email)) {
    loginRedirect({ mode: 'signup', error: SIGNUP_DOMAIN_ERROR })
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    // The DB trigger (`enforce_email_domain`) rejects outside-domain signups
    // even if this action's pre-check above were somehow bypassed (e.g. a
    // direct API call) — map its error to the same friendly copy.
    const message = error.message.includes('restricted to @bicol-u.edu.ph')
      ? SIGNUP_DOMAIN_ERROR
      : error.message
    loginRedirect({ mode: 'signup', error: message })
  }

  loginRedirect({ message: 'Check your email to confirm your account' })
}
