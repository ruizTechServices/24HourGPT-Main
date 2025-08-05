'use client'

import NavBar, { NavItem } from '@/components/app/landing_page/Navbar'
import AuthButtons from '@/components/app/sign-in/AuthButtons'
  import { useSupabaseSession } from '@/hooks/useSupabaseSession'

export default function AuthTestPage() {
  const session = useSupabaseSession();
  const items: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "$1 Chatbot", href: "/basic" },
    ...(session
      ? [{ label: "Sign Out", href: "/auth-test" }]
      : [{ label: "Sign In", href: "/auth-test" }]),
  ];
  return (
    <>
    <NavBar items={items} />
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <AuthButtons />
    </main>
    </>
  )
}
