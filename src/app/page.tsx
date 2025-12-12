"use client";

import React, { useState, useCallback } from "react";
import { ChatSection } from "@/components/ChatSection";
import { FilePanel } from "@/components/FilePanel";
import { Sidebar } from "@/components/Sidebar";
import { useRooms, Room } from "@/hooks/useRooms";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);

  const {
    rooms,
    isLoading: isLoadingRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom
  } = useRooms();

  // Handle selecting a room from history
  const handleSelectRoom = useCallback(async (roomId: string) => {
    setIsLoadingRoom(true);
    setIsSidebarOpen(false);

    try {
      const room = await getRoom(roomId);
      if (room) {
        setCurrentRoom(room);
      }
    } catch (error) {
      console.error("Failed to load room:", error);
    } finally {
      setIsLoadingRoom(false);
    }
  }, [getRoom]);

  // Handle creating a new chat
  const handleNewChat = useCallback(() => {
    setCurrentRoom(null);
    setIsSidebarOpen(false);
  }, []);

  // Handle deleting a room
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      const success = await deleteRoom(roomId);
      if (success && currentRoom?.id === roomId) {
        setCurrentRoom(null);
      }
    }
  }, [deleteRoom, currentRoom]);

  // Handle saving a new conversation
  const handleSaveConversation = useCallback(async (
    title: string,
    userAnswers: string[],
    aiAnswers: string[]
  ): Promise<Room | null> => {
    const room = await createRoom(title, userAnswers, aiAnswers);
    if (room) {
      setCurrentRoom(room);
    }
    return room;
  }, [createRoom]);

  // Handle updating an existing conversation
  const handleUpdateConversation = useCallback(async (
    roomId: string,
    userAnswers: string[],
    aiAnswers: string[]
  ): Promise<Room | null> => {
    return await updateRoom(roomId, { userAnswers, aiAnswers });
  }, [updateRoom]);

  return (
    <main className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        rooms={rooms}
        isLoadingRooms={isLoadingRooms}
        currentRoomId={currentRoom?.id || null}
        onNewChat={handleNewChat}
        onSelectRoom={handleSelectRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full transition-all duration-300 ease-in-out">

        {/* Chat Section: 3.75/5 width (75%) on Desktop */}
        <section className="h-full w-full md:w-[75%] border-r border-gray-100 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 relative">
          <ChatSection
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            currentRoom={currentRoom}
            isLoadingRoom={isLoadingRoom}
            onSaveConversation={handleSaveConversation}
            onUpdateConversation={handleUpdateConversation}
          />
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
