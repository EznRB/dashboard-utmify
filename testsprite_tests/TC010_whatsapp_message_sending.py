import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Add here a placeholder token for authentication if needed
AUTH_TOKEN = "Bearer sample_valid_token"

def test_whatsapp_message_sending():
    url = f"{BASE_URL}/api/v1/whatsapp/send"
    headers = {"Content-Type": "application/json", "Authorization": AUTH_TOKEN}

    # Valid request payload
    valid_payload = {
        "to": "+12345678901",
        "message": "Test message from automated test."
    }

    # 1. Test sending valid message
    response = requests.post(url, json=valid_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200 OK for valid message, got {response.status_code}"
    resp_json = response.json()
    assert ("success" in resp_json and resp_json["success"] is True) or ("messageId" in resp_json), "Expected success response content"

    # 2. Test missing 'to' field
    payload_missing_to = {
        "message": "Test message without recipient."
    }
    response = requests.post(url, json=payload_missing_to, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400 or response.status_code == 422, f"Expected 400 or 422 for missing 'to', got {response.status_code}"

    # 3. Test missing 'message' field
    payload_missing_message = {
        "to": "+12345678901"
    }
    response = requests.post(url, json=payload_missing_message, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400 or response.status_code == 422, f"Expected 400 or 422 for missing 'message', got {response.status_code}"

    # 4. Test invalid 'to' format (empty string)
    payload_invalid_to = {
        "to": "",
        "message": "Message with invalid recipient"
    }
    response = requests.post(url, json=payload_invalid_to, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400 or response.status_code == 422, f"Expected 400 or 422 for invalid 'to', got {response.status_code}"

    # 5. Test invalid 'message' content (empty string)
    payload_invalid_message = {
        "to": "+12345678901",
        "message": ""
    }
    response = requests.post(url, json=payload_invalid_message, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 400 or response.status_code == 422, f"Expected 400 or 422 for invalid 'message', got {response.status_code}"

test_whatsapp_message_sending()
