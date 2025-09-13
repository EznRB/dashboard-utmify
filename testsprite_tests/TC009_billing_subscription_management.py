import requests
import time

BASE_URL = "http://localhost:3001"
SUBSCRIPTION_ENDPOINT = f"{BASE_URL}/api/v1/billing/subscription"
TIMEOUT = 30

def test_billing_subscription_management():
    headers = {"Content-Type": "application/json"}

    # Helper function to get current subscription details
    def get_subscription():
        try:
            response = requests.get(SUBSCRIPTION_ENDPOINT, headers=headers, timeout=TIMEOUT)
            return response
        except requests.RequestException as e:
            raise AssertionError(f"Request to get subscription failed: {e}")

    # Test retrieving current subscription details
    response_get = get_subscription()
    assert response_get.status_code == 200, f"Expected 200, got {response_get.status_code}"
    json_get = response_get.json()
    assert "plan" in json_get, "Missing 'plan' in subscription details"
    assert "status" in json_get, "Missing 'status' in subscription details"

    # Performance test - measure response time for get subscription under load
    response_times = []
    for _ in range(5):
        start_time = time.time()
        resp = get_subscription()
        duration = time.time() - start_time
        response_times.append(duration)
        assert resp.status_code == 200, f"Expected 200 during performance test, got {resp.status_code}"
    avg_response_time = sum(response_times) / len(response_times)
    assert avg_response_time < 2, f"Average response time too high: {avg_response_time:.2f}s"


test_billing_subscription_management()
