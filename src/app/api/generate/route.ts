import { NextRequest, NextResponse } from 'next/server';

import { generateToolkit } from '@/lib/toolkit-ai';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { transcript, preacherName, customPrompt } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (!preacherName) {
      return NextResponse.json(
        { error: 'Preacher name is required' },
        { status: 400 }
      );
    }

    const toolkit = await generateToolkit({
      transcript,
      preacherName,
      customPrompt,
    });

    return NextResponse.json({ toolkit });
  } catch (error) {
    console.error('Error generating toolkit:', error);
    return NextResponse.json(
      { error: 'Failed to generate toolkit' },
      { status: 500 }
    );
  }
}
