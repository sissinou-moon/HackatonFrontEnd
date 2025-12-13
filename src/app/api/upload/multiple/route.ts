import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        console.log("Proxying upload request to external API...");

        // Parse the incoming form data
        const incomingFormData = await req.formData();

        // Prepare outgoing form data
        // We iterate and append to ensuring we pass all fields (files, folder, etc.)
        const outgoingFormData = new FormData();

        for (const [key, value] of incomingFormData.entries()) {
            outgoingFormData.append(key, value);
        }

        // Call the external API server
        const response = await fetch("http://localhost:3000/api/multiple", {
            method: "POST",
            // Note: When sending FormData with fetch, do NOT set Content-Type header manually.
            // The browser/environment will set it with the correct boundary.
            body: outgoingFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("External API upload error:", response.status, errorText);
            throw new Error(`External API responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Upload proxy error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
