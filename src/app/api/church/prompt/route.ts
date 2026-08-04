import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthenticatedChurch,
  saveChurchSystemPrompt,
} from '@/lib/church-auth';

export async function PUT(request: NextRequest) {
  try {
    const church = await getAuthenticatedChurch(request);
    if (!church) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { systemPrompt } = await request.json();
    if (!systemPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Toolkit instructions are required' },
        { status: 400 }
      );
    }

    const savedPrompt = await saveChurchSystemPrompt(
      church.id,
      systemPrompt
    );
    return NextResponse.json({ systemPrompt: savedPrompt });
  } catch (error) {
    console.error('Error saving church prompt:', error);
    return NextResponse.json(
      { error: 'Failed to save church instructions' },
      { status: 500 }
    );
  }
}
