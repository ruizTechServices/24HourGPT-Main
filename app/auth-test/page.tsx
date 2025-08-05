'use client'

import AuthButtons from '@/components/app/sign-in/AuthButtons'

export default function AuthTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Auth Test Page</h1>
      <AuthButtons />
    </main>
  )
}
