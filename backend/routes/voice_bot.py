from flask import Blueprint, request, jsonify, current_app
import os
from groq import Groq
from elevenlabs.client import ElevenLabs
import base64
from dotenv import load_dotenv

voice_bot_bp = Blueprint('voice_bot', __name__)
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Bella
GROQ_MODEL = "llama-3.1-8b-instant"

client = Groq(api_key=GROQ_API_KEY)
el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

SYSTEM_PROMPT = """
You are Arya, the ResQNet Emergency Dispatcher. 
Your ONLY goal is to collect 3 specific pieces of information (slots) from the user:
1. DISASTER_TYPE
2. LOCATION
3. PEOPLE_COUNT

STRICT RULES:
- Read the entire chat history carefully to see what the user has already told you.
- NEVER ask for information you already have.
- Ask for EXACTLY ONE missing piece of information at a time.
- KEEP RESPONSES UNDER 15 WORDS.

STATE MACHINE LOGIC (Follow this strictly):
- If the user hasn't said what the emergency is, ask: "This is Arya Dispatch. What is your emergency?"
- If you know the emergency, but NOT the location, ask: "What is your current location?"
- If you know the emergency AND location, but NOT the number of people, ask: "How many people are with you?"
- If the user answers multiple things at once, move to the next unknown slot.

ONCE ALL 3 SLOTS ARE KNOWN:
Stop asking questions. Give ONE brief safety tip based on the disaster, then say EXACTLY: "Your report has been recorded. Help is being coordinated. Stay safe."

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

    # Build messages for Groq
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        messages.append(msg)
    messages.append({"role": "user", "content": user_text})

    try:
        # 1. Get AI Response text
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.5,
            max_tokens=150
        )
        response_text = completion.choices[0].message.content

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
            'history': messages[1:] + [{"role": "assistant", "content": response_text}]
        })

    except Exception as e:
        print(f"Error in voice bot: {e}")
        return jsonify({'error': str(e)}), 500
