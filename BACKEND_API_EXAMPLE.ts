// EXAMPLE: How the backend /api/chat endpoint should return sources
// This is a reference implementation - adapt to your actual backend

// Expected streaming response format:
// Each data chunk should include sources metadata

interface PineconeMatch {
    metadata: {
        filename: string;
        folder?: string;
        // ... other metadata
    };
    score: number;
}

interface ChatStreamResponse {
    choices: [{
        delta: {
            content: string;
        }
    }];
    sources?: Array<{ filename: string }>; // Sources should be included
}

// Backend implementation example:
async function handleChatRequest(question: string, topK: number) {
    // 1. Query Pinecone for relevant documents
    const queryEmbedding = await generateEmbedding(question);
    const pineconeResults = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true
    });

    // 2. Extract unique filenames from matched documents
    const sources = Array.from(new Set(
        pineconeResults.matches.map((match: PineconeMatch) => ({
            filename: match.metadata.filename
        }))
    ));

    // 3. Build context from matched documents
    const context = pineconeResults.matches
        .map(match => match.metadata.text)
        .join('\n\n');

    // 4. Stream AI response with sources
    const stream = await deepseekAPI.chat.completions.create({
        model: "deepseek-chat",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: `Context: ${context}\n\nQuestion: ${question}` }
        ],
        stream: true
    });

    // 5. Return streaming response
    return new Response(
        new ReadableStream({
            async start(controller) {
                // Send sources once at the beginning or end
                const sourcesChunk = `data: ${JSON.stringify({ sources })}\n\n`;
                controller.enqueue(new TextEncoder().encode(sourcesChunk));

                // Stream AI response chunks
                for await (const chunk of stream) {
                    const data = {
                        choices: [{
                            delta: {
                                content: chunk.choices[0]?.delta?.content || ''
                            }
                        }]
                    };
                    const chunkText = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(chunkText));
                }

                controller.close();
            }
        }),
        {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        }
    );
}

// Alternative: Include sources in a final message
async function handleChatRequestAlt(question: string, topK: number) {
    // ... same setup as above ...

    return new Response(
        new ReadableStream({
            async start(controller) {
                // Stream AI response chunks first
                for await (const chunk of stream) {
                    const data = {
                        choices: [{
                            delta: {
                                content: chunk.choices[0]?.delta?.content || ''
                            }
                        }]
                    };
                    const chunkText = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(chunkText));
                }

                // Send sources at the end
                const sourcesData = {
                    choices: [{ delta: { content: '' } }],
                    sources: sources  // Include sources here
                };
                const sourcesChunk = `data: ${JSON.stringify(sourcesData)}\n\n`;
                controller.enqueue(new TextEncoder().encode(sourcesChunk));

                controller.close();
            }
        }),
        {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        }
    );
}

// Usage in your backend route:
// POST /api/chat
export async function POST(request: Request) {
    const { question, topK } = await request.json();
    const stream = request.url.includes('stream=true');

    if (stream) {
        return await handleChatRequest(question, topK || 10);
    } else {
        // Non-streaming response
        const response = await generateResponse(question, topK);
        return Response.json({
            answer: response.content,
            sources: response.sources
        });
    }
}
