import streamlit as st
from openai import OpenAI
import tempfile
import os
from dotenv import load_dotenv
from hashlib import sha256
from hmac import compare_digest
import markdown2
import bs4

# Load environment variables and setup
load_dotenv()
st.set_page_config(page_title="Small Group Toolkit Generator")

# Add password verification function
def verify_password(input_password, stored_password):
    """Securely verify password using constant-time comparison"""
    # Hash the input password using SHA-256
    input_hash = sha256(input_password.encode()).hexdigest()
    stored_hash = sha256(stored_password.encode()).hexdigest()
    return compare_digest(input_hash, stored_hash)

# Get password from environment variable
APP_PASSWORD = os.getenv("APP_PASSWORD")
if not APP_PASSWORD:
    st.error("Application password not found. Please set APP_PASSWORD in your .env file.")
    st.stop()

# Initialize session state for authentication
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False

# Title should be visible at all times
st.title("Small Group Toolkit Generator")

# Password protection
if not st.session_state.authenticated:
    # Use a form to enable Enter key submission
    with st.form("login_form"):
        password_input = st.text_input("Enter application password:", type="password")
        submitted = st.form_submit_button("Login")
        
        if submitted:
            if verify_password(password_input, APP_PASSWORD):
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("Incorrect password. Please try again.")
    st.stop()

# Custom CSS simplified with consistent blue theme
st.markdown("""
    <style>
        /* Primary buttons (Start Transcribing, Download) */
        .stButton button[kind="primary"],
        .stButton button[data-testid="baseButton-secondary"],
        .stDownloadButton button {
            background-color: rgba(0, 123, 255, 0.8);
            color: white;
            border: none;
            transition: all 0.3s ease;
        }
        .stButton button[kind="primary"]:hover,
        .stButton button[data-testid="baseButton-secondary"]:hover,
        .stDownloadButton button:hover {
            background-color: rgba(0, 123, 255, 1);
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        /* Reset button */
        .stButton button[kind="secondary"] {
            background-color: rgba(220, 53, 69, 0.6);
            color: white;
            transition: all 0.3s ease;
        }
        .stButton button[kind="secondary"]:hover {
            background-color: rgba(220, 53, 69, 0.8);
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        /* Text Area styling */
        .stTextArea textarea,
        div[data-baseweb="textarea"] textarea,
        .stTextArea div[data-baseweb="textarea"] {
            border: 1px solid transparent !important;
            transition: border-color 0.3s ease !important;
        }

        .stTextArea textarea:focus,
        div[data-baseweb="textarea"] textarea:focus,
        .stTextArea div[data-baseweb="textarea"]:focus-within {
            border-color: rgba(0, 123, 255, 0.8) !important;
        }
    </style>
""", unsafe_allow_html=True)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    st.error("OpenAI API key not found. Please check your .env file.")
    st.stop()
client = OpenAI(api_key=api_key)

# Initialize session state
if 'transcription' not in st.session_state:
    st.session_state.transcription = None
if 'current_model' not in st.session_state:
    st.session_state.current_model = None

# Initialize session state for upload counter
if 'upload_counter' not in st.session_state:
    st.session_state.upload_counter = 0

