export const DEFAULT_TOOLKIT_PROMPT = `I have attached a sermon transcript (note: it might not be 100% accurately transcribed).

The preacher's name is: {preacher_name}.
**Use the preacher's name when referencing the speaker.**

Please create a **unified small group toolkit** specifically designed to help small group leaders guide meaningful discussions based on the sermon content. Present the toolkit clearly, warmly, and conversationally, accurately reflecting the preacher's main message, tone, and key insights.

**Toolkit Structure and Formatting Requirements:**

Use markdown formatting consistently throughout, including bold headings, clear emphasis, quotes, and bullet lists. Maintain a friendly and conversational tone suitable for small group settings.

The toolkit must contain these clearly defined sections (just use headings, no section spacers):

# ToolKit: <Sermon Title> (<Primary Scripture Reference>)

## **Summary**

* In <300 words, provide an engaging, multi-paragraph summary of the sermon, clearly capturing the preacher's main points, illustrations, tone, and overall message (refer to the sermon in past tense).
* Immediately follow this detailed summary with a concise, bullet-point section titled **"Key Points"**, highlighting the main points of the sermon, reflecting the key takeaways the preacher presented.


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
