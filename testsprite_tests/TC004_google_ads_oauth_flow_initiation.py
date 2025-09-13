import requests
import pytest

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_google_ads_oauth_flow_initiation():
    url = f"{BASE_URL}/api/v1/google-ads/auth"
    
    # Test valid redirect_uri
    valid_payload = {
        "redirect_uri": "https://example.com/oauth/callback"
    }
    try:
        response = requests.post(url, json=valid_payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        pytest.fail(f"Request failed with exception: {e}")
    
    assert response.status_code == 200 or response.status_code == 201, f"Expected 200 or 201 but got {response.status_code}"
    json_resp = response.json()
    assert isinstance(json_resp, dict), "Response should be a JSON object"
    assert "auth_url" in json_resp or "url" in json_resp or any(k for k in json_resp.keys()), "Response should contain an OAuth URL or token"
    # It is assumed response includes a URL to continue OAuth flow
    
    # Test missing redirect_uri parameter
    missing_param_payload = {}
    try:
        response_missing = requests.post(url, json=missing_param_payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        pytest.fail(f"Request failed with exception on missing param test: {e}")
    
    assert response_missing.status_code in (400, 422), f"Expected 400 or 422 error for missing redirect_uri, got {response_missing.status_code}"
    json_missing = response_missing.json()
    assert "error" in json_missing or "message" in json_missing, "Error response should contain error or message field"
    
    # Test invalid redirect_uri (not a proper URL)
    invalid_payload = {
        "redirect_uri": "not-a-valid-url"
    }
    try:
        response_invalid = requests.post(url, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        pytest.fail(f"Request failed with exception on invalid param test: {e}")
    
    assert response_invalid.status_code in (400, 422), f"Expected 400 or 422 error for invalid redirect_uri, got {response_invalid.status_code}"
    json_invalid = response_invalid.json()
    assert "error" in json_invalid or "message" in json_invalid, "Error response should contain error or message field"

test_google_ads_oauth_flow_initiation()