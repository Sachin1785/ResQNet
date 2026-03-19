from flask import Blueprint, request, jsonify, current_app
import os
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs
import base64
from dotenv import load_dotenv

voice_bot_bp = Blueprint('voice_bot', __name__)
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Bella
GEMINI_MODEL = "gemini-flash-latest"

client = genai.Client(api_key=GEMINI_API_KEY)
el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

SYSTEM_PROMPT = """
You are Arya, the ResQNet Emergency Dispatcher. 
Your goal is to understand the user's emergency situation, gather necessary details, and provide a single relevant safety tip.

STRICT RULES:
- Ask relevant follow up questions to gather critical information (e.g., nature of emergency, location, number of people).
- READ THE CHAT HISTORY. NEVER repeat a question for information the user has already provided. If they said there's a fire, do NOT ask what their emergency is again.
- Ask only ONE follow up question at a time.
- Keep your responses short and concise.
- If the user says exactly "START_DISPATCH_SESSION", greet them and ask what the emergency is.

LOGIC:
- Assess what information is still missing to properly document the emergency.
- Once you are satisfied you have gathered enough information, stop asking questions. Provide ONE brief safety tip based on the disaster, and conclude by saying EXACTLY: "Your report has been recorded. Help is being coordinated. Stay safe."

Safety Tip Cheat Sheet:
- Fire: Stay low. Touch doors with back of hand. Get out.
- Flood: Move to higher ground. Avoid water.
- Medical: Apply pressure to bleeding. Stay calm.
- Earthquake: Drop, Cover, Hold On. Stay away from glass.
"""

@voice_bot_bp.route('/voice-bot/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_text = data.get('text')
    history = data.get('history', []) # List of {role, content}

    if not user_text:
        return jsonify({'error': 'No text provided'}), 400

    # Build contents from history. Gemini requires strictly alternating user/model roles.
    contents = []
    for msg in history:
        role = "user" if msg['role'] == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg['content'])]
        ))

    # ALWAYS add the current user message as a brand new Content object.
    # Never merge with the previous entry — that collapses turns and kills context.
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_text)]
    ))

    try:
        # 1. Get AI Response text
        response_text = ""
        for chunk in client.models.generate_content_stream(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.5,
            ),
        ):
            if chunk.text:
                response_text += chunk.text

        # 2. Convert to Speech
        audio_generator = el_client.text_to_speech.convert(
            text=response_text,
            voice_id=VOICE_ID,
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )

        # Collect audio chunks into a single byte string
        audio_bytes = b"".join(audio_generator)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        return jsonify({
            'text': response_text,
            'audio': audio_base64,
            'history': history + [
                {"role": "user", "content": user_text},
                {"role": "model", "content": response_text}  # 'model' not 'assistant' for correct round-trip
            ]
        })

    except Exception as e:
        print(f"Error in voice bot: {e}")
        return jsonify({'error': str(e)}), 500
