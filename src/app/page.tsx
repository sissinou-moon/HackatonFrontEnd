"use client";

import React, { useState } from "react";
import { ChatSection } from "@/components/ChatSection";
import { FilePanel } from "@/components/FilePanel";
import { Sidebar } from "@/components/Sidebar";
import { PanelRightOpen } from "lucide-react";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(true);

  return (
    <main className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full transition-all duration-300 ease-in-out">

        {/* Chat Section: Expands when FilePanel is hidden */}
        <section className={`h-full w-full ${isFilePanelOpen ? 'md:w-[75%]' : 'md:w-full'} border-r border-gray-100 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 relative transition-all duration-300`}>
          <ChatSection onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        </section>

        {/* Files Panel: 1.25/5 width (25%) on Desktop */}
        {isFilePanelOpen && (
          <section className="hidden md:flex flex-col h-full md:w-[25%] bg-gray-50/30 transition-all duration-300">
            <FilePanel onClose={() => setIsFilePanelOpen(false)} />
          </section>
        )}

        {/* Toggle button when panel is hidden */}
        {!isFilePanelOpen && (
          <button
            onClick={() => setIsFilePanelOpen(true)}
            className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all z-20 cursor-pointer"
            title="Show Sources"
          >
            <PanelRightOpen className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Mobile View Handling:
            - Chat takes full width.
            - Files hidden or accessible via other means (not specified, keeping hidden for now as per previous instructions for simple mobile view)
        */}
      </div>
    </main>
  );
}
