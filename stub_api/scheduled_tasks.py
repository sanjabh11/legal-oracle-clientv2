"""
Scheduled Tasks for Legal Oracle
Handles background jobs like regulatory monitoring and alert sending
"""

import asyncio
from datetime import datetime
from typing import List, Dict
import os
from dotenv import load_dotenv

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    print("[WARN] APScheduler not installed. Scheduled tasks will not run.")
    print("[WARN] Install with: pip install apscheduler")
    SCHEDULER_AVAILABLE = False

from regulatory_api import fetch_proposed_regulations
from arbitrage_monitor import ArbitrageMonitor, format_opportunity_for_api
from email_service import AlertEmailService
from supabase import create_client

load_dotenv()

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[WARN] Supabase credentials not found. Scheduled tasks will not access database.")
    supabase = None
else:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Initialize services
email_service = AlertEmailService()
scheduler = BackgroundScheduler() if SCHEDULER_AVAILABLE else None


async def scan_and_alert_opportunities():
    """
    Main scheduled job: Scan regulations and send alerts to subscribed users
    Runs every 6 hours
    """
    print(f"[{datetime.now().isoformat()}] Starting regulatory scan...")
    
    if not supabase:
        print("[ERROR] Supabase client not initialized. Skipping scan.")
        return
    
    try:
        # 1. Fetch active subscriptions
        subscriptions_response = supabase.table("user_alert_subscriptions") \
            .select("*") \
            .eq("is_active", True) \
            .execute()
        
        subscriptions = subscriptions_response.data if subscriptions_response.data else []
        
        if not subscriptions:
            print("[INFO] No active subscriptions found")
            return
        
        print(f"[INFO] Found {len(subscriptions)} active subscriptions")
        
        # 2. Get unique industries to scan
        industries = set()
        for sub in subscriptions:
            industry = sub.get('industry')
            if industry:
                industries.add(industry)
        
        if not industries:
            industries = {'technology'}  # Default industry
        
        # 3. Scan regulations for each industry
        all_opportunities = []
        
        for industry in industries:
            print(f"[INFO] Scanning {industry} regulations...")
            
            try:
                # Fetch regulations from last 7 days
                regs = await fetch_proposed_regulations(
                    industry=industry,
                    timeframe_days=7,
                    per_page=50
                )
                
                if regs.get('count', 0) > 0:
                    # Detect arbitrage opportunities
                    monitor = ArbitrageMonitor()
                    opportunities = await monitor.scan_for_opportunities(
                        regs['results'],
                        []  # No existing cases for now
                    )
                    
                    # Format and tag with industry
                    for opp in opportunities:
                        formatted = format_opportunity_for_api(opp)
                        formatted['industry'] = industry
                        all_opportunities.append(formatted)
                    
                    print(f"[INFO] Found {len(opportunities)} opportunities in {industry}")
            
            except Exception as e:
                print(f"[ERROR] Failed to scan {industry}: {str(e)}")
                continue
        
        print(f"[INFO] Total opportunities detected: {len(all_opportunities)}")
        
        # 4. Send personalized alerts to each user
        alerts_sent = 0
        
        for subscription in subscriptions:
            user_email = subscription.get('user_email')
            user_industry = subscription.get('industry')
            alert_types = subscription.get('alert_types', [])
            
            if not user_email:
                continue
            
            # Filter opportunities for this user
            user_opportunities = []
            
            for opp in all_opportunities:
                # Match industry
                if user_industry and opp.get('industry') != user_industry:
                    continue
                
                # Match alert types if specified
                if alert_types and opp.get('type') not in alert_types:
                    continue
                
                user_opportunities.append(opp)
            
            # Send email if there are opportunities
            if user_opportunities:
                try:
                    result = email_service.send_arbitrage_alert(
                        user_email,
                        user_opportunities,
                        subscription
                    )
                    
                    if result.get('status') == 'sent':
                        alerts_sent += 1
                        print(f"[OK] Sent alert to {user_email} with {len(user_opportunities)} opportunities")
                        
                        # Update last_alert_sent timestamp
                        supabase.table("user_alert_subscriptions") \
                            .update({"last_alert_sent": datetime.now().isoformat()}) \
                            .eq("id", subscription['id']) \
                            .execute()
                    else:
                        print(f"[ERROR] Failed to send to {user_email}: {result.get('message')}")
                
                except Exception as e:
                    print(f"[ERROR] Failed to send alert to {user_email}: {str(e)}")
        
        print(f"[SUMMARY] Scan complete. Sent {alerts_sent} alerts out of {len(subscriptions)} subscriptions")
        
        # 5. Log scan activity
        try:
            supabase.table("alert_scan_log").insert({
                "scan_timestamp": datetime.now().isoformat(),
                "opportunities_found": len(all_opportunities),
                "alerts_sent": alerts_sent,
                "industries_scanned": list(industries)
            }).execute()
        except Exception as e:
            print(f"[WARN] Failed to log scan activity: {str(e)}")
    
    except Exception as e:
        print(f"[ERROR] Scan failed: {str(e)}")
        import traceback
        traceback.print_exc()


