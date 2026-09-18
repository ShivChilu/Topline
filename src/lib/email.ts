import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface StudentEmailPayload {
  studentName: string;
  email: string;
  registrationNumber?: string | null;
  university?: string | null;
  notes?: string | null;
  userId?: string | null;
  templateName?: string | null;
}

export interface EventEmailPayload {
  studentName: string;
  email: string;
  eventName: string;
  eventDate?: string | Date | null;
  eventLocation?: string | null;
  reportingTime?: string | null;
  instructions?: string | null;
  notes?: string | null;
  whatsappGroupLink?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  eventId?: string | null;
  templateName?: string | null;
  customSubject?: string | null;
  customMessage?: string | null;
  confirmationDeadline?: string | null;
}

export function getAppBaseUrl(): string {
  return "https://toplineodc.co.in";
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// Helper to send emails via Resend HTTPS REST API (Preferred on Render) or Nodemailer SMTP fallback
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || process.env.SMTP_FROM || "Topline ODC <updates@toplineodc.co.in>";

  // 1. Primary: Resend HTTPS REST API (Port 443, never blocked on Render)
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: subject,
          html: html,
        }),
      });

      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[RESEND SUCCESS] Email sent to ${to} (ID: ${data.id})`);
        return { success: true };
      } else {
        console.error("[RESEND ERROR]", data);
        if (data.message) {
          console.warn(`Resend API Warning: ${data.message}`);
        }
      }
    } catch (err: any) {
      console.error("[RESEND FETCH FAILED]", err);
    }
  }

  // 2. Secondary Fallback: SMTP / Nodemailer
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (err: any) {
      console.error("[SMTP ERROR]", err);
      return { success: false, message: err.message };
    }
  }

  // 3. Simulation Mode
  console.log(`[EMAIL SIMULATION] Sent to ${to}: ${subject}`);
  return { success: true, simulated: true };
}

/**
 * Creates an EmailLog entry and generates tracked click URLs & open tracking pixel
 */
export async function createTrackedEmailSession({
  to,
  recipientName,
  userId,
  applicationId,
  eventId,
  templateName,
  subject,
  bodyPreview,
}: {
  to: string;
  recipientName?: string | null;
  userId?: string | null;
  applicationId?: string | null;
  eventId?: string | null;
  templateName?: string | null;
  subject: string;
  bodyPreview?: string | null;
}): Promise<{
  emailLogId: string | null;
  getTrackedUrl: (action: string, destinationUrl: string) => string;
  getTrackingPixelHtml: () => string;
}> {
  let emailLogId: string | null = null;

  try {
    const createdLog = await prisma.emailLog.create({
      data: {
        recipientEmail: to,
        recipientName: recipientName || null,
        userId: userId || null,
        applicationId: applicationId || null,
        eventId: eventId || null,
        templateName: templateName || "General Notification",
        subject,
        bodyPreview: bodyPreview ? bodyPreview.substring(0, 200) : null,
        sentAt: new Date(),
      },
    });
    emailLogId = createdLog.id;
  } catch (err) {
    console.error("Failed to create EmailLog audit record:", err);
  }

  const getTrackedUrl = (action: string, destinationUrl: string): string => {
    if (!emailLogId) return destinationUrl;
    return `${getAppBaseUrl()}/api/track/click?emailId=${encodeURIComponent(emailLogId)}&action=${encodeURIComponent(action)}&url=${encodeURIComponent(destinationUrl)}`;
  };

  const getTrackingPixelHtml = (): string => {
    if (!emailLogId) return "";
    return `<img src="${getAppBaseUrl()}/api/track/open?emailId=${encodeURIComponent(emailLogId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  };

  return { emailLogId, getTrackedUrl, getTrackingPixelHtml };
}

/**
 * Global Student Profile Selection Confirmation Email Template
 */