# Define default toolkit prompt template
DEFAULT_TOOLKIT_PROMPT_TEMPLATE = """I have attached a sermon transcript (note: it might not be 100% accurately transcribed).

The preacher's name is: {preacher_name}.
**Always use the preacher's name throughout the toolkit.**

Please create a **unified small group toolkit** specifically designed to help small group leaders guide meaningful discussions based on the sermon content. Present the toolkit clearly, warmly, and conversationally, accurately reflecting the preacher's main message, tone, and key insights.

**Toolkit Structure and Formatting Requirements:**

Use markdown formatting consistently throughout, including bold headings, clear emphasis, quotes, and bullet lists. Maintain a friendly and conversational tone suitable for small group settings.

The toolkit must contain these clearly defined sections:

---

## **Summary**

* Provide a detailed, engaging, multi-paragraph summary of the sermon, clearly capturing the preacher's main points, illustrations, tone, and overall message.
* Immediately follow this detailed summary with a concise, clearly formatted bullet-point section titled **"Key Points"**, highlighting the preacher's core takeaways.

---

## **Discussion Questions**

Create exactly five (5) discussion questions designed specifically for authentic and meaningful small group conversations. Each question must:

* Be clear, concise, and conversational—avoiding overly formal language, complex structures, or excessive length.
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

---

## **Appendix: Key Scriptures**

* List each key scripture referenced in the sermon fully and clearly, using the NIV translation (unless another translation is explicitly requested or provided).
* Clearly format each scripture using markdown quote formatting for readability.
* Separate each scripture clearly with headings or spacing.

---

**Additional Notes:**

* Fully incorporate all explicit and implicit instructions from previous user feedback, emphasizing simplicity, sensitivity, warmth, and clarity suitable for diverse small group discussions.
* Avoid previously corrected issues (e.g., overly formal or lengthy questions, unclear references, insensitive phrasing).
* Provide this toolkit as a complete, ready-to-use markdown-formatted document requiring no additional editing or formatting from the user.

---

**Example of an Excellent Toolkit:**

# **Small Group Toolkit: Luke 10:17–24**

## **Summary**

In this week's sermon, Matt unpacked **Luke 10:17–24**, exploring the deep and lasting joy that comes from being united with Christ. The seventy-two disciples had just returned from their mission, excited and energised by what they had seen—healings, deliverance, and people receiving the message. Jesus rejoiced with them but pointed them to a deeper truth: *"Don't rejoice that the spirits submit to you, but rejoice that your names are written in heaven."*

Matt reminded us that while it's good to celebrate God at work in visible ways, our true source of joy must be rooted in grace—**that we belong to God, that we are known and secure in Him.** The sermon brought great encouragement and perspective to those who may feel spiritually 'ordinary.' Jesus uses everyday obedience, the quiet and unseen moments of faithfulness, to break the power of the enemy and advance His kingdom.

Through this lens, Matt challenged us to reject the lie that our lives are insignificant. Whether we're studying, working, parenting, praying alone in our room, or simply showing up—**we are doing spiritual warfare**. The enemy is terrified of a Christian who prays, who speaks the name of Jesus, and who lives with the quiet confidence of their position in heaven.

He also warned against the trap of pride when things go well and discouragement when they don't. If our joy depends on our success, it will be unstable. But if it's rooted in the fact that our names are written in heaven, it will endure.

Matt finished by inviting us to ask the most important question: *"Is your name written in heaven?"* Not: "Are you religious?" or "Do you attend church?" But: "Do you trust Jesus with childlike faith?" For those who do, communion becomes not a ritual, but a joyful celebration of Christ's love and grace. A reminder that we are saved, secure, and sent out.

---

## **Key Points**

- **The deepest source of our joy** is not our ministry success but the fact that our names are written in heaven.
- **Ordinary obedience carries spiritual weight.** Small, quiet acts of faithfulness shake the kingdom of darkness.
- **Jesus gives us real authority.** As we live for Him, He backs us with power that scares the enemy.
- **We must guard against both pride and discouragement.** They can both shift our joy away from grace.
- **Salvation is a miracle of grace.** We come to Jesus like children—trusting, humble, and surrendered.

---

## **Discussion Questions**

1. **Opening question**
    
    *Can anyone share how knowing you're saved has made a real difference in your daily life?*
    
2. **Reflection question**
    
    *What ordinary or everyday tasks might feel more important if you saw them as meaningful to God?*
    
3. **Vulnerability question**
    
    *Is anyone willing to share about a time you felt either proud or discouraged in your faith? Did you learn anything helpful?*
    
4. **Practical application**
    
    *How can we keep our joy rooted in heaven, even when life here feels up and down?*
    
5. **Personal reflection & sharing**
    
    *Think of one place or situation in your life where God has intentionally put you. Let's each share at least one example.*
    

---

## **Appendix: Key Scriptures**

**Luke 10:17–24 (NIV)**

> The seventy-two returned with joy and said, "Lord, even the demons submit to us in your name."
> 
> 
> He replied, "I saw Satan fall like lightning from heaven. I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy; nothing will harm you.
> 
> However, do not rejoice that the spirits submit to you, but rejoice that your names are written in heaven."
> 
> At that time Jesus, full of joy through the Holy Spirit, said, "I praise you, Father, Lord of heaven and earth, because you have hidden these things from the wise and learned, and revealed them to little children. Yes, Father, for this is what you were pleased to do.
> 
> All things have been committed to me by my Father. No one knows who the Son is except the Father, and no one knows who the Father is except the Son and those to whom the Son chooses to reveal him."
> 
> Then he turned to his disciples and said privately, "Blessed are the eyes that see what you see. For I tell you that many prophets and kings wanted to see what you see but did not see it, and to hear what you hear but did not hear it."
> 

---

**Romans 10:9 (NIV)**

> "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved."
> 

---

**Ephesians 2:6–7 (NIV)**

> "And God raised us up with Christ and seated us with him in the heavenly realms in Christ Jesus,
> 
> 
> in order that in the coming ages he might show the incomparable riches of his grace, expressed in his kindness to us in Christ Jesus."
> 

---

**Matthew 28:18–20 (NIV)**

> Then Jesus came to them and said, "All authority in heaven and on earth has been given to me.
> 
> 
> Therefore go and make disciples of all nations, baptising them in the name of the Father and of the Son and of the Holy Spirit,
> 
> and teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age."
> 

---

**Psalm 73:25–26 (NIV)**

> "Whom have I in heaven but you? And earth has nothing I desire besides you.
> 
> 
> My flesh and my heart may fail, but God is the strength of my heart and my portion forever."
> 

---

**John 1:16 (NIV)**

> "Out of his fullness we have all received grace in place of grace already given."
> 

---

Create your toolkit following this example's quality, tone, and structure."""

