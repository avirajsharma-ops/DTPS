import nodemailer from 'nodemailer';

// Email configuration - uses environment variables
// SMTP credentials for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || `"DTPS" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Payment Reminder Email Template
export function getPaymentReminderTemplate(data: {
  clientName: string;
  amount: number;
  finalAmount: number;
  planName?: string;
  duration?: string;
  paymentLink: string;
  expireDate?: string;
  dietitianName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Payment Reminder - ${data.planName || 'Your Plan'} - ₹${data.finalAmount}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3AB1A0 0%, #2A9A8B 100%); padding: 32px 24px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Payment Reminder</h1>
              ${data.dietitianName ? `
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">DIETITIAN ${data.dietitianName.toUpperCase()}</p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Greeting with icon -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3AB1A0 0%, #2A9A8B 100%); border-radius: 8px; text-align: center; line-height: 32px;">
                      <span style="font-size: 16px;">🥗</span>
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <p style="color: #1f2937; font-size: 18px; margin: 0; font-weight: 600;">
                      Dear ${data.clientName},
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                This is a friendly reminder that you have a pending payment. Please complete your payment to continue with your nutrition program.
              </p>
              
              <!-- Payment Details Card -->
              <table role="presentation" style="width: 100%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; margin-bottom: 4px;">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; margin-right: 8px;">📋</span>
                          <span style="color: #1f2937; font-size: 16px; font-weight: 600;">Payment Details</span>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; margin-top: 16px;">
                      ${data.planName ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">Plan</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 500; text-align: right; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.planName}</td>
                      </tr>
                      ` : ''}
                      
                      ${data.duration ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">Duration</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 500; text-align: right; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.duration}</td>
                      </tr>
                      ` : ''}
                      
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">Amount</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 500; text-align: right; padding: 8px 0; border-bottom: 1px dashed #e5e7eb;">₹${data.finalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; margin-top: 12px;">
                      <tr>
                        <td style="color: #1f2937; font-size: 16px; font-weight: 700; padding: 8px 0;">Total Amount</td>
                        <td style="color: #3AB1A0; font-size: 22px; font-weight: 700; text-align: right; padding: 8px 0;">₹${data.finalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                    
                    ${data.expireDate ? `
                    <table role="presentation" style="width: 100%; margin-top: 16px;">
                      <tr>
                        <td style="background-color: #fef3cd; padding: 12px 16px; border-radius: 8px; text-align: center;">
                          <span style="color: #856404; font-size: 13px;">
                            ⏰ Link expires on: ${data.expireDate}
                          </span>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px 0;">
                    <a href="${data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #3AB1A0 0%, #2A9A8B 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(58, 177, 160, 0.35);">
                      Pay Now ₹${data.finalAmount.toLocaleString('en-IN')} →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                Secure payment powered by DTPS
              </p>
            </td>
          </tr>
          
          <!-- Footer with gradient line -->
          <tr>
            <td style="padding: 0;">
              <div style="height: 4px; background: linear-gradient(90deg, #3AB1A0 0%, #2A9A8B 50%, #3AB1A0 100%); border-radius: 0 0 16px 16px;"></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Payment Reminder - DTPS

Dear ${data.clientName},

This is a friendly reminder that you have a pending payment.

Payment Details:
${data.planName ? `Plan: ${data.planName}` : ''}
${data.duration ? `Duration: ${data.duration}` : ''}
Amount: ₹${data.finalAmount.toLocaleString('en-IN')}
Total: ₹${data.finalAmount.toLocaleString('en-IN')}
${data.expireDate ? `Expires: ${data.expireDate}` : ''}

Pay Now: ${data.paymentLink}

${data.dietitianName ? `Your Dietitian: ${data.dietitianName}` : ''}

Secure payment powered by DTPS
  `;

  return { subject, html, text };
}

// Invoice Email Template
export function getInvoiceEmailTemplate(data: {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  tax: number;
  discount: number;
  finalAmount: number;
  planName?: string;
  duration?: string;
  paymentId?: string;
  paidAt?: string;
  dietitianName?: string;
  dietitianEmail?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Invoice #${data.invoiceNumber} - DTPS`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">INVOICE</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">#${data.invoiceNumber}</p>
            </td>
          </tr>
          
          <!-- Invoice Info -->
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="vertical-align: top; width: 50%;">
                    <h3 style="color: #333333; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</h3>
                    <p style="color: #555555; font-size: 15px; margin: 0; line-height: 1.6;">
                      <strong>${data.clientName}</strong><br>
                      ${data.clientEmail}
                    </p>
                  </td>
                  <td style="vertical-align: top; width: 50%; text-align: right;">
                    <h3 style="color: #333333; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Details</h3>
                    <p style="color: #555555; font-size: 14px; margin: 0; line-height: 1.6;">
                      Date: ${data.invoiceDate}<br>
                      ${data.paidAt ? `Paid: ${data.paidAt}` : ''}<br>
                      ${data.paymentId ? `Txn ID: ${data.paymentId}` : ''}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Services Table -->
              <table role="presentation" style="width: 100%; margin-top: 30px; border-collapse: collapse;">
                <tr style="background-color: #f8fafc;">
                  <th style="text-align: left; padding: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666666; border-bottom: 2px solid #e2e8f0;">Description</th>
                  <th style="text-align: right; padding: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #666666; border-bottom: 2px solid #e2e8f0;">Amount</th>
                </tr>
                <tr>
                  <td style="padding: 16px 12px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 15px; color: #333333; font-weight: 500;">
                      ${data.planName || 'Nutrition Consultation'}
                    </p>
                    ${data.duration ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #888888;">Duration: ${data.duration}</p>` : ''}
                  </td>
                  <td style="padding: 16px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #333333;">
                    ₹${data.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
                
                ${data.tax > 0 ? `
                <tr>
                  <td style="padding: 10px 12px; text-align: right; font-size: 14px; color: #666666;">Tax (${data.tax}%)</td>
                  <td style="padding: 10px 12px; text-align: right; font-size: 14px; color: #666666;">
                    +₹${((data.amount * data.tax) / 100).toLocaleString('en-IN')}
                  </td>
                </tr>
                ` : ''}
                
                ${data.discount > 0 ? `
                <tr>
                  <td style="padding: 10px 12px; text-align: right; font-size: 14px; color: #10b981;">Discount (${data.discount}%)</td>
                  <td style="padding: 10px 12px; text-align: right; font-size: 14px; color: #10b981;">
                    -₹${((data.amount * data.discount) / 100).toLocaleString('en-IN')}
                  </td>
                </tr>
                ` : ''}
                
                <tr style="background-color: #f0fdf4;">
                  <td style="padding: 16px 12px; text-align: right; font-size: 16px; color: #333333; font-weight: 700;">Total Paid</td>
                  <td style="padding: 16px 12px; text-align: right; font-size: 20px; color: #10b981; font-weight: 700;">
                    ₹${data.finalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </table>
              
              <!-- Payment Status -->
              <table role="presentation" style="width: 100%; margin-top: 30px;">
                <tr>
                  <td style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
                    <span style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ✓ PAID
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              ${data.dietitianName ? `
              <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                Issued by: <strong>${data.dietitianName}</strong>
                ${data.dietitianEmail ? `<br><a href="mailto:${data.dietitianEmail}" style="color: #667eea;">${data.dietitianEmail}</a>` : ''}
              </p>
              ` : ''}
              <p style="color: #888888; font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} DTPS - Dietitian Practice System
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Thank you for your payment!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
INVOICE #${data.invoiceNumber}
DTPS - Dietitian Practice System
Date: ${data.invoiceDate}

Bill To:
${data.clientName}
${data.clientEmail}

Description: ${data.planName || 'Nutrition Consultation'}
${data.duration ? `Duration: ${data.duration}` : ''}

Amount: ₹${data.amount.toLocaleString('en-IN')}
${data.tax > 0 ? `Tax (${data.tax}%): +₹${((data.amount * data.tax) / 100).toLocaleString('en-IN')}` : ''}
${data.discount > 0 ? `Discount (${data.discount}%): -₹${((data.amount * data.discount) / 100).toLocaleString('en-IN')}` : ''}

Total Paid: ₹${data.finalAmount.toLocaleString('en-IN')}

Status: PAID
${data.paidAt ? `Paid on: ${data.paidAt}` : ''}
${data.paymentId ? `Transaction ID: ${data.paymentId}` : ''}

${data.dietitianName ? `Issued by: ${data.dietitianName}` : ''}
${data.dietitianEmail ? `Contact: ${data.dietitianEmail}` : ''}

© ${new Date().getFullYear()} DTPS - Dietitian Practice System
Thank you for your payment!
  `;

  return { subject, html, text };
}
