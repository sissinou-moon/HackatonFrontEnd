import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { FileText } from 'lucide-react';

interface ChatMessageProps {
    content: string;
    role: 'user' | 'ai';
    onOpenFile?: (fileName: string) => void;
}

export function ChatMessage({ content, role, onOpenFile }: ChatMessageProps) {
    // Pre-process content to convert citations into special markdown links
    const processedContent = useMemo(() => {
        if (!content) return '';

        // Comprehensive citation regex from original code
        const citationRegex = /(\[Source:\s*([^,\]]+),\s*lines?\s*\d+\])|(\(Source:\s*([^,\)]+),\s*lignes?\s*\d+\))|(\(Source:\s*([^,\)]+),\s*lines?\s*\d+\))|([Ss]elon le document\s*["""']([^"""']+)["""'],?\s*à la ligne\s*\d+)|(le fichier\s+--?\s*(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt))\s*--?\s*à la ligne\s*\d+)|(Source\s*:\s*(?:--\s*)?(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt))\s*(?:,|--)?\s*lignes?\s*\d+)|(\*\s*--\s*(.+?)--[^\n]*?السطر\s*\d+)|(\[(From|File:)\s*([^,\]]+),\s*lines?\s*\d+\])|(\*\(Source:\s*([^,\)]+),\s*lines?\s*[\d\s]+(?:and\s*[\d\s]+)?\)\*)|("([^"]+\.(?:docx?|pdf|xlsx?|pptx?|txt))")|(From file:\s*(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt)))|(From\s+(.+?\.(?:docx?|pdf|xlsx?|pptx?|txt)))/gi;

        // First, replace literal "\n" sequences (one or more) with a single actual newline
        // This effectively interprets "\n\n" as a single "\n" as requested
        let contentWithNewlines = content.replace(/(\\n)+/g, '\n');

        // Ensure headers are preceded by a double newline to be parsed correctly as blocks
        contentWithNewlines = contentWithNewlines.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

        // Ensure tables are preceded by a double newline
        contentWithNewlines = contentWithNewlines.replace(/([^\n])\n(\|)/g, '$1\n\n$2');

        // Ensure lists are preceded by a double newline (unordered)
        contentWithNewlines = contentWithNewlines.replace(/([^\n])\n([*-]\s)/g, '$1\n\n$2');

        // Ensure lists are preceded by a double newline (ordered)
        contentWithNewlines = contentWithNewlines.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2');

        return contentWithNewlines.replace(citationRegex, (match, ...args) => {
            // The args array contains capture groups. We need to find the filename.
            // Based on the regex, the filename is in one of the capture groups.
            // The original code had a logic to find it:
            /*
            let fileName = (
                match[2] || match[4] || match[6] || match[8] ||
                match[10] || match[12] || match[14] || match[17] || match[19] || match[21] || match[23] || match[25]
            )?.trim();
            */
            // args is [p1, p2, ..., offset, string]
            // We need to map the indices correctly. 
            // match is args[0] (implicit in replace callback structure, but here 'match' is the first arg)
            // The capture groups start at args[0] (which is p1).

            // Let's reconstruct the groups array from args
            // The last two args are offset and string, so we slice them off
            const groups = args.slice(0, -2);

            const fileName = (
                groups[1] || groups[3] || groups[5] || groups[7] ||
                groups[9] || groups[11] || groups[13] || groups[16] || groups[18] || groups[20] || groups[22] || groups[24]
            )?.trim();

            if (fileName) {
                const cleanFileName = fileName.replace(/^["']|["']$/g, '');
                // Return a markdown link with a special protocol
                return `[${match}](citation:${cleanFileName})`;
            }
            return match;
        });
    }, [content]);

    return (
        <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert text-gray-800' : 'text-gray-800'}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, href, children, ...props }) => {
                        if (href?.startsWith('citation:')) {
                            const fileName = href.replace('citation:', '');
                            // Extract the original citation text from children
                            const citationText = typeof children === 'string' ? children :
                                Array.isArray(children) ? children.join('') :
                                    'Source citation';

                            return (
                                <button
                                    onClick={() => onOpenFile?.(fileName)}
                                    className="inline-flex items-center justify-center w-5 h-5 mx-0.5 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-all align-middle group relative"
                                    aria-label={citationText}
                                >
                                    <FileText className="w-3 h-3" />
                                    {/* Tooltip on hover */}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap z-50 shadow-lg max-w-xs break-words">
                                        {citationText}
                                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                                    </span>
                                </button>
                            );
                        }
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" {...props}>
                                {children}
                            </a>
                        );
                    },
                    // Table components with proper structure
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 table-auto" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-gray-50" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                        <tbody className="bg-white divide-y divide-gray-200" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                        <tr className="hover:bg-gray-50 transition-colors" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100" {...props} />
                    ),
                    // Paragraph with whitespace preservation for newlines
                    p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0 leading-7 whitespace-pre-wrap" {...props} />
                    ),
                    // Unordered lists with proper nesting support
                    ul: ({ node, depth, ordered, ...props }: any) => {
                        // Determine if this is a nested list by checking parent
                        const isNested = node?.position?.start?.column > 1;
                        return (
                            <ul
                                className={`list-disc mb-3 space-y-1.5 ${isNested ? 'pl-6 mt-1.5' : 'pl-6'}`}
                                {...props}
                            />
                        );
                    },
                    // Ordered lists with proper nesting support
                    ol: ({ node, depth, ordered, ...props }: any) => {
                        const isNested = node?.position?.start?.column > 1;
                        return (
                            <ol
                                className={`list-decimal mb-3 space-y-1.5 ${isNested ? 'pl-6 mt-1.5' : 'pl-6'}`}
                                {...props}
                            />
                        );
                    },
                    // List items with proper styling
                    li: ({ node, ordered, ...props }: any) => (
                        <li className="pl-2 leading-relaxed" {...props} />
                    ),
                    // Code blocks with syntax highlighting support
                    code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = inline || (!match && !String(children).includes('\n'));

                        return isInline ? (
                            <code className="px-1.5 py-0.5 rounded bg-gray-100 text-sm text-blue-700 font-mono" {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className="my-4 rounded-lg overflow-hidden">
                                <code className={`block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto font-mono ${className || ''}`} {...props}>
                                    {children}
                                </code>
                            </pre>
                        );
                    },
                    // Pre tag to wrap code blocks properly
                    pre: ({ node, ...props }) => (
                        <pre className="my-4 rounded-lg overflow-hidden" {...props} />
                    ),
                    // Blockquotes
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 italic text-gray-700 bg-blue-50/50" {...props} />
                    ),
                    // Horizontal rules
                    hr: ({ node, ...props }) => (
                        <hr className="my-4 border-t-2 border-gray-200" {...props} />
                    ),
                    // Headings
                    h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold mb-3 mt-4 text-gray-900" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-bold mb-2.5 mt-3.5 text-gray-900" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold mb-2 mt-3 text-gray-900" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                        <h4 className="text-base font-semibold mb-1.5 mt-2.5 text-gray-900" {...props} />
                    ),
                    h5: ({ node, ...props }) => (
                        <h5 className="text-sm font-semibold mb-1.5 mt-2 text-gray-900" {...props} />
                    ),
                    h6: ({ node, ...props }) => (
                        <h6 className="text-sm font-semibold mb-1 mt-2 text-gray-800" {...props} />
                    ),
                    // Strong and emphasis
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-gray-900" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                    ),
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
