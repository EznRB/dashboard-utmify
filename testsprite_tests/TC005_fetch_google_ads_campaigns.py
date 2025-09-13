import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_fetch_google_ads_campaigns():
    """
    Validate the retrieval of Google Ads campaigns via /api/v1/google-ads/campaigns
    ensuring campaigns are fetched correctly for a valid customer_id and errors
    are handled for invalid or missing IDs.
    """

    endpoint = f"{BASE_URL}/api/v1/google-ads/campaigns"
    headers = {
        "Accept": "application/json"
    }

    # Define a valid customer_id for testing the success scenario.
    # In a real scenario, this would be a known valid ID; here we assume a placeholder.
    valid_customer_id = "1234567890"

    # 1. Test success case with valid customer_id
    try:
        response = requests.get(
            endpoint, 
            headers=headers, 
            params={"customer_id": valid_customer_id}, 
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        # Assuming the response is a JSON object containing a list of campaigns
        assert isinstance(data, dict), "Response JSON should be an object"
        assert "campaigns" in data, "Response JSON should contain 'campaigns' key"
        assert isinstance(data["campaigns"], list), "'campaigns' should be a list"
    except Exception as e:
        assert False, f"Exception during valid customer_id request: {str(e)}"

    # 2. Test error case with missing customer_id (should return an error)
    try:
        response = requests.get(
            endpoint,
            headers=headers,
            timeout=TIMEOUT
        )
        # Assuming API returns 400 or 422 for missing required query param
        assert response.status_code in (400, 422), f"Expected status 400 or 422 for missing customer_id, got {response.status_code}"
        error_data = response.json()
        assert "error" in error_data or "message" in error_data, "Error response should contain error description"
    except Exception as e:
        assert False, f"Exception during missing customer_id request: {str(e)}"

    # 3. Test error case with invalid customer_id (expecting 400 or 404 or similar)
    invalid_customer_id = "invalid_id_!@#"

    try:
        response = requests.get(
            endpoint,
            headers=headers,
            params={"customer_id": invalid_customer_id},
            timeout=TIMEOUT
        )
        assert response.status_code in (400, 404), f"Expected status 400 or 404 for invalid customer_id, got {response.status_code}"
        error_data = response.json()
        assert "error" in error_data or "message" in error_data, "Error response should contain error description"
    except Exception as e:
        assert False, f"Exception during invalid customer_id request: {str(e)}"

test_fetch_google_ads_campaigns()