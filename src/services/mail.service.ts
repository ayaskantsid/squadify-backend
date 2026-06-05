import { Resend } from "resend";

const FROM_EMAIL = "Acme <onboarding@resend.dev>";
const resendApiKey = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn("RESEND_API_KEY is not set. Email sending is disabled.");
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    throw new Error("Email service is not configured. RESEND_API_KEY is required.");
  }

  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (response.error) {
    console.error("Email sending error:", response.error);
    throw new Error(`Failed to send email: ${response.error.message}`);
  }

  return response;
}

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  tripName: string;
  inviterName: string;
  invitationToken: string;
}

export async function sendTripInvitationEmail(data: InvitationEmailData) {
  try {
    const { recipientEmail, recipientName, tripName, inviterName, invitationToken } = data;

    const invitationLink = `${process.env.FRONTEND_URL}/invite/${invitationToken}`;

    const emailContent = `
      <h2>You're invited to a trip!</h2>
      <p>Hi ${recipientName || "there"},</p>
      <p><strong>${inviterName}</strong> has invited you to join the trip <strong>"${tripName}"</strong> on Squadify.</p>
      <p>
        <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p>Or copy this link: ${invitationLink}</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <br/>
      <p>Happy splitting! 🎉</p>
      <p>Team Squadify</p>
    `;

    const response = await sendEmail({
      to: recipientEmail,
      subject: `${inviterName} invited you to "${tripName}" on Squadify`,
      html: emailContent,
    });

    console.log("Email sent successfully:", response.data?.id);
    return response;
  } catch (error) {
    console.error("Error in sendTripInvitationEmail:", error);
    throw error;
  }
}

export async function sendInvitationAcceptedEmail(data: {
  recipientEmail: string;
  recipientName?: string;
  acceptedByName: string;
  tripName: string;
}) {
  try {
    const { recipientEmail, recipientName, acceptedByName, tripName } = data;
    const dashboardLink = process.env.FRONTEND_URL || "#";

    const emailContent = `
      <h2>Invitation Accepted!</h2>
      <p>Hi ${recipientName || "there"},</p>
      <p><strong>${acceptedByName}</strong> has accepted your invitation to join the trip <strong>"${tripName}"</strong>.</p>
      <p>You can now start planning the trip together!</p>
      <p>
        <a href="${dashboardLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Open Squadify
        </a>
      </p>
      <br/>
      <p>Happy splitting! 🎉</p>
      <p>Team Squadify</p>
    `;

    const response = await sendEmail({
      to: recipientEmail,
      subject: `${acceptedByName} accepted your invitation to "${tripName}"`,
      html: emailContent,
    });

    console.log("Email sent successfully:", response.data?.id);
    return response;
  } catch (error) {
    console.error("Error in sendInvitationAcceptedEmail:", error);
    throw error;
  }
}
