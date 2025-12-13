"use client";

import React, { useState, useCallback } from "react";
import { ChatSection } from "@/components/ChatSection";
import { FilePanel } from "@/components/FilePanel";
import { Sidebar } from "@/components/Sidebar";
import { AuthPage } from "@/components/AuthPage";
import { useRooms, Room, AIAnswer } from "@/hooks/useRooms";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { FilePreviewModal, FilePreviewData } from "@/components/FilePreviewModal";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);

  // File Preview State
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const {
    rooms,
    isLoading: isLoadingRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom
  } = useRooms();

  // Handle opening a file
  const handleOpenFile = useCallback(async (path: string, fileName: string) => {
    setIsLoadingFile(true);
    try {
      // Try getting public URL directly first
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      // If direct path works (we assume checking getting the URL is cheap, but validity is hard to check without HEAD)
      // However, if the path from search is a "display path" (e.g. folder/file.docx) and real path is "folder/timestamp-file.docx",
      // getPublicUrl returns a URL regardless of existence usually, but let's try to verify or find the real file if we suspect mismatch.

      // The prompt says "No preview available" which implies the URL is 404.
      // We will perform a search in the directory to find the actual system path (with timestamp).

      let validUrl = urlData?.publicUrl;
      let finalFileName = fileName;

      // Extract folder and simple filename
      const cleanFileName = fileName.replace(/^["']|["']$/g, '').trim();
      // Path might be "Folder/Filename.docx"
      const pathParts = path.split('/');
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      const targetFileName = pathParts[pathParts.length - 1]; // This is from the 'displayPath' or 'path' argument

      console.log("Searching for file:", targetFileName, "in folder:", folderPath);

      // List files in the folder to find the real one (handling timestamps)
      const { data: files, error: listError } = await supabase
        .storage
        .from('documents')
        .list(folderPath, {
          limit: 100,
        });

      if (!listError && files && files.length > 0) {
        let targetFile = files.find(f => {
          const baseName = f.name.toLowerCase();
          const searchName = targetFileName.toLowerCase();

          // Exact match
          if (baseName === searchName) return true;

          // Ends with (timestamp case: 123456-filename.docx)
          if (baseName.endsWith(searchName)) return true; // e.g. 123-foo.docx ends with foo.docx

          // Also check if the 'fileName' argument was just the name part used for search
          const providedNameLower = fileName.toLowerCase();
          if (baseName.endsWith(providedNameLower)) return true;

          return false;
        });

        // If not found by 'endsWith', try loose match
        if (!targetFile) {
          targetFile = files.find(f => f.name.toLowerCase().includes(targetFileName.toLowerCase()));
        }

        if (targetFile) {
          console.log("Found actual file:", targetFile.name);
          finalFileName = targetFile.name;
          const fullPath = folderPath ? `${folderPath}/${targetFile.name}` : targetFile.name;
          const { data: realUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fullPath);
          validUrl = realUrlData.publicUrl;
        } else {
          console.warn("File not found in storage list, using provided path as fallback");
        }
      }

      if (!validUrl) {
        alert("Could not generate file URL");
        return;
      }

      const extension = finalFileName.toLowerCase().split('.').pop();
      let fileType: 'pdf' | 'docx' | 'other' = 'other';
      if (extension === 'pdf') fileType = 'pdf';
      else if (extension === 'docx' || extension === 'doc') fileType = 'docx';

      setFilePreview({
        fileName: finalFileName,
        fileUrl: validUrl,
        fileType
      });
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Failed to open file");
    } finally {
      setIsLoadingFile(false);
    }
  }, []);

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
    aiAnswers: AIAnswer[]
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
    aiAnswers: AIAnswer[]
  ): Promise<Room | null> => {
    return await updateRoom(roomId, { userAnswers, aiAnswers });
  }, [updateRoom]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show main app if logged in
  return (
    <main className="flex h-screen w-full bg-background overflow-hidden relative">
      <FilePreviewModal
        file={filePreview}
        onClose={() => setFilePreview(null)}
      />

      {/* Loading Overlay */}
      {isLoadingFile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium">Opening file...</p>
          </div>
        </div>
      )}

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
        onOpenFile={handleOpenFile}
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
        <section className="hidden md:flex flex-col h-full w-[350px] min-w-[350px] max-w-[350px] bg-gray-50/30 border-l border-gray-100 flex-shrink-0 z-20">
          <FilePanel onOpenFile={handleOpenFile} />
        </section>
      </div>
    </main>
  );
}
