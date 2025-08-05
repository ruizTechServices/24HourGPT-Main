'use client'

import { Button } from '@/components/ui/button'
import googleOauth from '@/lib/functions/supabase/googleOauth'
import userLogout from '@/lib/functions/supabase/userLogout'

export default function AuthButtons() {
  const handleLogin = async () => {
    const { data, error } = await googleOauth()

    if (error) {
      console.error('Google OAuth login failed:', error)
      return
    }

    console.log('Google OAuth login success:', data)
  }

  const handleLogout = async () => {
    const { error } = await userLogout()

    if (error) {
      console.error('Logout failed:', error)
      return
    }

    console.log('Logout success')
  }

  return (
    <div className="flex gap-4">
      <Button onClick={handleLogin}>Sign in with Google</Button>
      <Button variant="secondary" onClick={handleLogout}>
        Sign out
      </Button>
    </div>
  )
}
