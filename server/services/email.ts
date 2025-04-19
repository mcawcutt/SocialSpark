import sgMail from '@sendgrid/mail';

// Check if SendGrid API key is provided
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work correctly.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Common email configurations
// Using a sender that's verified in your SendGrid account
// Hard-coding the verified sender email for now
const FROM_EMAIL = 'matt@bluerocket.co.za';

// Log the actual email being used
console.log('Using sender email address:', FROM_EMAIL);
const APP_NAME = 'Ignyt';
const APP_URL = process.env.NODE_ENV === 'production' 
  ? 'https://app.ignyt.com' 
  : 'http://localhost:5000';

// Basic function to send emails
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid API key not set. Would have sent email:', options);
    return { success: true, mock: true, message: 'No API key - email not actually sent' };
  }
  
  // Using the hard-coded sender email
  console.log('Sending email from:', FROM_EMAIL);
  console.log('Sending email to:', options.to);

  try {
    const msg = {
      from: {
        email: FROM_EMAIL,
        name: 'Ignyt Platform'
      },
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html as string,
    };
    
    console.log('Email message prepared:', msg);
    
    await sgMail.send(msg);
    console.log('Email sent successfully');
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('SendGrid API error:', error.response.body);
    }
    
    // Return error information instead of throwing
    return { 
      success: false, 
      error: error.message,
      details: error.response?.body || {},
      message: 'Failed to send email'
    };
  }
}

// Send partner invitation email
export async function sendInviteEmail(options: {
  email: string;
  name: string;
  token: string;
  brandName: string;
  customMessage?: string;
}) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${encodeURIComponent(options.token)}`;
  const expiryDays = 7;

  const textContent = `
Hello ${options.name},

${options.brandName} has invited you to join their network on ${APP_NAME} to collaborate on social media content.

${options.customMessage ? options.customMessage + '\n\n' : ''}

To accept this invitation, please click on the link below:
${inviteUrl}

This invitation will expire in ${expiryDays} days.

If you have any questions, please contact ${options.brandName} directly.

Best regards,
The ${APP_NAME} Team
  `;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .container {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      background-color: #e03eb6;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .button {
      display: inline-block;
      background-color: #e03eb6;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 5px;
      font-weight: bold;
      margin: 15px 0;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME} - Partner Invitation</h1>
    </div>
    <div class="content">
      <p>Hello ${options.name},</p>
      
      <p>${options.brandName} has invited you to join their network on ${APP_NAME} to collaborate on social media content.</p>
      
      ${options.customMessage ? `<p>${options.customMessage}</p>` : ''}
      
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </div>
      
      <p>This invitation will expire in ${expiryDays} days.</p>
      
      <p>If you have any questions, please contact ${options.brandName} directly.</p>
      
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
    <div class="footer">
      <p>If you did not expect this invitation, you can ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.email,
    subject: `${options.brandName} has invited you to join ${APP_NAME}`,
    text: textContent,
    html: htmlContent,
  });
}