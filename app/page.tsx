"use client";

import NavBar, { NavItem } from "../components/app/landing_page/Navbar";
import { useSupabaseSession } from "@/hooks/useSupabaseSession"
import Hero from "../components/app/landing_page/Hero"
import Description from "../components/app/landing_page/description"

export default function Home() {
  const session = useSupabaseSession();
  const items: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "$1 Chatbot", href: "/basic" },
    ...(session
      ? [{ label: "Sign Out", href: "/auth-test" }]
      : [{ label: "Sign In", href: "/auth-test" }]),
  ];
  return (
    <div className="w-full h-[300vh] overflow-hidden">
      <NavBar items={items} />
      <Hero />
      <Description />
    </div>
  )
}
