import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';

import {
  createChurchSessionToken,
  verifyChurchPassword,
  verifyChurchSessionToken,
} from '@/lib/church-auth-crypto';
import { DEFAULT_TOOLKIT_PROMPT } from '@/lib/toolkit-prompt';
import { supabaseRequest } from '@/lib/supabase-rest';

export const CHURCH_SESSION_COOKIE = 'sermon-toolkit-church-session';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

type ChurchRow = {
  id: string;
  slug: string;
  name: string;
  password_hash: string;
  system_prompt: string | null;
  is_active: boolean;
};

export type ChurchSummary = Pick<ChurchRow, 'slug' | 'name'>;

export type AuthenticatedChurch = {
  id: string;
  slug: string;
  name: string;
  systemPrompt: string;
};

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET || '';
  if (secret.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.');
  }

  return secret;
}

function toAuthenticatedChurch(church: ChurchRow): AuthenticatedChurch {
  return {
    id: church.id,
    slug: church.slug,
    name: church.name,
    systemPrompt: church.system_prompt?.trim() || DEFAULT_TOOLKIT_PROMPT,
  };
}

async function findChurchById(id: string): Promise<ChurchRow | null> {
  const params = new URLSearchParams({
    select: 'id,slug,name,password_hash,system_prompt,is_active',
    id: `eq.${id}`,
    is_active: 'eq.true',
    limit: '1',
  });
  const rows = await supabaseRequest<ChurchRow[]>(`churches?${params}`);
  return rows[0] ?? null;
}

export async function listActiveChurches(): Promise<ChurchSummary[]> {
  const params = new URLSearchParams({
    select: 'slug,name',
    is_active: 'eq.true',
    order: 'name.asc',
  });
  return supabaseRequest<ChurchSummary[]>(`churches?${params}`);
}

export async function authenticateChurch(
  slug: string,
  password: string
): Promise<AuthenticatedChurch | null> {
  const params = new URLSearchParams({
    select: 'id,slug,name,password_hash,system_prompt,is_active',
    slug: `eq.${slug}`,
    is_active: 'eq.true',
    limit: '1',
  });
  const rows = await supabaseRequest<ChurchRow[]>(`churches?${params}`);
  const church = rows[0];

  if (!church || !verifyChurchPassword(password, church.password_hash)) {
    return null;
  }

  return toAuthenticatedChurch(church);
}

export async function getAuthenticatedChurch(
  request: NextRequest
): Promise<AuthenticatedChurch | null> {
  const token = request.cookies.get(CHURCH_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = verifyChurchSessionToken(token, getSessionSecret());
  if (!session) {
    return null;
  }

  const church = await findChurchById(session.churchId);
  return church ? toAuthenticatedChurch(church) : null;
}

export function setChurchSessionCookie(
  response: NextResponse,
  churchId: string
): void {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1_000;
  response.cookies.set(
    CHURCH_SESSION_COOKIE,
    createChurchSessionToken(churchId, getSessionSecret(), expiresAt),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    }
  );
}

export function clearChurchSessionCookie(response: NextResponse): void {
  response.cookies.set(CHURCH_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function saveChurchSystemPrompt(
  churchId: string,
  systemPrompt: string
): Promise<string> {
  const normalizedPrompt = systemPrompt.trim();
  if (!normalizedPrompt) {
    throw new Error('Toolkit instructions are required.');
  }

  const params = new URLSearchParams({
    id: `eq.${churchId}`,
    is_active: 'eq.true',
    select: 'system_prompt',
  });
  const rows = await supabaseRequest<Array<{ system_prompt: string }>>(
    `churches?${params}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        system_prompt: normalizedPrompt,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!rows[0]?.system_prompt) {
    throw new Error('Church prompt could not be saved.');
  }

  return rows[0].system_prompt;
}
