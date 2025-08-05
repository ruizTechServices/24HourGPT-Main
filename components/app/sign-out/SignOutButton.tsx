'use client'

import { Button } from '@/components/ui/button'
import userLogout from '@/lib/functions/supabase/userLogout'
import React from 'react'

interface SignOutButtonProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children?: React.ReactNode
}

export default function SignOutButton({ variant = 'secondary', children }: SignOutButtonProps) {
  const handleLogout = async () => {
    const { error } = await userLogout()

    if (error) {
      console.error('Logout failed:', error)
      return
    }

    console.log('Logout success')
  }

  return (
    <Button variant={variant} onClick={handleLogout}>
      {children ?? 'Sign out'}
    </Button>
  )
}
