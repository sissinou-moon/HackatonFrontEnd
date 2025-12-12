"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import { Send, Menu, Bookmark, User, Copy, ThumbsUp, ThumbsDown, FileText, ArrowLeft, X, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ChatMessage } from "./ChatMessage";

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: Date;
}

interface ChatSectionProps {
    onToggleSidebar: () => void;
}

interface FilePreview {
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'other';
}

export function ChatSection({ onToggleSidebar }: ChatSectionProps) {
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "ai",
            content:
                "Salam , je suis votre assiatant Algérie Telecom , comement je peut vous aider aujourd'hui ?",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currText, setCurrText] = useState("");
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, currText]);

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
            // Use streaming endpoint; backend responds with SSE-style chunks
            const response = await fetch("http://localhost:3000/api/chat?stream=true", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "text/event-stream",
                },
                body: JSON.stringify({
                    question: userMessageText,
                    topK: 3,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Failed to get streaming response");
            }

            // Create placeholder AI message
            const aiId = (Date.now() + 1).toString();
            const aiResponse: Message = {
                id: aiId,
                role: "ai",
                content: "",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);

            // Initialize streaming state
            setCurrText("");
            setStreamingMessageId(aiId);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let fullText = '';
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) {
                    done = true;
                    break;
                }

                // Decode and add to buffer
                buffer += decoder.decode(value, { stream: true });

                // SSE messages are separated by double newlines
                const messages = buffer.split('\n\n');
                // Keep the last incomplete message in buffer
                buffer = messages.pop() || '';

                for (const message of messages) {
                    const lines = message.split('\n');
                    const eventDataLines: string[] = [];

                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            // Handle "data: " and "data:"
                            const data = line.startsWith('data: ') ? line.substring(6) : line.substring(5);
                            eventDataLines.push(data);
                        }
                    }

                    if (eventDataLines.length === 0) continue;

                    const data = eventDataLines.join('\n');
                    if (data === '[DONE]') continue;

                    try {
                        // Try to parse as JSON (DeepSeek format or final metadata)
                        const json = JSON.parse(data);

                        // Handle DeepSeek standard format
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            setCurrText(fullText);
                        }

                        // Handle final sources metadata if present
                        if (json.sources) {
                            console.log("📚 Received sources:", json.sources);
                        }
                    } catch (e) {
                        // Fallback: If not JSON, treat as raw text content
                        // This handles the case where backend sends "data:  text"
                        if (data && !data.trim().startsWith('{') && !data.trim().startsWith('[')) {
                            fullText += data;
                            setCurrText(fullText);
                        }
                    }
                }
            }

            // Done streaming - log the final text and save to message
            console.log('Final streamed text (RAW):', JSON.stringify(fullText));
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: fullText } : m));
            setStreamingMessageId(null);
            setCurrText("");

        } catch (error) {
            console.error("Chat error:", error);
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content:
                    "désolé j'ai eu un petit probéme , pouvez veus ressayer plutard ?",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const openFile = async (baseFileName: string) => {
        setIsLoadingFile(true);
        try {
            console.log("🔍 Searching for file:", baseFileName);

            // Step 1: List ALL files in the bucket to see what we have
            const { data: files, error: listError } = await supabase
                .storage
                .from('documents')
                .list('', {
                    limit: 1000,
                    offset: 0,
                });

            if (listError) {
                console.error("❌ Error listing files:", listError);
                throw listError;
            }

            console.log("📁 Available files:", files?.map(f => f.name));

            if (!files || files.length === 0) {
                alert("No files found in storage bucket");
                return;
            }

            // Step 2: Clean the filename to match
            // Remove quotes, trim spaces, and normalize
            const cleanFileName = baseFileName
                .replace(/^["']|["']$/g, '') // Remove quotes
                .trim();

            console.log("🧹 Cleaned filename:", cleanFileName);

            // Step 3: Try multiple matching strategies
            let targetFile = null;

            // Strategy 1: Exact match
            targetFile = files.find(f => f.name === cleanFileName);
            if (targetFile) console.log("✅ Found exact match:", targetFile.name);

            // Strategy 2: Case-insensitive match
            if (!targetFile) {
                targetFile = files.find(f =>
                    f.name.toLowerCase() === cleanFileName.toLowerCase()
                );
                if (targetFile) console.log("✅ Found case-insensitive match:", targetFile.name);
            }

            // Strategy 3: Partial match (file contains the search term)
            if (!targetFile) {
                targetFile = files.find(f =>
                    f.name.toLowerCase().includes(cleanFileName.toLowerCase())
                );
                if (targetFile) console.log("✅ Found partial match:", targetFile.name);
            }

            // Strategy 4: Match by filename without extension
            if (!targetFile) {
                const baseNameWithoutExt = cleanFileName.replace(/\.[^/.]+$/, "");
                targetFile = files.find(f =>
                    f.name.toLowerCase().includes(baseNameWithoutExt.toLowerCase())
                );
                if (targetFile) console.log("✅ Found match without extension:", targetFile.name);
            }

            // Strategy 5: Fuzzy match - match the core filename
            if (!targetFile) {
                // Remove special characters and match
                const normalizedSearch = cleanFileName
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toLowerCase();

                targetFile = files.find(f => {
                    const normalizedFile = f.name
                        .replace(/[^a-zA-Z0-9]/g, '')
                        .toLowerCase();
                    return normalizedFile.includes(normalizedSearch);
                });
                if (targetFile) console.log("✅ Found fuzzy match:", targetFile.name);
            }

            if (!targetFile) {
                console.error("❌ No matching file found for:", cleanFileName);
                alert(`File not found: "${cleanFileName}"\n\nAvailable files:\n${files.map(f => f.name).join('\n')}`);
                return;
            }

            console.log("🎯 Using file:", targetFile.name);

            // Step 4: Get the public URL
            const { data: urlData } = supabase
                .storage
                .from('documents')
                .getPublicUrl(targetFile.name);

            if (!urlData?.publicUrl) {
                alert("Could not generate file URL");
                return;
            }

            console.log("🔗 Public URL:", urlData.publicUrl);

            // Step 5: Determine file type
            const extension = targetFile.name.toLowerCase().split('.').pop();
            let fileType: 'pdf' | 'docx' | 'other' = 'other';

            if (extension === 'pdf') {
                fileType = 'pdf';
            } else if (extension === 'docx' || extension === 'doc') {
                fileType = 'docx';
            }

            console.log("📄 File type:", fileType);

            // Step 6: Test if URL is accessible
            try {
                const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
                if (!testResponse.ok) {
                    console.error("❌ File URL not accessible:", testResponse.status);
                    alert(`File exists but URL is not accessible. Status: ${testResponse.status}\n\nMake sure your Supabase bucket is public!`);
                    return;
                }
                console.log("✅ File URL is accessible");
            } catch (fetchError) {
                console.error("❌ Error testing URL:", fetchError);
            }

            // Step 7: Set preview
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
    }

    const closeFilePreview = () => {
        setFilePreview(null);
    }

    // Get the viewer URL for different file types
    const getViewerUrl = (fileUrl: string, fileType: 'pdf' | 'docx' | 'other') => {
        if (fileType === 'pdf') {
            // For PDF, we can use the direct URL in an iframe
            return fileUrl;
        } else if (fileType === 'docx') {
            // For DOCX, use Microsoft Office Online viewer or Google Docs viewer
            return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    }



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
    };

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* File Preview Modal */}
            {filePreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
                    {/* Modal Header */}
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

                    {/* File Content Viewer */}
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

            {/* Loading Overlay */}
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
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-8 scroll-smooth">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"
                            } animate-slide-up`}
                    >
                        <div
                            className={`flex max-w-full md:max-w-[85%] lg:max-w-[75%] gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            {/* User Avatar (Only for user) */}
                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-gray-600" />
                                </div>
                            )}

                            {/* Message Content */}
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

                                {/* AI Actions (Below message) */}
                                {msg.role === "ai" && (
                                    <div className="flex items-center gap-2 mt-1 animate-fade-in">
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-primary hover:bg-blue-50 rounded-full transition-colors border border-transparent hover:border-blue-100">
                                            <Bookmark className="w-3.5 h-3.5" />
                                            Save as note
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
                    {/* Suggestion Chips */}
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
