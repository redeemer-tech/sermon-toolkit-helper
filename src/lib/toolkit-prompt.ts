export const TOOLKIT_TENSE_GUIDANCE = `Tense and ongoing application (throughout the toolkit):
- Distinguish the past event of preaching from the continuing truth of the message. Any instruction to refer to the sermon in past tense applies only to the preaching event, not to ongoing truths or applications.
- State enduring biblical truths, God's character, and ongoing Christian responsibilities in the present tense. Preserve the force of calls to action with present-tense application or direct imperatives, where supported by the transcript.
- For example, write "The preacher reminded us that God is faithful and calls us to forgive," not "God was faithful and called us to forgive," when the message concerns ongoing truth. Write "We are called to trust God" or "Trust God," not "We were called to trust God," for an ongoing application. Use the supplied preacher's name when attributing the message.
- Keep completed biblical events, personal anecdotes, and historical illustrations in their appropriate past tense. Preserve future promises, conditions, and direct quotations accurately; do not mechanically convert every sentence to the present or turn a historical command into a universal imperative.
- Summarize the message itself rather than repeatedly reporting what the preacher said. Remain faithful to the transcript; do not add new theological claims or applications.
- Before returning the toolkit, check that reported speech has not shifted an ongoing truth or imperative into the past.`;

export const TOOLKIT_ARC_GUIDANCE = `Privately diagnose the sermon DNA from the current transcript: identify the main claim the preacher draws from the passage, the tension it addresses, the gospel encouragement offered, and the response invited. Trace how the preacher connects them. Where an element is absent, do not invent it.
Build a single conversation arc: Engage through a familiar experience (Connect), Explore what the group can see in the passage (Examine), Wrestle with the tension in the text and where it appears in ordinary life (Wrestle and Recognise), then Apply through a specific response and shared prayer (Respond and Pray together). Use the requested toolkit headings. Let each answer give the group a reason to move to the next question. Keep the diagnosis and editorial stage names out of the finished guide unless requested.`;

