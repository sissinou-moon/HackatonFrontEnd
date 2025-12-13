"use client";

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AIAnswerSource } from '@/hooks/useRooms';
import { supabase } from '@/lib/supabaseClient';
import { X, Loader2, FileText } from 'lucide-react';

interface ChatMessageProps {
    content: string;
    role: 'user' | 'ai';
    sources?: AIAnswerSource[];
    onOpenFile?: (fileName: string) => void;
}

interface FilePreview {
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'other';
}

export function ChatMessage({ content, role, sources }: ChatMessageProps) {
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);

    const openFile = async (fileName: string) => {
        setIsLoadingFile(true);
        console.log(`🔍 Opening file: ${fileName}`);

        try {
            // Clean the filename
            const cleanFileName = fileName.replace(/^["']|["']$/g, '').trim();

            // Extract folder and file name if path contains '/'
            const parts = cleanFileName.split('/');
            const folderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            const targetFileName = parts[parts.length - 1];

            console.log("📁 Folder path:", folderPath || '(root)');
            console.log("📄 Target file name:", targetFileName);

            // Search for the file in the specific folder
            const { data: files, error: listError } = await supabase
                .storage
                .from('documents')
                .list(folderPath, {
                    limit: 100,  // Increased limit to find more files
                    offset: 0,
                    // Don't use search parameter here since we need to filter manually
                });

            if (listError) throw listError;

            console.log("📂 Files found in folder:", files);

            // Find the best match - looking for files that END with the target filename
            let targetFile = null;
            if (files && files.length > 0) {
                // First, try to find exact match with timestamp prefix
                targetFile = files.find(f => {
                    // Check if file ends with the target filename
                    // Supports formats like: "timestamp-filename.docx" or "timestamp-filename"
                    const baseName = f.name.toLowerCase();
                    const searchName = targetFileName.toLowerCase();

                    // Check if file ends with the search name
                    if (baseName.endsWith(searchName)) {
                        return true;
                    }

                    // Also check with extension variations
                    const searchNameNoExt = searchName.split('.')[0];
                    if (baseName.includes(`-${searchNameNoExt}`)) {
                        return true;
                    }

                    return false;
                });

                // If not found, try more flexible matching
                if (!targetFile) {
                    targetFile = files.find(f => {
                        const baseName = f.name.toLowerCase();
                        const searchName = targetFileName.toLowerCase();

                        // Check if the base filename (after last '-') matches
                        const lastPart = baseName.split('-').pop() || '';
                        if (lastPart === searchName) {
                            return true;
                        }

                        // Check if file contains the search name anywhere
                        if (baseName.includes(searchName)) {
                            return true;
                        }

                        return false;
                    });
                }

                // If still not found, try matching just the filename without extension
                if (!targetFile) {
                    const searchNameNoExt = targetFileName.toLowerCase().split('.')[0];
                    targetFile = files.find(f => {
                        const baseName = f.name.toLowerCase();
                        // Check if file contains the filename without extension
                        return baseName.includes(`-${searchNameNoExt}`);
                    });
                }

                // Take first result if still not found (as fallback)
                if (!targetFile && files.length > 0) {
                    targetFile = files[0];
                    console.warn("⚠️ Using first file as fallback:", targetFile.name);
                }
            }

            if (!targetFile) {
                alert(`File not found: "${cleanFileName}"`);
                setIsLoadingFile(false);
                return;
            }

            console.log("✅ File matched:", targetFile.name);

            // Construct full path for the file
            const fullFilePath = folderPath ? `${folderPath}/${targetFile.name}` : targetFile.name;

            // Get public URL with full path
            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(fullFilePath);

            if (!urlData?.publicUrl) {
                alert("Could not generate file URL");
                setIsLoadingFile(false);
                return;
            }

            // Determine file type
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

    const closeFilePreview = () => {
        setFilePreview(null);
    };

    const getViewerUrl = (fileUrl: string, fileType: 'pdf' | 'docx' | 'other') => {
        if (fileType === 'pdf' || fileType === 'docx') {
            return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

    const processedContent = useMemo(() => {
        if (!content) return '';

        let contentWithNewlines = content.replace(/\\n/g, '\n');

        // 1. FIX HEADINGS
        contentWithNewlines = contentWithNewlines.replace(/(?<!\n)###/g, '\n###');
        contentWithNewlines = contentWithNewlines.replace(/###(?=[^\s])/g, '### ');

        // 2. REMOVE ALL "Source :" LINES (in French)
        // This matches lines like "Source : ..." or "Source: ..." (with or without space)
        contentWithNewlines = contentWithNewlines.replace(
            /^(?:Source\s*:?\s*.*?)(?:\n|$)/gim,
            ''
        );

        // 3. REMOVE ANY LINE THAT CONTAINS "Source" WITH COLON (French or English)
        contentWithNewlines = contentWithNewlines.replace(
            /^.*Source\s*:.*(?:\n|$)/gim,
            ''
        );

        // 4. REMOVE "Source" IN MIDDLE OF SENTENCES (French)
        contentWithNewlines = contentWithNewlines.replace(
            /\s*Source\s*:\s*[^.,;!?\n]+(?:[.,;!?]|$)/gi,
            ''
        );

        // 5. REMOVE "[From folder/file.ext...]" BLOCKS
        contentWithNewlines = contentWithNewlines.replace(
            /\[From\s+[^\]]+\]/gi,
            ''
        );

        // 6. REMOVE ANY REMAINING BRACKETED FILE NAMES
        contentWithNewlines = contentWithNewlines.replace(
            /\[[^\]]*?\.(?:pdf|docx|doc|txt|xlsx|pptx)[^\]]*?\]/gi,
            ''
        );

        // 7. CLEAN UP EXTRA NEWLINES AND SPACES
        // Remove multiple consecutive empty lines
        contentWithNewlines = contentWithNewlines.replace(/\n{3,}/g, '\n\n');

        // Remove leading/trailing spaces from each line
        contentWithNewlines = contentWithNewlines
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0) // Remove empty lines
            .join('\n');

        // Ensure proper spacing between paragraphs
        contentWithNewlines = contentWithNewlines.replace(/([.!?])\s*(?=[A-ZÀ-ÖØ-öø-ÿ])/g, '$1\n\n');

        // 8. FIX TABLES
        contentWithNewlines = contentWithNewlines.replace(/\| :--- \|/g, '| :--- |');
        contentWithNewlines = contentWithNewlines.replace(/\| :--- \| :--- \|/g, '| :--- | :--- |');

        return contentWithNewlines;
    }, [content]);

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

            {/* Loading Overlay */}
            {isLoadingFile && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-gray-600 font-medium">Opening file...</p>
                    </div>
                </div>
            )}

            <div className="w-full">
                <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert text-gray-800' : 'text-gray-800'}`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            a: ({ node, href, children, ...props }) => {
                                // Prevent rendering file links
                                if (href?.startsWith('citation:') || (href && /\.(pdf|docx|doc|txt|xlsx)$/i.test(href) && !href.startsWith('http'))) {
                                    return <span>{children}</span>;
                                }
                                return (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-medium break-all"
                                        {...props}
                                    >
                                        {children}
                                    </a>
                                );
                            },
                            h3: ({ node, children, ...props }: any) => (
                                <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-100 w-full block" {...props}>
                                    {children}
                                </h3>
                            ),
                            table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-6">
                                    <table className="min-w-full border-collapse border border-gray-300 shadow-sm rounded-lg overflow-hidden" {...props} />
                                </div>
                            ),
                            thead: ({ node, ...props }) => <thead className="bg-gray-800 text-white" {...props} />,
                            tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200" {...props} />,
                            tr: ({ node, ...props }) => <tr className="even:bg-gray-50 hover:bg-gray-100 transition-colors" {...props} />,
                            th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-sm font-semibold border border-gray-300" {...props} />,
                            td: ({ node, ...props }) => <td className="px-4 py-3 text-sm border border-gray-300" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed whitespace-pre-wrap text-gray-700" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-2 leading-relaxed" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-extrabold text-gray-900" {...props} />,
                        }}
                    >
                        {processedContent}
                    </ReactMarkdown>
                </div>

                {/* Display source badges for AI messages */}
                {role === 'ai' && sources && sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {/* Filter unique sources by fileName and limit to 2 */}
                        {Array.from(new Map(sources.map(s => [s.fileName, s])).values())
                            .slice(0, 2)
                            .map((source, index) => (
                                <button
                                    key={`${source.fileName}-${index}`}
                                    onClick={() => openFile(source.fileName)}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer hover:shadow-sm active:scale-95"
                                    title={`Source: ${source.fileName} (Line: ${source.lineNumber}) - Click to open`}
                                >
                                    <span className="flex items-center gap-1">
                                        <span className="flex-shrink-0">📄</span>
                                        <span className="max-w-[80px] truncate block">{source.fileName}</span>
                                    </span>
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </>
    );
}