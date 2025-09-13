import requests

BASE_URL = "http://localhost:3001"
UTM_CREATE_URL = f"{BASE_URL}/api/v1/utm/create"
TIMEOUT = 30

def test_utm_link_creation_and_validation():
    headers = {
        "Content-Type": "application/json"
    }

    # Test case 1: Valid UTM link creation with minimal required parameter originalUrl
    valid_payload_minimal = {
        "originalUrl": "https://www.example.com"
    }
    response = requests.post(UTM_CREATE_URL, json=valid_payload_minimal, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 201 or response.status_code == 200, f"Expected 200 or 201, got {response.status_code}"
    data = response.json()
    assert "utmLink" in data or "shortUrl" in data or "url" in data, "Response missing UTM link creation result"
    # The created UTM link should contain the original URL and any added UTM params if present
    created_url = data.get("utmLink") or data.get("shortUrl") or data.get("url")
    assert valid_payload_minimal["originalUrl"] in created_url, "Created link does not contain original URL"

    # Test case 2: Valid UTM link creation with all UTM parameters
    valid_payload_full = {
        "originalUrl": "https://www.example.com/page",
        "utmSource": "newsletter",
        "utmMedium": "email",
        "utmCampaign": "launch",
        "utmTerm": "testterm",
        "utmContent": "contentA"
    }
    response = requests.post(UTM_CREATE_URL, json=valid_payload_full, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 201 or response.status_code == 200, f"Expected 200 or 201, got {response.status_code}"
    data = response.json()
    created_url_full = data.get("utmLink") or data.get("shortUrl") or data.get("url")
    assert created_url_full is not None, "Response missing UTM link"
    # The returned link should include UTM parameters
    for param in ["utm_source=newsletter", "utm_medium=email", "utm_campaign=launch", "utm_term=testterm", "utm_content=contentA"]:
        assert param in created_url_full.lower(), f"UTM parameter {param} missing in created URL"

    # Test case 3: Invalid URL format in originalUrl
    invalid_payload = {
        "originalUrl": "htp://bad-url"
    }
    response = requests.post(UTM_CREATE_URL, json=invalid_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code >= 400, f"Expected client error status for invalid URL, got {response.status_code}"
    data = response.json()
    # Check if error message mentions invalid URL or is descriptive
    error_keys = ["error", "message", "detail", "errors"]
    assert any(key in data for key in error_keys), "No error message returned for invalid URL"

    # Test case 4: Missing originalUrl (required field)
    missing_url_payload = {
        "utmSource": "newsletter"
    }
    response = requests.post(UTM_CREATE_URL, json=missing_url_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code >= 400, f"Expected client error status for missing originalUrl, got {response.status_code}"
    data = response.json()
    assert any(key in data for key in error_keys), "No error message returned for missing originalUrl"

test_utm_link_creation_and_validation()