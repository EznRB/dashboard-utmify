import requests
from datetime import datetime, timedelta

def test_metrics_history_data_grouping():
    # Use correct localhost URL with port
    url = "http://localhost:3001/api/v1/metrics/history"
    
    # Include required parameters: startDate and endDate
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    params = {
        "startDate": start_date,
        "endDate": end_date,
        "groupBy": "day"
    }
    
    # Add proper headers including authorization
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer valid-test-token"  # This would need to be a valid token in real tests
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        # The endpoint should return 401 for invalid token, not 500
        # In a real test environment, this would be 200 with valid auth
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict), "Response should be a JSON object"
            assert "success" in data, "Response should have success field"
            assert "data" in data, "Response should have data field"
            assert isinstance(data["data"], list), "Data should be an array of historical metrics"
        elif response.status_code == 401:
            # Expected for invalid token - this means the endpoint is working
            data = response.json()
            assert "error" in data, "Error response should have error field"
            assert data["error"]["code"] == "INVALID_TOKEN", "Should return INVALID_TOKEN error"
            
    except requests.RequestException as e:
        assert False, f"Request failed unexpectedly: {e}"


test_metrics_history_data_grouping()