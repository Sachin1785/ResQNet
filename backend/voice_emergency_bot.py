import os
import time
import threading
import queue
from groq import Groq
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import speech_recognition as sr
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "YOUR_ELEVENLABS_API_KEY")

VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Bella (Calm, Professional) - You can change this
GROQ_MODEL = "llama-3.1-8b-instant"

# System Prompt for Arya Dispatcher
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

class VoiceBot:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Initialize Groq
        if not GROQ_API_KEY:
            print("⚠️ Warning: No GROQ_API_KEY found.")
        self.client = Groq(api_key=GROQ_API_KEY)
        
        # Initialize Chat History
        self.messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Initialize ElevenLabs Client
        if not ELEVENLABS_API_KEY:
            print("⚠️ Warning: No ElevenLabs API Key found.")
        self.el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    def listen(self):
        """Captures audio from microphone and converts to text."""
        with self.microphone as source:
            print("\n📡 Listening...")
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                print("🧠 Processing speech...")
                text = self.recognizer.recognize_google(audio)
                print(f"👤 User: {text}")
                return text
            except sr.WaitTimeoutError:
                return None
            except sr.UnknownValueError:
                print("❌ Could not understand audio")
                return None
            except Exception as e:
                print(f"❌ Error during listening: {e}")
                return None

    def get_ai_response(self, text):
        """Sends text to Groq and gets a response."""
        try:
            self.messages.append({"role": "user", "content": text})
            
            completion = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=self.messages,
                temperature=0.5,
                max_tokens=100,
                top_p=1,
                stream=False,
                stop=None,
            )
            
            response_text = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": response_text})
            
            return response_text
        except Exception as e:
            print(f"❌ Groq Error: {e}")
            return "I am having trouble connecting. Please hold."

    def speak(self, text):
        """Converts text to speech using ElevenLabs and plays it."""
        print(f"🎙️ Atlas: {text}")
        try:
            audio = self.el_client.text_to_speech.convert(
                text=text,
                voice_id=VOICE_ID,
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
            )
            play(audio)
        except Exception as e:
            print(f"❌ ElevenLabs Error: {e}")
            # Fallback to pure print if TTS fails
            pass

    def run(self):
        print("🚀 Arya Emergency Voice Bot (Groq Powered) is Active.")
        print("-----------------------------------------------------")
        
        # Initial greeting
        initial_greeting = "Hello, I'm Arya, your ResQNet assistant. How can I help you stay safe today?"
        self.speak(initial_greeting)
        
        while True:
            user_input = self.listen()
            if user_input:
                ai_text = self.get_ai_response(user_input)
                self.speak(ai_text)
                
                # Check if incident is resolved/logged
                if "report has been logged" in ai_text.lower():
                    print("\n✅ Incident Logged. Ending call.")
                    break
            
            time.sleep(0.1)

if __name__ == "__main__":
    bot = VoiceBot()
    bot.run()