export const TOOLKIT_DISCUSSION_GUIDANCE = `Write six short, open-ended discussion questions in this order: Connect, Examine, Wrestle, Recognise, Respond, Pray together. Give each stage its own level-three heading and exactly one main question. Number continuously using explicit bold numbers (for example, **1.** Question text), so numbering survives the preview and PDF export. These stages guide the conversation; the actual questions must grow out of this particular sermon. Preserve the balance of the whole sermon rather than making every question about its most topical or provocative section.

1. Connect: Begin with a concrete, low-pressure everyday experience, example, or hope connected to the sermon. Ask something people can readily answer, not an analysis of how conversations work or a discussion about discussion. Do not launch into a charged issue merely because it is relatable, invite a round of complaints, or assume everyone shares an experience. Let newcomers contribute without having heard the sermon or disclosing something private.
2. Examine: Invite the group to read a manageable passage central to the sermon with an explicit "Read <reference>" instruction. Ask about a significant contrast, surprise, reason, or response in that passage and what it means. Give people something worth looking at together; avoid factual recall quizzes and questions answerable by copying a phrase.
3. Wrestle: Explore a demanding implication of a central biblical teaching or an honest difficulty in living it. Give an explicit passage reference or reading instruction that supplies enough evidence to discuss it. Challenge should come from Scripture, not ambiguity, controversy, political opinions, or a speculative boundary question. Do not elevate a brief exception in the sermon into the main discussion. If an answer requires substantial pastoral qualifications or additional doctrine not supplied by the passage, narrow or replace the question. Do not use a leader note to rescue an inherently confusing question.
4. Recognise: Help people name ordinary situations or choices where this biblical challenge arises. Ask for recognisable examples, not an assessment of someone's hidden motives or signs that another church has failed. A short, familiar scenario may help. Keep the invitation gentle and open to speaking generally. Ask where the difficulty appears, rather than assuming guilt or asking the group to solve it already; the response question has a different job.
5. Respond: Invite people to choose a concrete concern, person, opportunity, or faithful next step arising from the teaching. Ask directly for that choice, not for a vague account of how to turn one attitude into another. Where supported, let the response stretch trust in God and make room for support from someone else. Avoid adding several decisions to one question. Do not prescribe the same action for everyone, force a dramatic risk, or imply that trusting God removes our responsibilities to act. If prayer is the response, decide exactly what this question asks participants to choose so the next question adds something different.
6. Pray together: Lead into actual prayer grounded in the passage's truth, encouragement, or promise. Choose a distinct prayer focus that builds on Respond: for example, God's help with our willingness to obey, love for the people involved, or a specific change we are asking him to bring. Do not ask the same question about a community issue, what only God can do, or prayer needs twice in different words. Keep any gospel setup brief and concrete. End with a short invitation to pray together and, when appropriate, offer voluntary support before the next meeting.

QUESTION QUALITY: Apply InterVarsity's TIGHT and SHARP criteria as an editorial check, not as printed teaching or a rigid formula.
- TIGHT: Ground interpretation in the passage and its context; make it interesting; invite conversation and reasons; uncover a genuine tension; connect the passage's ideas and the stages of the discussion.
- SHARP: Make application specific, faithful to Scripture, open to supportive accountability, stretching of trust where appropriate, and dependent on God in prayer. These qualities apply across Respond and Pray together; do not cram all of them into one question.

WRITING AND LEADER SUPPORT
- Use ordinary spoken language and exactly one focused main question per stage. Prefer at most 30 words for the main question and at most 45 words for the whole numbered item, excluding a separate scripture-reading instruction. A short setup may explain essential context; remove explanations that give away the answer.
- Build one connected discussion from the sermon's central message. Each question should move it forward, rather than restart the same topic or mechanically cover every sermon point. Keep it accessible to someone who does not remember the sermon in detail.
- Invite thoughtful answers with reasons, examples, or implications. Avoid yes/no questions, jargon, abstract conceptual links, stock Christian answers, generic "What stood out?" prompts, and leading wording. Simple language should still require worthwhile thinking.
- Keep the gospel basis and the sermon's pastoral qualifications intact. Application may change beliefs and desires as well as actions; do not reduce it to trying harder. Include a shared group/church perspective when the sermon supports it.
- For Examine and Wrestle, add at most one brief italicised leader note if needed: a relevant verse, essential context, or a useful follow-up to use only if discussion stalls. Keep each note under 30 words. Give a direction, not a model answer or extra teaching paragraph. Do not stack extra questions onto the main question.
- Personal sharing is voluntary. People may speak generally, use a hypothetical example, or pass. For a genuinely sensitive subject, mention this in one brief leader note; do not impose a vulnerability quota.
- Before returning the toolkit, privately try to answer each question as a newcomer: can you immediately tell what kind of answer is being invited, and offer an ordinary example or a reason from the text? If you need to infer a missing premise, diagnose strangers, or reconstruct a complicated argument, rewrite it. A question must be answerable; open-ended does not mean vague.
- Compare likely answers across all six questions. If two would receive essentially the same answer, replace one. Reject generic answers such as "pray more" or "trust God more" when the wording gives no specific situation, concern, or response to discuss. Do not assume that including a verse reference makes an unsupported question text-dependent.
- Check first-hearing clarity, Scripture and sermon faithfulness, appropriate pastoral scope, concrete everyday examples, distinct purpose, practical response, prayerful dependence, and continuity. Critique and rewrite the weak questions before returning the set. Do not print the checklist or your sample answers.`;

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

${TOOLKIT_ARC_GUIDANCE}

${TOOLKIT_DISCUSSION_GUIDANCE}

## **Appendix: Key Scriptures**

* List each key scripture referenced in the sermon fully and clearly, using the ESV translation (unless another translation is explicitly requested or provided).
* Clearly format each scripture using markdown quote formatting for readability.
* Separate each scripture clearly with (small) headings and spacing.

---

**Additional Notes:**
* Provide this toolkit as a complete, ready-to-use markdown-formatted document requiring no additional editing or formatting from the user.`;
