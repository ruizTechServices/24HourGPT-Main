'use client'

import { Button } from '@/components/ui/button'
import googleOauth from '@/lib/functions/supabase/googleOauth'
import SignOutButton from '@/components/app/sign-out/SignOutButton'

export default function AuthButtons() {
  const handleLogin = async () => {
    const { data, error } = await googleOauth()

    if (error) {
      console.error('Google OAuth login failed:', error)
      return
    }

    console.log('Google OAuth login success:', data)
  }



  return (
    <div className="flex gap-4">
      <Button onClick={handleLogin}>Sign in with Google</Button>
      <SignOutButton />
    </div>
  )
}
