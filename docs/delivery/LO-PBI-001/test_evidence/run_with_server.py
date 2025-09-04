import json
import os
import sys
import time
import subprocess
from urllib import request, parse, error

API = os.environ.get('API', 'http://127.0.0.1:8000')
TOKEN = os.environ.get('TOKEN', 'test-admin')
EVID = os.path.join('docs', 'delivery', 'LO-PBI-001', 'test_evidence')

HEADERS = {
    'Authorization': f'Bearer {TOKEN}'
}
JSON_CT = {'Content-Type': 'application/json'}


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def http_get(path: str, headers=None, timeout=10) -> str:
    url = f"{API}{path}"
    req = request.Request(url, headers=headers or {})
    with request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8', errors='replace')


def http_post(path: str, body: dict, headers=None, timeout=15) -> str:
    url = f"{API}{path}"
    data = json.dumps(body).encode('utf-8')
    hdrs = {}
    if headers:
        hdrs.update(headers)
    hdrs.update(JSON_CT)
    req = request.Request(url, data=data, headers=hdrs, method='POST')
    with request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8', errors='replace')


def print_and_save(title: str, content: str, filename: str):
    print(f"=== {title} ===")
    print(content)
    with open(os.path.join(EVID, filename), 'w', encoding='utf-8') as f:
        f.write(content)


def wait_ready(timeout_s=20) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            c = http_get('/api/v1/admin/health')
            if c:
                return True
        except Exception:
            time.sleep(0.5)
    return False


def main():
    ensure_dir(EVID)

    # Start uvicorn server in subprocess
    print('Starting server...')
    proc = subprocess.Popen([
        sys.executable, '-m', 'uvicorn', 'stub_api.main:app', '--host', '127.0.0.1', '--port', '8000'
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    try:
        if not wait_ready(30):
            print('Server not ready, server logs:')
            try:
                out = proc.stdout.read(4096)
                if out:
                    print(out)
            except Exception:
                pass
            raise SystemExit(1)

        # Admin
        c = http_get('/api/v1/admin/health')
        print_and_save('Admin Health', c, 'admin_health.json')

        c = http_get('/api/v1/admin/metrics', headers=HEADERS)
        print_and_save('Admin Metrics', c, 'admin_metrics.json')

        c = http_get('/api/v1/admin/datasets', headers=HEADERS)
        print_and_save('Admin Datasets', c, 'admin_datasets.json')

        # Datasets
        c = http_get('/api/v1/datasets', headers=HEADERS)
        print_and_save('Datasets List', c, 'datasets_list.json')

        body1 = {
            "keywords": ["arbitration"],
            "fields": ["title", "body"],
            "date_range": {"from": None, "to": None},
            "limit": 2,
        }
        c = http_post('/api/v1/datasets/caselaw/search', body1, headers=HEADERS)
        print_and_save('Dataset Search', c, 'dataset_search.json')

        body2 = {"query": "contract breach damages", "limit": 2}
        c = http_post('/api/v1/datasets/caselaw/semantic_search', body2, headers=HEADERS)
        print_and_save('Dataset Semantic Search', c, 'dataset_semantic.json')

        # Export
        c = http_get('/api/v1/export/datasets/caselaw/csv', headers=HEADERS)
        print_and_save('Export CSV', c, 'export.csv')

        c = http_get('/api/v1/export/datasets/caselaw/json', headers=HEADERS)
        print_and_save('Export JSON', c, 'export.json')

        # Caselaw
        c = http_get('/api/v1/caselaw/stats', headers=HEADERS)
        print_and_save('Caselaw Stats', c, 'caselaw_stats.json')

        c = http_get('/api/v1/caselaw/case/CASE1', headers=HEADERS)
        print_and_save('Caselaw Case', c, 'caselaw_case.json')

        body3 = {"filters": {"jurisdiction": ["US-CA"]}, "limit": 1}
        c = http_post('/api/v1/caselaw/filter-search', body3, headers=HEADERS)
        print_and_save('Caselaw Filter Search', c, 'caselaw_filter.json')

        body4 = {"query": "precedent for arbitration clause"}
        c = http_post('/api/v1/caselaw/similarity-search', body4, headers=HEADERS)
        print_and_save('Caselaw Similarity', c, 'caselaw_similarity.json')

        body5 = {"judge_name": "Hon. Jane Doe"}
        c = http_post('/api/v1/caselaw/judge-analysis', body5, headers=HEADERS)
        print_and_save('Caselaw Judge Analysis', c, 'caselaw_judge.json')

        # Core
        body6 = {
            "case_type": "civil",
            "jurisdiction": "US-CA",
            "key_facts": ["contract breach"],
            "judge_id": None,
        }
        c = http_post('/api/v1/outcome/predict', body6, headers=HEADERS)
        print_and_save('Outcome Predict', c, 'outcome_predict.json')

        body7 = {"case_id": "stub-123", "strategies": ["settlement", "motion"]}
        c = http_post('/api/v1/strategy/optimize', body7, headers=HEADERS)
        print_and_save('Strategy Optimize', c, 'strategy_optimize.json')

        body8 = {
            "case_id": "stub-123",
            "strategy": "settlement",
            "opponent_type": None,
            "simulation_parameters": {},
        }
        c = http_post('/api/v1/simulation/run', body8, headers=HEADERS)
        print_and_save('Simulation Run', c, 'simulation_run.json')

        c = http_get('/api/v1/trends/forecast?industry=fintech&jurisdictions=US,EU&time_horizon=12m', headers=HEADERS)
        print_and_save('Trends Forecast', c, 'trends_forecast.json')

        c = http_get('/api/v1/jurisdiction/optimize?case_type=civil&key_facts=contract%20breach&preferred_outcome=win', headers=HEADERS)
        print_and_save('Jurisdiction Optimize', c, 'jurisdiction_optimize.json')

        body9 = {
            "jurisdiction": None,
            "industry": "fintech",
            "requirements": ["KYC", "AML"],
            "risk_tolerance": "medium",
        }
        c = http_post('/api/v1/compliance/optimize', body9, headers=HEADERS)
        print_and_save('Compliance Optimize', c, 'compliance_optimize.json')

        print('OK')

    except error.HTTPError as e:
        print(f"HTTPError: {e.code} {e.reason}")
        try:
            print(e.read().decode('utf-8', errors='replace'))
        except Exception:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        try:
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


if __name__ == '__main__':
    main()
