import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { login, signup } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const mode = params.mode === 'signup' ? 'signup' : 'login'
  const error = params.error
  const message = params.message

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <h1 className="text-balance text-center font-serif text-2xl font-semibold tracking-tight text-ink">
          BUCS PolicyPulse
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Your official BUCS policy assistant
        </p>

        {message ? (
          <p
            role="status"
            className="mt-6 rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <form
          action={mode === 'signup' ? signup : login}
          className="mt-6 flex flex-col gap-4"
        >
          {mode === 'signup' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className="text-sm font-medium text-ink">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                className="h-11 rounded-lg border border-border bg-bg px-3 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-lg border border-border bg-bg px-3 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            {mode === 'signup' ? (
              <p className="text-xs text-muted">
                Use your @bicol-u.edu.ph school email.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="h-11 rounded-lg border border-border bg-bg px-3 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <Button type="submit" variant="primary" size="touch" className="mt-2 w-full">
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Need an account?{' '}
              <Link
                href="/login?mode=signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
