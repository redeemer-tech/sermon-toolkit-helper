import { NextRequest, NextResponse } from 'next/server';

// Configure route for large file uploads
export const maxDuration = 300; // 5 minutes timeout for long transcriptions
export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq Whisper: 25MB limit for direct file uploads
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

// Supported audio extensions
const SUPPORTED_EXTENSIONS = new Set([
  'flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm'
]);

export async function POST(request: NextRequest) {
  try {
    const requestFormData = await request.formData();
    const file = requestFormData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    console.log(`Transcribing file: ${file.name}, size: ${fileSizeMB}MB, type: ${file.type}, extension: ${extension}`);

    // Check file extension is supported
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${extension}. Supported types: ${[...SUPPORTED_EXTENSIONS].join(', ')}` },
        { status: 400 }
      );
    }

    // Check file size (free tier limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File too large (${fileSizeMB}MB). Maximum file size is 25MB. Please compress your audio (try converting to 64kbps mono MP3).` 
        },
        { status: 400 }
      );
    }

    // Read file bytes
    const bytes = await file.bytes();
    const buffer = Buffer.from(bytes);
    
    console.log(`Buffer size: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB, Expected: ${fileSizeMB}MB`);
    
    if (buffer.length !== file.size) {
      console.error(`Buffer size mismatch! Got ${buffer.length} bytes, expected ${file.size} bytes`);
      return NextResponse.json(
        { error: 'File upload incomplete. Please try again.' },
        { status: 400 }
      );
    }
    
    // Use native fetch with FormData for reliable multipart upload
    const groqFormData = new FormData();
    const blob = new Blob([buffer], { type: 'audio/mp4' });
    groqFormData.append('file', blob, file.name);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('temperature', '0');
    groqFormData.append('response_format', 'verbose_json');
    
    console.log(`Sending ${(blob.size / (1024 * 1024)).toFixed(1)}MB to Groq API...`);
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Groq API error:', responseData);
      throw new Error(responseData.error?.message || 'Transcription failed');
    }
    
    const transcription = responseData;

    // Format transcript with paragraphs
    const text = transcription.text || '';
    const paragraphs = text
      .split('\n')
      .filter((p) => p.trim())
      .map((p) => p.trim())
      .join('\n\n');

    return NextResponse.json({ transcript: paragraphs || text });
  } catch (error: unknown) {
    console.error('Error transcribing audio:', error);
    
    // Extract the actual error message
    let errorMessage = 'Failed to transcribe audio';
    
    if (error && typeof error === 'object') {
      const err = error as { message?: string; status?: number; error?: { message?: string } };
      
      // Check for 413 error from Groq
      if (err.message?.includes('413')) {
        errorMessage = 'File too large. Please compress your audio (try converting to 64kbps mono MP3).';
      } else if (err.error?.message) {
        errorMessage = `Groq API error: ${err.error.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
