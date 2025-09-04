from datetime import datetime, timezone

# API constants
API_PREFIX = "/api/v1"
RATE_LIMIT_RPM = 100

# Simple in-memory start time for uptime calculation
APP_STARTED_AT = datetime.now(timezone.utc)

# Demo datasets
DATASETS = [
    {
        "name": "caselaw",
        "description": "Sample caselaw corpus",
        "size": 123456,
        "last_indexed": datetime.now(timezone.utc).isoformat(),
        "status": "ready",
    }
]
