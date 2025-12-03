import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_TOOLKIT_PROMPT = `I have attached a sermon transcript (note: it might not be 100% accurately transcribed).

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

* Be clear, concise, and avoid overly formal language, complex structures, or excessive length. Aim to ask one question at a time.
* Foster genuine reflection, vulnerability, and practical application in group members' everyday lives.
* Be sensitive to group members' comfort level in sharing personal experiences. Phrase vulnerable questions gently (e.g., "Would anyone like to share..." or "Is anyone comfortable sharing…").

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

* List each key scripture referenced in the sermon fully and clearly, using the NIV translation (unless another translation is explicitly requested or provided).
* Clearly format each scripture using markdown quote formatting for readability.
* Separate each scripture clearly with headings or spacing.

---

**Additional Notes:**
* Provide this toolkit as a complete, ready-to-use markdown-formatted document requiring no additional editing or formatting from the user.`;

export async function POST(request: NextRequest) {
  try {
    const { transcript, preacherName, customPrompt } = await request.json();

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

    const prompt = (customPrompt || DEFAULT_TOOLKIT_PROMPT).replace(
      '{preacher_name}',
      preacherName
    );

    // Using OpenAI Responses API with GPT-5.1 medium thinking
    const response = await openai.responses.create({
      model: 'gpt-5.1',
      reasoning: {
        effort: 'medium',
      },
      instructions: prompt,
      input: transcript,
    });

    // Extract the output text
    const outputText =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      '';

    return NextResponse.json({ toolkit: outputText.trim() });
  } catch (error) {
    console.error('Error generating toolkit:', error);
    return NextResponse.json(
      { error: 'Failed to generate toolkit' },
      { status: 500 }
    );
  }
}

