"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import { Send, Menu, Bookmark, User, Copy, ThumbsUp, ThumbsDown, FileText, ArrowLeft, X, Loader2 } from "lucide-react";
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

            // Create placeholder AI message that will be updated as chunks arrive
            const aiId = (Date.now() + 1).toString();
            const aiResponse: Message = {
                id: aiId,
                role: "ai",
                content: "",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) {
                    done = true;
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // SSE messages separated by double newline
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                for (const part of parts) {
                    const lines = part.split('\n').map(l => l.trim());
                    if (lines.length === 0) continue;

                    // detect event header
                    let eventType = 'message';
                    let dataLines: string[] = [];
                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            eventType = line.replace('event:', '').trim();
                        } else if (line.startsWith('data:')) {
                            dataLines.push(line.replace('data:', '').trim());
                        }
                    }

                    const data = dataLines.join('\n');

                    if (eventType === 'message' || eventType === 'message' /* fallback */) {
                        // append partial text
                        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + data } : m));
                    } else if (eventType === 'done') {
                        // final metadata event (sources) — can be parsed and appended if desired
                        try {
                            const json = JSON.parse(data);
                            // Optionally append source info to last message
                            if (json?.sources && Array.isArray(json.sources)) {
                                const sourcesText = '\n\nSources:\n' + json.sources.map((s: any) => `- ${s.fileName} (line ${s.lineNumber})`).join('\n');
                                setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + sourcesText } : m));
                            }
                        } catch (e) {
                            // ignore parse errors
                        }
                    } else if (eventType === 'error') {
                        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + '\n\n[Error receiving response]' } : m));
                    }
                }
            }

            // flush any remaining buffer
            if (buffer) {
                const lines = buffer.split('\n').map(l => l.trim());
                const dataLines = lines.filter(l => l.startsWith('data:')).map(l => l.replace('data:', '').trim());
                if (dataLines.length) {
                    const data = dataLines.join('\n');
                    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + data } : m));
                }
            }

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

    // Helper component to render content with interactive citations and tables
    const MessageContent = ({ content }: { content: string }) => {
        // 1. Initial cleanup
        const processedContent = content
            .replace(/`/g, '')
            .replace(/^\s*\*\s+/gm, '╰┈➤ ');

        // 2. Rich Text Renderer with memoized regex
        const renderRichText = React.useMemo(() => {
            return (text: string) => {
                const elements: (string | JSX.Element)[] = [];
                let elementKey = 0;

                // Comprehensive citation regex - covers all formats including standalone quoted files, 'From file:', and 'From [filename]' patterns
                const citationRegex = /(\[Source:\s*([^,\]]+),\s*lines?\s*\d+\])|(\(Source:\s*([^,\)]+),\s*lignes?\s*\d+\))|(\(Source:\s*([^,\)]+),\s*lines?\s*\d+\))|([Ss]elon le document\s*["""']([^"""']+)["""'],?\s*à la ligne\s*\d+)|(le fichier\s+--?\s*(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt))\s*--?\s*à la ligne\s*\d+)|(Source\s*:\s*(?:--\s*)?(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt))\s*(?:,|--)?\s*lignes?\s*\d+)|(\*\s*--\s*(.+?)--[^\n]*?السطر\s*\d+)|(\[(From|File:)\s*([^,\]]+),\s*lines?\s*\d+\])|(\*\(Source:\s*([^,\)]+),\s*lines?\s*[\d\s]+(?:and\s*[\d\s]+)?\)\*)|("([^"]+\.(?:docx?|pdf|xlsx?|pptx?|txt))")|(From file:\s*(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt)))|(From\s+(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt)))/gi;

                let lastIndex = 0;
                let match;

                while ((match = citationRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        elements.push(text.slice(lastIndex, match.index));
                    }

                    // Extract filename from matched groups
                    let fileName = (
                        match[2] || match[4] || match[6] || match[8] ||
                        match[10] || match[12] || match[14] || match[17] || match[19] || match[21] || match[23] || match[25]
                    )?.trim();

                    // Remove quotes if present
                    if (fileName) {
                        fileName = fileName.replace(/^["']|["']$/g, '');

                        elements.push(
                            <button
                                key={`cite-${elementKey++}`}
                                onClick={() => openFile(fileName)}
                                className="inline mx-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                                title={`Open ${fileName}`}
                            >
                                {fileName}
                            </button>
                        );
                    }
                    lastIndex = citationRegex.lastIndex;
                }

                if (lastIndex < text.length) {
                    elements.push(text.slice(lastIndex));
                }

                // Process bold text
                const finalElements: (string | JSX.Element)[] = [];
                const boldRegex = /\*\*([^\*]+)\*\*/g;

                elements.forEach((element, idx) => {
                    if (typeof element === 'string') {
                        let lastBoldIndex = 0;
                        let boldMatch;

                        while ((boldMatch = boldRegex.exec(element)) !== null) {
                            if (boldMatch.index > lastBoldIndex) {
                                finalElements.push(element.slice(lastBoldIndex, boldMatch.index));
                            }
                            finalElements.push(
                                <strong key={`bold-${idx}-${elementKey++}`} className="font-bold text-gray-900">
                                    {boldMatch[1]}
                                </strong>
                            );
                            lastBoldIndex = boldRegex.lastIndex;
                        }
                        if (lastBoldIndex < element.length) {
                            finalElements.push(element.slice(lastBoldIndex));
                        }
                    } else {
                        finalElements.push(element);
                    }
                });

                return finalElements;
            };
        }, []);

        // 3. Block Parser for Tables
        const lines = processedContent.split('\n');
        const blocks: { type: 'text' | 'table', content: string[] }[] = [];
        let currentBlock: { type: 'text' | 'table', content: string[] } = { type: 'text', content: [] };

        for (const line of lines) {
            const isTableLine = line.trim().startsWith('|');

            if (isTableLine) {
                if (currentBlock.type !== 'table') {
                    if (currentBlock.content.length > 0) blocks.push(currentBlock);
                    currentBlock = { type: 'table', content: [] };
                }
                currentBlock.content.push(line);
            } else {
                if (currentBlock.type === 'table') {
                    blocks.push(currentBlock);
                    currentBlock = { type: 'text', content: [] };
                }
                currentBlock.content.push(line);
            }
        }
        if (currentBlock.content.length > 0) blocks.push(currentBlock);

        // 4. Render blocks
        return (
            <div className="space-y-4">
                {blocks.map((block, index) => {
                    if (block.type === 'table' && block.content.length >= 2 && block.content[1].includes('-')) {
                        const parseRow = (row: string) =>
                            row.split('|')
                                .map(c => c.trim())
                                .filter((c, i, arr) => i > 0 && i < arr.length - 1);

                        const headers = parseRow(block.content[0]);
                        const rows = block.content.slice(2).map(parseRow);

                        return (
                            <div key={index} className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {headers.map((h, i) => (
                                                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    {renderRichText(h)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-700">
                                        {rows.map((row, rI) => (
                                            <tr key={rI} className={rI % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                {row.map((cell, cI) => (
                                                    <td key={cI} className="px-4 py-3 whitespace-pre-wrap leading-relaxed">
                                                        {renderRichText(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    } else {
                        const text = block.content.join('\n').trim();
                        if (!text) return null;
                        return (
                            <div key={index} className="whitespace-pre-wrap leading-7">
                                {renderRichText(text)}
                            </div>
                        );
                    }
                })}
            </div>
        );
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
