import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def create_incident():
    print("1. Creating Incident...")
    data = {
        "title": "Test Resolution Incident",
        "type": "fire", 
        "severity": "high",
        "lat": 28.7041,
        "lng": 77.1025,
        "description": "This is a test incident to verify resolution logic."
    }
    res = requests.post(f"{BASE_URL}/incidents", json=data)
    if res.status_code == 201:
        incident_id = res.json()['incident_id']
        print(f"   Success! Incident ID: {incident_id}")
        return incident_id
    else:
        print(f"   Failed: {res.text}")
        return None

def create_responder():
    print("2. Getting/Creating Responder...")
    # Get first available responder or create one for test
    res = requests.get(f"{BASE_URL}/personnel?status=available")
    if res.status_code == 200 and len(res.json()['personnel']) > 0:
        responder = res.json()['personnel'][0]
        print(f"   Found available responder: {responder['name']} (ID: {responder['id']})")
        return responder['id']
    else:
        print("   No available responders found. Please ensure seed data is run.")
        return None

def assign_responder(incident_id, personnel_id):
    print(f"3. Assigning Responder {personnel_id} to Incident {incident_id}...")
    data = {
        "personnel_ids": [personnel_id]
    }
    res = requests.post(f"{BASE_URL}/incidents/{incident_id}/assign", json=data)
    if res.status_code == 200:
        print("   Success! Responder Assigned.")
    else:
        print(f"   Failed to assign: {res.text}")

def check_status(name, entity_type, id):
    if entity_type == 'incident':
        res = requests.get(f"{BASE_URL}/incidents/{id}")
        status = res.json()['incident']['status']
        print(f"   [{name}] Incident Status: {status}")
        return status
    elif entity_type == 'personnel':
        res = requests.get(f"{BASE_URL}/personnel/{id}")
        status = res.json()['personnel']['status']
        assigned_id = res.json()['personnel']['assigned_incident_id']
        print(f"   [{name}] Personnel Status: {status}, Assigned Incident: {assigned_id}")
        return status, assigned_id

def resolve_incident(incident_id, confirm=False):
    action = "Confirming" if confirm else "Submitting"
    print(f"4. {action} Resolution for Incident {incident_id}...")
    
    data = {"confirm": confirm}
    res = requests.post(f"{BASE_URL}/incidents/{incident_id}/resolve", json=data)
    if res.status_code == 200:
        print(f"   Success! {res.json()['message']}")
        print(f"   Released Personnel: {res.json()['released_personnel']}")
    else:
        print(f"   Failed to resolve: {res.text}")

def run_test():
    try:
        # incident_id = create_incident()
        # if not incident_id: return

        # responder_id = create_responder()
        # if not responder_id: return

        incident_id = 2
        responder_id = 1

        check_status("Before Assignment", "personnel", responder_id)
        assign_responder(incident_id, responder_id)
        
        # Verify assignment
        check_status("After Assignment", "incident", incident_id)
        p_status, p_incident = check_status("After Assignment", "personnel", responder_id)
        
        if p_status != 'en-route' or str(p_incident) != str(incident_id):
            print("   ERROR: Assignment failed check.")
            return

        # 1. SUBMIT FOR REVIEW (Responder Action)
        print("   Testing Submission (Responder)...")
        resolve_incident(incident_id, confirm=False)

        # Verify Pending State
        i_status = check_status("After Submission", "incident", incident_id)
        p_status, p_incident = check_status("After Submission", "personnel", responder_id)

        if i_status != 'pending_review':
             print(f"❌ FAILED: Expected incident status 'pending_review', got '{i_status}'")
             return
        
        if p_status == 'available' or p_incident is None:
             print(f"❌ FAILED: Resources should NOT be released yet. Got {p_status}")
             return

        print("   ✅ Submission verified. Incident pending, resources still held.")

        # 2. CONFIRM RESOLUTION (Supervisor Action)
        print("   Testing Confirmation (Supervisor)...")
        resolve_incident(incident_id, confirm=True)

        # Verify Release
        i_status = check_status("After Confirmation", "incident", incident_id)
        p_status, p_incident = check_status("After Confirmation", "personnel", responder_id)

        if i_status == 'resolved' and p_status == 'available' and p_incident is None:
            print("\n✅ TEST PASSED: Incident Resolved and Resources Released.")
        else:
            print("\n❌ TEST FAILED: States didn't update correctly.")
            print(f"Expected: resolved/available/None, Got: {i_status}/{p_status}/{p_incident}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    run_test()