# Initialize additional session state
if 'toolkit' not in st.session_state:
    st.session_state.toolkit = None
if 'toolkit_prompt' not in st.session_state:
    st.session_state.toolkit_prompt = DEFAULT_TOOLKIT_PROMPT_TEMPLATE
if 'preacher_name' not in st.session_state:
    st.session_state.preacher_name = ""

def transcribe_audio(file_path, model="whisper-1"):
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="text",  # Changed back to "text"
        )
        paragraphs = [p.strip() for p in str(transcript).split('\n') if p.strip()]
        return paragraphs

def markdown_to_plain(md: str) -> str:
    html = markdown2.markdown(md)
    text = bs4.BeautifulSoup(html, "html.parser").get_text()
    return text.strip()

# Choose input mode
mode = st.radio(
    "How would you like to provide the sermon content?",
    ("Audio file", "Existing transcript"),
    index=0,
)

uploaded_file = None  # declare for type completeness

if mode == "Audio file":
    # File uploader with dynamic key
    uploaded_file = st.file_uploader(
        "Upload an audio file",
        type=["mp3", "wav", "mpeg", "m4a"],
        key=f"uploader_{st.session_state.upload_counter}",
    )

    if uploaded_file:
        # Start transcription immediately after file upload
        if not st.session_state.transcription:
            with st.spinner("Transcribing audio..."):
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=os.path.splitext(uploaded_file.name)[1]
                ) as tmp_file:
                    tmp_file.write(uploaded_file.getvalue())
                    tmp_file_path = tmp_file.name

                try:
                    # Use whisper-1 model for transcription
                    paragraphs = transcribe_audio(tmp_file_path, "whisper-1")
                    st.session_state.transcription = "\n\n".join(paragraphs)
                finally:
                    os.unlink(tmp_file_path)

if mode == "Existing transcript":
    if not st.session_state.transcription:
        st.info("Upload a transcript file or paste the text below.")
        txt_file = st.file_uploader(
            "Upload transcript (.txt or .md)",
            type=["txt", "md"],
            key="transcript_file_uploader",
        )
        if txt_file is not None:
            st.session_state.transcription = txt_file.read().decode("utf-8")
            st.success("Transcript loaded from file.")

        manual_text = st.text_area(
            "Or paste transcript here", key="manual_transcript_input", height=200
        )
        if st.button("Use Pasted Transcript", disabled=not manual_text.strip()):
            st.session_state.transcription = manual_text.strip()
            st.success("Transcript loaded from pasted text.")

