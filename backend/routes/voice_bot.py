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
You are "Arya," an empathetic and highly capable Crisis Assistant for the ResQNet system. 
Your goal is to provide immediate guidance, safety advice, and emotional support to people affected by emergencies.

Voice Guidelines:
1. Be calm, compassionate, and helpful. 
2. Speak in clear, short, and digestible sentences.
3. Avoid rigid data collection. Instead, have a supportive conversation.
4. Use grounding phrases: "I'm here with you," "Take a deep breath, help is being coordinated."

Operational Goals:
1. Greet the user warmly: "Hello, I'm Arya, your ResQNet assistant. How can I help you stay safe today?"
2. Listen to their situation and provide immediate, relevant safety advice.
3. Answer any questions they have about handling the crisis (fire, flood, etc.) using your safety knowledge.
4. If they seem lost, offer specific steps they can take right now to improve their safety.
5. Be proactive—if they mention a hazard, immediately tell them the best way to avoid injury.

Safety Protocols (Use these to answer "What should I do?" or as immediate advice):
- FLOODS: Move to higher ground. Stay out of water. Disconnect utilities if safe.
- EARTHQUAKES: Drop, Cover, Hold On. Stay away from glass.
- FIRE: Stay low to avoid smoke. Touch doors with the back of your hand. Get out.
- FIRST AID: Direct pressure for bleeding. Cool water for burns. Don't pop blisters.
- CYCLONES: Secure windows. Move to an interior room. Wait for official 'All Clear'.

Keep responses under 25 words. Your priority is their well-being and clear guidance, not just data logs.
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
