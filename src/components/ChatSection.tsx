"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import { Send, Menu, Bookmark, User, Copy, ThumbsUp, ThumbsDown, FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: Date;
}

interface ChatSectionProps {
    onToggleSidebar: () => void;
}

export function ChatSection({ onToggleSidebar }: ChatSectionProps) {
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

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
            const response = await fetch("http://localhost:3000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: userMessageText,
                    topK: 7,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();
            const aiContent =
                data.answer ||
                data.message ||
                data.response ||
                (typeof data === "string" ? data : JSON.stringify(data));

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: aiContent,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
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

    const openFile = async (fileName: string) => {
        try {
            // Assuming file is in 'documents' bucket. 
            // We can get a public URL or signed URL. 
            // Since user said "open a dialog that open the exact file", simplified version is opening in new tab.
            const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
            if (data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                alert("Could not find file URL");
            }
        } catch (e) {
            console.error("Error opening file", e);
        }
    }

    // Helper component to render content with interactive citations
    const MessageContent = ({ content }: { content: string }) => {
        // First, replace backticks with nothing
        let processedContent = content.replace(/`/g, '');

        // Replace bullet points * with ╰┈➤
        processedContent = processedContent.replace(/^\s*\*\s+/gm, '➜');

        const elements: (string | JSX.Element)[] = [];
        let elementKey = 0;

        // Combined regex for all citation formats:
        // 1. *(Source: FileName, line N)*
        // 2. * -- FileName-- ... السطر N
        // 3. [From FileName, line N]
        // 4. FileName, line N (no backticks since we removed them)
        // 5. Selon le document "FileName" à la ligne N
        const allCitationsRegex = /(\*\(Source:\s*([^,\)]+),\s*lines?\s*[\d\s]+(?:and\s*[\d\s]+)?\)\*)|(\*\s*--\s*([^-]+)--[^\n]*?السطر\s*\d+)|(\[(From|File:)\s*([^,\]]+),\s*line\s*(\d+)\])|(\b([^,\n]+\.docx?),\s*line\s*\d+)|([Ss]elon le document\s*["""']([^"""']+)["""']\s*à la ligne\s*\d+)/gi;

        let lastIndex = 0;
        let match;

        while ((match = allCitationsRegex.exec(processedContent)) !== null) {
            if (match.index > lastIndex) {
                const textBefore = processedContent.slice(lastIndex, match.index);
                elements.push(textBefore);
            }

            let fileName = '';
            if (match[2]) {
                // *(Source: FileName, ...)* pattern
                fileName = match[2].trim();
            } else if (match[4]) {
                // * -- FileName-- ... pattern
                fileName = match[4].trim();
            } else if (match[7]) {
                // [From/File: FileName, ...] pattern
                fileName = match[7].trim();
            } else if (match[9]) {
                // FileName.docx, line N pattern (no backticks)
                fileName = match[9].trim();
            } else if (match[11]) {
                // Selon le document "FileName" pattern
                fileName = match[11].trim();
            }

            if (fileName) {
                elements.push(
                    <button
                        key={`citation-${elementKey++}`}
                        onClick={() => openFile(fileName)}
                        className="inline mx-1 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                        title={`Open ${fileName}`}
                    >
                        {fileName}
                    </button>
                );
            }

            lastIndex = allCitationsRegex.lastIndex;
        }

        if (lastIndex < processedContent.length) {
            elements.push(processedContent.slice(lastIndex));
        }

        const finalElements: (string | JSX.Element)[] = [];

        elements.forEach((element, idx) => {
            if (typeof element === 'string') {
                // Process bold markdown **text**
                const boldRegex = /\*\*([^\*]+)\*\*/g;
                const parts: (string | JSX.Element)[] = [];
                let lastBoldIndex = 0;
                let boldMatch;

                while ((boldMatch = boldRegex.exec(element)) !== null) {
                    if (boldMatch.index > lastBoldIndex) {
                        parts.push(element.slice(lastBoldIndex, boldMatch.index));
                    }

                    parts.push(
                        <strong key={`bold-${idx}-${elementKey++}`} className="font-bold text-gray-900">
                            {boldMatch[1]}
                        </strong>
                    );

                    lastBoldIndex = boldRegex.lastIndex;
                }

                if (lastBoldIndex < element.length) {
                    parts.push(element.slice(lastBoldIndex));
                }

                finalElements.push(...parts);
            } else {
                finalElements.push(element);
            }
        });

        return <div className="whitespace-pre-wrap leading-7">{finalElements}</div>;
    };

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
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
                <div>{/* Optional Right Header Controls */}</div>
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
                                    <MessageContent content={msg.content} />
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
                        className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[24px] p-2 focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/40 transition-all shadow-inner hover:bg-white hover:shadow-sm"
                    >
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question about your files..."
                            className="w-full max-h-32 bg-transparent text-gray-800 placeholder-gray-400 border-none focus:ring-0 py-3 pl-4 pr-12 resize-none text-[15px] leading-relaxed"
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
