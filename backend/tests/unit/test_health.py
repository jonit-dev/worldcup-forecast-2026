from wc_forecast.api.app import create_app


def test_should_return_ok_when_health_endpoint_is_called():
    app = create_app()

    response = app.test_client().get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
