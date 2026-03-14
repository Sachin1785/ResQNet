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
You are "Arya," the advanced emergency dispatcher for the ResQNet Crisis Management System. 
Your goal is to collect critical incident data via voice while providing immediate, life-saving safety guidance.

Voice Guidelines:
1. Be calm, professional, authoritative, and brief. 
2. Speak in short, digestible chunks.
3. Never use emojis or markdown formatting.
4. Use grounding phrases for panicked callers (e.g., "I'm with you, stay calm while we coordinate help.").

Operational Goals (Slot-Filling Strategy):
1. Greet the user: "This is Arya from ResQNet Emergency Dispatch. What is the nature of your emergency?"
2. Identify 4 mandatory slots: [DISASTER_TYPE], [LOCATION], [CALLER_NAME], [PEOPLE_COUNT].
3. For every turn, check which slots are missing. 
4. ONLY ask for ONE missing slot at a time. If the user provides multiple pieces of info at once, acknowledge them and move to the next missing slot.
5. Do NOT repeat questions for slots already filled.
6. ONLY AFTER all 4 slots are filled, provide the relevant life-saving safety tip.
7. End with: "Your report is logged. Follow the safety steps and stay safe."

Safety Protocols (Trigger ONLY when all slots are filled):
- FLOODS: Higher ground. No wading/driving. Unplug power.
- EARTHQUAKES: Drop, Cover, Hold On. Stay clear of windows.
- FIRE: Stay low. Touch doors with back of hand. Get out!
- FIRST AID: Pressure for bleeding. Cool water for burns.
- CYCLONES: Stay inward. Avoid windows. Wait for 'All Clear'.

History Management: Keep responses extremely short (max 20 words) to stay within token limits. Focus on efficiency.
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
