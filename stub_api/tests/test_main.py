import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_admin_health():
    response = client.get("/api/v1/admin/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"

def test_outcome_predict():
    response = client.post(
        "/api/v1/outcome/predict",
        json={
            "case_type": "contract_dispute",
            "jurisdiction": "California",
            "key_facts": ["breach of contract"],
            "judge_id": "judge_123"
        },
        headers={"Authorization": "Bearer test-admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "outcome_probabilities" in data
    assert "caseId" in data
    assert "precedents" in data

def test_caselaw_judge_analysis():
    response = client.post(
        "/api/v1/caselaw/judge-analysis",
        json={"judge_name": "Smith", "limit": 1},
        headers={"Authorization": "Bearer test-admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "analysis" in data
    assert "cached" in data

def test_simulation_run():
    response = client.post(
        "/api/v1/simulation/run",
        json={
            "case_id": "test_case",
            "strategy": "aggressive litigation",
            "opponent_type": "judge",
            "simulation_parameters": {"court_type": "district"}
        },
        headers={"Authorization": "Bearer test-admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "success_rate" in data
    assert 0.1 <= data["success_rate"] <= 0.95

def test_trends_forecast():
    response = client.get(
        "/api/v1/trends/forecast?industry=tech&jurisdictions=US&time_horizon=2_years",
        headers={"Authorization": "Bearer test-admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "predicted_changes" in data
    assert "impact_analysis" in data

def test_jurisdiction_optimize():
    response = client.get(
        "/api/v1/jurisdiction/optimize?case_type=contract_dispute&key_facts=breach&preferred_outcome=win",
        headers={"Authorization": "Bearer test-admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommended_jurisdictions" in data
    assert len(data["recommended_jurisdictions"]) > 0
