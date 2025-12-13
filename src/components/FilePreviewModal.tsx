
import React from 'react';
import { X, FileText } from 'lucide-react';

export interface FilePreviewData {
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'docx' | 'other';
}

interface FilePreviewModalProps {
    file: FilePreviewData | null;
    onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
    if (!file) return null;

    const getViewerUrl = (fileUrl: string, fileType: 'pdf' | 'docx' | 'other') => {
        if (fileType === 'pdf' || fileType === 'docx') {
            return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <h3 className="text-sm font-semibold truncate max-w-[300px]">
                            {file.fileName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                        >
                            Open in New Tab
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* File Content */}
                <div className="flex-1 bg-gray-100 overflow-hidden">
                    <iframe
                        src={getViewerUrl(file.fileUrl, file.fileType)}
                        className="w-full h-full border-0"
                        title={`Preview: ${file.fileName}`}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                </div>
            </div>
        </div>
    );
}
