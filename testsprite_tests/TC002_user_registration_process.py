import requests
import uuid

BASE_URL = "http://localhost:3001"
REGISTER_ENDPOINT = "/api/v1/auth/register"
TIMEOUT = 30

def test_user_registration_process():
    url = BASE_URL + REGISTER_ENDPOINT
    headers = {"Content-Type": "application/json"}

    # Valid user data for registration
    unique_email = f"user_{uuid.uuid4().hex}@example.com"
    valid_payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "StrongP@ssw0rd!",
        "organizationName": "Test Organization"
    }

    # Test successful registration with valid data
    response = requests.post(url, json=valid_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 201 or response.status_code == 200, f"Expected 201 or 200, got {response.status_code}"
    json_data = response.json()
    # Adjust assertion: check that email in response matches
    assert "email" in json_data and json_data["email"] == unique_email, "Response should contain registered user's email"

    # Test missing required fields iteratively
    for missing_field in ["name", "email", "password", "organizationName"]:
        invalid_payload = dict(valid_payload)
        invalid_payload.pop(missing_field)
        resp = requests.post(url, json=invalid_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 400 or resp.status_code == 422, (
            f"Missing field '{missing_field}' should fail with 400 or 422, got {resp.status_code}"
        )
        err_json = resp.json()
        assert any(missing_field in str(err_json.get("message", "")).lower() for key in err_json), f"Error message should mention missing {missing_field}"

    # Test invalid email format
    invalid_email_payload = dict(valid_payload)
    invalid_email_payload["email"] = "invalid-email-format"
    resp = requests.post(url, json=invalid_email_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400 or resp.status_code == 422, f"Invalid email should fail with 400 or 422, got {resp.status_code}"
    err_json = resp.json()
    assert "email" in str(err_json.get("message", "")).lower(), "Error should indicate invalid email format"

    # Test short password (assuming min length validation)
    short_password_payload = dict(valid_payload)
    short_password_payload["password"] = "123"
    resp = requests.post(url, json=short_password_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400 or resp.status_code == 422, f"Short password should fail with 400 or 422, got {resp.status_code}"
    err_json = resp.json()
    assert "password" in str(err_json.get("message", "")).lower(), "Error should indicate password validation failure"


test_user_registration_process()
