#!/usr/bin/env python3
"""
Direct Migration Runner - Applies SQL migrations via Supabase Python client
Uses psycopg2 for direct SQL execution
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migrations():
    """Apply all migrations directly to Supabase"""
    print("=" * 70)
    print("LEGAL ORACLE - DIRECT MIGRATION APPLICATION")
    print("=" * 70)
    
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Get database URL from Supabase
        supabase_url = os.getenv("SUPABASE_URL")
        project_ref = supabase_url.split("https://")[1].split(".")[0]
        
        # Construct PostgreSQL connection string
        db_password = "hwqEgOHND8rKkKnT"  # From .env
        db_host = f"aws-0-ap-south-1.pooler.supabase.com"
        db_user = f"postgres.{project_ref}"
        db_name = "postgres"
        db_port = "6543"
        
        print(f"\n[INFO] Connecting to database...")
        print(f"  Host: {db_host}")
        print(f"  User: {db_user}")
        print(f"  Database: {db_name}")
        
        # Connect to database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("[OK] Connected successfully!\n")
        
        # Migration files to apply
        migration_files = [
            ("Base Schema", "../docs/delivery/LO-PBI-001/migrations.sql"),
            ("Compliance Framework", "../docs/delivery/LO-PBI-001/sql/002_compliance_framework.sql")
        ]
        
        for name, filepath in migration_files:
            print(f"{'='*70}")
            print(f"Applying: {name}")
            print(f"{'='*70}")
            
            if not os.path.exists(filepath):
                print(f"[ERROR] File not found: {filepath}")
                continue
            
            # Read SQL file
            with open(filepath, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Execute entire file as one block (better for CREATE FUNCTION, etc.)
            try:
                cursor.execute(sql_content)
                print(f"[OK] {name} applied successfully")
                continue
            except Exception as e:
                print(f"[INFO] Batch execution failed, trying statement-by-statement: {str(e)[:100]}")
            
            # Fallback: Split into statements (simple split by semicolon)
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            
            print(f"[INFO] Found {len(statements)} SQL statements")
            
            executed = 0
            skipped = 0
            errors = 0
            
            for i, statement in enumerate(statements, 1):
                # Skip comments
                if statement.startswith('--') or len(statement) < 10:
                    skipped += 1
                    continue
                
                try:
                    # Execute statement
                    cursor.execute(statement)
                    executed += 1
                    
                    # Show progress for major operations
                    if "CREATE TABLE" in statement.upper():
                        table_name = statement.split("CREATE TABLE")[1].split("IF NOT EXISTS")[1].split("(")[0].strip() if "IF NOT EXISTS" in statement else statement.split("CREATE TABLE")[1].split("(")[0].strip()
                        print(f"  [{i}/{len(statements)}] Created table: {table_name}")
                    elif "INSERT INTO" in statement.upper():
                        table_name = statement.split("INSERT INTO")[1].split("(")[0].strip()
                        print(f"  [{i}/{len(statements)}] Inserted data into: {table_name}")
                    elif "CREATE FUNCTION" in statement.upper():
                        print(f"  [{i}/{len(statements)}] Created function")
                    elif "CREATE INDEX" in statement.upper():
                        print(f"  [{i}/{len(statements)}] Created index")
                    
                except Exception as e:
                    error_msg = str(e)
                    # Ignore "already exists" errors
                    if "already exists" in error_msg.lower():
                        skipped += 1
                        print(f"  [{i}/{len(statements)}] Skipped (already exists)")
                    else:
                        errors += 1
                        print(f"  [{i}/{len(statements)}] ERROR: {error_msg[:100]}")
            
            print(f"\n[SUMMARY] {name}:")
            print(f"  Executed: {executed}")
            print(f"  Skipped: {skipped}")
            print(f"  Errors: {errors}")
            print()
        
        # Verify tables were created
        print("=" * 70)
        print("VERIFYING TABLES")
        print("=" * 70)
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n[INFO] Found {len(tables)} tables in public schema:")
        for table in tables:
            print(f"  ✓ {table[0]}")
        
        # Check for our expected tables
        expected_tables = [
            'legal_cases', 'caselaw_cache', 'judge_patterns',
            'precedent_relationships', 'app_config',
            'compliance_frameworks', 'compliance_controls',
            'industry_compliance_map', 'strategic_patterns'
        ]
        
        table_names = [t[0] for t in tables]
        missing = [t for t in expected_tables if t not in table_names]
        
        if missing:
            print(f"\n[WARNING] Missing tables: {', '.join(missing)}")
        else:
            print(f"\n[OK] All expected tables created!")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print("MIGRATION COMPLETE!")
        print("=" * 70)
        print("\nNext steps:")
        print("1. Run: python seed_data.py")
        print("2. Test: python test_supabase.py")
        print()
        
        return True
        
    except ImportError:
        print("[ERROR] psycopg2 not installed")
        print("Install with: pip install psycopg2-binary")
        return False
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
