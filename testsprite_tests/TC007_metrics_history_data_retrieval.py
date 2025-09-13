import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_metrics_history_data_retrieval():
    endpoint = f"{BASE_URL}/api/v1/metrics/history"
    valid_groupbys = ["day", "week", "month"]
    invalid_groupby = "year"

    # Test valid groupBy values
    for groupby in valid_groupbys:
        try:
            response = requests.get(endpoint, params={"groupBy": groupby}, headers=HEADERS, timeout=TIMEOUT)
            assert response.status_code == 200, f"Expected 200 OK for groupBy={groupby}, got {response.status_code}"
            json_data = response.json()
            assert isinstance(json_data, dict) or isinstance(json_data, list), f"Response for groupBy={groupby} should be dict or list"
            # Additional assertions could verify the data grouping shape if schema specifics were given
        except requests.RequestException as e:
            assert False, f"Request failed for groupBy={groupby}: {e}"

    # Test invalid groupBy value
    try:
        response = requests.get(endpoint, params={"groupBy": invalid_groupby}, headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code in (400, 422), f"Expected 400 or 422 for invalid groupBy, got {response.status_code}"
        json_data = response.json()
        assert "error" in json_data or "message" in json_data, "Error response should contain error or message field"
    except requests.RequestException as e:
        assert False, f"Request failed for invalid groupBy={invalid_groupby}: {e}"

test_metrics_history_data_retrieval()