export type ToolkitHistoryEntry = {
  sessionId: string;
  preacherName: string;
  transcript: string;
  toolkit: string;
  createdAt: string;
};

const MAX_HISTORY_TOOLKIT_CHARACTERS = 9_000;
const MAX_HISTORY_TRANSCRIPT_CHARACTERS = 3_000;

function truncateMiddle(value: string, maxCharacters: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxCharacters) {
    return normalized;
  }

  const marker = '\n\n[Earlier material shortened for context]\n\n';
  const availableCharacters = maxCharacters - marker.length;
  const startCharacters = Math.ceil(availableCharacters * 0.7);
  const endCharacters = Math.floor(availableCharacters * 0.3);

  return [
    normalized.slice(0, startCharacters).trimEnd(),
    marker,
    normalized.slice(-endCharacters).trimStart(),
  ].join('');
}

export function stripHistoricalAppendix(toolkit: string): string {
  return toolkit
    .replace(
      /\n{0,2}##\s+(?:\*\*)?Appendix:\s*Key Scriptures(?:\*\*)?[\s\S]*$/i,
      ''
    )
    .trim();
}

export function buildToolkitHistoryContext(
  history: ToolkitHistoryEntry[]
): string {
  return history
    .map((entry, index) => {
      const historicalToolkit = truncateMiddle(
        stripHistoricalAppendix(entry.toolkit),
        MAX_HISTORY_TOOLKIT_CHARACTERS
      );
      const transcriptExcerpt = truncateMiddle(
        entry.transcript,
        MAX_HISTORY_TRANSCRIPT_CHARACTERS
      );
      const date = Number.isNaN(Date.parse(entry.createdAt))
        ? entry.createdAt
        : new Date(entry.createdAt).toISOString().slice(0, 10);

      return [
        `### Previous sermon ${index + 1} (${date})`,
        `Preacher: ${entry.preacherName}`,
        '',
        'Transcript excerpt:',
        transcriptExcerpt,
        '',
        'Saved toolkit (scripture appendix omitted):',
        historicalToolkit,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export function buildToolkitGenerationInput(
  transcript: string,
  history: ToolkitHistoryEntry[]
): string {
  if (history.length === 0) {
    return transcript;
  }

  return [
    '# Current sermon transcript (authoritative)',
    transcript,
    '',
    '# Recent sermon and toolkit history (secondary context)',
    buildToolkitHistoryContext(history),
  ].join('\n');
}

export function buildHistoryAwareInstructions(historyCount: number): string {
  if (historyCount === 0) {
    return '';
  }

  return `

Continuity and variety requirements:
- The input includes ${historyCount} recent prior sermon toolkit${historyCount === 1 ? '' : 's'} after the current transcript.
- Treat the current sermon transcript as authoritative. Use history only to understand the recent teaching and discussion context.
- Make this week's discussion questions meaningfully distinct from recent questions. Avoid repeating the same wording, angle, personal example, or sequence unless the current sermon genuinely requires it.
- Build on relevant themes where helpful, but do not force connections and do not mention the historical context in the finished toolkit.
- Do not copy factual details from a prior transcript into this week's summary, key points, or scripture list.`;
}
