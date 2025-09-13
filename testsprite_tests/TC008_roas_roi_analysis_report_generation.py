import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_roas_roi_analysis_report_generation():
    endpoint = f"{BASE_URL}/api/v1/roas-roi/analysis"
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer testtoken"
    }

    # 1. Successful request with valid date range
    params_valid = {
        "startDate": "2024-01-01",
        "endDate": "2024-01-31"
    }
    try:
        response = requests.get(endpoint, headers=headers, params=params_valid, timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        assert isinstance(data, dict), "Response should be a JSON object"
        # Validate keys related to report data presence (example keys based on typical ROAS/ROI report structure)
        assert "report" in data or "analysis" in data, "Response should contain report or analysis data"
    except requests.RequestException as e:
        assert False, f"Request with valid dates failed: {e}"

    # 2. Missing startDate parameter
    params_missing_start = {
        "endDate": "2024-01-31"
    }
    response = requests.get(endpoint, headers=headers, params=params_missing_start, timeout=TIMEOUT)
    # Expecting 400 or 422 for missing required date param or proper error message
    assert response.status_code in (400, 422), f"Expected 400 or 422 for missing startDate, got {response.status_code}"

    # 3. Missing endDate parameter
    params_missing_end = {
        "startDate": "2024-01-01"
    }
    response = requests.get(endpoint, headers=headers, params=params_missing_end, timeout=TIMEOUT)
    assert response.status_code in (400, 422), f"Expected 400 or 422 for missing endDate, got {response.status_code}"

    # 4. Invalid date format for startDate
    params_invalid_start = {
        "startDate": "invalid-date",
        "endDate": "2024-01-31"
    }
    response = requests.get(endpoint, headers=headers, params=params_invalid_start, timeout=TIMEOUT)
    assert response.status_code in (400, 422), f"Expected 400 or 422 for invalid startDate format, got {response.status_code}"

    # 5. Invalid date format for endDate
    params_invalid_end = {
        "startDate": "2024-01-01",
        "endDate": "invalid-date"
    }
    response = requests.get(endpoint, headers=headers, params=params_invalid_end, timeout=TIMEOUT)
    assert response.status_code in (400, 422), f"Expected 400 or 422 for invalid endDate format, got {response.status_code}"

test_roas_roi_analysis_report_generation()
