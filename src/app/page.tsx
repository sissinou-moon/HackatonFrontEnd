"use client";

import React, { useState, useCallback } from "react";
import { ChatSection } from "@/components/ChatSection";
import { FilePanel } from "@/components/FilePanel";
import { Sidebar } from "@/components/Sidebar";
import { PanelRightOpen } from "lucide-react";
import { useRooms, Room } from "@/hooks/useRooms";

export default function Home() {

  const [isFilePanelOpen, setIsFilePanelOpen] = useState(true);
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
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Chat Section: Takes all remaining space, restricted from growing */}
        <section className="flex-1 h-full min-w-0 flex flex-col border-r border-gray-100 bg-white relative">
          <ChatSection
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            currentRoom={currentRoom}
            isLoadingRoom={isLoadingRoom}
            onSaveConversation={handleSaveConversation}
            onUpdateConversation={handleUpdateConversation}
          />
        </section>

        {/* Files Panel: Strictly fixed width, no shrinking or growing */}
        {isFilePanelOpen && (
          <section className="hidden md:flex flex-col h-full w-[350px] min-w-[350px] max-w-[350px] bg-gray-50/30 border-l border-gray-100 flex-shrink-0 z-20">
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
      </div>
    </main >
  );
}
