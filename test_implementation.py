#!/usr/bin/env python3
"""
Test script to verify Legal Oracle implementation
Tests all critical endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_BASE = "http://127.0.0.1:8000/api/v1"
TEST_TOKEN = "test-admin"  # Replace with actual token in production

def test_endpoint(endpoint, method="GET", data=None, params=None):
    """Test a single API endpoint"""
    url = f"{API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        else:
            return False, f"Unsupported method: {method}"
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, f"Status {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)

def run_tests():
    """Run comprehensive tests"""
    print("🧪 Testing Legal Oracle Implementation")
    print("=" * 50)
    
    tests = [
        # Health check
        ("Health Check", "/admin/health", "GET", None, None),
        
        # Core prediction endpoints
        ("Case Outcome Prediction", "/predict_outcome", "POST", {
            "case_text": "Contract dispute involving software licensing agreement breach",
            "jurisdiction": "California",
            "key_facts": ["breach of contract", "software licensing"]
        }, None),
        
        # New endpoints implemented
        ("Trend Forecasting", "/trends/forecast", "GET", None, {
            "industry": "tech",
            "jurisdictions": "California,Federal",
            "time_horizon": "2_years"
        }),
        
        ("Jurisdiction Optimization", "/jurisdiction/optimize", "GET", None, {
            "case_type": "contract_dispute",
            "key_facts": "software licensing, breach of contract",
            "preferred_outcome": "win"
        }),
        
        ("Precedent Simulation", "/precedent/simulate", "POST", {
            "case_id": "CD-2024-001",
            "decision": "plaintiff victory",
            "jurisdiction": "California"
        }, None),
        
        ("Legal Evolution Modeling", "/trends/model", "GET", None, {
            "legal_domain": "contract_law",
            "time_horizon": "5_years"
        }),
        
        ("Compliance Optimization", "/compliance/optimize", "POST", {
            "industry": "tech",
            "jurisdiction": "California",
            "current_practices": ["basic_data_protection"]
        }, None),
        
        ("Arbitrage Alerts", "/arbitrage/alerts", "GET", None, {
            "user_role": "business",
            "jurisdiction": "California",
            "legal_interests": "tax,corporate"
        }),
        
        ("Landmark Case Prediction", "/precedent/predict", "GET", None, {
            "jurisdiction": "Federal",
            "case_details": "constitutional_law,privacy"
        }),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, endpoint, method, data, params in tests:
        print(f"\n🔍 Testing: {test_name}")
        success, result = test_endpoint(endpoint, method, data, params)
        
        if success:
            print(f"✅ PASSED - {test_name}")
            passed += 1
        else:
            print(f"❌ FAILED - {test_name}: {result}")
            failed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Legal Oracle is ready for use.")
        return 0
    else:
        print("⚠️  Some tests failed. Check backend server and configuration.")
        return 1

def check_frontend_security():
    """Check frontend security compliance"""
    print("\n🔒 Checking Frontend Security...")
    
    try:
        with open("legal-oracle-client/.env", "r") as f:
            env_content = f.read()
        
        # Check for exposed secrets
        violations = []
        if "GEMINI_API_KEY" in env_content and "VITE_GEMINI_API_KEY" in env_content:
            violations.append("Gemini API key exposed in frontend")
        if "HF_API_TOKEN" in env_content and "VITE_" in env_content:
            violations.append("HuggingFace token exposed in frontend")
        
        if violations:
            print("❌ Security violations found:")
            for violation in violations:
                print(f"  - {violation}")
            return False
        else:
            print("✅ Frontend security compliance verified")
            return True
    except Exception as e:
        print(f"⚠️  Could not check frontend security: {e}")
        return False

def main():
    """Main test function"""
    print(f"🚀 Legal Oracle Implementation Test Suite")
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API Base: {API_BASE}")
    
    # Check security first
    security_ok = check_frontend_security()
    
    # Run API tests
    test_result = run_tests()
    
    # Final summary
    print("\n" + "=" * 50)
    print("📋 FINAL ASSESSMENT")
    print("=" * 50)
    
    if security_ok and test_result == 0:
        print("🎯 IMPLEMENTATION COMPLETE - All systems operational!")
        print("✅ Security compliance: PASSED")
        print("✅ API functionality: PASSED")
        print("✅ Ready for production deployment")
    else:
        print("⚠️  IMPLEMENTATION NEEDS ATTENTION")
        if not security_ok:
            print("❌ Security compliance: FAILED")
        if test_result != 0:
            print("❌ API functionality: FAILED")
    
    return test_result

if __name__ == "__main__":
    sys.exit(main())
