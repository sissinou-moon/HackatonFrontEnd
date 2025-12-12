"use client";

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ChatMessageProps {
    content: string;
    role: 'user' | 'ai';
    onOpenFile?: (fileName: string) => void;
}

export function ChatMessage({ content, role }: ChatMessageProps) {

    const processedContent = useMemo(() => {
        if (!content) return '';

        let contentWithNewlines = content.replace(/\\n/g, '\n');

        // 1. FIX HEADINGS
        contentWithNewlines = contentWithNewlines.replace(/(?<!\n)###/g, '\n###');
        contentWithNewlines = contentWithNewlines.replace(/###(?=[^\s])/g, '### ');

        // 2. REMOVE "Source: ..." LINES
        contentWithNewlines = contentWithNewlines.replace(
            /(?:\*\*|)?Source:\s*.*?(?:\n|$)/gi,
            ''
        );

        // 3. REMOVE "[From folder/file.ext...]" BLOCKS (New Fix)
        // Matches [From ...] and removes it entirely
        contentWithNewlines = contentWithNewlines.replace(
            /\[From\s+[^\]]+\]/gi,
            ''
        );

        // 4. REMOVE ANY REMAINING BRACKETED FILE NAMES
        // Detects [filename.pdf] or [filename.docx, line 1] and removes them
        contentWithNewlines = contentWithNewlines.replace(
            /\[[^\]]*?\.(?:pdf|docx|doc|txt|xlsx|pptx)[^\]]*?\]/gi,
            ''
        );

        // 5. CLEAN UP EXTRA NEWLINES
        // The removals above leave behind empty lines; this collapses them
        contentWithNewlines = contentWithNewlines.replace(/\n{3,}/g, '\n\n');
        contentWithNewlines = contentWithNewlines.trim();

        // 6. FIX TABLES
        contentWithNewlines = contentWithNewlines.replace(/\| :--- \|/g, '| :--- |');
        contentWithNewlines = contentWithNewlines.replace(/\| :--- \| :--- \|/g, '| :--- | :--- |');

        return contentWithNewlines;
    }, [content]);

    return (
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
    );
}