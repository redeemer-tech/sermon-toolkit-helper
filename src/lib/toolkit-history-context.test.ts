import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildHistoryAwareInstructions,
  buildToolkitGenerationInput,
  buildToolkitHistoryContext,
  stripHistoricalAppendix,
  type ToolkitHistoryEntry,
} from '@/lib/toolkit-history-context';

const history: ToolkitHistoryEntry[] = [
  {
    sessionId: 'b88b0f93-82b2-464e-a4df-39442ae85e78',
    preacherName: 'Previous Preacher',
    transcript: 'A previous sermon transcript.',
    toolkit: [
      '# ToolKit: Previous Sermon',
      '',
      '## **Discussion Questions**',
      '',
      '1. What stood out to you?',
      '',
      '## **Appendix: Key Scriptures**',
      '',
      '> Appendix text that should not be sent as history.',
    ].join('\n'),
    createdAt: '2026-07-28T08:00:00.000Z',
  },
];

describe('toolkit history context', () => {
  test('removes the large scripture appendix while retaining questions', () => {
    const toolkit = stripHistoricalAppendix(history[0].toolkit);

    assert.match(toolkit, /What stood out to you\?/);
    assert.doesNotMatch(toolkit, /Appendix text/);
  });

  test('labels prior sermons and includes both saved sources', () => {
    const context = buildToolkitHistoryContext(history);

    assert.match(context, /Previous sermon 1 \(2026-07-28\)/);
    assert.match(context, /A previous sermon transcript\./);
    assert.match(context, /What stood out to you\?/);
  });

  test('keeps the current transcript authoritative in the model input', () => {
    const input = buildToolkitGenerationInput('This week\'s sermon.', history);

    assert.ok(
      input.indexOf("This week's sermon.") <
        input.indexOf('A previous sermon transcript.')
    );
    assert.match(input, /Current sermon transcript \(authoritative\)/);
  });

  test('adds explicit anti-repetition instructions only when history exists', () => {
    assert.match(
      buildHistoryAwareInstructions(1),
      /meaningfully distinct from recent questions/
    );
    assert.equal(buildHistoryAwareInstructions(0), '');
  });
});
