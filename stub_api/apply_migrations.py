#!/usr/bin/env python3
"""
Migration Runner - Applies all database schemas to Supabase
Uses Supabase SQL Editor or direct PostgreSQL connection
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def get_sql_files():
    """Get list of SQL migration files to apply"""
    return [
        ("Base Schema", "../docs/delivery/LO-PBI-001/migrations.sql"),
        ("Compliance Framework", "../docs/delivery/LO-PBI-001/sql/002_compliance_framework.sql")
    ]

def display_sql_instructions():
    """Display instructions for manual SQL execution"""
    print("\n" + "=" * 70)
    print("DATABASE MIGRATION INSTRUCTIONS")
    print("=" * 70)
    
    url = os.getenv("SUPABASE_URL")
    project_id = url.split("https://")[1].split(".")[0] if url else "YOUR_PROJECT"
    
    print(f"\nSupabase Project: {project_id}")
    print(f"Dashboard URL: https://supabase.com/dashboard/project/{project_id}")
    
    print("\n" + "-" * 70)
    print("OPTION 1: Supabase Dashboard SQL Editor (RECOMMENDED)")
    print("-" * 70)
    
    print("\n1. Go to: https://supabase.com/dashboard/project/{}/sql".format(project_id))
    print("2. Click 'New Query'")
    print("3. Copy and paste the SQL from each file below:")
    
    for name, filepath in get_sql_files():
        abs_path = os.path.abspath(filepath)
        print(f"\n   [{name}]")
        print(f"   File: {abs_path}")
        
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.read().strip().split('\n')
                print(f"   Lines: {len(lines)}")
        else:
            print(f"   [WARNING] File not found!")
    
    print("\n4. Click 'Run' for each SQL script")
    
    print("\n" + "-" * 70)
    print("OPTION 2: PostgreSQL CLI (psql)")
    print("-" * 70)
    
    print("\n1. Get your database password from Supabase Dashboard > Settings > Database")
    print("2. Run these commands:")
    
    for name, filepath in get_sql_files():
        abs_path = os.path.abspath(filepath)
        print(f"\n   # {name}")
        print(f"   psql -h db.{project_id}.supabase.co -U postgres -d postgres -f \"{abs_path}\"")
    
    print("\n" + "-" * 70)
    print("OPTION 3: Supabase CLI")
    print("-" * 70)
    
    print("\n1. Link project (if not already):")
    print("   supabase link --project-ref {}".format(project_id))
    
    print("\n2. Apply migrations:")
    for name, filepath in get_sql_files():
        print(f"\n   # {name}")
        print(f"   supabase db execute -f \"{os.path.abspath(filepath)}\"")
    
    print("\n" + "=" * 70)
    print("VERIFICATION")
    print("=" * 70)
    
    print("\nAfter running migrations, verify with:")
    print("  python test_supabase.py")
    
    print("\nOr check tables in Supabase Dashboard:")
    print("  https://supabase.com/dashboard/project/{}/editor".format(project_id))
    
    print("\nExpected tables:")
    expected = [
        "legal_cases", "caselaw_cache", "judge_patterns",
        "precedent_relationships", "app_config",
        "compliance_frameworks", "compliance_controls",
        "industry_compliance_map", "strategic_patterns"
    ]
    for table in expected:
        print(f"  - {table}")
    
    print("\n" + "=" * 70 + "\n")

def print_sql_files():
    """Print SQL content for easy copy-paste"""
    print("\n" + "=" * 70)
    print("SQL FILE CONTENTS (FOR COPY-PASTE)")
    print("=" * 70)
    
    for name, filepath in get_sql_files():
        print(f"\n{'='*70}")
        print(f"FILE: {name}")
        print(f"Path: {os.path.abspath(filepath)}")
        print(f"{'='*70}\n")
        
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                print(content)
                print(f"\n/* END OF {name} */\n")
        else:
            print(f"[ERROR] File not found: {filepath}\n")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--show-sql":
        print_sql_files()
    else:
        display_sql_instructions()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
