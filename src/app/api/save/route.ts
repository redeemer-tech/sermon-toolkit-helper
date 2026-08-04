import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthenticatedChurch,
  saveChurchSystemPrompt,
} from '@/lib/church-auth';
import { saveToolkitVersion } from '@/lib/toolkit-history';

export async function POST(request: NextRequest) {
  try {
    const church = await getAuthenticatedChurch(request);
    if (!church) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const {
      sessionId,
      parentVersionId,
      transcript,
      preacherName,
      customPrompt,
      toolkit,
    } = await request.json();

    if (!transcript?.trim() || !preacherName?.trim() || !customPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Transcript, preacher name, and toolkit instructions are required' },
        { status: 400 }
      );
    }

    if (!toolkit?.trim()) {
      return NextResponse.json(
        { error: 'Toolkit content is required' },
        { status: 400 }
      );
    }

    const savedPrompt = await saveChurchSystemPrompt(church.id, customPrompt);
    const saved = await saveToolkitVersion({
      churchId: church.id,
      sessionId,
      parentVersionId,
      transcript: transcript.trim(),
      preacherName: preacherName.trim(),
      generationPrompt: savedPrompt,
      toolkit,
      source: 'manual',
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error saving toolkit:', error);
    return NextResponse.json(
      { error: 'Failed to save toolkit to Redeemer Supabase' },
      { status: 500 }
    );
  }
}
