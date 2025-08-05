'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/clients/supabase/client'
import type { Session } from '@supabase/supabase-js'

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Listen for future changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return session
}
