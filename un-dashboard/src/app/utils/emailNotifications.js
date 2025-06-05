// Email notification service for security events
import nodemailer from 'nodemailer';

class EmailNotificationService {
  constructor() {
    this.transporter = null;
    this.isEnabled = false;
    this.initialize();
  }

  // Initialize email transporter
  initialize() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      // Check if all required config is present
      if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransporter(emailConfig);
        this.isEnabled = true;
        console.log('Email notification service initialized');
      } else {
        console.log('Email configuration not complete, notifications disabled');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isEnabled = false;
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    if (!this.isEnabled) {
      console.log('Email service not enabled, skipping notification');
      return { success: false, reason: 'Service not enabled' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Convert basic HTML to text
  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  // Failed login notification
  async notifyFailedLogin(userEmail, username, ipAddress, userAgent, attempts = 1) {
    const subject = `Security Alert: Failed Login Attempt${attempts > 1 ? 's' : ''}`;
    
    const html = `
      <h2 style="color: #dc3545;">Security Alert: Failed Login Attempt${attempts > 1 ? 's' : ''}</h2>
      
      <p>We detected ${attempts > 1 ? `${attempts} failed login attempts` : 'a failed login attempt'} on your UN Dashboard account.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
        <h4>Attempt Details:</h4>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Browser:</strong> ${userAgent}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          ${attempts > 1 ? `<li><strong>Number of attempts:</strong> ${attempts}</li>` : ''}
        </ul>
      </div>
      
      <h4>What should you do?</h4>
      <ul>
        <li>If this was you, please check your password and try again</li>
        <li>If this wasn't you, consider changing your password immediately</li>
        <li>Review your account activity and contact support if you see suspicious activity</li>
      </ul>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  // Account lockout notification
  async notifyAccountLockout(userEmail, username, ipAddress) {
    const subject = 'Security Alert: Account Temporarily Locked';
    
    const html = `
      <h2 style="color: #dc3545;">Security Alert: Account Temporarily Locked</h2>
      
      <p>Your UN Dashboard account has been temporarily locked due to multiple failed login attempts.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
        <h4>Lockout Details:</h4>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <h4>What happens next?</h4>
      <ul>
        <li>Your account will be automatically unlocked after a brief security timeout</li>
        <li>You can try logging in again in a few minutes</li>
        <li>If you continue to have trouble, please contact support</li>
      </ul>
      
      <p style="color: #856404; background-color: #fff3cd; padding: 10px; border: 1px solid #ffeaa7;">
        <strong>Security Tip:</strong> If you didn't attempt to log in, someone may be trying to access your account. 
        Consider changing your password once you regain access.
      </p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  // Password change notification
  async notifyPasswordChange(userEmail, username, ipAddress, userAgent) {
    const subject = 'Security Notice: Password Changed';
    
    const html = `
      <h2 style="color: #28a745;">Security Notice: Password Changed</h2>
      
      <p>Your UN Dashboard account password has been successfully changed.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
        <h4>Change Details:</h4>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Browser:</strong> ${userAgent}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <h4>If you made this change:</h4>
      <p>No further action is required. Your account is secure.</p>
      
      <h4>If you didn't make this change:</h4>
      <ul>
        <li>Contact support immediately</li>
        <li>Check your account for any unauthorized access</li>
        <li>Consider reviewing your security settings</li>
      </ul>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  // Session termination notification
  async notifySessionTermination(userEmail, username, ipAddress, userAgent) {
    const subject = 'Security Notice: Session Terminated';
    
    const html = `
      <h2 style="color: #17a2b8;">Security Notice: Session Terminated</h2>
      
      <p>Your UN Dashboard session has been terminated.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #17a2b8; margin: 20px 0;">
        <h4>Session Details:</h4>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Browser:</strong> ${userAgent}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <h4>If you did not log out:</h4>
      <ul>
        <li>Your session may have been terminated by an administrator</li>
        <li>Your session may have expired due to inactivity</li>
        <li>Contact support if you believe this was unauthorized</li>
      </ul>
      
      <h4>If you logged out:</h4>
      <p>This notification confirms your session was successfully terminated.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  // New device login notification
  async notifyNewDeviceLogin(userEmail, username, deviceInfo, ipAddress) {
    const subject = 'Security Notice: Login from New Device';
    
    const html = `
      <h2 style="color: #17a2b8;">Security Notice: Login from New Device</h2>
      
      <p>We detected a login to your UN Dashboard account from a new device or location.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #17a2b8; margin: 20px 0;">
        <h4>Login Details:</h4>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Device:</strong> ${deviceInfo.device || 'Unknown'}</li>
          <li><strong>Browser:</strong> ${deviceInfo.browser || 'Unknown'}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
      </div>
      
      <h4>If this was you:</h4>
      <p>No action is required. Welcome to your new device!</p>
      
      <h4>If this wasn't you:</h4>
      <ul>
        <li>Change your password immediately</li>
        <li>Review your active sessions and terminate any unauthorized ones</li>
        <li>Contact support if you need assistance</li>
      </ul>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  // Admin notification for security events
  async notifyAdminSecurityEvent(event, details) {
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',') || [];
    
    if (adminEmails.length === 0) {
      console.log('No admin emails configured for security notifications');
      return { success: false, reason: 'No admin emails configured' };
    }

    const subject = `Security Alert: ${event}`;
    
    const html = `
      <h2 style="color: #dc3545;">Security Alert: ${event}</h2>
      
      <p>A security event has been detected in the UN Dashboard system.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
        <h4>Event Details:</h4>
        <pre style="background-color: #fff; padding: 10px; border: 1px solid #ddd;">${JSON.stringify(details, null, 2)}</pre>
      </div>
      
      <p>Please review this event and take appropriate action if necessary.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
        This is an automated security notification from the UN Dashboard system.
      </p>
    `;

    // Send to all admin emails
    const results = await Promise.allSettled(
      adminEmails.map(email => this.sendEmail(email.trim(), subject, html))
    );

    return {
      success: results.some(result => result.status === 'fulfilled' && result.value.success),
      results
    };
  }

  // Test email configuration
  async testConfiguration(testEmail) {
    if (!this.isEnabled) {
      return { success: false, reason: 'Email service not enabled' };
    }

    const subject = 'UN Dashboard Email Test';
    const html = `
      <h2>Email Configuration Test</h2>
      <p>This is a test email to verify that the UN Dashboard email notification system is working correctly.</p>
      <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
    `;

    return this.sendEmail(testEmail, subject, html);
  }

  // Get service status
  getStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    };
  }
}

// Singleton instance
export const emailNotificationService = new EmailNotificationService();

export default emailNotificationService;
