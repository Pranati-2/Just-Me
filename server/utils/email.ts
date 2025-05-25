import { MailService } from '@sendgrid/mail';

// Initialize SendGrid mailService
const mailService = new MailService();

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using SendGrid
 * @param params Email parameters
 * @returns Promise resolving to an object with success status and message
 */
export async function sendEmail(params: EmailParams): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    // Handle dummy or missing API key case for development
    if (!apiKey || apiKey === 'dummy_key') {
      console.log('Using mock email service (SendGrid API key is not set or is a dummy value)');
      console.log('Email would have been sent with the following details:');
      console.log(`To: ${params.to}`);
      console.log(`From: ${params.from || 'notifications@socialmediahub.com'}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Content: ${params.text || '(HTML content)'}`);
      
      // Return success for development purposes
      return { 
        success: true, 
        message: 'Email sending simulated (no real email sent - using dummy API key)' 
      };
    }
    
    // Set API key here to ensure it's set before sending
    mailService.setApiKey(apiKey);

    const mailData = {
      to: params.to,
      from: params.from || 'notifications@socialmediahub.com',
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    };
    
    await mailService.send(mailData);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to send email' 
    };
  }
}