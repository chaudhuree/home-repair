import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config(); // Load environment variables

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface EmailConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure?: boolean;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config?: EmailConfig) {
    // Use provided config or default to Mailtrap
    const emailConfig: EmailConfig = config || {
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '2525'),
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  private async sendEmail(options: EmailOptions): Promise<any> {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'support@homerepair.com',
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body
      });
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
    const subject = 'Password Reset OTP';
    const body = `Your password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Your password reset OTP is: <strong>${otp}</strong></p>
      </div>
    `;

    await this.sendEmail({ to: email, subject, body, html });
  }

  async sendPasswordResetToken(email: string, resetToken: string) {
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Password Reset Request',
      body: `You requested a password reset. Click the following link to reset your password: ${resetURL}\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div>
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the following link to reset your password:</p>
          <p><a href="${resetURL}">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 10 minutes.</p>
        </div>
      `
    };

    return this.sendEmail(emailOptions);
  }

  // Method to switch email provider configuration
  switchEmailProvider(providerConfig: EmailConfig): void {
    this.transporter = nodemailer.createTransport(providerConfig);
  }
}

// Shitch to gmail provider
export const switchToGmailProvider = () => {
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!gmailClientId || !gmailClientSecret) {
    throw new Error('Gmail credentials are not set in the environment variables');
  }

  emailService.switchEmailProvider({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: gmailClientId,
      pass: gmailClientSecret
    },
    secure: false // Use TLS
  });
};


// Singleton instance for easy import and use
export const emailService = new EmailService();