# If we have a transcript, display it and toolkit generator section
if st.session_state.transcription:
    st.text_area("Transcription", st.session_state.transcription, height=300)
    
    # Toolkit section
    st.subheader("Toolkit Generator")
    
    # Preacher's name input (required)
    preacher_name = st.text_input(
        "Preacher's Name *",
        value=st.session_state.preacher_name,
        placeholder="Enter the preacher's name (required)",
        help="This name will be used throughout the toolkit"
    )
    st.session_state.preacher_name = preacher_name
    
    if not preacher_name:
        st.warning("⚠️ Please enter the preacher's name before generating the toolkit.")
    
    # Update the prompt with the preacher's name
    if preacher_name:
        current_prompt = DEFAULT_TOOLKIT_PROMPT_TEMPLATE.format(preacher_name=preacher_name)
    else:
        current_prompt = DEFAULT_TOOLKIT_PROMPT_TEMPLATE.format(preacher_name="[PREACHER'S NAME REQUIRED]")
    
    # Prompt editor
    st.text_area(
        "Toolkit Prompt (editable)",
        key="toolkit_prompt_input",
        value=current_prompt,
        on_change=lambda: st.session_state.update(toolkit_prompt=st.session_state["toolkit_prompt_input"]),
        height=200,
    )
    
    if st.button("Generate Toolkit", type="primary", help="Generate small group toolkit using current prompt and transcription", disabled=not preacher_name):
        with st.spinner("Generating toolkit with OpenAI…"):
            try:
                # Ensure we're using the formatted prompt with the actual preacher's name
                final_prompt = st.session_state.toolkit_prompt_input
                # Double-check that the preacher's name is properly inserted
                if "{preacher_name}" in final_prompt:
                    final_prompt = final_prompt.format(preacher_name=preacher_name)
                
                response = client.responses.create(
                    model="gpt-4o",  # default flagship model
                    instructions=final_prompt,
                    input=st.session_state.transcription,
                )
                # New Responses API returns .output_text shortcut
                output_md = getattr(response, "output_text", None)
                if output_md is None:
                    # Fallback to first output message if shortcut missing
                    output_md = response.output[0].content[0].text  # type: ignore
                st.session_state.toolkit = output_md.strip()
            except Exception as e:
                st.error(f"Error generating toolkit: {e}")
                st.session_state.toolkit = None
    
    # Display toolkit if available
    if st.session_state.toolkit:
        st.markdown("### Generated Toolkit")
        
        # Show the markdown version
        st.markdown(st.session_state.toolkit)
        
        # Create columns for download buttons
        col1, col2 = st.columns(2)
        
        with col1:
            st.download_button(
                label="Download Toolkit (Markdown)",
                data=st.session_state.toolkit,
                file_name="toolkit.md",
                mime="text/markdown",
                use_container_width=True,
            )
        
        with col2:
            plain_toolkit = markdown_to_plain(st.session_state.toolkit)
            st.download_button(
                label="Download Toolkit (Plain Text)",
                data=plain_toolkit,
                file_name="toolkit.txt",
                mime="text/plain",
                use_container_width=True,
            )
    
    # Create two columns with 1:2 ratio
    col1, col2 = st.columns([1, 2])
    
    # Reset button in left column (red)
    with col1:
        if st.button("Reset", 
                    use_container_width=True,
                    type="secondary",  # secondary with custom color
                    help="Clear current transcription and start over"):
            st.session_state.upload_counter += 1
            st.session_state.transcription = None
            st.rerun()

    # Download button in right column (blue)
    with col2:
        if uploaded_file is not None:
            original_filename = os.path.splitext(uploaded_file.name)[0]
            download_filename = f"{original_filename}_transcription.txt"
        else:
            download_filename = "transcription.txt"

        st.download_button(
            label="Download Transcription",
            data=st.session_state.transcription,
            file_name=download_filename,
            mime="text/plain",
            use_container_width=True,
            type="primary",
            help="Download transcription as text file",
        )
        if st.session_state.get('download_clicked', False):
            st.success("✓ Downloaded successfully!")
