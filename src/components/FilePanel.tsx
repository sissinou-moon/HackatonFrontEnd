"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Plus,
    FileText,
    MoreVertical,
    Search,
    FolderOpen,
    Loader2,
    Folder,
    FolderPlus,
    ChevronRight,
    Home,
    Trash2,
    Upload,
    X,
    Check
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FileItem {
    id: string;
    name: string;
    displayName: string;
    type: string;
    size: string;
    date: string;
    isFolder: boolean;
    path: string;
}

export function FilePanel() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // Folder navigation
    const [currentPath, setCurrentPath] = useState<string>('');
    const [folders, setFolders] = useState<string[]>([]);

    // Inline folder creation (IDE-style)
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // Helper function to clean file names
    const cleanFileName = (fileName: string): string => {
        const cleaned = fileName.replace(/^\d+-\s*/, '');
        return cleaned;
    };

    // Get breadcrumb paths
    const getBreadcrumbs = () => {
        if (!currentPath) return [];
        return currentPath.split('/').filter(Boolean);
    };

    // Navigate to folder
    const navigateToFolder = (folderPath: string) => {
        setCurrentPath(folderPath);
        setSearchTerm('');
    };

    // Navigate up one level
    const navigateUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    // Navigate to specific breadcrumb
    const navigateToBreadcrumb = (index: number) => {
        const parts = currentPath.split('/').filter(Boolean);
        const newPath = parts.slice(0, index + 1).join('/');
        setCurrentPath(newPath);
    };

    // Fetch files and folders from Supabase
    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.storage
                .from("documents")
                .list(currentPath || '', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) throw error;

            if (data) {
                const mappedItems: FileItem[] = [];
                const folderSet = new Set<string>();

                data.forEach((item) => {
                    // Check if it's a folder (has no metadata or is a placeholder)
                    if (item.id === null || item.metadata === null) {
                        // It's a folder
                        folderSet.add(item.name);
                        mappedItems.push({
                            id: `folder-${item.name}`,
                            name: item.name,
                            displayName: item.name,
                            type: 'FOLDER',
                            size: '',
                            date: '',
                            isFolder: true,
                            path: currentPath ? `${currentPath}/${item.name}` : item.name
                        });
                    } else {
                        // It's a file
                        mappedItems.push({
                            id: item.id,
                            name: item.name,
                            displayName: cleanFileName(item.name),
                            type: item.name.split(".").pop()?.toUpperCase() || "FILE",
                            size: item.metadata?.size
                                ? (item.metadata.size / 1024 / 1024).toFixed(2) + " MB"
                                : "0 MB",
                            date: new Date(item.created_at).toLocaleDateString(),
                            isFolder: false,
                            path: currentPath ? `${currentPath}/${item.name}` : item.name
                        });
                    }
                });

                // Sort: folders first, then files
                mappedItems.sort((a, b) => {
                    if (a.isFolder && !b.isFolder) return -1;
                    if (!a.isFolder && b.isFolder) return 1;
                    return a.displayName.localeCompare(b.displayName);
                });

                setFiles(mappedItems);
                setFolders(Array.from(folderSet));
            }
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Focus the folder input when creating
    useEffect(() => {
        if (isCreatingFolder && newFolderInputRef.current) {
            newFolderInputRef.current.focus();
        }
    }, [isCreatingFolder]);

    // Create folder (IDE-style)
    const createFolder = async () => {
        // Sanitize folder name: replace spaces with underscores to match backend behavior
        const rawFolderName = newFolderName.trim();
        if (!rawFolderName) {
            setIsCreatingFolder(false);
            setNewFolderName('');
            return;
        }

        const folderName = rawFolderName.replace(/\s+/g, '_');

        try {
            // Create a placeholder file to represent the folder
            const folderPath = currentPath
                ? `${currentPath}/${folderName}/.folder`
                : `${folderName}/.folder`;

            const { error } = await supabase.storage
                .from('documents')
                .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error && !error.message.includes('already exists')) {
                throw error;
            }

            setNewFolderName('');
            setIsCreatingFolder(false);
            await fetchFiles();
        } catch (err) {
            console.error('Failed to create folder:', err);
            alert('Could not create folder');
        }
    };

    // Handle folder name input keydown
    const handleFolderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createFolder();
        } else if (e.key === 'Escape') {
            setIsCreatingFolder(false);
            setNewFolderName('');
        }
    };

    // Delete file or folder
    const deleteItem = async (item: FileItem) => {
        try {
            if (item.isFolder) {
                // For folders, we need to delete all contents first
                const { data: contents } = await supabase.storage
                    .from('documents')
                    .list(item.path);

                if (contents && contents.length > 0) {
                    const filesToDelete = contents.map(f => `${item.path}/${f.name}`);
                    await supabase.storage.from('documents').remove(filesToDelete);
                }

                // Delete folder placeholder
                await supabase.storage.from('documents').remove([`${item.path}/.folder`]);
            } else {
                await supabase.storage.from('documents').remove([item.path]);
            }

            setMenuOpenId(null);
            await fetchFiles();
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Could not delete item');
        }
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("file", file);

            // Add folder parameter if we're inside a folder
            if (currentPath) {
                formData.append("folder", currentPath);
            }

            const response = await fetch("http://localhost:3000/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            await fetchFiles();
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Compute filtered files
    const filteredFiles = files.filter((f) => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return true;

        const normalizedName = f.displayName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
        return searchWords.every(word => normalizedName.includes(word));
    });

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="h-full flex flex-col bg-gray-50/50 border-l border-gray-100">
            {/* Header */}
            <div className="px-6 py-5 pb-2">
                <h2 className="text-xl font-bold text-gray-800 tracking-tight mb-1">
                    Sources
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                    Upload documents to chat.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept=".pdf,.doc,.docx"
                    />

                    {/* Add Source Button */}
                    <button
                        onClick={triggerFileInput}
                        disabled={uploading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-primary hover:bg-blue-600 text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 text-white/90 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 text-white/90 group-hover:text-white" />
                        )}
                        <span className="font-semibold text-xs">
                            {uploading ? "Uploading..." : "Add Source"}
                        </span>
                    </button>

                    {/* Create Folder Button */}
                    <button
                        onClick={() => setIsCreatingFolder(true)}
                        disabled={isCreatingFolder}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group disabled:opacity-70"
                    >
                        <FolderPlus className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                        <span className="font-medium text-xs hidden sm:inline">New Folder</span>
                    </button>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            {(currentPath || breadcrumbs.length > 0) && (
                <div className="px-6 py-2 flex items-center gap-1 text-xs overflow-x-auto bg-white/50 border-y border-gray-100">
                    <button
                        onClick={() => navigateToFolder('')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                    >
                        <Home className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
                                className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0 ${index === breadcrumbs.length - 1
                                    ? 'font-semibold text-gray-800'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {crumb}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Search / Filter */}
            <div className="px-6 py-2 mb-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 scroll-smooth pb-8">
                {/* Inline Folder Creation (IDE-style) */}
                {isCreatingFolder && (
                    <div className="bg-white p-3 rounded-xl border-2 border-primary shadow-lg animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                <FolderPlus className="w-4 h-4 text-primary" />
                            </div>
                            <input
                                ref={newFolderInputRef}
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={handleFolderKeyDown}
                                onBlur={() => {
                                    if (!newFolderName.trim()) {
                                        setIsCreatingFolder(false);
                                    }
                                }}
                                placeholder="Folder name..."
                                className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-none outline-none placeholder-gray-400"
                                autoFocus
                            />
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={createFolder}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreatingFolder(false);
                                        setNewFolderName('');
                                    }}
                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 ml-11">
                            Press Enter to create, Esc to cancel
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
                    </div>
                ) : filteredFiles.length === 0 && !isCreatingFolder ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 animate-fade-in">
                        <FolderOpen className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-xs">
                            {currentPath ? 'This folder is empty' : 'No sources added'}
                        </p>
                        {currentPath && (
                            <button
                                onClick={navigateUp}
                                className="mt-3 text-xs text-primary hover:underline"
                            >
                                Go back
                            </button>
                        )}
                    </div>
                ) : (
                    filteredFiles.map((item, index) => (
                        <div
                            key={item.id}
                            className={`group bg-white p-3 rounded-xl border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 animate-slide-up ${item.isFolder
                                ? 'hover:border-blue-200 cursor-pointer'
                                : 'hover:border-blue-100'
                                }`}
                            style={{ animationDelay: `${index * 0.03}s` }}
                            onClick={() => item.isFolder && navigateToFolder(item.path)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-lg transition-colors flex-shrink-0 ${item.isFolder
                                        ? 'bg-blue-50 group-hover:bg-blue-100'
                                        : 'bg-gray-50 group-hover:bg-blue-50'
                                        }`}>
                                        {item.isFolder ? (
                                            <Folder className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`font-medium text-sm truncate transition-colors ${item.isFolder
                                            ? 'text-gray-800 group-hover:text-blue-700'
                                            : 'text-gray-800 group-hover:text-primary'
                                            }`}>
                                            {item.displayName}
                                        </h3>
                                        {!item.isFolder && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                    {item.type}
                                                </span>
                                                <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                                                    • {item.size}
                                                </span>
                                            </div>
                                        )}
                                        {item.isFolder && (
                                            <span className="text-[10px] text-gray-400">Folder</span>
                                        )}
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpenId(menuOpenId === item.id ? null : item.id);
                                        }}
                                        className="text-gray-300 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {menuOpenId === item.id && (
                                        <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 animate-fade-in">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteItem(item);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Info */}
            <div className="p-3 text-center border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                <p className="text-[10px] text-gray-400">
                    {files.filter(f => !f.isFolder).length} files, {files.filter(f => f.isFolder).length} folders
                    {currentPath && ` in ${breadcrumbs[breadcrumbs.length - 1]}`}
                </p>
            </div>
        </div>
    );
}