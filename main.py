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
    password_input = st.text_input("Enter application password:", type="password")
    
    if st.button("Login"):
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

# Define default toolkit prompt
DEFAULT_TOOLKIT_PROMPT = (
    "I have attached a transcript of the sermon audio (probably not 100% accurately transcribed)\n\n"
    "Please create a unified toolkit to help small group leaders guide their groups through the sermon content. "
    "The toolkit should be returned in plain text (not markdown) and must include the following sections:\n\n"
    "Summary:\n"
    "• Start with a detailed, multi-paragraph summary of the sermon.\n"
    "  \n"
    "• Follow the summary with a bullet point section that highlights the main points of the sermon, reflecting the key takeaways as presented by the preacher.\n\n"
    "Discussion Questions:\n"
    "• Develop 5-6 insightful and singular discussion questions designed to facilitate meaningful conversation and spiritual growth.\n\n"
    "Appendix:\n"
    "• Conclude with an appendix listing the key scriptures referenced in the sermon in full text."
)

# Initialize additional session state
if 'toolkit' not in st.session_state:
    st.session_state.toolkit = None
if 'toolkit_prompt' not in st.session_state:
    st.session_state.toolkit_prompt = DEFAULT_TOOLKIT_PROMPT

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
    
    # Prompt editor
    st.text_area(
        "Toolkit Prompt (editable)",
        key="toolkit_prompt_input",
        value=st.session_state.toolkit_prompt,
        on_change=lambda: st.session_state.update(toolkit_prompt=st.session_state["toolkit_prompt_input"]),
        height=200,
    )
    
    if st.button("Generate Toolkit", type="primary", help="Generate small group toolkit using current prompt and transcription"):
        with st.spinner("Generating toolkit with OpenAI…"):
            try:
                response = client.responses.create(
                    model="gpt-4o",  # default flagship model
                    instructions=st.session_state.toolkit_prompt,
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
        plain_toolkit = markdown_to_plain(st.session_state.toolkit)
        st.text_area("Toolkit (Plain Text)", plain_toolkit, height=400)
        
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
