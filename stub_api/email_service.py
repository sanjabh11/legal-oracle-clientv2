"""
Email Alert Service for Legal Oracle
Sends regulatory arbitrage alerts to subscribed users
"""

from typing import List, Dict, Optional
import os
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class AlertEmailService:
    """
    Email service for sending arbitrage alerts
    Uses SMTP (can be configured for SendGrid, Gmail, or other providers)
    """
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('ALERT_FROM_EMAIL', 'alerts@legal-oracle.com')
        
        # If SendGrid API key is provided, use SendGrid
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY', '')
        self.use_sendgrid = bool(self.sendgrid_api_key)
        
        if self.use_sendgrid:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail
                self.sg = SendGridAPIClient(self.sendgrid_api_key)
                self.Mail = Mail
                print("[INFO] Using SendGrid for email delivery")
            except ImportError:
                print("[WARN] SendGrid library not installed. Install with: pip install sendgrid")
                self.use_sendgrid = False
    
    def send_arbitrage_alert(
        self, 
        user_email: str, 
        opportunities: List[Dict],
        user_preferences: Optional[Dict] = None
    ) -> Dict:
        """
        Send email with regulatory arbitrage opportunities
        
        Args:
            user_email: Recipient email address
            opportunities: List of opportunity dictionaries
            user_preferences: User's subscription preferences
            
        Returns:
            Dict with status and message
        """
        if not opportunities:
            return {"status": "skipped", "message": "No opportunities to send"}
        
        # Build email content
        subject = f"🚨 {len(opportunities)} New Legal Arbitrage Opportunities"
        html_content = self._build_email_html(opportunities, user_preferences)
        text_content = self._build_email_text(opportunities)
        
        # Send email
        if self.use_sendgrid:
            return self._send_via_sendgrid(user_email, subject, html_content)
        else:
            return self._send_via_smtp(user_email, subject, html_content, text_content)
    
    def _build_email_html(self, opportunities: List[Dict], preferences: Optional[Dict] = None) -> str:
        """Build HTML email template"""
        
        # Top opportunities (max 10)
        rows = ""
        for i, opp in enumerate(opportunities[:10], 1):
            score = opp.get('opportunity_score', 0)
            score_color = "#10b981" if score > 0.7 else "#f59e0b" if score > 0.4 else "#ef4444"
            
            rows += f"""
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 16px; vertical-align: top;">
                    <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                        {i}. {opp.get('title', 'Untitled')[:80]}
                    </div>
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                        {opp.get('description', 'No description')[:150]}...
                    </div>
                    <div style="font-size: 12px; color: #9ca3af;">
                        <span style="background: {score_color}; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">
                            Score: {score:.2f}
                        </span>
                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; margin-right: 8px;">
                            Type: {opp.get('type', 'Unknown')}
                        </span>
                        <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px;">
                            Window: {opp.get('window_days', 'N/A')} days
                        </span>
                    </div>
                </td>
            </tr>
            """
        
        industry = preferences.get('industry', 'All Industries') if preferences else 'All Industries'
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                        ⚖️ Legal Oracle
                    </h1>
                    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
                        Regulatory Arbitrage Intelligence
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px;">
                    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">
                        🚨 New Opportunities Detected
                    </h2>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                        We've detected <strong>{len(opportunities)}</strong> new legal arbitrage opportunities 
                        in <strong>{industry}</strong>. Review them below to identify strategic advantages.
                    </p>
                    
                    <!-- Opportunities Table -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                        {rows}
                    </table>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://legal-oracle.netlify.app/arbitrage" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: #ffffff; 
                                  text-decoration: none; 
                                  padding: 14px 32px; 
                                  border-radius: 6px; 
                                  font-weight: 600; 
                                  font-size: 16px;
                                  display: inline-block;">
                            View All Opportunities →
                        </a>
                    </div>
                    
                    <!-- Stats -->
                    <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-top: 24px;">
                        <div style="font-size: 12px; color: #6b7280;">
                            <strong>Alert Summary:</strong> {len(opportunities)} opportunities | 
                            Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                        You're receiving this because you subscribed to Legal Oracle arbitrage alerts.
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        <a href="https://legal-oracle.netlify.app/settings" style="color: #667eea; text-decoration: none;">
                            Manage Preferences
                        </a> | 
                        <a href="https://legal-oracle.netlify.app/unsubscribe" style="color: #667eea; text-decoration: none;">
                            Unsubscribe
                        </a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _build_email_text(self, opportunities: List[Dict]) -> str:
        """Build plain text version of email"""
        text = f"""
Legal Oracle - Regulatory Arbitrage Alerts
==========================================

New Opportunities Detected: {len(opportunities)}

"""
        for i, opp in enumerate(opportunities[:10], 1):
            text += f"""
{i}. {opp.get('title', 'Untitled')}
   Score: {opp.get('opportunity_score', 0):.2f} | Type: {opp.get('type', 'Unknown')} | Window: {opp.get('window_days', 'N/A')} days
   {opp.get('description', 'No description')[:150]}...

"""
        
        text += f"""
View all opportunities: https://legal-oracle.netlify.app/arbitrage

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
"""
        return text
    
    def _send_via_sendgrid(self, to_email: str, subject: str, html_content: str) -> Dict:
        """Send email using SendGrid API"""
        try:
            message = self.Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            response = self.sg.send(message)
            return {
                "status": "sent",
                "provider": "sendgrid",
                "code": response.status_code,
                "to": to_email
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "sendgrid",
                "message": str(e),
                "to": to_email
            }
    
    def _send_via_smtp(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: str
    ) -> Dict:
        """Send email using SMTP (Gmail, Outlook, etc.)"""
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.from_email
            message['To'] = to_email
            
            # Attach both text and HTML versions
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            message.attach(part1)
            message.attach(part2)
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            return {
                "status": "sent",
                "provider": "smtp",
                "server": self.smtp_server,
                "to": to_email
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": "smtp",
                "message": str(e),
                "to": to_email
            }
    
    def send_test_email(self, to_email: str) -> Dict:
        """Send a test email to verify configuration"""
        test_opportunities = [
            {
                "title": "Temporary Exemption for Tech Startups - SEC Regulation",
                "description": "The SEC proposes temporary relief for tech startups from certain disclosure requirements until Dec 2025. This creates a window for accelerated fundraising.",
                "opportunity_score": 0.85,
                "type": "temporary_exemption",
                "window_days": 90,
                "impact": "high"
            },
            {
                "title": "Circuit Split on Data Privacy Enforcement",
                "description": "9th Circuit and 2nd Circuit have conflicting interpretations of CCPA enforcement scope, creating strategic jurisdiction selection opportunities.",
                "opportunity_score": 0.72,
                "type": "jurisdictional_conflict",
                "window_days": 180,
                "impact": "medium"
            }
        ]
        
        return self.send_arbitrage_alert(to_email, test_opportunities, {"industry": "Technology"})


# Utility function for easy access
def send_alert(user_email: str, opportunities: List[Dict], preferences: Optional[Dict] = None) -> Dict:
    """
    Convenience function to send alert
    
    Usage:
        from email_service import send_alert
        result = send_alert("user@example.com", opportunities)
    """
    service = AlertEmailService()
    return service.send_arbitrage_alert(user_email, opportunities, preferences)