export async function sendStudentSelectionEmail({
  studentName,
  email,
  registrationNumber,
  university,
  notes,
  userId,
  templateName = "Student Profile Selection Confirmation",
}: StudentEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for student." };
    }

    const subject = `🎉 Verified & Selected: Welcome to Topline ODC Roster`;
    const portalUrl = `${getAppBaseUrl()}/events`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId,
      templateName,
      subject,
      bodyPreview: `Profile approved & selected for upcoming events. University: ${university || "N/A"}`,
    });

    const trackedPortalUrl = getTrackedUrl("OPEN_PORTAL", portalUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #059669; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ED0000; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; font-weight: 500; }
        .value { color: #ffffff; font-weight: 600; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">✓ PROFILE SELECTED & VERIFIED</div>
          <h2 style="color: #ffffff; margin-top: 0;">Congratulations, ${studentName}!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            We are pleased to inform you that your profile has been successfully <strong>selected and approved</strong> by the Topline Operations Team for upcoming premium catering and event assignments.
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Profile Details</div>
            <div class="row"><span class="label">Full Name:</span> <span class="value">${studentName}</span></div>
            ${registrationNumber ? `<div class="row"><span class="label">Roll / Reg Number:</span> <span class="value">${registrationNumber}</span></div>` : ""}
            ${university ? `<div class="row"><span class="label">University / College:</span> <span class="value">${university}</span></div>` : ""}
            <div class="row"><span class="label">Profile Status:</span> <span class="value" style="color: #10b981;">Selected / Active</span></div>
          </div>

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Admin Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            You can now log in to the Topline Student Portal to view upcoming events, check scheduled shifts, and confirm attendance.
          </p>

          <div style="text-align: center;">
            <a href="${trackedPortalUrl}" class="btn" style="color: #ffffff;">View Available Events</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an automated system notification.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send student selection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Global Student Profile Status Update (Not Selected / Under Review)
 */
export async function sendStudentDeselectionEmail({
  studentName,
  email,
  notes,
  userId,
  templateName = "Student Profile Status Notice",
}: StudentEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for student." };
    }

    const subject = `Topline ODC — Profile Selection Status Update`;
    const portalUrl = `${getAppBaseUrl()}/profile`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId,
      templateName,
      subject,
      bodyPreview: `Profile status updated. Note: ${notes || "Under review"}`,
    });

    const trackedPortalUrl = getTrackedUrl("OPEN_PORTAL", portalUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #374151; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #4b5563; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">PROFILE STATUS NOTICE</div>
          <h2 style="color: #ffffff; margin-top: 0;">Hello, ${studentName}</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            Your profile status on the Topline Student Portal has been updated. Please ensure your photos, grooming standards, and contact details are complete and up to date.
          </p>

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin: 20px 0;"><strong>Coordinator Note:</strong> ${notes}</div>` : ""}

          <div style="text-align: center;">
            <a href="${trackedPortalUrl}" class="btn" style="color: #ffffff;">Update My Profile</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send deselection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Event-Specific Candidate Selection Email Template with 1-Click RSVP & WhatsApp Group Unlock
 */
export async function sendEventSelectionEmail({
  studentName,
  email,
  eventName,
  eventDate,
  eventLocation,
  reportingTime,
  instructions,
  notes,
  whatsappGroupLink,
  applicationId,
  userId,
  eventId,
  templateName = "Event Selection & WhatsApp Group Invite",
  customSubject,
  customMessage,
  confirmationDeadline,
}: EventEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for candidate." };
    }

    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";
    
    // Replacement dictionary for subject & custom message
    const placeholderData: Record<string, string> = {
      name: studentName,
      studentName: studentName,
      eventName: eventName,
      eventDate: formattedDate,
      eventLocation: eventLocation || "To be communicated",
      reportingTime: reportingTime || "As scheduled",
      instructions: instructions || "",
      notes: notes || "",
      confirmationDeadline: confirmationDeadline || "Immediately upon receipt",
      deadline: confirmationDeadline || "Immediately upon receipt",
    };

    const replacePlaceholders = (text: string) => {
      let res = text;
      for (const [key, val] of Object.entries(placeholderData)) {
        const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
        const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
        res = res.replace(regexDouble, val).replace(regexSingle, val);
      }
      return res;
    };

    let subject = `Confirm your slot for ${eventName}`;
    if (customSubject && customSubject.trim()) {
      subject = replacePlaceholders(customSubject.trim());
    }

    let renderedIntroHtml = `
      <p style="color: #d1d5db; line-height: 1.5; margin: 8px 0 16px 0; font-size: 14px;">
        You are selected for <strong>${eventName}</strong>. Please confirm your availability immediately below to secure your slot on the duty roster.
      </p>
    `;

    if (customMessage && customMessage.trim()) {
      const interpolatedMsg = replacePlaceholders(customMessage.trim());
      const paragraphs = interpolatedMsg
        .split(/\n\n+/)
        .map((p) => `<p style="color: #d1d5db; line-height: 1.6; margin: 12px 0;">${p.replace(/\n/g, "<br />")}</p>`)
        .join("");
      renderedIntroHtml = paragraphs;
    }

    const rawConfirmUrl = applicationId ? `${getAppBaseUrl()}/rsvp/${applicationId}?action=CONFIRM` : `${getAppBaseUrl()}/profile`;
    const rawDeclineUrl = applicationId ? `${getAppBaseUrl()}/rsvp/${applicationId}?action=DECLINE` : `${getAppBaseUrl()}/profile`;
    const rawPortalUrl = `${getAppBaseUrl()}/profile`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId,
      applicationId,
      eventId,
      templateName,
      subject,
      bodyPreview: `Selected for ${eventName} (${formattedDate || "Upcoming"}). Availability confirmation required${confirmationDeadline ? ` before ${confirmationDeadline}` : ""}.`,
    });

    const confirmUrl = getTrackedUrl("CONFIRM_YES", rawConfirmUrl);
    const declineUrl = getTrackedUrl("DECLINE_NO", rawDeclineUrl);
    const portalUrl = getTrackedUrl("OPEN_PORTAL", rawPortalUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #059669; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ED0000; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; font-weight: 500; }
        .value { color: #ffffff; font-weight: 600; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn-confirm { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 16px 28px; border-radius: 8px; font-weight: 800; font-size: 16px; margin: 6px 4px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); text-align: center; }
        .btn-decline { display: inline-block; background: #374151; color: #f87171 !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 6px 4px; border: 1px solid #4b5563; text-align: center; }
        .btn-portal { display: inline-block; background: #ED0000; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">✓ SELECTED FOR EVENT DUTY</div>
          <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 12px;">Congratulations, ${studentName}!</h2>
          
          ${renderedIntroHtml}

          <!-- PRIMARY TOP CONFIRMATION & RSVP ACTION BOX -->
          <div style="background: #0f172a; border: 2px solid #3b82f6; border-radius: 12px; padding: 22px; text-align: center; margin: 20px 0 24px 0; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
            ${
              confirmationDeadline
                ? `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 800; margin-bottom: 14px; display: inline-block; letter-spacing: 0.5px;">
              ⏰ CONFIRMATION DEADLINE: <span style="color: #ffffff; text-decoration: underline;">${confirmationDeadline}</span>
            </div>
            `
                : ""
            }
            <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">⚡ Confirm Your Attendance Now</div>
            <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0; line-height: 1.5;">
              Click below to confirm your slot on the official duty roster and immediately unlock the <strong>WhatsApp Group Link</strong> for briefing.
            </p>

            <div style="margin: 12px 0;">
              <a href="${confirmUrl}" class="btn-confirm" target="_blank" style="display: block; color: #ffffff;">
                ✅ YES, I AM AVAILABLE (Confirm & Join WhatsApp)
              </a>
            </div>
            <div style="margin-top: 10px;">
              <a href="${declineUrl}" class="btn-decline" target="_blank" style="display: block; color: #f87171;">
                ❌ NO, NOT AVAILABLE (Decline & Release Slot)
              </a>
            </div>
          </div>

          <!-- EVENT DETAILS CARD -->
          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Event Assignment Details</div>
            <div class="row"><span class="label">Event Name:</span> <span class="value">${eventName}</span></div>
            ${formattedDate ? `<div class="row"><span class="label">Date:</span> <span class="value">${formattedDate}</span></div>` : ""}
            ${eventLocation ? `<div class="row"><span class="label">Location / Venue:</span> <span class="value">${eventLocation}</span></div>` : ""}
            ${reportingTime ? `<div class="row"><span class="label">Reporting Time:</span> <span class="value">${reportingTime}</span></div>` : ""}
            <div class="row"><span class="label">Selection Status:</span> <span class="value" style="color: #10b981;">Selected (Awaiting RSVP)</span></div>
          </div>

          ${instructions ? `<div style="background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin: 16px 0;"><strong>Instructions:</strong> ${instructions}</div>` : ""}

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Admin / Coordinator Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 20px;">
            Please ensure you are punctual, groomed as per standards, and carry your college / government photo ID.
          </p>

          <div style="text-align: center; margin-top: 10px;">
            <a href="${portalUrl}" class="btn-portal">Open Student Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an automated system notification.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send event selection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Event-Specific Candidate Deselection / Not Selected Email Template
 */
export async function sendEventDeselectionEmail({
  studentName,
  email,
  eventName,
  eventDate,
  notes,
  applicationId,
  userId,
  eventId,
  templateName = "Event Application Status Notice",
}: EventEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for candidate." };
    }

    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";
    const subject = `Topline ODC — Application Status Update: ${eventName}`;
    const portalUrl = `${getAppBaseUrl()}/events`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId,
      applicationId,
      eventId,
      templateName,
      subject,
      bodyPreview: `Not selected for ${eventName}. Active for other gigs.`,
    });

    const trackedPortalUrl = getTrackedUrl("BROWSE_EVENTS", portalUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #374151; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #dc2626; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; font-weight: 500; }
        .value { color: #ffffff; font-weight: 600; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">EVENT APPLICATION UPDATE</div>
          <h2 style="color: #ffffff; margin-top: 0;">Hello, ${studentName}</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            Thank you for your application. Due to quota limitations and specific event requirements, your application for <strong>${eventName}</strong> has not been selected for this particular date.
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Application Details</div>
            <div class="row"><span class="label">Event:</span> <span class="value">${eventName}</span></div>
            ${formattedDate ? `<div class="row"><span class="label">Date:</span> <span class="value">${formattedDate}</span></div>` : ""}
            <div class="row"><span class="label">Status:</span> <span class="value" style="color: #ef4444;">Not Selected for this Event</span></div>
          </div>

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Coordinator Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            <strong>Note:</strong> Your permanent student profile remains active and verified. You are fully eligible to apply for all upcoming catering opportunities on the Topline portal.
          </p>

          <div style="text-align: center;">
            <a href="${trackedPortalUrl}" class="btn" style="color: #ffffff;">Browse Other Events</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send event deselection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Custom Broadcast / Single Message Email Template with Full Action & Open Tracking
 */
export async function sendCustomBroadcastEmail({
  to,
  studentName,
  subject,
  messageBody,
  includeBranding = true,
  userId,
  applicationId,
  eventId,
  templateName = "Custom Broadcast Message",
}: {
  to: string;
  studentName: string;
  subject: string;
  messageBody: string;
  includeBranding?: boolean;
  userId?: string | null;
  applicationId?: string | null;
  eventId?: string | null;
  templateName?: string | null;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!to) {
      return { success: false, message: "No recipient email address provided." };
    }

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to,
      recipientName: studentName,
      userId,
      applicationId,
      eventId,
      templateName,
      subject,
      bodyPreview: messageBody.substring(0, 180),
    });

    const isProfileTarget = 
      Boolean(templateName && templateName.toLowerCase().includes("profile")) || 
      Boolean(subject && subject.toLowerCase().includes("profile")) || 
      Boolean(messageBody && (messageBody.toLowerCase().includes("profile") || messageBody.toLowerCase().includes("100%")));

    let destinationUrl = `${getAppBaseUrl()}/events`;
    let actionKey = "OPEN_PORTAL";
    let buttonLabel = "Go to Topline Portal";

    if (eventId) {
      destinationUrl = `${getAppBaseUrl()}/events/${eventId}`;
      actionKey = "APPLY_EVENT";
      buttonLabel = "Apply for Event – Topline ODC";
    } else if (isProfileTarget) {
      destinationUrl = `${getAppBaseUrl()}/profile`;
      actionKey = "UPDATE_PROFILE";
      buttonLabel = "👉 Complete Your Profile (100%)";
    }

    const portalUrl = getTrackedUrl(actionKey, destinationUrl);

    // Convert markdown link syntax [Text](url) to styled tracked button and replace links with tracked/styled links
    const processedBody = messageBody
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_match, text, rawUrl) => {
          const trackedUrl = getTrackedUrl("APPLY_OR_CUSTOM_CTA", rawUrl);
          return `<div style="text-align: center; margin: 16px 0;"><a href="${trackedUrl}" style="display: inline-block; background-color: #ED0000; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 14px rgba(237, 0, 0, 0.4); text-align: center;">${text}</a></div>`;
        }
      )
      .replace(
        /\{\{\s*profileLink\s*\}\}/gi,
        `<a href="${portalUrl}" style="color: #60a5fa; font-weight: bold; text-decoration: underline;">${destinationUrl}</a>`
      )
      .replace(
        /\{\{\s*applyLink\s*\}\}/gi,
        `<div style="text-align: center; margin: 16px 0;"><a href="${portalUrl}" style="display: inline-block; background-color: #ED0000; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 14px rgba(237, 0, 0, 0.4); text-align: center;">Apply for the Event – Topline ODC →</a></div>`
      );

    const formattedBody = processedBody
      .split("\n\n")
      .map((para) => `<p style="margin-top: 0; margin-bottom: 16px; color: #d1d5db; line-height: 1.7;">${para.replace(/\n/g, "<br/>")}</p>`)
      .join("");

    const hasInlineCta = (messageBody.includes("[") && messageBody.includes("](")) || /\{\{\s*applyLink\s*\}\}/i.test(messageBody);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #2563eb; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-bottom: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 800; font-size: 15px; margin-top: 20px; box-shadow: 0 4px 14px rgba(237, 0, 0, 0.4); }
      </style>
    </head>
    <body>
      <div class="container">
        ${includeBranding ? `
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        ` : ""}
        <div class="content">
          <div class="badge">OFFICIAL NOTIFICATION</div>
          <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Dear ${studentName || "Student"},</h2>
          
          <div style="font-size: 15px; color: #e5e7eb;">
            ${formattedBody}
          </div>

          ${!hasInlineCta ? `
          <div style="text-align: center; margin-top: 28px;">
            <a href="${portalUrl}" class="btn" style="color: #ffffff;">${buttonLabel}</a>
          </div>
          ` : ""}
        </div>
        ${includeBranding ? `
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an official communication from Topline ODC Administration.
        </div>
        ` : ""}
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to,
      subject: subject || "Notification from Topline ODC",
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send custom broadcast email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Dispatches login credentials to newly registered admin / event admin.
 */
export async function sendAdminCredentialsEmail({
  adminName,
  email,
  username,
  password,
  role,
  assignedEventNames = [],
}: {
  adminName: string;
  email: string;
  username: string;
  password: string;
  role: string;
  assignedEventNames?: string[];
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email provided for admin credentials dispatch." };
    }

    const subject = `Your Topline Admin Access Credentials`;
    const loginUrl = `${getAppBaseUrl()}/login`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: adminName,
      templateName: "Admin Login Credentials",
      subject,
      bodyPreview: `Admin credentials issued for username: ${username}, role: ${role}`,
    });

    const trackedLoginUrl = getTrackedUrl("LOGIN_CLICK", loginUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #2563eb; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; font-weight: 500; }
        .value { color: #ffffff; font-weight: 600; font-family: monospace; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">ADMIN ACCESS CREDENTIALS</div>
          <h2 style="color: #ffffff; margin-top: 0;">Welcome, ${adminName}!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            Your account has been created on the Topline Management Portal with <strong>${role}</strong> privileges.
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Login Credentials</div>
            <div class="row"><span class="label">Portal URL:</span> <span class="value" style="color: #60a5fa;">${loginUrl}</span></div>
            <div class="row"><span class="label">Username:</span> <span class="value">${username}</span></div>
            <div class="row"><span class="label">Password:</span> <span class="value">${password}</span></div>
            <div class="row"><span class="label">Assigned Role:</span> <span class="value" style="color: #fbbf24;">${role}</span></div>
            ${
              assignedEventNames.length > 0
                ? `<div class="row"><span class="label">Assigned Event(s):</span> <span class="value" style="color: #a78bfa;">${assignedEventNames.join(", ")}</span></div>`
                : ""
            }
          </div>

          <p style="color: #ef4444; font-size: 13px; line-height: 1.5;">
            <strong>Security Notice:</strong> Please change your password upon your first successful login under Account Settings.
          </p>

          <div style="text-align: center;">
            <a href="${trackedLoginUrl}" class="btn" style="color: #ffffff;">Log In to Dashboard</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send admin credentials email:", error);
    return { success: false, message: error.message };
  }
}

