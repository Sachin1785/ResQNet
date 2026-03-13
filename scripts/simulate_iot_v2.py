import requests
import json
import time
import random
from datetime import datetime

# Configuration
# Use the local URL or your ngrok URL for testing
SERVER_URL = "http://localhost:5000/api/iot/stream"

# Sample System IDs
SYSTEM_IDS = ["system1A", "system2B"]

def get_mock_sensor_data(system_id):
    """Generate mock data matching the ESP32 JSON format"""
    # Base values
    temp = 30.5 + random.uniform(-1, 1)
    pressure = 984.0 + random.uniform(-0.5, 0.5)
    altitude = 245.0 + random.uniform(-1, 1)
    gas_v = 1.9 + random.uniform(-0.1, 0.2)
    rain = 15 + random.uniform(-2, 5)
    
    # Gravity (Normal is ~9.8 on Z)
    ax = random.uniform(-0.3, 0.3)
    ay = random.uniform(-0.3, 0.3)
    az = 9.8 + random.uniform(-0.2, 0.2)
    
    # Occasionally trigger alerts
    if random.random() > 0.95:
        gas_v = 3.2 # Gas Leak
        print(f"🔥 [SIM] Triggering GAS ALERT for {system_id}")
    
    if random.random() > 0.98:
        az = 22.5 # Violent Earthquake/Impact
        print(f"🏠 [SIM] Triggering SEISMIC ALERT for {system_id}")

    return {
        "system_id": system_id,
        "temperature": round(temp, 2),
        "pressure": round(pressure, 2),
        "altitude": round(altitude, 2),
        "accel_x": round(ax, 3),
        "accel_y": round(ay, 3),
        "accel_z": round(az, 3),
        "gas_voltage": round(gas_v, 2),
        "water_level": random.randint(0, 5),
        "rain_level": round(rain, 2)
    }

def run_simulation():
    print(f"🛰️  ESP32-Pi Hybrid Simulator Running...")
    print(f"🔗 Target: {SERVER_URL}")
    print("-" * 50)
    
    try:
        while True:
            for sid in SYSTEM_IDS:
                payload = get_mock_sensor_data(sid)
                try:
                    res = requests.post(SERVER_URL, json=payload, timeout=5)
                    status = "OK" if res.status_code == 200 else f"ERR {res.status_code}"
                    alert_count = res.json().get('alerts_triggered', 0) if res.status_code == 200 else 0
                    
                    alert_tag = f"🚨 {alert_count} ALERTS!" if alert_count > 0 else "🟢 Clear"
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] {sid}: {status} | {alert_tag} | Gas: {payload['gas_voltage']}V | Impact: {payload['accel_z']}m/s2")
                except Exception as e:
                    print(f"❌ Connection failed: {e}")
                
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Simulation stopped.")

if __name__ == "__main__":
    run_simulation()
