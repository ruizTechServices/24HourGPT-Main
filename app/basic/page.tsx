import ChatInterface from "@/components/app/chatbot_basic/ChatInterface";
import NavBar from "@/components/app/landing_page/Navbar";
// This page component is also a server component by default (no "use client").

export default function BasicPage() {
    const navItems = [
        { label: "Home", href: "/" },
        { label: "$1 Chatbot", href: "/basic" },
    ];

    return (
        <div className="h-screen flex flex-col">  
            <NavBar items={navItems} />
            <ChatInterface />
        </div>
    );
}
