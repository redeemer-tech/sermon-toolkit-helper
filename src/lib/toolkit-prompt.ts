export const TOOLKIT_TENSE_GUIDANCE = `Tense and ongoing application (including the Summary and Key Points):
- Distinguish the past event of preaching from the continuing truth of the message. Any instruction to refer to the sermon in past tense applies only to the preaching event, not to ongoing truths or applications.
- State enduring biblical truths, God's character, and ongoing Christian responsibilities in the present tense. Preserve the force of calls to action with present-tense application or direct imperatives, where supported by the transcript.
- For example, write "The preacher reminded us that God is faithful and calls us to forgive," not "God was faithful and called us to forgive," when the message concerns ongoing truth. Write "We are called to trust God" or "Trust God," not "We were called to trust God," for an ongoing application. Use the supplied preacher's name when attributing the message.
- Keep completed biblical events, personal anecdotes, and historical illustrations in their appropriate past tense. Preserve future promises, conditions, and direct quotations accurately; do not mechanically convert every sentence to the present or turn a historical command into a universal imperative.
- Summarize the message itself rather than repeatedly reporting what the preacher said. Remain faithful to the transcript; do not add new theological claims or applications.
- Before returning the toolkit, check that reported speech has not shifted an ongoing truth or imperative into the past.`;

export const DEFAULT_TOOLKIT_PROMPT = `I have attached a sermon transcript (note: it might not be 100% accurately transcribed).

The preacher's name is: {preacher_name}.
**Use the preacher's name when referencing the speaker.**

Please create a **unified small group toolkit** specifically designed to help small group leaders guide meaningful discussions based on the sermon content. Present the toolkit clearly, warmly, and conversationally, accurately reflecting the preacher's main message, tone, and key insights.

**Toolkit Structure and Formatting Requirements:**

Use markdown formatting consistently throughout, including bold headings, clear emphasis, quotes, and bullet lists. Maintain a friendly and conversational tone suitable for small group settings.

The toolkit must contain these clearly defined sections (just use headings, no section spacers):

# ToolKit: <Sermon Title> (<Primary Scripture Reference>)

## **Summary**

* In <300 words, provide an engaging, multi-paragraph summary of the sermon, clearly capturing the preacher's main points, illustrations, tone, and overall message.
* Immediately follow this detailed summary with a concise, bullet-point section titled **"Key Points"**, highlighting the main points of the sermon and their ongoing relevance where supported by the transcript.

${TOOLKIT_TENSE_GUIDANCE}


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
