import OpenAI from 'openai';
import Groq from 'groq-sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 4 * 60 * 1000,
  maxRetries: 0,
});

export const DEFAULT_TOOLKIT_PROMPT = `I have attached a sermon transcript (note: it might not be 100% accurately transcribed).

The preacher's name is: {preacher_name}.
**Always use the preacher's name throughout the toolkit.**

Please create a **unified small group toolkit** specifically designed to help small group leaders guide meaningful discussions based on the sermon content. Present the toolkit clearly, warmly, and conversationally, accurately reflecting the preacher's main message, tone, and key insights.

**Toolkit Structure and Formatting Requirements:**

Use markdown formatting consistently throughout, including bold headings, clear emphasis, quotes, and bullet lists. Maintain a friendly and conversational tone suitable for small group settings.

The toolkit must contain these clearly defined sections (just use headings, no section spacers):

# ToolKit: <Sermon Title> (<Primary Scripture Reference>)

## **Summary**

* In <300 words, provide an engaging, multi-paragraph summary of the sermon, clearly capturing the preacher's main points, illustrations, tone, and overall message (use past tense).
* Immediately follow this detailed summary with a concise, bullet-point section titled **"Key Points"**, highlighting the main points of the sermon, reflecting the key takeaways as presented by the preacher.


## **Discussion Questions**

Create five to six insightful and singular discussion questions designed to facilitate meaningful conversation and spiritual growth. Each question must:

- Be clear, concise, and avoid overly formal language, complex structures, or excessive length. 
- Keep questions simple while avoiding a comprehension-style approach. Ask one question at a time. 
- Foster genuine reflection, vulnerability, and practical application in group members' everyday lives.
- Be sensitive to group members' comfort level in sharing personal experiences. Phrase vulnerable questions gently (e.g., "Would anyone like to share..." or "Is anyone comfortable sharing…").
- Bring in relevant scriptures where sensible so as to keep things Bible-focused and practical.

Structure your questions exactly as follows for clarity and consistency:

1. **Opening question**
   *(Friendly, inviting initial sharing or personal experiences directly connected to the sermon's main message.)*

2. **Reflection question**
   *(Encourages practical reflection about everyday life, clearly rooted in sermon content.)*

3. **Vulnerability question**
   *(Gently invites honest sharing of personal struggles, growth, or insights, respecting group members' potential sensitivities.)*

4. **Practical application**
   *(Guides participants towards concrete, actionable responses aligned directly with sermon insights.)*

5. **Personal reflection & sharing**
   *(Encourages each participant to reflect personally and share specific, tangible examples from their own lives clearly tied to the sermon's message.)*

## **Appendix: Key Scriptures**

* List each key scripture referenced in the sermon fully and clearly, using the ESV translation (unless another translation is explicitly requested or provided).
* Clearly format each scripture using markdown quote formatting for readability.
* Separate each scripture clearly with (small) headings and spacing.

---

**Additional Notes:**
* Provide this toolkit as a complete, ready-to-use markdown-formatted document requiring no additional editing or formatting from the user.`;

const TOOLKIT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['toolkit_markdown', 'scripture_references'],
  properties: {
    toolkit_markdown: {
      type: 'string',
      description:
        'The full toolkit markdown body, excluding the appendix section.',
    },
    scripture_references: {
      type: 'array',
      description:
        'A unique, ordered list of scripture references that should appear in the appendix.',
      items: {
        type: 'string',
      },
    },
  },
} as const;

const MANAGED_APPENDIX_HEADING = '## **Appendix: Key Scriptures**';
const APPENDIX_BATCH_SIZE = 3;
const GROQ_MAX_RETRIES = 4;

type ReasoningEffort = 'low' | 'medium' | 'high';

type GenerateToolkitParams = {
  transcript: string;
  preacherName: string;
  customPrompt?: string;
};

type ReviseToolkitParams = GenerateToolkitParams & {
  currentToolkit: string;
  editInstructions: string;
};

function getPrompt(preacherName: string, customPrompt?: string): string {
  return (customPrompt || DEFAULT_TOOLKIT_PROMPT).replace(
    '{preacher_name}',
    preacherName
  );
}

function getResponseText(response: OpenAI.Responses.Response): string {
  let outputText = response.output_text || '';

  if (!outputText && response.output?.length) {
    const firstOutput = response.output[0];
    if (
      firstOutput &&
      'content' in firstOutput &&
      Array.isArray(firstOutput.content)
    ) {
      const textContent = firstOutput.content.find(
        (content: unknown) =>
          typeof content === 'object' && content !== null && 'text' in content
      );

      if (
        textContent &&
        typeof textContent === 'object' &&
        'text' in textContent
      ) {
        outputText = (textContent as { text: string }).text;
      }
    }
  }

  return outputText.trim();
}

