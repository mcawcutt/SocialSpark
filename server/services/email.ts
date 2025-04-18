import { MailService } from '@sendgrid/mail';

// Initialize SendGrid mail service with API key
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY as string);

// Default sender email - you can replace this with your actual sender email
const DEFAULT_FROM_EMAIL = 'noreply@ignyt.app';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { to, subject, text, html, from = DEFAULT_FROM_EMAIL } = options;
    
    // Log email attempt
    console.log(`Attempting to send email to ${to} with subject: ${subject}`);
    
    // Send the email
    await mailService.send({
      to,
      from,
      subject,
      text,
      html,
    });
    
    console.log(`Email successfully sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return false;
  }
}

/**
 * Send a partner invitation email
 */
export async function sendPartnerInvitation(
  email: string, 
  brandName: string,
  inviteLink: string,
  fromEmail?: string
): Promise<boolean> {
  const subject = `You've been invited to join ${brandName} on Ignyt`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #e03eb6; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Ignyt</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
        <h2>You've been invited!</h2>
        <p>${brandName} has invited you to join their retailer network on Ignyt.</p>
        <p>Ignyt is a platform that helps brands distribute content to their retail partners for social media posting.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #e03eb6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        
        <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${inviteLink}</p>
      </div>
      
      <div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">
        <p>This is an automated message from Ignyt. Please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const text = `
    You've been invited to join ${brandName} on Ignyt
    
    ${brandName} has invited you to join their retailer network on Ignyt.
    Ignyt is a platform that helps brands distribute content to their retail partners for social media posting.
    
    To accept the invitation, visit: ${inviteLink}
    
    This is an automated message from Ignyt. Please do not reply to this email.
  `;
  
  return sendEmail({
    to: email,
    subject,
    html,
    text,
    from: fromEmail
  });
}

/**
 * Send a notification that content has been shared for posting
 */
export async function sendContentNotification(
  email: string,
  brandName: string,
  contentTitle: string,
  contentLink: string,
  fromEmail?: string
): Promise<boolean> {
  const subject = `New content ready for posting from ${brandName}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #e03eb6; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Ignyt</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #eee; background-color: #fff;">
        <h2>New Content Available!</h2>
        <p>${brandName} has shared new content for you to post: <strong>${contentTitle}</strong></p>
        <p>You can view and schedule this content on your Ignyt dashboard.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${contentLink}" style="display: inline-block; background-color: #e03eb6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
            View Content
          </a>
        </div>
        
        <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #666;">${contentLink}</p>
      </div>
      
      <div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">
        <p>This is an automated message from Ignyt. Please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const text = `
    New content ready for posting from ${brandName}
    
    ${brandName} has shared new content for you to post: ${contentTitle}
    You can view and schedule this content on your Ignyt dashboard.
    
    To view the content, visit: ${contentLink}
    
    This is an automated message from Ignyt. Please do not reply to this email.
  `;
  
  return sendEmail({
    to: email,
    subject,
    html,
    text,
    from: fromEmail
  });
}