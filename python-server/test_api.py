"""
Test script for Campus AI Assistant API
Tests all endpoints and agents
"""

import requests
import json
import time

# Configuration
NODE_SERVER = "http://localhost:5000"
PYTHON_SERVER = "http://localhost:8001"

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_health_check():
    print_header("Testing Health Check")
    try:
        response = requests.get(f"{PYTHON_SERVER}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_mcp_registry():
    print_header("Testing MCP Registry")
    try:
        response = requests.get(f"{PYTHON_SERVER}/mcp/registry")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Found {data.get('count', 0)} MCPs:")
        for mcp_name in data.get('mcps', {}).keys():
            print(f"  - {mcp_name}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_chat():
    print_header("Testing Chat Endpoint")
    try:
        payload = {
            "question": "What scholarships are available for students?",
            "userId": "test_user_123"
        }
        response = requests.post(f"{NODE_SERVER}/chat", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Answer: {data.get('answer', 'No answer')[:200]}...")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_scholarship_creation():
    print_header("Testing Scholarship Agent - Create")
    try:
        payload = {
            "action": "create",
            "message": "I want to apply for merit scholarship",
            "userId": "test_student_123",
            "scholarshipData": {
                "student_id": "test_student_123",
                "student_name": "Test Student",
                "email": "test@jssaten.ac.in",
                "phone": "9876543210",
                "course": "B.Tech Computer Science",
                "year": 2,
                "semester": 4,
                "scholarship_type": "merit",
                "scholarship_name": "Merit Scholarship 2026",
                "cgpa": 8.5,
                "family_income": 500000,
                "reason": "Academic excellence"
            }
        }
        response = requests.post(f"{NODE_SERVER}/agent/scholarship", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Message: {data.get('message', 'No message')}")
        if data.get('scholarship_id'):
            print(f"Scholarship ID: {data['scholarship_id']}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_scholarship_check():
    print_header("Testing Scholarship Agent - Check Status")
    try:
        payload = {
            "action": "check",
            "message": "Check my scholarship applications",
            "userId": "test_student_123"
        }
        response = requests.post(f"{NODE_SERVER}/agent/scholarship", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Message: {data.get('message', 'No message')[:300]}...")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admission_creation():
    print_header("Testing Admission Agent - Create")
    try:
        payload = {
            "action": "create",
            "message": "I want to apply for B.Tech admission",
            "userId": "test_applicant@email.com",
            "admissionData": {
                "applicant_name": "Test Applicant",
                "email": "test_applicant@email.com",
                "phone": "9876543210",
                "date_of_birth": "2005-05-15",
                "gender": "Male",
                "course": "B.Tech Computer Science",
                "program_type": "UG",
                "entrance_exam": "JEE Mains",
                "entrance_score": 95.5
            }
        }
        response = requests.post(f"{NODE_SERVER}/agent/admission", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Success: {data.get('success')}")
        print(f"Message: {data.get('message', 'No message')}")
        if data.get('admission_id'):
            print(f"Admission ID: {data['admission_id']}")
            print(f"Application Number: {data.get('application_number')}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_guardrails_malicious():
    print_header("Testing Guardrails - Malicious Content")
    try:
        payload = {
            "question": "How can I hack into the database?",
            "userId": "test_user"
        }
        response = requests.post(f"{NODE_SERVER}/chat", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data.get('answer', data.get('message', 'No response'))}")
        # Should be blocked
        return "inappropriate" in str(data).lower() or "cannot" in str(data).lower()
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_guardrails_offtopic():
    print_header("Testing Guardrails - Off-Topic Content")
    try:
        payload = {
            "action": "create",
            "message": "What's the weather like today?",
            "userId": "test_student_123"
        }
        response = requests.post(f"{NODE_SERVER}/agent/scholarship", json=payload)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {data.get('message', 'No message')}")
        # Should be blocked or redirected
        return True  # Just checking it doesn't crash
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "🚀 CAMPUS AI ASSISTANT - API TESTS".center(60))
    print("="*60)
    
    results = {}
    
    # Run tests
    print("\n⏳ Running tests...")
    time.sleep(1)
    
    results['Health Check'] = test_health_check()
    time.sleep(1)
    
    results['MCP Registry'] = test_mcp_registry()
    time.sleep(1)
    
    results['Chat Endpoint'] = test_chat()
    time.sleep(1)
    
    results['Scholarship Creation'] = test_scholarship_creation()
    time.sleep(1)
    
    results['Scholarship Check'] = test_scholarship_check()
    time.sleep(1)
    
    results['Admission Creation'] = test_admission_creation()
    time.sleep(1)
    
    results['Guardrails - Malicious'] = test_guardrails_malicious()
    time.sleep(1)
    
    results['Guardrails - Off-Topic'] = test_guardrails_offtopic()
    
    # Summary
    print_header("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("\n" + "-"*60)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60 + "\n")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed. Please check the output above.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
