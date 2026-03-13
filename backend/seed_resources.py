import requests
import json

API_URL = "http://localhost:5000/api/resources"

resources = [
    {
        "name": "Central High Shelter",
        "type": "shelter",
        "status": "deployed",
        "lat": 19.0760,
        "lng": 72.8777,
        "is_public": True
    },
    {
        "name": "Mobile Medical Unit 1",
        "type": "medical",
        "status": "active",
        "lat": 19.0800,
        "lng": 72.8800,
        "is_public": True,
        "description": "Emergency triage and first aid"
    },
    {
        "name": "Water Distribution Point A",
        "type": "food_water",
        "status": "deployed",
        "lat": 19.0700,
        "lng": 72.8700,
        "is_public": True
    },
    {
        "name": "Police Command Van",
        "type": "police",
        "status": "active",
        "lat": 19.0750,
        "lng": 72.8750,
        "is_public": False # Should not show in public map
    }
]

def seed_resources():
    print("🌱 Seeding public resources...")
    for res in resources:
        try:
            response = requests.post(API_URL, json=res)
            if response.status_code == 201:
                print(f"✅ Created: {res['name']}")
            else:
                print(f"❌ Failed: {res['name']} - {response.text}")
        except Exception as e:
            print(f"❌ Error connecting to API: {e}")

if __name__ == "__main__":
    seed_resources()
