"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, FileText, MoreVertical, Search, FolderOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FileItem {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    url?: string;
}

export function FilePanel() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Fetch files from Supabase
    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.storage.from("documents").list();

            if (error) {
                throw error;
            }

            if (data) {
                const mappedFiles: FileItem[] = data.map((file) => ({
                    id: file.id,
                    name: file.name,
                    type: file.name.split(".").pop()?.toUpperCase() || "FILE",
                    size: (file.metadata?.size / 1024 / 1024).toFixed(2) + " MB",
                    date: new Date(file.created_at).toLocaleDateString(),
                }));
                setFiles(mappedFiles);
            }
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("http://localhost:3000/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            // Refresh list after upload
            await fetchFiles();

        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file");
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50 border-l border-gray-100">
            {/* Header */}
            <div className="px-6 py-5 pb-2">
                <h2 className="text-xl font-bold text-gray-800 tracking-tight mb-1">
                    Sources
                </h2>
                <p className="text-xs text-gray-500 mb-5">
                    Upload documents to chat.
                </p>

                {/* Add File Button */}
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />

                    <button
                        onClick={triggerFileInput}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-blue-600 text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <Loader2 className="w-5 h-5 text-white/90 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5 text-white/90 group-hover:text-white" />
                        )}
                        <span className="font-semibold text-sm">
                            {uploading ? "Uploading..." : "Add Source"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search / Filter */}
            <div className="px-6 py-2 mb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white border border-gray-100 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 scroll-smooth pb-8">
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 animate-fade-in">
                        <FolderOpen className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-xs">No sources added</p>
                    </div>
                ) : (
                    files.map((file, index) => (
                        <div
                            key={file.id}
                            className="group bg-white p-3 rounded-xl border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-blue-100 transition-all duration-300 cursor-pointer animate-slide-up"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 overflow-hidden">
                                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors flex-shrink-0">
                                        <FileText className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-gray-800 text-sm truncate group-hover:text-primary transition-colors">
                                            {file.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                {file.type}
                                            </span>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                                                • {file.size}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="text-gray-300 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Info */}
            <div className="p-3 text-center border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                <p className="text-[10px] text-gray-400">{files.length} sources loaded</p>
            </div>
        </div>
    );
}
