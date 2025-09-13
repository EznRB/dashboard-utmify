import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/v1/auth/login"
TIMEOUT = 30

def test_user_login_functionality():
    url = BASE_URL + LOGIN_ENDPOINT
    headers = {
        "Content-Type": "application/json"
    }

    # Valid credentials (Assuming these valid credentials exist in the system)
    valid_payload = {
        "email": "validuser@example.com",
        "password": "ValidPassword123"
    }

    # Invalid credentials
    invalid_payload = {
        "email": "invaliduser@example.com",
        "password": "WrongPassword"
    }

    # Test successful login with valid credentials
    try:
        response_valid = requests.post(url, headers=headers, json=valid_payload, timeout=TIMEOUT)
        assert response_valid.status_code == 200, f"Expected 200, got {response_valid.status_code}"
        json_response = response_valid.json()
        # Assuming response contains a JWT token on success
        assert "token" in json_response or "accessToken" in json_response, "Missing token in successful login response"
    except requests.RequestException as e:
        assert False, f"Request exception on valid login test: {e}"

    # Test login failure with invalid credentials
    try:
        response_invalid = requests.post(url, headers=headers, json=invalid_payload, timeout=TIMEOUT)
        assert response_invalid.status_code in (400, 401), f"Expected 400 or 401, got {response_invalid.status_code}"
        json_response_invalid = response_invalid.json()
        # Assuming error message is returned
        assert "error" in json_response_invalid or "message" in json_response_invalid, "Error message expected in invalid login response"
    except requests.RequestException as e:
        assert False, f"Request exception on invalid login test: {e}"

test_user_login_functionality()