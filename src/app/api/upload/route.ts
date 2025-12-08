import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

// Supported audio extensions for validation
const SUPPORTED_EXTENSIONS = new Set([
  'flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm'
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file extension
        const extension = pathname.split('.').pop()?.toLowerCase() || '';
        if (!SUPPORTED_EXTENSIONS.has(extension)) {
          throw new Error(`Unsupported file type: .${extension}`);
        }

        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/m4a',
            'audio/wav',
            'audio/webm',
            'audio/ogg',
            'audio/flac',
            'audio/x-m4a',
            'video/mp4', // Some m4a files are detected as video/mp4
          ],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25MB - Groq's limit
          tokenPayload: JSON.stringify({
            uploadedAt: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Audio upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}

