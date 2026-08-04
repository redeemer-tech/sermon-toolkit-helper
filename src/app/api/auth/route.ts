import { NextRequest, NextResponse } from 'next/server';

import {
  authenticateChurch,
  clearChurchSessionCookie,
  getAuthenticatedChurch,
  listActiveChurches,
  setChurchSessionCookie,
} from '@/lib/church-auth';

export async function GET(request: NextRequest) {
  try {
    const [churches, church] = await Promise.all([
      listActiveChurches(),
      getAuthenticatedChurch(request),
    ]);

    if (!church) {
      return NextResponse.json({ authenticated: false, churches });
    }

    return NextResponse.json({
      authenticated: true,
      churches,
      church: { slug: church.slug, name: church.name },
      systemPrompt: church.systemPrompt,
    });
  } catch (error) {
    console.error('Error loading church authentication:', error);
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { churchSlug, password } = await request.json();

    if (!churchSlug?.trim() || !password) {
      return NextResponse.json(
        { error: 'Choose a church and enter its password' },
        { status: 400 }
      );
    }

    const church = await authenticateChurch(churchSlug.trim(), password);

    if (!church) {
      return NextResponse.json(
        { error: 'Incorrect church or password' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      church: { slug: church.slug, name: church.name },
      systemPrompt: church.systemPrompt,
    });
    setChurchSessionCookie(response, church.id);
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearChurchSessionCookie(response);
  return response;
}

