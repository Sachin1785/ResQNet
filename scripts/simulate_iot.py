import requests
import json
import time
import random
from datetime import datetime

# Configuration
SERVER_URL = "http://localhost:5000/api/iot/stream"

# Sample System IDs to simulate
SYSTEM_IDS = ["SN_FIRE_001", "SN_GAS_A1", "SN_WATER_01"]

def get_mock_data(system_id):
    """Generate random sensor data for simulation"""
    # Randomly oscillate values
    data = {
        "systemid": system_id,
        "gas": round(random.uniform(200, 450), 2),      # Threshold: 400
        "temp": round(random.uniform(25, 55), 2),      # Threshold: 50
        "water": round(random.uniform(0, 25), 2),       # Threshold: 20
        "acceleration": round(random.uniform(0, 0.5), 2), # Threshold: 2.0
        "timestamp": datetime.utcnow().isoformat()
    }
    return data

def run_simulation(duration_seconds=60, interval=2):
    print(f"🚀 Starting Hackfusion IoT Simulation...")
    print(f"🔗 Target: {SERVER_URL}")
    print(f"⏱️ Duration: {duration_seconds}s | Interval: {interval}s")
    print("-" * 50)
    
    start_time = time.time()
    
    try:
        while time.time() - start_time < duration_seconds:
            for system_id in SYSTEM_IDS:
                payload = get_mock_data(system_id)
                
                # Intermittently trigger a breach for testing
                if random.random() > 0.8:
                    payload['gas'] = 850.0 # Extreme gas leak
                    print(f"🔥 [ALERT SIM] Triggering Gas Breach for {system_id}")
                
                try:
                    response = requests.post(SERVER_URL, json=payload, timeout=5)
                    if response.status_code == 200:
                        res_json = response.json()
                        alerts = res_json.get('alerts_triggered', 0)
                        status = "🚨 ALERT!" if alerts > 0 else "✅ OK"
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] {system_id}: {status} (Gas: {payload['gas']})")
                    else:
                        print(f"❌ Server Error: {response.status_code}")
                except Exception as e:
                    print(f"❌ Connection Error: {e}")
                
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n🛑 Simulation stopped by user.")

    print("-" * 50)
    print("🏁 Simulation finished.")

if __name__ == "__main__":
    run_simulation()
