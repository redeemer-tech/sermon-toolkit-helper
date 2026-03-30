import { NextRequest, NextResponse } from 'next/server';

import { reviseToolkit } from '@/lib/toolkit-ai';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      preacherName,
      customPrompt,
      currentToolkit,
      editInstructions,
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

    const toolkit = await reviseToolkit({
      transcript,
      preacherName,
      customPrompt,
      currentToolkit,
      editInstructions,
    });

    return NextResponse.json({ toolkit });
  } catch (error) {
    console.error('Error editing toolkit:', error);
    return NextResponse.json({ error: 'Failed to edit toolkit' }, { status: 500 });
  }
}
