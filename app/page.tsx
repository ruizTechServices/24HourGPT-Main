"use client";

import NavBar, { NavItem } from "@/components/app/landing_page/Navbar";
import { useSupabaseSession } from "@/hooks/useSupabaseSession"
import { Button } from "@/components/ui/button";

export default function Home() {
  const session = useSupabaseSession();
  const items: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "$1 Chatbot", href: "/basic" },
    ...(session
      ? [{ label: "Sign Out", href: "/auth-test" }]
      : [{ label: "Sign In", href: "/auth-test" }]),
  ];

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error upgrading:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-customer-portal-session', {
        method: 'POST',
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error managing subscription:', error);
    }
  };

  return (
    <div className="w-full h-[300vh] overflow-hidden">
      <NavBar items={items} />
      <div className="flex justify-center mt-8 space-x-4">
        <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
        {session && <Button onClick={handleManageSubscription}>Manage Subscription</Button>}
      </div>
    </div>
  )
}
