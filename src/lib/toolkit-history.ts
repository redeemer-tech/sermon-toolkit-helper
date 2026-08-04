import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import type { ToolkitHistoryEntry } from '@/lib/toolkit-history-context';

export type ToolkitVersionSource =
  | 'generated'
  | 'regenerated'
  | 'ai-edit'
  | 'manual';

type ToolkitSessionRow = {
  id: string;
  preacher_name: string;
  transcript: string;
  transcript_sha256: string;
  created_at: string;
};

type ToolkitVersionRow = {
  session_id: string;
  toolkit: string;
  created_at: string;
};

type SaveToolkitVersionParams = {
  sessionId?: string;
  parentVersionId?: string;
  transcript: string;
  preacherName: string;
  generationPrompt: string;
  toolkit: string;
  source: ToolkitVersionSource;
  editInstructions?: string;
};

type SaveToolkitSessionParams = Pick<
  SaveToolkitVersionParams,
  'sessionId' | 'transcript' | 'preacherName' | 'generationPrompt'
>;

const DEFAULT_HISTORY_LIMIT = 6;
const HISTORY_QUERY_LIMIT = 12;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseConfig() {
  const url = (
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  ).replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Toolkit history is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }

  return { url, serviceRoleKey };
}

async function supabaseRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Redeemer Supabase request failed (${response.status}): ${body.slice(0, 1_000)}`
    );
  }

  if (!body) {
    return undefined as T;
  }

  return JSON.parse(body) as T;
}

function transcriptFingerprint(transcript: string): string {
  return createHash('sha256').update(transcript.trim()).digest('hex');
}

function validUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

async function createOrUpdateSession({
  sessionId,
  transcript,
  preacherName,
  generationPrompt,
}: Pick<
  SaveToolkitVersionParams,
  'sessionId' | 'transcript' | 'preacherName' | 'generationPrompt'
>): Promise<string> {
  const payload = {
    transcript,
    transcript_sha256: transcriptFingerprint(transcript),
    preacher_name: preacherName,
    generation_prompt: generationPrompt,
    updated_at: new Date().toISOString(),
  };

  if (validUuid(sessionId)) {
    const params = new URLSearchParams({
      id: `eq.${sessionId}`,
      select: 'id',
    });
    const rows = await supabaseRequest<Array<{ id: string }>>(
      `sermon_toolkit_sessions?${params}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      }
    );

    if (rows[0]?.id) {
      return rows[0].id;
    }
  }

  const params = new URLSearchParams({
    on_conflict: 'transcript_sha256',
    select: 'id',
  });
  const rows = await supabaseRequest<Array<{ id: string }>>(
    `sermon_toolkit_sessions?${params}`,
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!rows[0]?.id) {
    throw new Error('Redeemer Supabase did not return a toolkit session ID.');
  }

  return rows[0].id;
}

export async function saveToolkitSession(
  params: SaveToolkitSessionParams
): Promise<string> {
  return createOrUpdateSession(params);
}

export async function saveToolkitVersion(
  params: SaveToolkitVersionParams
): Promise<{ sessionId: string; versionId: string }> {
  const sessionId = await saveToolkitSession(params);
  const versionId = randomUUID();

  await supabaseRequest<void>('sermon_toolkit_versions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: versionId,
      session_id: sessionId,
      parent_version_id: validUuid(params.parentVersionId)
        ? params.parentVersionId
        : null,
      source: params.source,
      toolkit: params.toolkit,
      edit_instructions: params.editInstructions?.trim() || null,
    }),
  });

  return { sessionId, versionId };
}

export async function loadRecentToolkitHistory({
  currentTranscript,
  excludeSessionId,
  limit = DEFAULT_HISTORY_LIMIT,
}: {
  currentTranscript: string;
  excludeSessionId?: string;
  limit?: number;
}): Promise<ToolkitHistoryEntry[]> {
  const sessionParams = new URLSearchParams({
    select: 'id,preacher_name,transcript,transcript_sha256,created_at',
    transcript_sha256: `neq.${transcriptFingerprint(currentTranscript)}`,
    order: 'created_at.desc',
    limit: String(Math.max(limit, HISTORY_QUERY_LIMIT)),
  });

  if (validUuid(excludeSessionId)) {
    sessionParams.set('id', `neq.${excludeSessionId}`);
  }

  const sessions = await supabaseRequest<ToolkitSessionRow[]>(
    `sermon_toolkit_sessions?${sessionParams}`
  );
  if (sessions.length === 0) {
    return [];
  }

  const versionParams = new URLSearchParams({
    select: 'session_id,toolkit,created_at',
    session_id: `in.(${sessions.map((session) => session.id).join(',')})`,
    order: 'created_at.desc',
  });
  const versions = await supabaseRequest<ToolkitVersionRow[]>(
    `sermon_toolkit_versions?${versionParams}`
  );
  const latestVersionBySession = new Map<string, ToolkitVersionRow>();

  for (const version of versions) {
    if (!latestVersionBySession.has(version.session_id)) {
      latestVersionBySession.set(version.session_id, version);
    }
  }

  return sessions
    .flatMap((session): ToolkitHistoryEntry[] => {
      const version = latestVersionBySession.get(session.id);
      if (!version) {
        return [];
      }

      return [
        {
          sessionId: session.id,
          preacherName: session.preacher_name,
          transcript: session.transcript,
          toolkit: version.toolkit,
          createdAt: session.created_at,
        },
      ];
    })
    .slice(0, Math.max(0, limit));
}