def scheduled_scan_wrapper():
    """
    Wrapper for asyncio coroutine to run in scheduler
    """
    asyncio.run(scan_and_alert_opportunities())


async def manual_trigger_scan():
    """
    Manually trigger a scan (for testing or admin use)
    """
    print("[INFO] Manual scan triggered")
    await scan_and_alert_opportunities()


def start_scheduler():
    """
    Start the background scheduler
    Runs regulatory scan every 6 hours
    """
    if not SCHEDULER_AVAILABLE:
        print("[ERROR] APScheduler not available. Cannot start scheduler.")
        return False
    
    if not scheduler:
        print("[ERROR] Scheduler not initialized")
        return False
    
    try:
        # Add job: scan every 6 hours
        scheduler.add_job(
            func=scheduled_scan_wrapper,
            trigger=IntervalTrigger(hours=6),
            id='regulatory_scan_job',
            name='Scan regulations and send arbitrage alerts',
            replace_existing=True,
            max_instances=1  # Prevent overlapping scans
        )
        
        # Start scheduler
        scheduler.start()
        print("[OK] Scheduler started - regulatory scans will run every 6 hours")
        print(f"[OK] Next scan scheduled at: {scheduler.get_jobs()[0].next_run_time}")
        
        return True
    
    except Exception as e:
        print(f"[ERROR] Failed to start scheduler: {str(e)}")
        return False


def stop_scheduler():
    """
    Stop the background scheduler
    """
    if scheduler and scheduler.running:
        scheduler.shutdown()
        print("[INFO] Scheduler stopped")
        return True
    return False


def get_scheduler_status() -> Dict:
    """
    Get current scheduler status
    """
    if not scheduler:
        return {
            "running": False,
            "reason": "Scheduler not initialized"
        }
    
    jobs = scheduler.get_jobs()
    
    return {
        "running": scheduler.running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            }
            for job in jobs
        ]
    }


# Test function
async def test_alert_system(test_email: str = None):
    """
    Test the alert system with sample data
    
    Args:
        test_email: Email to send test alert to
    """
    print("[TEST] Running alert system test...")
    
    # Create test opportunities
    test_opportunities = [
        {
            "title": "Temporary Exemption for Tech Startups",
            "description": "SEC proposes temporary relief until Dec 2025",
            "opportunity_score": 0.85,
            "type": "temporary_exemption",
            "window_days": 90,
            "industry": "technology"
        },
        {
            "title": "Circuit Split on Data Privacy",
            "description": "Conflicting interpretations between 9th and 2nd Circuit",
            "opportunity_score": 0.72,
            "type": "jurisdictional_conflict",
            "window_days": 180,
            "industry": "technology"
        }
    ]
    
    if test_email:
        result = email_service.send_arbitrage_alert(
            test_email,
            test_opportunities,
            {"industry": "technology", "frequency": "daily"}
        )
        print(f"[TEST] Email send result: {result}")
    else:
        print("[TEST] No test email provided, skipping email send")
    
    print(f"[TEST] Would detect {len(test_opportunities)} opportunities")
    return test_opportunities


if __name__ == "__main__":
    """
    Run tests if executed directly
    """
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "test":
            # Test mode
            test_email = sys.argv[2] if len(sys.argv) > 2 else None
            asyncio.run(test_alert_system(test_email))
        
        elif command == "scan":
            # Manual scan
            asyncio.run(manual_trigger_scan())
        
        elif command == "start":
            # Start scheduler
            start_scheduler()
            print("[INFO] Scheduler running. Press Ctrl+C to stop.")
            try:
                import time
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                stop_scheduler()
                print("[INFO] Scheduler stopped")
    
    else:
        print("""
Legal Oracle Scheduled Tasks
=============================

Usage:
  python scheduled_tasks.py test [email]    - Test alert system
  python scheduled_tasks.py scan            - Run manual scan
  python scheduled_tasks.py start           - Start scheduler daemon

Examples:
  python scheduled_tasks.py test user@example.com
  python scheduled_tasks.py scan
  python scheduled_tasks.py start
""")
