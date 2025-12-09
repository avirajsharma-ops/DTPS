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
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Payment Reminder</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">DTPS - Dietitian Practice System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.clientName}</strong>,
              </p>
              
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                This is a friendly reminder that you have a pending payment. Please complete your payment to continue with your nutrition program.
              </p>
              
              <!-- Payment Details Card -->
              <table role="presentation" style="width: 100%; background-color: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
                    
                    ${data.planName ? `
                    <table role="presentation" style="width: 100%; margin-bottom: 8px;">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 5px 0;">Plan:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; padding: 5px 0;">${data.planName}</td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    ${data.duration ? `
                    <table role="presentation" style="width: 100%; margin-bottom: 8px;">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 5px 0;">Duration:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; padding: 5px 0;">${data.duration}</td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <table role="presentation" style="width: 100%; margin-bottom: 8px;">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 5px 0;">Amount:</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; padding: 5px 0;">₹${data.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
                      <tr>
                        <td style="color: #333333; font-size: 16px; font-weight: 700; padding: 5px 0;">Total Amount:</td>
                        <td style="color: #667eea; font-size: 20px; font-weight: 700; text-align: right; padding: 5px 0;">₹${data.finalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                    
                    ${data.expireDate ? `
                    <p style="color: #ef4444; font-size: 13px; margin: 15px 0 0 0;">
                      ⏰ Link expires on: ${data.expireDate}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px 0;">
                    <a href="${data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      Pay Now ₹${data.finalAmount.toLocaleString('en-IN')}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                If the button doesn't work, copy and paste this link in your browser:<br>
                <a href="${data.paymentLink}" style="color: #667eea; word-break: break-all;">${data.paymentLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              ${data.dietitianName ? `
              <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                Your Dietitian: <strong>${data.dietitianName}</strong>
              </p>
              ` : ''}
              <p style="color: #888888; font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} DTPS - Dietitian Practice System
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                This is an automated reminder. Please do not reply to this email.
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
Payment Reminder - DTPS

Dear ${data.clientName},

This is a friendly reminder that you have a pending payment.

Payment Details:
${data.planName ? `Plan: ${data.planName}` : ''}
${data.duration ? `Duration: ${data.duration}` : ''}
Amount: ₹${data.amount.toLocaleString('en-IN')}
Total: ₹${data.finalAmount.toLocaleString('en-IN')}
${data.expireDate ? `Expires: ${data.expireDate}` : ''}

Pay Now: ${data.paymentLink}

${data.dietitianName ? `Your Dietitian: ${data.dietitianName}` : ''}

© ${new Date().getFullYear()} DTPS - Dietitian Practice System
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
