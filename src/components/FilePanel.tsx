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
    Check,
    CloudUpload
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

interface FilePreview {
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'other';
}

export function FilePanel() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // File preview modal state
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);

    // Upload to Pinecone state
    const [uploadingToPinecone, setUploadingToPinecone] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'loading' | 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'loading',
        visible: false
    });

    // Helper to show toast
    const showToast = (message: string, type: 'loading' | 'success' | 'error') => {
        setToast({ message, type, visible: true });
        if (type !== 'loading') {
            setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 4000);
        }
    };

    // Folder navigation
    const [currentPath, setCurrentPath] = useState<string>('');
    const [folders, setFolders] = useState<string[]>([]);

    // Inline folder creation (IDE-style)
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // Upload file to Pinecone
    const uploadToPinecone = async (file: FileItem) => {
        if (file.isFolder) return;

        setUploadingToPinecone(file.id);
        setMenuOpenId(null);
        showToast("Uploading...", 'loading');

        try {
            // Download the file from Supabase
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('documents')
                .download(file.path);

            if (downloadError || !fileData) {
                throw new Error('Failed to download file from storage');
            }

            // Create FormData
            const formData = new FormData();

            // Create a File object with the original name
            const fileBlob = new File([fileData], file.name, { type: fileData.type });
            formData.append('file', fileBlob);

            // Add folder if exists
            const folderPath = file.path.split('/').slice(0, -1).join('/');
            if (folderPath) {
                formData.append('folder', folderPath);
            }

            // Upload to Pinecone
            const response = await fetch('http://localhost:3000/api/upload/re-pinecone', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to upload to Pinecone');
            }

            showToast("You can now ask the ai anything about this file ✅", 'success');

        } catch (error) {
            console.error('Error uploading to Pinecone:', error);
            showToast("Please, verify your internet connection ❌", 'error');
        } finally {
            setUploadingToPinecone(null);
        }
    };

    // Open file in modal
    const openFile = async (file: FileItem) => {
        if (file.isFolder) return;

        setIsLoadingFile(true);
        console.log(`🔍 Opening file: ${file.path}`);

        try {
            // Get public URL directly from path
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(file.path);

            if (!urlData?.publicUrl) {
                alert("Could not generate file URL");
                setIsLoadingFile(false);
                return;
            }

            // Determine file type
            const extension = file.name.toLowerCase().split('.').pop();
            let fileType: 'pdf' | 'docx' | 'other' = 'other';
            if (extension === 'pdf') fileType = 'pdf';
            else if (extension === 'docx' || extension === 'doc') fileType = 'docx';

            setFilePreview({
                fileName: file.displayName,
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

    const closeFilePreview = () => {
        setFilePreview(null);
    };

    const getViewerUrl = (fileUrl: string, fileType: 'pdf' | 'docx' | 'other') => {
        if (fileType === 'pdf' || fileType === 'docx') {
            return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

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

    // Debounced Search state
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Recursive global search
    const performGlobalSearch = async (term: string) => {
        setLoading(true);
        const termLower = term.toLowerCase().trim();
        const results: FileItem[] = [];
        const queue: string[] = ['']; // Start from root
        const visited = new Set<string>();

        try {
            // BFS Traversal
            while (queue.length > 0) {
                // Process in chunks of 5 folders to parallelism
                const batch = queue.splice(0, 5);

                await Promise.all(batch.map(async (folderPath) => {
                    if (visited.has(folderPath)) return;
                    visited.add(folderPath);

                    const { data } = await supabase.storage
                        .from('documents')
                        .list(folderPath, { limit: 100 });

                    if (data) {
                        for (const item of data) {
                            const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

                            if (item.id === null || item.metadata === null) {
                                // It's a folder: Add to queue
                                queue.push(itemPath);
                            } else {
                                // It's a file: Check for match
                                if (item.name.toLowerCase().includes(termLower)) {
                                    results.push({
                                        id: item.id || item.name,
                                        name: item.name,
                                        displayName: cleanFileName(item.name),
                                        type: item.name.split(".").pop()?.toUpperCase() || "FILE",
                                        size: item.metadata?.size
                                            ? (item.metadata.size / 1024 / 1024).toFixed(2) + " MB"
                                            : "0 MB",
                                        date: new Date(item.created_at).toLocaleDateString(),
                                        isFolder: false,
                                        path: itemPath
                                    });
                                }
                            }
                        }
                    }
                }));

                // Safety break if too many results
                if (results.length > 100) break;
            }

            setFiles(results);
            setFolders([]); // Clear folders in search view
        } catch (error) {
            console.error("Search error:", error);
            showToast("Search failed", 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch files and folders from Supabase
    const fetchFiles = useCallback(async () => {
        // Trigger global search if term exists
        if (debouncedSearchTerm) {
            await performGlobalSearch(debouncedSearchTerm);
            return;
        }

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
    }, [currentPath, debouncedSearchTerm]);

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
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploading(true);
            const formData = new FormData();

            // Append all files to formData
            Array.from(files).forEach((file) => {
                formData.append("files", file);
            });

            // Add folder parameter if we're inside a folder
            if (currentPath) {
                formData.append("folder", currentPath);
            }

            // Determine endpoint based on number of files (or always use multiple for consistency)
            // Using the requested /api/upload/multiple endpoint
            const endpoint = "/api/upload/multiple";

            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Upload failed");
            }

            showToast(result.message || `Successfully processed ${files.length} file(s)`, 'success');
            await fetchFiles();
        } catch (error) {
            console.error("Error uploading files:", error);
            showToast("Failed to upload files", 'error');
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

        // 1. Exact/Raw match (handles special chars like _)
        if (f.displayName.toLowerCase().includes(searchLower)) return true;

        // 2. Tokenized match (handles spacing differences)
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
        <>
            {/* File Preview Modal */}
            {filePreview && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                <h3 className="text-sm font-semibold truncate max-w-[300px]">
                                    {filePreview.fileName}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={filePreview.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
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

                        {/* File Content */}
                        <div className="flex-1 bg-gray-100 overflow-hidden">
                            <iframe
                                src={getViewerUrl(filePreview.fileUrl, filePreview.fileType)}
                                className="w-full h-full border-0"
                                title={`Preview: ${filePreview.fileName}`}
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up-fade">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                        toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' :
                            'bg-white border-gray-100 text-gray-700'
                        }`}>
                        {toast.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                        {toast.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
                        {toast.type === 'error' && <X className="w-5 h-5 text-red-600" />}
                        <span className="font-medium text-sm whitespace-nowrap">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {isLoadingFile && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-gray-600 font-medium">Opening file...</p>
                    </div>
                </div>
            )}

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
                            multiple
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
                                    : 'hover:border-blue-100 cursor-pointer'
                                    }`}
                                style={{ animationDelay: `${index * 0.03}s` }}
                                onClick={() => item.isFolder ? navigateToFolder(item.path) : openFile(item)}
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
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                            {item.type}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 truncate max-w-[60px]">
                                                            • {item.size}
                                                        </span>
                                                    </div>
                                                    {debouncedSearchTerm && item.path.includes('/') && (
                                                        <span className="text-[10px] text-blue-400/80 truncate max-w-[150px] flex items-center gap-1">
                                                            <FolderOpen className="w-2.5 h-2.5" />
                                                            /{item.path.split('/').slice(0, -1).join('/')}
                                                        </span>
                                                    )}
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
                                            <div className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 animate-fade-in">
                                                {/* Upload To AI option (only for files) */}
                                                {!item.isFolder && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            uploadToPinecone(item);
                                                        }}
                                                        disabled={uploadingToPinecone === item.id}
                                                        className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {uploadingToPinecone === item.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <CloudUpload className="w-3.5 h-3.5" />
                                                        )}
                                                        {uploadingToPinecone === item.id ? 'Uploading...' : 'Upload To AI'}
                                                    </button>
                                                )}

                                                {/* Delete option */}
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
        </>
    );
}