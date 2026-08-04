import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import type { ToolkitHistoryEntry } from '@/lib/toolkit-history-context';
import { supabaseRequest } from '@/lib/supabase-rest';

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
  churchId: string;
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
  | 'churchId'
  | 'sessionId'
  | 'transcript'
  | 'preacherName'
  | 'generationPrompt'
>;

const DEFAULT_HISTORY_LIMIT = 6;
const HISTORY_QUERY_LIMIT = 12;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function transcriptFingerprint(transcript: string): string {
  return createHash('sha256').update(transcript.trim()).digest('hex');
}

function validUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

async function createOrUpdateSession({
  churchId,
  sessionId,
  transcript,
  preacherName,
  generationPrompt,
}: Pick<
  SaveToolkitVersionParams,
  | 'churchId'
  | 'sessionId'
  | 'transcript'
  | 'preacherName'
  | 'generationPrompt'
>): Promise<string> {
  const payload = {
    church_id: churchId,
    transcript,
    transcript_sha256: transcriptFingerprint(transcript),
    preacher_name: preacherName,
    generation_prompt: generationPrompt,
    updated_at: new Date().toISOString(),
  };

  if (validUuid(sessionId)) {
    const params = new URLSearchParams({
      id: `eq.${sessionId}`,
      church_id: `eq.${churchId}`,
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
    on_conflict: 'church_id,transcript_sha256',
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
  let parentVersionId: string | null = null;

  if (validUuid(params.parentVersionId)) {
    const parentParams = new URLSearchParams({
      id: `eq.${params.parentVersionId}`,
      session_id: `eq.${sessionId}`,
      select: 'id',
      limit: '1',
    });
    const parentRows = await supabaseRequest<Array<{ id: string }>>(
      `sermon_toolkit_versions?${parentParams}`
    );
    parentVersionId = parentRows[0]?.id ?? null;
  }

  await supabaseRequest<void>('sermon_toolkit_versions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: versionId,
      session_id: sessionId,
      parent_version_id: parentVersionId,
      source: params.source,
      toolkit: params.toolkit,
      edit_instructions: params.editInstructions?.trim() || null,
    }),
  });

  return { sessionId, versionId };
}

export async function loadRecentToolkitHistory({
  churchId,
  currentTranscript,
  excludeSessionId,
  limit = DEFAULT_HISTORY_LIMIT,
}: {
  churchId: string;
  currentTranscript: string;
  excludeSessionId?: string;
  limit?: number;
}): Promise<ToolkitHistoryEntry[]> {
  const sessionParams = new URLSearchParams({
    select: 'id,preacher_name,transcript,transcript_sha256,created_at',
    church_id: `eq.${churchId}`,
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
