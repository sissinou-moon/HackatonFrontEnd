# AI Answer Storage Format Update

## Overview
Updated the application to store AI answers with their source metadata instead of just plain text. Each AI answer now includes the content and an array of sources (filenames) that were used to generate that answer.

## Changes Made

### 1. **Data Model Updates** (`src/hooks/useRooms.ts`)

#### New Interfaces
```typescript
export interface AIAnswerSource {
    fileName: string;
    lineNumber: number;
    text: string;
    score: number;
}

export interface AIAnswer {
    content: string;
    sources: AIAnswerSource[];
}
```

#### Updated Room Interface
```typescript
export interface Room {
    id: string;
    title: string;
    aiAnswers: AIAnswer[];  // Changed from string[]
    userAnswers: string[];
    pinAnswer: PinnedAnswer[] | null;
    created_at: string;
    updated_at?: string;
}
```

#### Updated Function Signatures
- `createRoom()`: Now accepts `AIAnswer[]` for `aiAnswers` parameter
- `updateRoom()`: Now accepts `AIAnswer[]` for `aiAnswers` parameter

### 2. **ChatSection Component** (`src/components/ChatSection.tsx`)

#### Updated Message Interface
```typescript
interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    sources?: AIAnswerSource[];  // New field
    timestamp: Date;
}
```

#### Source Extraction from API
The component now extracts sources from the streaming API response:
```typescript
// Extract sources from the response
if (parsedData.sources && Array.isArray(parsedData.sources) && sources.length === 0) {
    sources = parsedData.sources.map((s: any) => ({
        filename: s.filename || s.name || s
    }));
}
```

#### Saving AI Answers with Sources
When saving or updating conversations:
```typescript
// New room
await onSaveConversation(
    title,
    [userMessageText],
    [{ content: fullAiText, sources }]  // Now includes sources
);

// Existing room
await onUpdateConversation(
    roomId,
    [...currentUserAnswers, userMessageText],
    [...currentAiAnswers, { content: fullAiText, sources }]  // Now includes sources
);
```

#### Loading Messages from Rooms
When loading existing conversations:
```typescript
if (aiAnswers[i]) {
    loadedMessages.push({
        id: `ai-${i}`,
        role: "ai",
        content: aiAnswers[i].content,  // Extract content
        sources: aiAnswers[i].sources,  // Extract sources
        timestamp: new Date(currentRoom.created_at),
    });
}
```

### 3. **Page Component** (`src/app/page.tsx`)

Updated handler function signatures:
```typescript
const handleSaveConversation = useCallback(async (
    title: string,
    userAnswers: string[],
    aiAnswers: AIAnswer[]  // Changed from string[]
): Promise<Room | null> => { ... }, [createRoom]);

const handleUpdateConversation = useCallback(async (
    roomId: string,
    userAnswers: string[],
    aiAnswers: AIAnswer[]  // Changed from string[]
): Promise<Room | null> => { ... }, [updateRoom]);
```

### 4. **ChatMessage Component** (`src/components/ChatMessage.tsx`)

Updated to accept sources:
```typescript
interface ChatMessageProps {
    content: string;
    role: 'user' | 'ai';
    sources?: AIAnswerSource[];  // New field
    onOpenFile?: (fileName: string) => void;
}

export function ChatMessage({ content, role, sources }: ChatMessageProps) {
    // Component can now access sources if needed
}
```

## Data Format

### Old Format (Plain String Array)
```json
{
    "aiAnswers": [
        "This is the AI response text...",
        "Another AI response..."
    ]
}
```

### New Format (AIAnswer Array)
```json
{
    "aiAnswers": [
        {
            "content": "This is the AI response text...",
            "sources": [
                { 
                    "fileName": "Offres/document1.pdf",
                    "lineNumber": 46,
                    "text": "excerpt from document...",
                    "score": 0.85
                },
                { 
                    "fileName": "Offres/document2.docx",
                    "lineNumber": 12,
                    "text": "another excerpt...",
                    "score": 0.72
                }
            ]
        },
        {
            "content": "Another AI response...",
            "sources": [
                { 
                    "fileName": "Reports/report.pdf",
                    "lineNumber": 3,
                    "text": "report excerpt...",
                    "score": 0.91
                }
            ]
        }
    ]
}
```

## Backend Compatibility

### Expected API Response Format
The chat API should return sources in the streaming response:
```typescript
{
    "choices": [{
        "delta": {
            "content": "streaming text..."
        }
    }],
    "sources": [  // Sources array
        { "filename": "file1.pdf" },
        { "filename": "file2.docx" }
    ]
}
```

## Migration Notes

### Database Schema
The Supabase `history` table's `aiAnswers` column should store JSON data in the new format:
```sql
-- Example of new data structure
{
  "content": "AI answer text",
  "sources": [
    {"filename": "document.pdf"}
  ]
}
```

### Backward Compatibility
⚠️ **Important**: Existing rooms with old format (string arrays) will need migration. You may need to:

1. **Option A**: Run a migration script to convert old data:
```typescript
// Convert old string[] to AIAnswer[]
aiAnswers.map(answer => ({
    content: answer,
    sources: []
}))
```

2. **Option B**: Add backward compatibility handling in the frontend:
```typescript
// In ChatSection when loading rooms
const normalizedAiAnswers = aiAnswers.map(answer => 
    typeof answer === 'string' 
        ? { content: answer, sources: [] }
        : answer
);
```

## Benefits

1. **Source Tracking**: Each AI answer now tracks which files were used to generate it
2. **Better Debugging**: Can trace back which documents influenced specific responses
3. **Enhanced Citations**: Sources can be displayed to users showing data provenance
4. **Audit Trail**: Complete record of what information contributed to each answer

## Next Steps

To complete the implementation:

1. **Update Backend API** (`/api/chat`):
   - Ensure it returns sources in the response format shown above
   - Extract filenames from Pinecone metadata when generating responses

2. **Update Backend Room Routes** (`/api/room`):
   - Ensure POST and PUT endpoints correctly handle the new AIAnswer format
   - Update database schema if needed

3. **Data Migration**:
   - Create a migration script for existing rooms with old format
   - Or add backward compatibility handling

4. **Optional UI Enhancement**:
   - Display sources in ChatMessage component
   - Add clickable source links below each AI response
   - Show source badges or tags
