"""
Email service for sending reports and notifications
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
import uuid
from io import BytesIO

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails with attachments"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', self.smtp_username)
        self.from_name = getattr(settings, 'FROM_NAME', 'ValuerPro')
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.smtp_username and self.smtp_password and self.smtp_server)
    
    def send_email(
        self, 
        to_emails: List[str], 
        subject: str, 
        body_text: str, 
        body_html: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Send email with optional attachments
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            body_text: Plain text body
            body_html: Optional HTML body
            attachments: List of attachment dictionaries with 'content', 'filename', 'content_type'
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_configured():
            logger.error("Email service is not configured")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # Add text body
            text_part = MIMEText(body_text, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Add HTML body if provided
            if body_html:
                html_part = MIMEText(body_html, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    self._add_attachment(msg, attachment)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {', '.join(to_emails)}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email message"""
        content = attachment['content']
        filename = attachment['filename']
        content_type = attachment.get('content_type', 'application/octet-stream')
        
        # Create attachment part
        part = MIMEBase('application', 'octet-stream')
        
        if isinstance(content, BytesIO):
            part.set_payload(content.getvalue())
        elif isinstance(content, bytes):
            part.set_payload(content)
        else:
            part.set_payload(str(content).encode('utf-8'))
        
        # Encode attachment
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename= {filename}'
        )
        
        msg.attach(part)
    
    def send_report_delivery_email(
        self,
        recipient_email: str,
        recipient_name: str,
        report_ref: str,
        valuer_name: str,
        pdf_content: Optional[BytesIO] = None,
        docx_content: Optional[BytesIO] = None,
        custom_message: Optional[str] = None
    ) -> bool:
        """
        Send property valuation report to client
        """
        subject = f"Property Valuation Report - {report_ref}"
        
        # Create email body
        body_text = f"""Dear {recipient_name},

Please find attached your property valuation report (Reference: {report_ref}).

This report has been prepared by {valuer_name} in accordance with International Valuation Standards and the professional standards of the Institute of Valuers of Sri Lanka.

{custom_message if custom_message else ''}

Important Notes:
- This report is prepared for your specific use and should not be distributed without the valuer's consent
- The valuation is valid as of the inspection date mentioned in the report
- Please contact us if you have any questions regarding this valuation

Thank you for choosing our valuation services.

Best regards,
{valuer_name}
ValuerPro - Professional Property Valuation Services

---
This email was generated automatically by ValuerPro system.
"""
        
        # Create HTML body
        body_html = f"""
        <html>
        <body>
            <p>Dear <strong>{recipient_name}</strong>,</p>
            
            <p>Please find attached your property valuation report (Reference: <strong>{report_ref}</strong>).</p>
            
            <p>This report has been prepared by <strong>{valuer_name}</strong> in accordance with International 
            Valuation Standards and the professional standards of the Institute of Valuers of Sri Lanka.</p>
            
            {f'<div style="background-color: #f9f9f9; padding: 10px; border-left: 4px solid #007cba;"><p>{custom_message}</p></div>' if custom_message else ''}
            
            <h3>Important Notes:</h3>
            <ul>
                <li>This report is prepared for your specific use and should not be distributed without the valuer's consent</li>
                <li>The valuation is valid as of the inspection date mentioned in the report</li>
                <li>Please contact us if you have any questions regarding this valuation</li>
            </ul>
            
            <p>Thank you for choosing our valuation services.</p>
            
            <p>Best regards,<br>
            <strong>{valuer_name}</strong><br>
            ValuerPro - Professional Property Valuation Services</p>
            
            <hr>
            <small>This email was generated automatically by ValuerPro system.</small>
        </body>
        </html>
        """
        
        # Prepare attachments
        attachments = []
        
        if pdf_content:
            attachments.append({
                'content': pdf_content,
                'filename': f'Valuation_Report_{report_ref}.pdf',
                'content_type': 'application/pdf'
            })
        
        if docx_content:
            attachments.append({
                'content': docx_content,
                'filename': f'Valuation_Report_{report_ref}.docx',
                'content_type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            })
        
        return self.send_email(
            to_emails=[recipient_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            attachments=attachments if attachments else None
        )
    
    def send_notification_email(
        self,
        recipient_email: str,
        recipient_name: str,
        notification_type: str,
        message: str,
        report_ref: Optional[str] = None
    ) -> bool:
        """
        Send notification email to client or valuer
        """
        subject_mapping = {
            'report_ready': f'Your Property Valuation Report is Ready - {report_ref}',
            'report_updated': f'Property Valuation Report Updated - {report_ref}',
            'inspection_reminder': f'Property Inspection Reminder - {report_ref}',
            'payment_reminder': f'Payment Reminder - {report_ref}',
            'general': 'Notification from ValuerPro'
        }
        
        subject = subject_mapping.get(notification_type, subject_mapping['general'])
        
        body_text = f"""Dear {recipient_name},

{message}

{f'Report Reference: {report_ref}' if report_ref else ''}

Best regards,
ValuerPro Team

---
This email was generated automatically by ValuerPro system.
If you have any questions, please contact your valuer directly.
"""
        
        body_html = f"""
        <html>
        <body>
            <p>Dear <strong>{recipient_name}</strong>,</p>
            
            <p>{message.replace('\n', '<br>')}</p>
            
            {f'<p><strong>Report Reference:</strong> {report_ref}</p>' if report_ref else ''}
            
            <p>Best regards,<br>
            <strong>ValuerPro Team</strong></p>
            
            <hr>
            <small>This email was generated automatically by ValuerPro system.<br>
            If you have any questions, please contact your valuer directly.</small>
        </body>
        </html>
        """
        
        return self.send_email(
            to_emails=[recipient_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )


# Global email service instance
email_service = EmailService()


def send_report_to_client(
    recipient_email: str,
    recipient_name: str,
    report_ref: str,
    valuer_name: str,
    pdf_content: Optional[BytesIO] = None,
    docx_content: Optional[BytesIO] = None,
    custom_message: Optional[str] = None
) -> bool:
    """Convenience function to send report to client"""
    return email_service.send_report_delivery_email(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        report_ref=report_ref,
        valuer_name=valuer_name,
        pdf_content=pdf_content,
        docx_content=docx_content,
        custom_message=custom_message
    )


def send_notification(
    recipient_email: str,
    recipient_name: str,
    notification_type: str,
    message: str,
    report_ref: Optional[str] = None
) -> bool:
    """Convenience function to send notification"""
    return email_service.send_notification_email(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        notification_type=notification_type,
        message=message,
        report_ref=report_ref
    )


def is_email_service_available() -> bool:
    """Check if email service is available"""
    return email_service.is_configured()