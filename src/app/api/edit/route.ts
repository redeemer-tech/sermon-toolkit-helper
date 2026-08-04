import { NextRequest, NextResponse } from 'next/server';

import { reviseToolkit } from '@/lib/toolkit-ai';
import { saveToolkitVersion } from '@/lib/toolkit-history';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      preacherName,
      customPrompt,
      currentToolkit,
      editInstructions,
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

    if (!currentToolkit) {
      return NextResponse.json(
        { error: 'Current toolkit is required' },
        { status: 400 }
      );
    }

    if (!editInstructions) {
      return NextResponse.json(
        { error: 'Edit instructions are required' },
        { status: 400 }
      );
    }

    if (!customPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Toolkit instructions are required' },
        { status: 400 }
      );
    }

    const toolkit = await reviseToolkit({
      transcript: transcript.trim(),
      preacherName: preacherName.trim(),
      customPrompt,
      currentToolkit,
      editInstructions,
    });
    const saved = await saveToolkitVersion({
      sessionId,
      parentVersionId,
      transcript: transcript.trim(),
      preacherName: preacherName.trim(),
      generationPrompt: customPrompt,
      toolkit,
      source: 'ai-edit',
      editInstructions,
    });

    return NextResponse.json({ toolkit, ...saved });
  } catch (error) {
    console.error('Error editing toolkit:', error);
    return NextResponse.json({ error: 'Failed to edit toolkit' }, { status: 500 });
  }
}
