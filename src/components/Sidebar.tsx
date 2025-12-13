"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, Settings, LogOut, X, Trash2, Search, FileText, Loader2 } from "lucide-react";
import { Room } from "@/hooks/useRooms";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    rooms: Room[];
    isLoadingRooms: boolean;
    currentRoomId: string | null;
    onNewChat: () => void;
    onSelectRoom: (roomId: string) => void;
    onDeleteRoom: (roomId: string) => void;
}

export function Sidebar({
    isOpen,
    onClose,
    rooms,
    isLoadingRooms,
    currentRoomId,
    onNewChat,
    onSelectRoom,
    onDeleteRoom,
}: SidebarProps) {
    const { logout, user } = useAuth();
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        setShowResults(true);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, topK: 10 })
            });
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.results);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const highlightText = (text: string, query: string) => {
        // Simple case-insensitive highlight logic
        // For a more robust solution, use regex with escape
        // This is a placeholder for the concept
        return text;
        // Actual implementation logic usually involves splitting and wrapping in span with bg-yellow-200
    };

    const handleLogout = async () => {
        if (confirm("Are you sure you want to log out?")) {
            await logout();
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const groupRoomsByDate = (rooms: Room[]) => {
        const today: Room[] = [];
        const yesterday: Room[] = [];
        const thisWeek: Room[] = [];
        const older: Room[] = [];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 86400000);
        const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

        rooms.forEach(room => {
            const roomDate = new Date(room.created_at);
            if (roomDate >= todayStart) {
                today.push(room);
            } else if (roomDate >= yesterdayStart) {
                yesterday.push(room);
            } else if (roomDate >= weekStart) {
                thisWeek.push(room);
            } else {
                older.push(room);
            }
        });

        return { today, yesterday, thisWeek, older };
    };

    const groupedRooms = groupRoomsByDate(rooms);

    const RoomSection = ({ title, roomList }: { title: string; roomList: Room[] }) => {
        if (roomList.length === 0) return null;

        return (
            <div className="mb-4">
                <h3 className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {title}
                </h3>
                {roomList.map((room) => (
                    <div
                        key={room.id}
                        className={`group w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left cursor-pointer
                            ${currentRoomId === room.id
                                ? "bg-blue-50 text-blue-700 border-l-2 border-blue-500"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                        onClick={() => onSelectRoom(room.id)}
                    >
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentRoomId === room.id ? "text-blue-500" : "text-gray-400"
                            }`} />
                        <div className="flex-1 min-w-0">
                            <span className="block truncate font-medium">{room.title}</span>
                            <span className="block text-[10px] text-gray-400 truncate">
                                {formatDate(room.created_at)}
                            </span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRoom(room.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                            title="Delete chat"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed md:relative top-0 left-0 h-full bg-gray-50 border-r border-gray-100 transition-all duration-300 ease-in-out z-50 flex flex-col
          ${isOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden"
                    }`}
            >
                <div className="flex flex-col h-full min-w-[18rem]">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg/1200px-Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg.png"
                                    alt="Algérie Télécom"
                                    className="h-6 object-contain"
                                />
                            </div>
                            <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-200 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search in files..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        const query = e.currentTarget.value;
                                        if (!query.trim()) return;

                                        // TODO: Pass a callback prop to parent to handle this or handle local state if results are shown in sidebar
                                        // For now, based on the prompt, it seems the results might be displayed somewhere. 
                                        // "In the search result , show list of items..."
                                        // We'll implement a local state to show results in a modal or overlay for now within the sidebar or delegate.
                                        // BUT simpler approach: Expand Sidebar state to show results momentarily or trigger a search function.
                                        await handleSearch(query);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-4">
                        <button
                            onClick={onNewChat}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shadow-sm group
                                ${currentRoomId === null
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25 shadow-lg"
                                    : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md hover:text-primary"
                                }`}
                        >
                            <div className={`p-1 rounded-lg transition-colors ${currentRoomId === null
                                ? "bg-white/20"
                                : "bg-blue-50 group-hover:bg-blue-500"
                                }`}>
                                <Plus className={`w-5 h-5 ${currentRoomId === null
                                    ? "text-white"
                                    : "text-blue-500 group-hover:text-white"
                                    }`} />
                            </div>
                            <span className={`font-medium ${currentRoomId === null ? "text-white" : "text-gray-700"
                                }`}>
                                New Chat
                            </span>
                        </button>
                    </div>

                    {/* Content Area: Search Results OR Chat History */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
                        {showResults ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1 mb-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Search Results</h3>
                                    <button
                                        onClick={() => { setShowResults(false); setSearchResults([]); }}
                                        className="text-xs text-blue-500 hover:text-blue-600"
                                    >
                                        Close
                                    </button>
                                </div>

                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                        <p className="text-xs text-gray-400 mt-2">Searching knowledge base...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-500">
                                        No matches found.
                                    </div>
                                ) : (
                                    searchResults.map((result, idx) => (
                                        <div key={idx} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="p-1.5 bg-blue-50 rounded text-blue-600">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{result.fileName}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{result.displayPath}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {result.matches.slice(0, 2).map((match: any, mIdx: number) => (
                                                    <div key={mIdx} className="bg-gray-50 rounded p-2 text-xs text-gray-600 font-mono border-l-2 border-blue-400">
                                                        {/* Simplified Highlight Logic Display */}
                                                        <div className="line-clamp-2">
                                                            <span className="text-gray-400 mr-2">Line {match.lineNumber}</span>
                                                            {/* We are directly displaying text here. 
                                                                 For highlighting, a helper function parsing 'match.text' against 'query' is ideal on frontend. 
                                                             */}
                                                            {match.text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Existing Logic for Chat History Rendering
                            isLoadingRooms ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
                                        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 animate-pulse"></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 animate-pulse">Loading history...</p>
                                </div>
                            ) : rooms.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-3">
                                        <MessageSquare className="w-7 h-7 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
                                </div>
                            ) : (
                                <>
                                    <RoomSection title="Today" roomList={groupedRooms.today} />
                                    <RoomSection title="Yesterday" roomList={groupedRooms.yesterday} />
                                    <RoomSection title="This Week" roomList={groupedRooms.thisWeek} />
                                    <RoomSection title="Older" roomList={groupedRooms.older} />
                                </>
                            )
                        )}
                    </div>

                    {/* Footer Area */}
                    <div className="p-4 border-t border-gray-100 space-y-1">
                        {user && (
                            <div className="px-3 py-2 mb-2 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs text-gray-500">Logged in as</p>
                                <p className="text-sm font-medium text-gray-700 truncate">{user.email}</p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Log out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
