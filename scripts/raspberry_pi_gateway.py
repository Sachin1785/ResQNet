import serial
import json
from datetime import datetime
import requests
import time

# --- CONFIGURATION ---
# The Serial port where your ESP32 is connected (usually /dev/ttyACM0 or /dev/ttyUSB0)
SERIAL_PORT = "/dev/ttyACM0"
BAUD_RATE = 115200

# Your ngrok URL from the dashboard
SERVER_URL = "https://mostly-unbiased-ladybird.ngrok-free.app/api/iot/stream"

print(f"🚀 Hackfusion IoT Gateway Hub Starting...")
print(f"🔗 Target Server: {SERVER_URL}")
print(f"🔌 Monitoring Serial: {SERIAL_PORT} @ {BAUD_RATE}")

# Initialize Serial Connection
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
except Exception as e:
    print(f"❌ Error: Could not open serial port {SERIAL_PORT}: {e}")
    print("💡 Tip: Try running 'sudo usermod -a -G dialout $USER' and rebooting.")
    exit(1)

while True:
    try:
        # Read a line from ESP32
        line = ser.readline().decode('utf-8').strip()

        if not line:
            continue

        # 1. Parse JSON from ESP32
        # Expected format: {"system_id":"...", "temperature":..., "gas_voltage":..., etc.}
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            print(f"⚠️ Invalid JSON ignored: {line}")
            continue

        # 2. Add Gateway Metadata
        data["timestamp"] = datetime.utcnow().isoformat()
        data["gateway_id"] = "RPI_GATEWAY_HQ"

        print(f"📡 Serial Data: {line}")

        # 3. Forward to Hackfusion Backend
        try:
            response = requests.post(SERVER_URL, json=data, timeout=8)
            
            if response.status_code == 200:
                res_body = response.json()
                alerts = res_body.get('alerts_triggered', 0)
                if alerts > 0:
                    print(f"🚨 CRITICAL: {alerts} alert(s) triggered on server!")
                else:
                    print(f"✅ Data forwarded successfully.")
            elif response.status_code == 201:
                print(f"✨ New IoT Node Registered & Data Forwarded.")
            else:
                print(f"❌ Server Error ({response.status_code}): {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"📡 Network Error: Backend unreachable. (Check ngrok or Internet)")

    except KeyboardInterrupt:
        print("\n🛑 Gateway stopped by user.")
        break
    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")
        time.sleep(1) # Wait a bit before retrying
