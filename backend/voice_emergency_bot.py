import os
import time
import threading
import queue
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import speech_recognition as sr
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "YOUR_ELEVENLABS_API_KEY")

VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Bella (Calm, Professional) - You can change this
GEMINI_MODEL = "gemini-flash-latest" # Using Flash for fast dispatch responses

# System Prompt for Arya Dispatcher
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

class VoiceBot:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
        # Initialize Gemini
        if not GEMINI_API_KEY:
            print("⚠️ Warning: No GEMINI_API_KEY found.")
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Initialize Chat History
        self.messages = []
        
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
        """Sends text to Gemini and gets a response."""
        try:
            # Build contents history for Gemini using native roles, ensuring perfect alternation
            contents = []
            for msg in self.messages:
                role = "user" if msg['role'] == "user" else "model"
                
                if contents and contents[-1].role == role:
                    contents[-1].parts.append(types.Part.from_text(text="\n" + msg['content']))
                else:
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg['content'])]
                    ))
                    
            # Add current user message
            if contents and contents[-1].role == "user":
                contents[-1].parts.append(types.Part.from_text(text="\n" + text))
            else:
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=text)]
                ))
            
            response_text = ""
            # Using the stream as requested in snippet
            for chunk in self.client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.5,
                ),
            ):
                if chunk.text:
                    response_text += chunk.text
            
            self.messages.append({"role": "user", "content": text})
            self.messages.append({"role": "model", "content": response_text})
            
            return response_text
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
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
        print("🚀 Arya Emergency Voice Bot (Gemini Powered) is Active.")
        print("-----------------------------------------------------")
        
        # Initial greeting
        initial_greeting = "This is Arya from the ResQNet Emergency Dispatch. What is the nature of your emergency?"
        self.speak(initial_greeting)
        
        while True:
            user_input = self.listen()
            if user_input:
                ai_text = self.get_ai_response(user_input)
                self.speak(ai_text)
                
                # Check if incident is resolved/logged
                if "report has been recorded" in ai_text.lower():
                    print("\n✅ Incident Logged. Ending call.")
                    break
            
            time.sleep(0.1)

if __name__ == "__main__":
    bot = VoiceBot()
    bot.run()
