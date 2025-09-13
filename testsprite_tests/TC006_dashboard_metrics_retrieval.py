import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Helper function to login and get a JWT token
def get_auth_token(email, password):
    url = f"{BASE_URL}/api/v1/auth/login"
    try:
        response = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        # Token might be in 'token' or 'accessToken' or similar keys - assuming 'accessToken' here
        token = data.get('accessToken') or data.get('token')
        assert token is not None, "No token found in login response"
        return token
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"


def test_dashboard_metrics_retrieval():
    # Use valid user credentials registered in the system for the test
    email = "testuser@example.com"
    password = "testpassword"

    token = get_auth_token(email, password)
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    url = f"{BASE_URL}/api/v1/metrics/dashboard"

    # Success case: valid date range
    params_valid = {
        "startDate": "2025-01-01",
        "endDate": "2025-01-31"
    }
    try:
        response = requests.get(url, headers=headers, params=params_valid, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert isinstance(data, dict), "Response is not a JSON object"
        # Assuming response contains some keys, no specific required keys defined in PRD. Check non-empty
        assert len(data) > 0, "Response data is empty"
    except requests.RequestException as e:
        assert False, f"Request failed for valid dates: {e}"

    # Case: missing dates (no params)
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict), "Response is not a JSON object for missing dates"
        else:
            assert response.status_code in (400, 422), "Expected client error status for missing dates"
    except requests.RequestException as e:
        assert False, f"Request failed for missing dates: {e}"

    # Case: invalid date formats
    params_invalid = {
        "startDate": "invalid-date",
        "endDate": "2025-01-31"
    }
    try:
        response = requests.get(url, headers=headers, params=params_invalid, timeout=TIMEOUT)
        assert response.status_code in (400, 422), f"Expected client error for invalid startDate, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid startDate: {e}"

    params_invalid = {
        "startDate": "2025-01-01",
        "endDate": "31-01-2025"  # wrong format
    }
    try:
        response = requests.get(url, headers=headers, params=params_invalid, timeout=TIMEOUT)
        assert response.status_code in (400, 422), f"Expected client error for invalid endDate, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid endDate: {e}"


test_dashboard_metrics_retrieval()
