/**
 * Email Service for TiltCheck Ecosystem
 * Sends transactional emails via Resend API
 */

import { Resend } from 'resend';
import {
  TipReceiptEmail,
  SecurityAlertEmail,
  PendingTipsEmail,
  type TipReceiptProps,
  type SecurityAlertProps,
  type PendingTipsProps,
} from '@tiltcheck/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Check if email service is enabled
 */
export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send tip receipt email
 */
export async function sendTipReceipt(params: {
  userEmail: string;
  recipientName: string;
  amount: string;
  recipient: string;
  txSignature: string;
  fee: string;
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email');
    return { success: false, reason: 'Email service disabled' };
  }

  if (!params.userEmail) {
    console.warn('[Email] No email provided, skipping');
    return { success: false, reason: 'No email address' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'JustTheTip <tips@tiltcheck.gg>',
      to: params.userEmail,
      subject: `💰 Tip Sent: ${params.amount} to ${params.recipient}`,
      react: TipReceiptEmail({
        recipientName: params.recipientName,
        amount: params.amount,
        recipient: params.recipient,
        txSignature: params.txSignature,
        fee: params.fee,
        timestamp: new Date(),
      }),
    });

    if (error) {
      console.error('[Email] Failed to send tip receipt:', error);
      return { success: false, error };
    }

    console.log('[Email] Tip receipt sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Error sending tip receipt:', error);
    return { success: false, error };
  }
}

/**
 * Send security alert email
 */
export async function sendSecurityAlert(params: {
  userEmail: string;
  userName: string;
  action: string;
  details: {
    newWallet?: string;
    walletType?: string;
    ipAddress?: string;
    location?: string;
  };
  verifyUrl?: string;
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email');
    return { success: false, reason: 'Email service disabled' };
  }

  if (!params.userEmail) {
    console.warn('[Email] No email provided, skipping');
    return { success: false, reason: 'No email address' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'TiltCheck Security <security@tiltcheck.gg>',
      to: params.userEmail,
      subject: '🔐 Security Alert: Account Activity Detected',
      react: SecurityAlertEmail({
        userName: params.userName,
        action: params.action,
        details: params.details,
        timestamp: new Date(),
        verifyUrl: params.verifyUrl,
      }),
    });

    if (error) {
      console.error('[Email] Failed to send security alert:', error);
      return { success: false, error };
    }

    console.log('[Email] Security alert sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Error sending security alert:', error);
    return { success: false, error };
  }
}

/**
 * Send pending tips reminder email
 */
export async function sendPendingTipsReminder(params: {
  userEmail: string;
  userName: string;
  tips: Array<{ from: string; amount: string; date: string }>;
  totalValue: string;
  expiresIn: string;
  registerUrl: string;
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email');
    return { success: false, reason: 'Email service disabled' };
  }

  if (!params.userEmail) {
    console.warn('[Email] No email provided, skipping');
    return { success: false, reason: 'No email address' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'JustTheTip <tips@tiltcheck.gg>',
      to: params.userEmail,
      subject: `💸 You Have ${params.tips.length} Unclaimed Tips Worth ${params.totalValue}`,
      react: PendingTipsEmail({
        userName: params.userName,
        tips: params.tips,
        totalValue: params.totalValue,
        expiresIn: params.expiresIn,
        registerUrl: params.registerUrl,
      }),
    });

    if (error) {
      console.error('[Email] Failed to send pending tips reminder:', error);
      return { success: false, error };
    }

    console.log('[Email] Pending tips reminder sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Error sending pending tips reminder:', error);
    return { success: false, error };
  }
}

/**
 * Send test email (for debugging)
 */
export async function sendTestEmail(toEmail: string) {
  if (!isEmailEnabled()) {
    throw new Error('RESEND_API_KEY not set');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'TiltCheck <test@tiltcheck.gg>',
      to: toEmail,
      subject: 'TiltCheck Email Service Test',
      html: '<p>Hello! This is a test email from TiltCheck email service.</p><p>If you received this, everything is working correctly! 🎉</p>',
    });

    if (error) {
      console.error('[Email] Test email failed:', error);
      return { success: false, error };
    }

    console.log('[Email] Test email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Error sending test email:', error);
    return { success: false, error };
  }
}

/**
 * Send OTP email for authentication
 */
export async function sendOTPEmail(params: {
  userEmail: string;
  otpCode: string;
  username?: string;
  purpose: 'login' | 'verify-email' | 'link-account';
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] RESEND_API_KEY not set, skipping OTP email');
    return { success: false, reason: 'Email service disabled' };
  }

  if (!params.userEmail) {
    console.warn('[Email] No email provided, skipping OTP');
    return { success: false, reason: 'No email address' };
  }

  const subjectMap = {
    'login': 'TiltCheck Login Code',
    'verify-email': 'Verify Your TiltCheck Email', 
    'link-account': 'Link Your TiltCheck Account'
  };

  const purposeText = {
    'login': 'sign in to your TiltCheck account',
    'verify-email': 'verify your email address',
    'link-account': 'link your email to your TiltCheck account'
  };

  try {
    const { data, error } = await resend.emails.send({
      from: 'TiltCheck <auth@tiltcheck.gg>',
      to: params.userEmail,
      subject: subjectMap[params.purpose],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 32px; font-weight: bold; color: #00d4aa; margin-bottom: 10px; }
            .otp-code { 
              font-size: 48px; 
              font-weight: bold; 
              color: #00d4aa; 
              text-align: center; 
              letter-spacing: 8px; 
              background: #f8f9fa;
              padding: 20px;
              border-radius: 12px;
              border: 2px solid #e9ecef;
              margin: 30px 0;
            }
            .warning { color: #dc3545; font-size: 14px; margin-top: 20px; }
            .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯 TiltCheck</div>
              <h1>Your Login Code</h1>
            </div>
            
            <p>Hello${params.username ? ` ${params.username}` : ''}!</p>
            <p>Use this code to ${purposeText[params.purpose]}:</p>
            
            <div class="otp-code">${params.otpCode}</div>
            
            <p>This code will expire in 10 minutes for your security.</p>
            
            <div class="warning">
              <strong>Security Notice:</strong> Never share this code with anyone. 
              TiltCheck support will never ask for your login codes.
            </div>
            
            <div class="footer">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>© 2025 TiltCheck - Tilt Protection for Crypto Gaming</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] OTP email failed:', error);
      return { success: false, error };
    }

    console.log('[Email] OTP email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Error sending OTP email:', error);
    return { success: false, error };
  }
}

// Export types
export type {
  TipReceiptProps,
  SecurityAlertProps,
  PendingTipsProps,
};

// Export all functions
export {
  isEmailEnabled,
  sendTipReceipt,
  sendSecurityAlert,
  sendPendingTipsReminder,
  sendTestEmail,
  sendOTPEmail
};
