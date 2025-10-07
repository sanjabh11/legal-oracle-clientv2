#!/usr/bin/env python3
"""
Security Audit - Comprehensive security validation before deployment
"""
import os
import re
import json

def check_env_files():
    """Check for exposed secrets and proper .env configuration"""
    print("\n" + "=" * 70)
    print("ENV FILES SECURITY CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    # Check for .env files
    env_files = [
        "stub_api/.env",
        "legal-oracle-client/.env",
        "legal-oracle-client/.env.local"
    ]
    
    for env_file in env_files:
        if os.path.exists(env_file):
            print(f"\n[CHECKING] {env_file}")
            with open(env_file, 'r') as f:
                content = f.read()
                
                # Check for exposed secrets
                if "SUPABASE_SERVICE_ROLE_KEY" in content and len(content.split("SUPABASE_SERVICE_ROLE_KEY=")[1].split()[0]) > 20:
                    warnings.append(f"{env_file}: Contains service role key (should only be in backend)")
                
                if "OPENAI_API_KEY" in content and "sk-" in content:
                    warnings.append(f"{env_file}: Contains OpenAI API key")
                
                if "GEMINI_API_KEY" in content and len(content.split("GEMINI_API_KEY=")[1].split()[0]) > 20:
                    warnings.append(f"{env_file}: Contains Gemini API key")
                
                # Check for placeholder values
                if "your-" in content.lower() or "placeholder" in content.lower():
                    warnings.append(f"{env_file}: Contains placeholder values (update before production)")
                
                print(f"  [OK] File checked")
        else:
            print(f"\n[MISSING] {env_file}")
    
    # Check .gitignore
    gitignore_path = ".gitignore"
    if os.path.exists(gitignore_path):
        print(f"\n[CHECKING] .gitignore")
        with open(gitignore_path, 'r') as f:
            gitignore = f.read()
            
            required_ignores = [".env", "node_modules", "__pycache__", "*.pyc", ".venv"]
            missing = [r for r in required_ignores if r not in gitignore]
            
            if missing:
                issues.append(f".gitignore missing: {', '.join(missing)}")
            else:
                print("  [OK] .gitignore properly configured")
    else:
        issues.append(".gitignore file not found")
    
    return issues, warnings

def check_api_security():
    """Check API security configurations"""
    print("\n" + "=" * 70)
    print("API SECURITY CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    # Check main.py for security issues
    main_py = "stub_api/main.py"
    if os.path.exists(main_py):
        print(f"\n[CHECKING] {main_py}")
        with open(main_py, 'r') as f:
            content = f.read()
            
            # Check CORS configuration
            if "CORSMiddleware" in content:
                if "allow_origins=[\"*\"]" in content.replace(" ", ""):
                    issues.append("CORS allows all origins (*) - security risk!")
                else:
                    print("  [OK] CORS properly restricted")
            else:
                warnings.append("No CORS middleware found")
            
            # Check authentication
            if "require_auth" not in content:
                warnings.append("No authentication function found")
            else:
                print("  [OK] Authentication function present")
            
            # Check for hardcoded secrets
            if re.search(r'(password|secret|key)\s*=\s*["\'][^"\']{10,}["\']', content, re.IGNORECASE):
                issues.append("Possible hardcoded secrets found")
            else:
                print("  [OK] No hardcoded secrets detected")
            
            # Check for SQL injection protection
            if ".execute(" in content and "f\"" in content:
                warnings.append("Possible SQL injection risk - verify all queries use parameterization")
            
            # Check rate limiting
            if "rate_limit" not in content.lower() and "slowapi" not in content.lower():
                warnings.append("No rate limiting detected - consider adding for production")
    
    return issues, warnings

def check_frontend_security():
    """Check frontend security"""
    print("\n" + "=" * 70)
    print("FRONTEND SECURITY CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    # Check for exposed API keys in frontend
    frontend_files = []
    for root, dirs, files in os.walk("legal-oracle-client/src"):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                frontend_files.append(os.path.join(root, file))
    
    print(f"\n[CHECKING] {len(frontend_files)} frontend files")
    
    exposed_secrets = []
    for filepath in frontend_files[:50]:  # Limit to avoid too much output
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Check for API keys
                if re.search(r'(api[_-]?key|secret|token)\s*[:=]\s*["\'][A-Za-z0-9]{20,}["\']', content, re.IGNORECASE):
                    exposed_secrets.append(os.path.basename(filepath))
        except:
            pass
    
    if exposed_secrets:
        issues.append(f"Possible exposed secrets in frontend: {', '.join(exposed_secrets[:5])}")
    else:
        print("  [OK] No obvious secrets in frontend")
    
    # Check supabase.ts
    supabase_ts = "legal-oracle-client/src/lib/supabase.ts"
    if os.path.exists(supabase_ts):
        print(f"\n[CHECKING] {supabase_ts}")
        with open(supabase_ts, 'r') as f:
            content = f.read()
            
            # Should use VITE_* env vars
            if "import.meta.env.VITE_" in content:
                print("  [OK] Using VITE_ environment variables")
            else:
                warnings.append("Supabase client not using VITE_ env vars")
            
            # Should NOT have service role key
            if "service_role" in content.lower():
                issues.append("Frontend contains service role key reference - CRITICAL!")
            else:
                print("  [OK] No service role key in frontend")
    
    return issues, warnings

def check_database_security():
    """Check database security configurations"""
    print("\n" + "=" * 70)
    print("DATABASE SECURITY CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    # Check migration files for RLS
    migration_files = [
        "docs/delivery/LO-PBI-001/migrations.sql",
        "docs/delivery/LO-PBI-001/sql/002_compliance_framework.sql"
    ]
    
    for filepath in migration_files:
        if os.path.exists(filepath):
            print(f"\n[CHECKING] {filepath}")
            with open(filepath, 'r') as f:
                content = f.read()
                
                # Check for RLS policies
                if "ENABLE ROW LEVEL SECURITY" in content.upper():
                    print("  [OK] RLS enabled")
                else:
                    warnings.append(f"{os.path.basename(filepath)}: No RLS policies found")
                
                # Check for public access
                if "GRANT ALL" in content.upper() and "PUBLIC" in content.upper():
                    warnings.append(f"{os.path.basename(filepath)}: Public GRANT found - verify necessity")
    
    return issues, warnings

def check_dependencies():
    """Check for vulnerable dependencies"""
    print("\n" + "=" * 70)
    print("DEPENDENCY SECURITY CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    # Check Python requirements
    req_file = "stub_api/requirements.txt"
    if os.path.exists(req_file):
        print(f"\n[CHECKING] {req_file}")
        with open(req_file, 'r') as f:
            content = f.read()
            
            # Check for version pinning
            unpinned = [line for line in content.split('\n') if line and '==' not in line and line.strip() and not line.startswith('#')]
            if unpinned:
                warnings.append(f"Unpinned dependencies: {', '.join(unpinned[:3])}")
            else:
                print("  [OK] All dependencies pinned")
    
    # Check package.json
    pkg_file = "legal-oracle-client/package.json"
    if os.path.exists(pkg_file):
        print(f"\n[CHECKING] {pkg_file}")
        with open(pkg_file, 'r') as f:
            try:
                pkg = json.load(f)
                deps = pkg.get('dependencies', {})
                
                # Check for known vulnerable packages
                vulnerable = []
                if 'react' in deps:
                    version = deps['react'].replace('^', '').replace('~', '')
                    if version.startswith('17.') or version.startswith('16.'):
                        vulnerable.append('react (outdated)')
                
                if vulnerable:
                    warnings.append(f"Potentially outdated packages: {', '.join(vulnerable)}")
                else:
                    print("  [OK] Major dependencies look current")
            except:
                warnings.append("Could not parse package.json")
    
    return issues, warnings

def check_file_permissions():
    """Check for sensitive files with wrong permissions"""
    print("\n" + "=" * 70)
    print("FILE PERMISSIONS CHECK")
    print("=" * 70)
    
    issues = []
    warnings = []
    
    sensitive_files = [
        "stub_api/.env",
        "legal-oracle-client/.env",
        "legal-oracle-client/.env.local"
    ]
    
    for filepath in sensitive_files:
        if os.path.exists(filepath):
            print(f"\n[CHECKING] {filepath}")
            # On Windows, file permissions work differently
            # Just check if file exists and is readable
            if os.access(filepath, os.R_OK):
                print(f"  [OK] File is accessible")
                warnings.append(f"{filepath}: Ensure proper production permissions (chmod 600)")
        else:
            print(f"\n[SKIP] {filepath} - not found")
    
    return issues, warnings

def generate_security_report():
    """Generate comprehensive security report"""
    print("\n" + "=" * 70)
    print("LEGAL ORACLE - COMPREHENSIVE SECURITY AUDIT")
    print("=" * 70)
    
    all_issues = []
    all_warnings = []
    
    # Run all checks
    checks = [
        ("Environment Files", check_env_files),
        ("API Security", check_api_security),
        ("Frontend Security", check_frontend_security),
        ("Database Security", check_database_security),
        ("Dependencies", check_dependencies),
        ("File Permissions", check_file_permissions)
    ]
    
    for name, check_func in checks:
        issues, warnings = check_func()
        all_issues.extend([(name, i) for i in issues])
        all_warnings.extend([(name, w) for w in warnings])
    
    # Generate report
    print("\n" + "=" * 70)
    print("SECURITY AUDIT SUMMARY")
    print("=" * 70)
    
    if all_issues:
        print(f"\n[CRITICAL ISSUES] {len(all_issues)} found:")
        for category, issue in all_issues:
            print(f"  ! [{category}] {issue}")
    else:
        print("\n[OK] No critical security issues found!")
    
    if all_warnings:
        print(f"\n[WARNINGS] {len(all_warnings)} found:")
        for category, warning in all_warnings:
            print(f"  ? [{category}] {warning}")
    else:
        print("\n[OK] No security warnings!")
    
    # Security score
    total_checks = len(checks) * 5  # Assume 5 checks per category
    issues_weight = len(all_issues) * 3
    warnings_weight = len(all_warnings) * 1
    
    security_score = max(0, 100 - issues_weight - warnings_weight)
    
    print("\n" + "=" * 70)
    print(f"SECURITY SCORE: {security_score}/100")
    
    if security_score >= 90:
        print("STATUS: EXCELLENT - Ready for production")
    elif security_score >= 75:
        print("STATUS: GOOD - Minor improvements recommended")
    elif security_score >= 60:
        print("STATUS: FAIR - Address warnings before production")
    else:
        print("STATUS: POOR - Critical issues must be fixed")
    
    print("=" * 70 + "\n")
    
    return security_score >= 75

if __name__ == "__main__":
    import sys
    passed = generate_security_report()
    sys.exit(0 if passed else 1)
