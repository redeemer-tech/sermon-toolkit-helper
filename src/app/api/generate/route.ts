import { NextRequest, NextResponse } from 'next/server';

import { generateToolkit } from '@/lib/toolkit-ai';
import {
  loadRecentToolkitHistory,
  saveToolkitSession,
  saveToolkitVersion,
} from '@/lib/toolkit-history';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      preacherName,
      customPrompt,
      sessionId,
      parentVersionId,
    } = await request.json();

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

    if (!customPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Toolkit instructions are required' },
        { status: 400 }
      );
    }

    const normalizedTranscript = transcript.trim();
    const normalizedPreacherName = preacherName.trim();
    const persistedSessionId = await saveToolkitSession({
      sessionId,
      transcript: normalizedTranscript,
      preacherName: normalizedPreacherName,
      generationPrompt: customPrompt,
    });
    const history = await loadRecentToolkitHistory({
      currentTranscript: normalizedTranscript,
      excludeSessionId: persistedSessionId,
    });
    const toolkit = await generateToolkit({
      transcript: normalizedTranscript,
      preacherName: normalizedPreacherName,
      customPrompt,
      history,
    });
    const saved = await saveToolkitVersion({
      sessionId: persistedSessionId,
      parentVersionId,
      transcript: normalizedTranscript,
      preacherName: normalizedPreacherName,
      generationPrompt: customPrompt,
      toolkit,
      source: sessionId ? 'regenerated' : 'generated',
    });

    return NextResponse.json({ toolkit, ...saved });
  } catch (error) {
    console.error('Error generating toolkit:', error);
    return NextResponse.json(
      { error: 'Failed to generate toolkit' },
      { status: 500 }
    );
  }
}
