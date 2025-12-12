"use client";

import React, { useState } from "react";
import { ChatSection } from "@/components/ChatSection";
import { FilePanel } from "@/components/FilePanel";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <main className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full transition-all duration-300 ease-in-out">

        {/* Chat Section: 3.75/5 width (75%) on Desktop */}
        <section className="h-full w-full md:w-[75%] border-r border-gray-100 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 relative">
          <ChatSection onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        </section>

        {/* Files Panel: 1.25/5 width (25%) on Desktop */}
        <section className="hidden md:flex flex-col h-full md:w-[25%] bg-gray-50/30">
          <FilePanel />
        </section>

        {/* Mobile View Handling:
            - Chat takes full width.
            - Files hidden or accessible via other means (not specified, keeping hidden for now as per previous instructions for simple mobile view)
        */}
      </div>
    </main>
  );
}
