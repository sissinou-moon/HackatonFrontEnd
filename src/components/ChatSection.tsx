"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import { Send, Menu, Bookmark, User, Copy, ThumbsUp, ThumbsDown, FileText, ArrowLeft, X, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ChatMessage } from "./ChatMessage";
import { Room, PinnedAnswer } from "@/hooks/useRooms";

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: Date;
}

interface ChatSectionProps {
    onToggleSidebar: () => void;
    currentRoom: Room | null;
    isLoadingRoom: boolean;
    onSaveConversation: (title: string, userAnswers: string[], aiAnswers: string[]) => Promise<Room | null>;
    onUpdateConversation: (roomId: string, userAnswers: string[], aiAnswers: string[]) => Promise<Room | null>;
}

interface FilePreview {
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'other';
}

export function ChatSection({
    onToggleSidebar,
    currentRoom,
    isLoadingRoom,
    onSaveConversation,
    onUpdateConversation
}: ChatSectionProps) {
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currText, setCurrText] = useState("");
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [pendingSave, setPendingSave] = useState(false);
    const [pinnedAnswers, setPinnedAnswers] = useState<PinnedAnswer[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const roomIdRef = useRef<string | null>(null);
    const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Initialize or reset messages based on current room
    useEffect(() => {
        if (currentRoom) {
            // Load messages from room
            const loadedMessages: Message[] = [];
            const userAnswers = currentRoom.userAnswers || [];
            const aiAnswers = currentRoom.aiAnswers || [];

            // Add welcome message first
            loadedMessages.push({
                id: "welcome",
                role: "ai",
                content: "Salam , je suis votre assiatant Algérie Telecom , comement je peut vous aider aujourd'hui ?",
                timestamp: new Date(currentRoom.created_at),
            });

            // Interleave user and AI messages
            for (let i = 0; i < Math.max(userAnswers.length, aiAnswers.length); i++) {
                if (userAnswers[i]) {
                    loadedMessages.push({
                        id: `user-${i}`,
                        role: "user",
                        content: userAnswers[i],
                        timestamp: new Date(currentRoom.created_at),
                    });
                }
                if (aiAnswers[i]) {
                    loadedMessages.push({
                        id: `ai-${i}`,
                        role: "ai",
                        content: aiAnswers[i],
                        timestamp: new Date(currentRoom.created_at),
                    });
                }
            }

            setMessages(loadedMessages);
            roomIdRef.current = currentRoom.id;
            // Load pinned answers from room
            setPinnedAnswers(currentRoom.pinAnswer || []);
        } else {
            // New chat - reset to welcome message only
            setMessages([
                {
                    id: "1",
                    role: "ai",
                    content: "Salam , je suis votre assiatant Algérie Telecom , comement je peut vous aider aujourd'hui ?",
                    timestamp: new Date(),
                },
            ]);
            roomIdRef.current = null;
            setPinnedAnswers([]);
        }
    }, [currentRoom]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll to a specific message by ID
    const scrollToMessage = (messageId: string) => {
        const messageElement = messageRefs.current[messageId];
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: "smooth", block: "start" });
            // Highlight the message briefly
            messageElement.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
            setTimeout(() => {
                messageElement.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
            }, 2000);
        }
    };

    // Remove a message from pinned notes
    const removeFromNote = async (messageId: string) => {
        if (!roomIdRef.current) return;

        const updatedPins = pinnedAnswers.filter(p => p.messageId !== messageId);

        try {
            const { error } = await supabase
                .from("history")
                .update({ pinAnswer: updatedPins })
                .eq("id", roomIdRef.current);

            if (error) throw error;

            setPinnedAnswers(updatedPins);
        } catch (err) {
            console.error("Failed to remove pin:", err);
            alert("Could not remove note. Please try again.");
        }
    };

    // Save a message as a pinned note
    const saveAsNote = async (msg: Message) => {
        if (!roomIdRef.current) {
            alert("Please save the conversation first before pinning a note.");
            return;
        }

        // If already pinned, remove it instead
        if (pinnedAnswers.some(p => p.messageId === msg.id)) {
            await removeFromNote(msg.id);
            return;
        }

        const newPinnedAnswer: PinnedAnswer = {
            messageId: msg.id,
            content: msg.content.slice(0, 200), // Store first 200 chars as preview
            pinnedAt: new Date().toISOString(),
        };

        const updatedPins = [...pinnedAnswers, newPinnedAnswer];

        try {
            // Update Supabase directly
            const { error } = await supabase
                .from("history")
                .update({ pinAnswer: updatedPins })
                .eq("id", roomIdRef.current);

            if (error) throw error;

            setPinnedAnswers(updatedPins);
        } catch (err) {
            console.error("Failed to pin answer:", err);
            alert("Could not save note. Please try again.");
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, currText]);

    // --- LOGIC TO OPEN FILES ---
    const openFile = async (baseFileName: string) => {
        setIsLoadingFile(true);
        try {
            const { data: files, error: listError } = await supabase
                .storage
                .from('documents')
                .list('', {
                    limit: 1000,
                    offset: 0,
                });

            if (listError) throw listError;

            if (!files || files.length === 0) {
                alert("No files found in storage bucket");
                return;
            }

            const cleanFileName = baseFileName.replace(/^["']|["']$/g, '').trim();
            let targetFile = null;

            // Matching Strategies
            targetFile = files.find(f => f.name === cleanFileName); // Exact
            if (!targetFile) targetFile = files.find(f => f.name.toLowerCase() === cleanFileName.toLowerCase()); // Case-insensitive
            if (!targetFile) targetFile = files.find(f => f.name.toLowerCase().includes(cleanFileName.toLowerCase())); // Partial
            if (!targetFile) {
                const baseNameWithoutExt = cleanFileName.replace(/\.[^/.]+$/, "");
                targetFile = files.find(f => f.name.toLowerCase().includes(baseNameWithoutExt.toLowerCase())); // No Ext
            }
            if (!targetFile) { // Fuzzy
                const normalizedSearch = cleanFileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                targetFile = files.find(f => f.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(normalizedSearch));
            }

            if (!targetFile) {
                alert(`File not found: "${cleanFileName}"`);
                return;
            }

            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(targetFile.name);

            if (!urlData?.publicUrl) {
                alert("Could not generate file URL");
                return;
            }

            const extension = targetFile.name.toLowerCase().split('.').pop();
            let fileType: 'pdf' | 'docx' | 'other' = 'other';
            if (extension === 'pdf') fileType = 'pdf';
            else if (extension === 'docx' || extension === 'doc') fileType = 'docx';

            setFilePreview({
                fileName: cleanFileName,
                fileUrl: urlData.publicUrl,
                fileType
            });

        } catch (e) {
            console.error("❌ Error opening file:", e);
            alert(`Error opening file: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            setIsLoadingFile(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessageText = inputValue;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMessageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputValue("");
        setIsTyping(true);

        try {
            const response = await fetch("http://localhost:3000/api/chat?stream=true", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "text/event-stream",
                },
                body: JSON.stringify({
                    question: userMessageText,
                    topK: 10,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Failed to get streaming response");
            }

            const aiId = (Date.now() + 1).toString();
            const aiResponse: Message = {
                id: aiId,
                role: "ai",
                content: "",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
            setStreamingMessageId(aiId);
            setCurrText("");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let fullAiText = '';
            let buffer = ''; // Buffer for handling stream chunks

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Process complete lines from the buffer
                    const lines = buffer.split('\n');
                    // Keep the last line in the buffer as it might be incomplete
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        // Check for Server-Sent Events prefix
                        if (trimmedLine.startsWith('data: ')) {
                            const dataContent = trimmedLine.slice(6); // Remove "data: "

                            // CASE 1: Check if it's the final JSON with sources
                            if (dataContent.startsWith('{')) {
                                try {
                                    const parsedData = JSON.parse(dataContent);

                                    // Handle OpenAI-style chunks if your backend wraps tokens in JSON
                                    if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
                                        fullAiText += parsedData.choices[0].delta.content;
                                    }

                                    // Handle the custom "sources" block at the end
                                    else if (parsedData.sources && Array.isArray(parsedData.sources)) {
                                        // Format sources specifically for ChatMessage regex to detect
                                        // Format: [Source: filename, line X]
                                        const sourcesMarkdown = parsedData.sources
                                            .map((s: any) => `\n- [Source: ${s.fileName}, line ${s.lineNumber}]`)
                                            .join("");

                                        if (sourcesMarkdown) {
                                            fullAiText += `\n\n**Sources:**${sourcesMarkdown}`;
                                        }
                                    }
                                } catch (e) {
                                    console.warn("Error parsing JSON data line:", e);
                                    // Fallback: If it looked like JSON but failed, treat as text? 
                                    // Usually safer to ignore or treat as raw text if not valid JSON
                                }
                            }
                            // CASE 2: It's just raw text (e.g. "data: Hello")
                            else {
                                fullAiText += dataContent;
                            }

                            setCurrText(fullAiText);
                        }
                    }
                }
            }

            setIsTyping(false);
            setStreamingMessageId(null);

            // Final update to the message state
            setMessages(prev => prev.map(msg =>
                msg.id === aiId ? { ...msg, content: fullAiText } : msg
            ));

            // Save Conversation logic
            if (roomIdRef.current) {
                const currentUserAnswers = currentRoom?.userAnswers || [];
                const currentAiAnswers = currentRoom?.aiAnswers || [];
                setPendingSave(true);
                try {
                    await onUpdateConversation(
                        roomIdRef.current,
                        [...currentUserAnswers, userMessageText],
                        [...currentAiAnswers, fullAiText]
                    );
                } finally {
                    setPendingSave(false);
                }
            } else {
                setPendingSave(true);
                try {
                    const newRoom = await onSaveConversation(
                        userMessageText.slice(0, 30) + "...",
                        [userMessageText],
                        [fullAiText]
                    );
                    if (newRoom) {
                        roomIdRef.current = newRoom.id;
                    }
                } finally {
                    setPendingSave(false);
                }
            }

        } catch (error) {
            console.error("Error generating response:", error);
            setIsTyping(false);
            setStreamingMessageId(null);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "ai",
                content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
                timestamp: new Date()
            }]);
        }
    };

    const closeFilePreview = () => {
        setFilePreview(null);
    };

    const getViewerUrl = (fileUrl: string, fileType: 'pdf' | 'docx' | 'other') => {
        if (fileType === 'pdf') {
            return fileUrl;
        } else if (fileType === 'docx') {
            return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

    const handleNewChat = () => {
        setMessages([
            {
                id: "1",
                role: "ai",
                content: "Salam , je suis votre assiatant Algérie Telecom , comement je peut vous aider aujourd'hui ?",
                timestamp: new Date(),
            },
        ]);
        setInputValue("");
        setFilePreview(null);
        roomIdRef.current = null;
    };

    const handlePrintMessage = (message: Message) => {
        if (message.role !== 'ai') return;
        console.log('🤖 AI Message Debug:', message);
    };

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Room Loading Overlay */}
            {isLoadingRoom && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-2 border-blue-100 animate-pulse"></div>
                            <div className="absolute inset-1 rounded-full border-2 border-t-blue-500 border-r-blue-300 border-b-transparent border-l-transparent animate-spin"></div>
                            <div className="absolute inset-3 rounded-full border-2 border-t-transparent border-r-transparent border-b-cyan-400 border-l-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                            <div className="absolute inset-5 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 shadow-lg shadow-blue-400/50 animate-pulse"></div>
                            <div className="absolute inset-[30%] rounded-full bg-white shadow-[0_0_15px_5px_rgba(59,130,246,0.5)] animate-pulse"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600 animate-pulse">Loading conversation...</p>
                            <p className="text-xs text-gray-400 mt-1">Retrieving your chat history</p>
                        </div>
                        <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Modal */}
            {filePreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={closeFilePreview}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="text-sm font-medium hidden sm:inline">Back to Chat</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-center">
                            <FileText className="w-5 h-5" />
                            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[400px]">
                                {filePreview.fileName}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={filePreview.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors hidden sm:inline-flex items-center gap-1"
                            >
                                Open in New Tab
                            </a>
                            <button
                                onClick={closeFilePreview}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-100 overflow-hidden">
                        <iframe
                            src={getViewerUrl(filePreview.fileUrl, filePreview.fileType)}
                            className="w-full h-full border-0"
                            title={`Preview: ${filePreview.fileName}`}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                    </div>
                </div>
            )}

            {/* Loading Overlay for Files */}
            {isLoadingFile && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-gray-600 font-medium">Loading file...</p>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white/90 backdrop-blur-md z-10 sticky top-0 justify-between">
                <div className="flex items-center">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg mr-3 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-auto flex items-center justify-center">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg/1200px-Logo_Alg%C3%A9rie_T%C3%A9l%C3%A9com.svg.png"
                                alt="Algérie Télécom"
                                className="h-8 object-contain"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <button
                        onClick={handleNewChat}
                        className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Chat</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {pendingSave && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-xs text-blue-600 font-medium">Saving...</span>
                            </div>
                        )}
                        {currentRoom && (
                            <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                {currentRoom.title}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pinned Notes Bar */}
                {pinnedAnswers.length > 0 && (
                    <div className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto" style={{ backgroundColor: 'rgba(120, 170, 255, 0.1)', borderColor: 'rgba(120, 170, 255, 0.3)' }}>
                        <Bookmark className="w-4 h-4 flex-shrink-0" style={{ color: '#78AAFF' }} />
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#5a8edb' }}>Pinned:</span>
                        <div className="flex gap-2 overflow-x-auto">
                            {pinnedAnswers.map((pin, index) => (
                                <button
                                    key={pin.messageId + index}
                                    onClick={() => scrollToMessage(pin.messageId)}
                                    className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 transition-colors truncate max-w-[200px] flex-shrink-0 shadow-sm"
                                    style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(120, 170, 255, 0.4)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(120, 170, 255, 0.15)';
                                        e.currentTarget.style.borderColor = '#78AAFF';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.borderColor = 'rgba(120, 170, 255, 0.4)';
                                    }}
                                    title={pin.content}
                                >
                                    {pin.content.slice(0, 50)}...
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-8 scroll-smooth">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        ref={(el) => { messageRefs.current[msg.id] = el; }}
                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"
                            } animate-slide-up transition-all duration-300`}
                        onClick={() => msg.role === "ai" && handlePrintMessage(msg)}
                    >
                        <div
                            className={`flex max-w-full md:max-w-[85%] lg:max-w-[75%] gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-gray-600" />
                                </div>
                            )}

                            <div className="flex flex-col gap-2 min-w-0">
                                <div
                                    className={`text-[15px] leading-7 ${msg.role === "user"
                                        ? "bg-gray-100 px-5 py-3 rounded-2xl text-gray-800 font-medium"
                                        : "text-gray-800 bg-transparent px-0 py-0"
                                        }`}
                                >
                                    <ChatMessage
                                        content={streamingMessageId === msg.id ? currText : msg.content}
                                        role={msg.role}
                                        onOpenFile={openFile}
                                    />
                                </div>

                                {msg.role === "ai" && (
                                    <div className="flex items-center gap-2 mt-1 animate-fade-in">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                saveAsNote(msg);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${pinnedAnswers.some(p => p.messageId === msg.id)
                                                ? "border-[#78AAFF]"
                                                : "text-gray-500 hover:text-primary hover:bg-blue-50 border-transparent hover:border-blue-100"
                                                }`}
                                            style={pinnedAnswers.some(p => p.messageId === msg.id) ? { color: '#78AAFF', backgroundColor: 'rgba(120, 170, 255, 0.1)' } : {}}
                                        >
                                            <Bookmark className="w-3.5 h-3.5" />
                                            {pinnedAnswers.some(p => p.messageId === msg.id) ? "Remove from note" : "Save as note"}
                                        </button>
                                        <div className="flex items-center gap-1 ml-2">
                                            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                <ThumbsDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start w-full animate-fade-in pl-0 md:pl-0">
                        <div className="flex gap-1 items-center h-8 px-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-50 z-20">
                <div className="max-w-4xl mx-auto">
                    {messages.length < 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                            {[
                                "Summarize this document",
                                "What are the key findings?",
                                "Explain the financial data",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setInputValue(suggestion);
                                    }}
                                    className="whitespace-nowrap px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-primary transition-colors cursor-pointer"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    <form
                        onSubmit={handleSendMessage}
                        className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[24px] p-2 transition-all shadow-inner hover:bg-white hover:shadow-sm focus:ring-0"
                    >
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question about your files..."
                            className="w-full max-h-32 bg-transparent text-gray-800 placeholder-gray-400 border-none py-3 pl-4 pr-12 resize-none text-[15px] leading-relaxed 
                                    ring-0 focus:ring-0
                                    focus:outline-none"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="absolute right-2 bottom-2 p-2 bg-primary text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-primary transition-all shadow-sm hover:shadow-md transform active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium tracking-wide">
                        Made with Forsa Tic
                    </p>
                </div>
            </div>
        </div>
    );
}