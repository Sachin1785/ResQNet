import requests
import time
import json

BASE_URL = "http://localhost:5000/api"

def test_deduplication():
    print("🧪 Starting Deduplication Test...")
    
    # 1. Create Initial Incident
    incident_a = {
        "title": "Test Fire A",
        "type": "fire",
        "severity": "high",
        "lat": 10.0000,
        "lng": 10.0000,
        "description": "Initial fire report"
    }
    
    print("\n1️⃣ Creating Incident A...")
    try:
        response = requests.post(f"{BASE_URL}/incidents", json=incident_a)
        if response.status_code != 201:
            print(f"❌ Failed to create Incident A. Status: {response.status_code}")
            print(response.text)
            return
        
        data_a = response.json()
        id_a = data_a['incident_id']
        print(f"✅ Created Incident A (ID: {id_a})")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is it running?")
        return

    # 2. Create Duplicate Incident (Close location, same type)
    incident_b = {
        "title": "Test Fire B (Duplicate)",
        "type": "fire",
        "severity": "medium",
        "lat": 10.0001,  # Very close
        "lng": 10.0001,
        "description": "Duplicate fire report"
    }
    
    print("\n2️⃣ Creating Incident B (Should be duplicate)...")
    response = requests.post(f"{BASE_URL}/incidents", json=incident_b)
    data_b = response.json()
    
    if response.status_code == 200 and data_b.get('is_duplicate'):
        if data_b['incident_id'] == id_a:
            print(f"✅ Correctly identified as duplicate of ID {id_a}")
        else:
            print(f"❌ Identified as duplicate but wrong ID returned: {data_b['incident_id']}")
    else:
        print(f"❌ Failed to identify duplicate! Status: {response.status_code}")
        print(data_b)


    # 3. Create Non-Duplicate (Different Type)
    incident_c = {
        "title": "Test Flood C",
        "type": "flood",  # Different type
        "severity": "high",
        "lat": 10.0000,
        "lng": 10.0000,
        "description": "Flood report"
    }
    
    print("\n3️⃣ Creating Incident C (Different Type)...")
    response = requests.post(f"{BASE_URL}/incidents", json=incident_c)
    data_c = response.json()
    
    if response.status_code == 201:
        id_c = data_c['incident_id']
        if id_c != id_a:
             print(f"✅ Created new incident C (ID: {id_c}) as expected (different type)")
        else:
             print("❌ Error: Merged different type!")
    else:
        print(f"❌ Failed to create Incident C. Status: {response.status_code}")


    # 4. Check Report Count
    print("\n4️⃣ Checking Report Count for Incident A...")
    response = requests.get(f"{BASE_URL}/incidents/{id_a}")
    if response.status_code == 200:
        incident_data = response.json()['incident']
        count = incident_data.get('report_count')
        print(f"📊 Report Count: {count}")
        if count == 2:
            print("✅ Report count matches expected value (2)")
        else:
            print(f"❌ Unexpected report count: {count} (Expected 2)")
    else:
        print("❌ Failed to fetch incident details")

if __name__ == "__main__":
    test_deduplication()
