import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';

// Configure route for long transcriptions
export const maxDuration = 300; // 5 minutes timeout

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { blobUrl, fileName } = await request.json();

    if (!blobUrl) {
      return NextResponse.json(
        { error: 'Blob URL is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching audio from blob: ${blobUrl}`);

    // Fetch the audio file from Vercel Blob
    const audioResponse = await fetch(blobUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio from blob storage');
    }

    const audioBlob = await audioResponse.blob();
    const fileSizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
    
    console.log(`Transcribing file: ${fileName}, size: ${fileSizeMB}MB`);

    // Create FormData for Groq API
    const groqFormData = new FormData();
    groqFormData.append('file', audioBlob, fileName || 'audio.mp3');
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('temperature', '0');
    groqFormData.append('response_format', 'verbose_json');
    
    console.log(`Sending ${fileSizeMB}MB to Groq API...`);
    
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
      .filter((p: string) => p.trim())
      .map((p: string) => p.trim())
      .join('\n\n');

    // Clean up: delete the blob after successful transcription
    try {
      await del(blobUrl);
      console.log('Cleaned up blob:', blobUrl);
    } catch (deleteError) {
      console.warn('Failed to delete blob (non-critical):', deleteError);
    }

    return NextResponse.json({ transcript: paragraphs || text });
  } catch (error: unknown) {
    console.error('Error transcribing audio:', error);
    
    let errorMessage = 'Failed to transcribe audio';
    
    if (error && typeof error === 'object') {
      const err = error as { message?: string; error?: { message?: string } };
      
      if (err.error?.message) {
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