function parseJsonResponse<T>(rawText: string, label: string): T {
  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    console.error(`Failed to parse ${label}:`, rawText, error);
    throw new Error(`Invalid ${label} response`);
  }
}

function stripAppendixSection(markdown: string): string {
  return markdown
    .replace(/\n{0,2}##\s+\*\*Appendix:\s*Key Scriptures\*\*[\s\S]*$/i, '')
    .trim();
}

function normalizeScriptureReferences(references: string[]): string[] {
  const seen = new Set<string>();

  return references
    .map((reference) => reference.trim())
    .filter(Boolean)
    .filter((reference) => {
      const normalized = reference.toLowerCase();
      if (normalized === 'none' || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function buildToolkitInstructions(basePrompt: string): string {
  return `${basePrompt}

Implementation requirements for this model call:
- Return a JSON object that matches the provided schema.
- Put the full toolkit markdown body in "toolkit_markdown".
- Exclude the appendix section entirely from "toolkit_markdown". Do not include any "Appendix: Key Scriptures" heading there.
- Put only scripture references, not verse text, in "scripture_references".
- Keep the scripture references unique and in the order you want them shown in the appendix.`;
}

function buildAppendixInput(prompt: string, references: string[]): string {
  return [
    'Original toolkit instructions:',
    prompt,
    '',
    'Scripture references to render:',
    ...references.map((reference) => `- ${reference}`),
  ].join('\n');
}

function splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function stripAppendixHeading(markdown: string): string {
  return markdown
    .replace(
      new RegExp(`^\\s*${MANAGED_APPENDIX_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'),
      ''
    )
    .trim();
}

function sanitizeAppendixMarkdown(markdown: string): string {
  return markdown
    .replace(/【[^】]+】/g, '')
    .replace(/\(([A-Z]{1,3})\)/g, '')
    .replace(/\[[a-z]\]/g, '')
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const maybeError = error as {
    message?: string;
    headers?: Record<string, string> | Headers;
  };
  const retryAfterHeader =
    maybeError.headers instanceof Headers
      ? maybeError.headers.get('retry-after')
      : maybeError.headers &&
          typeof maybeError.headers === 'object' &&
          'retry-after' in maybeError.headers
        ? maybeError.headers['retry-after']
        : null;

  if (typeof retryAfterHeader === 'string' && retryAfterHeader.trim()) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const message = typeof maybeError.message === 'string' ? maybeError.message : '';
  const match = message.match(/try again in\s+([\d.]+)\s*ms/i);
  if (match) {
    const milliseconds = Number(match[1]);
    if (Number.isFinite(milliseconds) && milliseconds >= 0) {
      return Math.ceil(milliseconds);
    }
  }

  return null;
}

function isRetryableGroqError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const status = (error as { status?: number }).status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

async function createGroqAppendixChunk(
  prompt: string,
  referenceChunk: string[]
) {
  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt += 1) {
    try {
      return await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        temperature: 0.1,
        max_completion_tokens: 5000,
        reasoning_effort: 'medium',
        tool_choice: 'auto',
        tools: [
          {
            type: 'browser_search',
          },
        ],
        messages: [
          {
            role: 'system',
            content: `Return markdown only.
- Generate scripture sections only, not the full toolkit.
- Do not include the heading "${MANAGED_APPENDIX_HEADING}".
- For each provided reference, add a small heading with the reference and then the full scripture text as a markdown blockquote.
- Use browser search to retrieve and verify the exact full scripture text for each reference before writing the scripture sections.
- Use the ESV translation unless another translation is explicitly requested or provided in the original toolkit instructions.
- Remove all cross-reference markers and publisher note markers from the quoted text, including patterns like "(A)", "(AA)", "[a]", inline footnote letters or numbers, and appended source citations.
- Keep only the clean scripture wording itself in the blockquote.
- Do not include source citations, line references, footnotes, notes, apologies, or extra commentary.`,
          },
          {
            role: 'user',
            content: buildAppendixInput(prompt, referenceChunk),
          },
        ],
      });
    } catch (error) {
      if (!isRetryableGroqError(error) || attempt === GROQ_MAX_RETRIES) {
        throw error;
      }

      const hintedDelayMs = extractRetryDelayMs(error);
      const fallbackDelayMs = Math.min(
        8000,
        1000 * 2 ** attempt + Math.floor(Math.random() * 300)
      );
      const delayMs = Math.max(hintedDelayMs ?? fallbackDelayMs, 500);

      console.warn('Retrying Groq appendix chunk after transient error:', {
        references: referenceChunk,
        attempt: attempt + 1,
        delayMs,
        status: (error as { status?: number }).status,
      });

      await sleep(delayMs);
    }
  }

  throw new Error('Groq appendix retries exhausted');
}

async function createStructuredResponse<T>({
  model,
  instructions,
  input,
  schemaName,
  schema,
  reasoning,
  maxOutputTokens,
}: {
  model: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  reasoning?: { effort: ReasoningEffort };
  maxOutputTokens?: number;
}): Promise<T> {
  const response = await openai.responses.create({
    model,
    ...(reasoning ? { reasoning } : {}),
    instructions,
    input,
    ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  return parseJsonResponse<T>(getResponseText(response), schemaName);
}

async function renderAppendix(
  prompt: string,
  scriptureReferences: string[]
): Promise<string> {
  if (scriptureReferences.length === 0) {
    return `${MANAGED_APPENDIX_HEADING}\n\n_No key scriptures were identified._`;
  }

  const chunkedReferences = splitIntoChunks(
    scriptureReferences,
    APPENDIX_BATCH_SIZE
  );
  const appendixSections: string[] = [];

  for (const referenceChunk of chunkedReferences) {
    const appendixResponse = await createGroqAppendixChunk(
      prompt,
      referenceChunk
    );

    const rawAppendixChunk =
      appendixResponse.choices[0]?.message?.content?.trim() || '';
    const cleanedAppendixChunk = sanitizeAppendixMarkdown(
      stripAppendixHeading(rawAppendixChunk)
    );

    if (!cleanedAppendixChunk) {
      console.error('Empty appendix chunk response:', {
        references: referenceChunk,
        finish_reason: appendixResponse.choices[0]?.finish_reason,
        executed_tools:
          appendixResponse.choices[0]?.message?.executed_tools?.length || 0,
      });
      throw new Error('Appendix generation returned empty output');
    }

    appendixSections.push(cleanedAppendixChunk);
  }

  return `${MANAGED_APPENDIX_HEADING}\n\n${appendixSections.join('\n\n')}`.trim();
}

function mergeToolkit(toolkitMarkdown: string, appendixMarkdown: string): string {
  return [toolkitMarkdown, appendixMarkdown].filter(Boolean).join('\n\n').trim();
}

export async function generateToolkit({
  transcript,
  preacherName,
  customPrompt,
}: GenerateToolkitParams): Promise<string> {
  const prompt = getPrompt(preacherName, customPrompt);

  const toolkitResponse = await createStructuredResponse<{
    toolkit_markdown: string;
    scripture_references: string[];
  }>({
    model: 'gpt-5.4',
    reasoning: {
      effort: 'medium',
    },
    instructions: buildToolkitInstructions(prompt),
    input: transcript,
    schemaName: 'toolkit_generation',
    schema: TOOLKIT_RESPONSE_SCHEMA,
    maxOutputTokens: 6000,
  });

  const toolkitMarkdown = stripAppendixSection(toolkitResponse.toolkit_markdown);
  const scriptureReferences = normalizeScriptureReferences(
    toolkitResponse.scripture_references
  );
  const appendixMarkdown = await renderAppendix(prompt, scriptureReferences);

  return mergeToolkit(toolkitMarkdown, appendixMarkdown);
}

export async function reviseToolkit({
  transcript,
  preacherName,
  customPrompt,
  currentToolkit,
  editInstructions,
}: ReviseToolkitParams): Promise<string> {
  const prompt = getPrompt(preacherName, customPrompt);

  const revisionResponse = await createStructuredResponse<{
    toolkit_markdown: string;
    scripture_references: string[];
  }>({
    model: 'gpt-5.4',
    reasoning: {
      effort: 'medium',
    },
    instructions: `${buildToolkitInstructions(prompt)}

You are revising an existing toolkit, not starting from scratch unless the requested edit requires it.
- Preserve the overall toolkit structure and formatting unless the edit instructions explicitly request a structural change.
- Apply the user's requested edits directly and cohesively across the toolkit.
- Ensure the revised content still aligns with the transcript and the preacher's message.
- Refresh the scripture references list so the appendix can be re-rendered from the revised body.`,
    input: [
      'Transcript:',
      transcript,
      '',
      'Current toolkit draft:',
      currentToolkit,
      '',
      'Requested edits:',
      editInstructions,
    ].join('\n'),
    schemaName: 'toolkit_revision',
    schema: TOOLKIT_RESPONSE_SCHEMA,
    maxOutputTokens: 6000,
  });

  const toolkitMarkdown = stripAppendixSection(revisionResponse.toolkit_markdown);
  const scriptureReferences = normalizeScriptureReferences(
    revisionResponse.scripture_references
  );
  const appendixMarkdown = await renderAppendix(prompt, scriptureReferences);

  return mergeToolkit(toolkitMarkdown, appendixMarkdown);
}