export interface AdminEventAssignmentPayload {
  adminName: string;
  email: string;
  eventName: string;
  eventDate?: string | Date | null;
  eventLocation?: string | null;
  reportingTime?: string | null;
  workType?: string | null;
  workersRequired?: number | null;
  paymentPerStudent?: number | null;
  instructions?: string | null;
  whatsappGroupLink?: string | null;
  assignedByAdminName?: string | null;
}

/**
 * Dispatches notification email to Event Admins when an event is assigned to them.
 */
export async function sendAdminEventAssignmentEmail({
  adminName,
  email,
  eventName,
  eventDate,
  eventLocation,
  reportingTime,
  workType,
  workersRequired,
  paymentPerStudent,
  instructions,
  whatsappGroupLink,
  assignedByAdminName,
}: AdminEventAssignmentPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for event admin assignment." };
    }

    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Upcoming";

    const subject = `🎯 New Event Assigned: ${eventName} — Topline ODC`;
    const loginUrl = `${getAppBaseUrl()}/admin/login`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: adminName,
      templateName: "Admin Event Assignment Notice",
      subject,
      bodyPreview: `You have been assigned as Event Admin for ${eventName} (${formattedDate}).`,
    });

    const trackedLoginUrl = getTrackedUrl("ADMIN_LOGIN_CLICK", loginUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background: #3b82f6; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row:last-child { margin-bottom: 0; }
        .label { color: #9ca3af; font-weight: 500; }
        .value { color: #ffffff; font-weight: 600; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 15px; margin-top: 20px; box-shadow: 0 4px 14px rgba(237, 0, 0, 0.4); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">🎯 NEW EVENT ASSIGNED</div>
          <h2 style="color: #ffffff; margin-top: 0;">Hello, ${adminName}!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            You have been assigned as the <strong>Event Admin</strong> for the upcoming event duty assignment${
              assignedByAdminName ? ` by ${assignedByAdminName}` : ""
            }.
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Event Assignment Details</div>
            <div class="row"><span class="label">Event Name:</span> <span class="value">${eventName}</span></div>
            <div class="row"><span class="label">Event Date:</span> <span class="value">${formattedDate}</span></div>
            ${eventLocation ? `<div class="row"><span class="label">Location / Venue:</span> <span class="value">${eventLocation}</span></div>` : ""}
            ${reportingTime ? `<div class="row"><span class="label">Reporting Time:</span> <span class="value">${reportingTime}</span></div>` : ""}
            ${workType ? `<div class="row"><span class="label">Work Type:</span> <span class="value">${workType}</span></div>` : ""}
            ${workersRequired ? `<div class="row"><span class="label">Workers Required:</span> <span class="value">${workersRequired}</span></div>` : ""}
            ${paymentPerStudent ? `<div class="row"><span class="label">Payout / Student:</span> <span class="value">₹${paymentPerStudent}</span></div>` : ""}
          </div>

          ${
            instructions
              ? `<div style="background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin: 16px 0;"><strong>Coordinator Instructions:</strong> ${instructions}</div>`
              : ""
          }

          ${
            whatsappGroupLink
              ? `<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #6ee7b7; margin: 16px 0;"><strong>Official WhatsApp Group:</strong> <a href="${whatsappGroupLink}" style="color: #34d399; font-weight: bold; text-decoration: underline;" target="_blank">Join Group</a></div>`
              : ""
          }

          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 20px;">
            Please log in to your Admin Portal to manage student candidate selection, track duty RSVP availability, and monitor live attendance check-ins.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${trackedLoginUrl}" class="btn" style="color: #ffffff;">Open Admin Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an official administrative system dispatch.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send admin event assignment email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Student Password Reset Verification Email (OTP & Direct Magic Link)
 */
export async function sendPasswordResetEmail({
  studentName,
  email,
  otp,
  resetToken,
  userId,
}: {
  studentName: string;
  email: string;
  otp: string;
  resetToken: string;
  userId?: string | null;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for password reset." };
    }

    const subject = `🔐 Password Reset Code: ${otp} — Topline ODC`;
    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId: userId || undefined,
      templateName: "Student Password Reset Verification",
      subject,
      bodyPreview: `Your Topline ODC password reset code is ${otp}. Valid for 5 minutes.`,
    });

    const trackedResetUrl = getTrackedUrl("PASSWORD_RESET_CLICK", resetUrl);

    // Format OTP characters with spacing
    const formattedOtp = otp.split("").join(" ");

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 32px 24px; text-align: center; }
        .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; margin-bottom: 20px; }
        .otp-card { background: #0f172a; border: 2px dashed #3b82f6; border-radius: 14px; padding: 24px; margin: 24px 0; text-align: center; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #60a5fa; margin: 10px 0; }
        .timer-badge { display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fbbf24; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 6px; margin-top: 6px; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 15px; margin: 18px 0; box-shadow: 0 4px 14px rgba(237, 0, 0, 0.4); text-align: center; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .note { font-size: 13px; color: #9ca3af; line-height: 1.6; margin-top: 16px; text-align: left; background: #1e293b; padding: 14px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">🔐 PASSWORD RESET REQUEST</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Hello, ${studentName || "Student"}!</h2>
          <p style="color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 0 0 16px 0;">
            We received a request to reset your Topline ODC account password. Use the 6-digit verification code below to set your new password:
          </p>

          <!-- 6-DIGIT OTP BOX -->
          <div class="otp-card">
            <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Verification Code (OTP)</div>
            <div class="otp-code">${formattedOtp}</div>
            <div class="timer-badge">⏰ Valid for strictly 5 minutes</div>
          </div>

          <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 6px 0;">
            Or click the button below to open the secure password reset page directly:
          </p>

          <div>
            <a href="${trackedResetUrl}" class="btn" style="color: #ffffff;">Reset My Password</a>
          </div>

          <div class="note">
            <strong style="color: #f3f4f6;">⚠️ Security Notice:</strong><br />
            This reset code will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email. Your current password remains unchanged and secure.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an automated security verification message.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    return { success: false, message: error.message };
  }
}
