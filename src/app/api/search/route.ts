import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, topK } = body;

        // Validate request body
        if (!query) {
            return NextResponse.json(
                { success: false, error: "Query is required" },
                { status: 400 }
            );
        }

        console.log("Proxying search request to external API...");

        // Call the external API server
        // Note: Ensure the external server is running on localhost:3000 and accessible.
        // If this Next.js app is also on port 3000, this will conflict or loop if not careful.
        // Assuming user has a separate backend process.
        const response = await fetch("http://localhost:3000/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                topK: topK || 5,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("External API error:", response.status, errorText);
            throw new Error(`External API responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
