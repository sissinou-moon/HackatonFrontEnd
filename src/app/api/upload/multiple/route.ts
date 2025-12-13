
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        const folder = formData.get('folder') as string || '';

        if (!files || files.length === 0) {
            return NextResponse.json({ success: false, message: 'No files uploaded' }, { status: 400 });
        }

        const results = [];

        for (const file of files) {
            try {
                const timestamp = Date.now();
                // Sanitize filename
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

                // Clean up folder path
                const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
                const storagePath = cleanFolder
                    ? `${cleanFolder}/${timestamp}-${safeName}`
                    : `${timestamp}-${safeName}`;

                // Upload to Supabase Storage
                const { data, error } = await supabase.storage
                    .from('documents')
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                results.push({
                    success: true,
                    fileName: file.name,
                    folder: folder,
                    storagePath: storagePath,
                    chunksCount: 0, // Placeholder as embedding logic is separate/not available
                    message: "Successfully uploaded"
                });

            } catch (err: any) {
                console.error(`Error uploading ${file.name}:`, err);
                results.push({
                    success: false,
                    fileName: file.name,
                    message: err.message || "Upload failed"
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${files.length} files`,
            results: results
        });

    } catch (error: any) {
        console.error('Upload handler error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
