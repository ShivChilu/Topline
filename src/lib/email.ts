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

export async function getMainWhatsAppGroupLink(): Promise<string> {
  try {
    const config = await prisma.setting.findUnique({
      where: { key: "homepage_content" },
    });
    if (config?.value && typeof config.value === "object" && "whatsappLink" in (config.value as any)) {
      const link = String((config.value as any).whatsappLink).trim();
      if (link && (link.startsWith("http://") || link.startsWith("https://"))) {
        return link;
      }
    }
  } catch (err) {
    console.error("Error fetching main WhatsApp group link:", err);
  }
  return "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh";
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

    const subject = `Topline ODC — Profile Verified & Selected for Event Roster`;
    const portalUrl = `${getAppBaseUrl()}/events`;
    const mainWhatsAppGroupUrl = await getMainWhatsAppGroupLink();

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: email,
      recipientName: studentName,
      userId,
      templateName,
      subject,
      bodyPreview: `Profile approved & selected for upcoming events. University: ${university || "N/A"}`,
    });

    const trackedPortalUrl = getTrackedUrl("OPEN_PORTAL", portalUrl);
    const trackedWhatsAppUrl = getTrackedUrl("JOIN_MAIN_WHATSAPP", mainWhatsAppGroupUrl);

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
        .btn { display: inline-block; background: #ED0000; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">✓ PROFILE SELECTED &amp; VERIFIED</div>
          <h2 style="color: #ffffff; margin-top: 0;">Congratulations, ${studentName}!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            We are pleased to inform you that your student profile has been successfully <strong>selected and approved</strong> by the Topline Operations Team for upcoming premium catering, hotel, and banquet event assignments.
          </p>

          <!-- OFFICIAL MAIN WHATSAPP GROUP JOIN BOX -->
          <div style="background: #064e3b; border: 1.5px solid #10b981; border-radius: 10px; padding: 20px; margin: 22px 0; text-align: center; box-shadow: 0 4px 15px rgba(6, 78, 59, 0.4);">
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
              💬 Join Our Official WhatsApp Community
            </div>
            <p style="font-size: 13px; color: #d1fae5; margin: 0 0 16px 0; line-height: 1.5;">
              If you are not yet in our official Topline WhatsApp group, join now to receive instant catering shift announcements, urgent vacancy alerts, and direct coordinator updates!
            </p>
            <div style="text-align: center;">
              <a href="${trackedWhatsAppUrl}" target="_blank" style="display: inline-block; background: #25D366; color: #022c22 !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);">
                👉 Join Official WhatsApp Group
              </a>
            </div>
          </div>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Profile Details</div>
            <div class="row"><span class="label">Full Name:</span> <span class="value">${studentName}</span></div>
            ${registrationNumber ? `<div class="row"><span class="label">Roll / Reg Number:</span> <span class="value">${registrationNumber}</span></div>` : ""}
            ${university ? `<div class="row"><span class="label">University / College:</span> <span class="value">${university}</span></div>` : ""}
            <div class="row"><span class="label">Profile Status:</span> <span class="value" style="color: #10b981;">Selected / Active Roster</span></div>
          </div>

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Admin Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            You can now log in to the Topline Student Portal to view upcoming events, apply for high-paying catering shifts, and confirm your attendance.
          </p>

          <div style="text-align: center; margin-top: 10px;">
            <a href="${trackedPortalUrl}" class="btn" style="color: #ffffff;">View Available Events</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC &amp; Catering Management. All rights reserved.<br />
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
    const mainWhatsAppUrl = await getMainWhatsAppGroupLink();
    const trackedMainWhatsAppUrl = getTrackedUrl("JOIN_MAIN_WHATSAPP", mainWhatsAppUrl);

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
              CONFIRMATION DEADLINE: <span style="color: #ffffff; text-decoration: underline;">${confirmationDeadline}</span>
            </div>
            `
                : ""
            }
            <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">Confirm Your Attendance Now</div>
            <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0; line-height: 1.5;">
              Click below to confirm your slot on the official duty roster and immediately unlock the <strong>WhatsApp Group Link</strong> for briefing.
            </p>

            <div style="margin: 12px 0;">
              <a href="${confirmUrl}" class="btn-confirm" target="_blank" style="display: block; color: #ffffff;">
                YES, I AM AVAILABLE (Confirm & Join WhatsApp)
              </a>
            </div>
            <div style="margin-top: 10px;">
              <a href="${declineUrl}" class="btn-decline" target="_blank" style="display: block; color: #f87171;">
                NO, NOT AVAILABLE (Decline & Release Slot)
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

          <!-- OFFICIAL MAIN WHATSAPP GROUP JOIN BOX -->
          <div style="background: #064e3b; border: 1.5px solid #10b981; border-radius: 10px; padding: 16px; margin: 20px 0; text-align: center;">
            <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
              Official Topline WhatsApp Community
            </div>
            <p style="font-size: 12px; color: #d1fae5; margin: 0 0 12px 0; line-height: 1.4;">
              Not in our main group yet? Join for quick event slot announcements and daily shift updates!
            </p>
            <a href="${trackedMainWhatsAppUrl}" target="_blank" style="display: inline-block; background: #25D366; color: #022c22 !important; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);">
              Join Main WhatsApp Group
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 20px;">
            Please ensure you are punctual, groomed as per standards, and carry your college / government photo ID.
          </p>

          <div style="text-align: center; margin-top: 10px;">
            <a href="${portalUrl}" class="btn-portal">Open Student Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC &amp; Catering Management. All rights reserved.<br />
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

/**
 * Admin Notification Email: Triggered when a referred student completes their 1st event shift
 */
export async function sendReferralCompletedAdminAlert({
  referrerName,
  referrerEmail,
  referrerPhone,
  referrerUpi,
  refereeName,
  refereePhone,
  refereeEmail,
  eventName,
  rewardAmount,
}: {
  referrerName: string;
  referrerEmail?: string | null;
  referrerPhone?: string | null;
  referrerUpi?: string | null;
  refereeName: string;
  refereePhone?: string | null;
  refereeEmail?: string | null;
  eventName: string;
  rewardAmount: number;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    // 1. Determine admin recipients (all active ADMIN/SUPERADMIN users or fallbacks)
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPERADMIN"] },
        isActive: true,
        email: { not: null },
      },
      select: { email: true, name: true },
    });

    const recipientEmails = admins.map((a) => a.email!).filter(Boolean);
    if (recipientEmails.length === 0) {
      // Fallback admin email if no DB admin email configured
      const fallback = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || "contact@toplinecatering.com";
      recipientEmails.push(fallback);
    }

    const subject = `💰 Referral Milestone Completed: ₹${rewardAmount} for ${referrerName}`;
    const adminReferralsUrl = `${getAppBaseUrl()}/admin/referrals`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1.5px; }
        .content { padding: 30px 24px; }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #6ee7b7; padding: 6px 14px; border-radius: 9999px; font-weight: 800; font-size: 13px; margin-bottom: 16px; }
        .reward-card { background: #0f172a; border: 2px solid #8b5cf6; border-radius: 14px; padding: 20px; margin: 20px 0; text-align: center; }
        .reward-amt { font-size: 32px; font-weight: 900; color: #facc15; margin: 6px 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
        .details-table td { padding: 8px 10px; border-bottom: 1px solid #1f2937; }
        .details-table td:first-child { color: #9ca3af; font-weight: 600; width: 40%; }
        .details-table td:last-child { color: #f3f4f6; font-weight: 700; }
        .btn { display: inline-block; background: #8b5cf6; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; margin: 16px 0; text-align: center; }
        .footer { padding: 18px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC ADMIN ALERT</h1>
        </div>
        <div class="content">
          <div class="badge">🎁 REFERRAL REWARD UNLOCKED</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 19px;">Referral Milestone Completed</h2>
          <p style="color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 0 0 14px 0;">
            A student has completed their first event work with verified attendance, qualifying their referrer for a cash reward payout.
          </p>

          <div class="reward-card">
            <div style="font-size: 12px; font-weight: 700; color: #c4b5fd; text-transform: uppercase;">Unlocked Reward</div>
            <div class="reward-amt">₹${rewardAmount}</div>
            <div style="font-size: 12px; color: #94a3b8;">Pending Offline Settlement</div>
          </div>

          <table class="details-table">
            <tr>
              <td>Student Referrer:</td>
              <td>${referrerName} ${referrerPhone ? `(${referrerPhone})` : ""}</td>
            </tr>
            <tr>
              <td>Referrer Email:</td>
              <td>${referrerEmail || "N/A"}</td>
            </tr>
            <tr>
              <td>Payout UPI ID:</td>
              <td style="color: #6ee7b7; font-family: monospace;">${referrerUpi || "⚠️ Not added yet (Profile)"}</td>
            </tr>
            <tr>
              <td>Friend (Referee):</td>
              <td>${refereeName} ${refereePhone ? `(${refereePhone})` : ""}</td>
            </tr>
            <tr>
              <td>Qualifying Event:</td>
              <td>${eventName}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${adminReferralsUrl}" class="btn" style="color: #ffffff;">Open Referrals Dashboard & Settle Payout</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC Admin Automation.
        </div>
      </div>
    </body>
    </html>
    `;

    // Send alert to all admin recipients
    let lastResult = { success: true };
    for (const email of recipientEmails) {
      lastResult = await sendEmail({
        to: email,
        subject,
        html: htmlContent,
      });
    }

    return lastResult;
  } catch (error: any) {
    console.error("Failed to send referral completion admin alert:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Student Referrer Email: Triggered when their referred friend attends their first event
 */
export async function sendReferralCompletedStudentAlert({
  referrerName,
  referrerEmail,
  referrerUpi,
  refereeName,
  eventName,
  rewardAmount,
}: {
  referrerName: string;
  referrerEmail: string;
  referrerUpi?: string | null;
  refereeName: string;
  eventName: string;
  rewardAmount: number;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!referrerEmail) {
      return { success: false, message: "No email address provided for student referrer." };
    }

    const subject = `🎉 Referral Reward Unlocked: ₹${rewardAmount} for inviting ${refereeName}!`;
    const profileUrl = `${getAppBaseUrl()}/profile`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 26px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 30px 24px; text-align: center; }
        .badge { display: inline-block; background: rgba(250, 204, 21, 0.15); border: 1px solid #facc15; color: #fde047; padding: 6px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; margin-bottom: 18px; }
        .reward-card { background: #0f172a; border: 2px dashed #8b5cf6; border-radius: 14px; padding: 22px; margin: 20px 0; }
        .reward-amt { font-size: 38px; font-weight: 900; color: #facc15; margin: 8px 0; }
        .upi-box { background: #1e293b; border-radius: 10px; padding: 12px; margin: 16px 0; font-size: 13px; text-align: left; }
        .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; margin: 16px 0; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); text-align: center; }
        .footer { padding: 18px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE STUDENT REWARDS</h1>
        </div>
        <div class="content">
          <div class="badge">🎉 REWARD READY FOR PAYOUT</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Congratulations, ${referrerName || "Topline Partner"}!</h2>
          <p style="color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 0 0 16px 0;">
            Your friend <strong style="color: #ffffff;">${refereeName}</strong> has successfully completed their first event shift at <strong style="color: #ffffff;">${eventName}</strong>!
          </p>

          <div class="reward-card">
            <div style="font-size: 12px; font-weight: 700; color: #c4b5fd; text-transform: uppercase;">Your Unlocked Bonus</div>
            <div class="reward-amt">₹${rewardAmount}</div>
            <div style="font-size: 12px; color: #94a3b8;">Approved & Queued for UPI Transfer</div>
          </div>

          <div class="upi-box">
            <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700;">Payout Destination UPI:</div>
            <div style="color: #6ee7b7; font-family: monospace; font-size: 14px; font-weight: 700; margin-top: 4px;">
              ${referrerUpi ? referrerUpi : "⚠️ No UPI ID found! Please add your UPI ID in profile."}
            </div>
          </div>

          <div>
            <a href="${profileUrl}" class="btn" style="color: #ffffff;">View My Referral Earnings</a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin-top: 20px;">
            Our administrative team will process your payment via UPI. Keep inviting your college friends to earn up to ₹150 for every verified friend!
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: referrerEmail,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send referral completion student email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Student Referrer Email: Triggered when Admin marks referral reward as PAID (Settled)
 */
export async function sendReferralPayoutPaidEmail({
  referrerName,
  referrerEmail,
  referrerUpi,
  refereeName,
  eventName,
  paidAmount,
  paidReference,
  totalLifetimeEarned,
  userId,
}: {
  referrerName: string;
  referrerEmail: string;
  referrerUpi?: string | null;
  refereeName: string;
  eventName?: string | null;
  paidAmount: number;
  paidReference?: string | null;
  totalLifetimeEarned?: number | null;
  userId?: string | null;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!referrerEmail) {
      return { success: false, message: "No email address provided for student referrer." };
    }

    const subject = `💰 Payout Processed: ₹${paidAmount} Referral Reward Credited to Your UPI!`;
    const profileUrl = `${getAppBaseUrl()}/profile`;
    const utrSnippet = paidReference && paidReference.trim() ? paidReference.trim() : "Direct UPI Transfer Completed";

    const { getTrackedUrl, getTrackingPixelHtml } = await createTrackedEmailSession({
      to: referrerEmail,
      recipientName: referrerName,
      userId,
      templateName: "Referral Reward Payout Settled",
      subject,
      bodyPreview: `Referral reward of ₹${paidAmount} for inviting ${refereeName} has been paid to your UPI (${referrerUpi || "UPI"}). UTR: ${utrSnippet}`,
    });

    const trackedProfileUrl = getTrackedUrl("VIEW_REWARDS_DASHBOARD", profileUrl);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 26px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 30px 24px; text-align: center; }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #6ee7b7; padding: 6px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; margin-bottom: 18px; }
        .paid-card { background: #064e3b/30; border: 2px solid #10b981; border-radius: 14px; padding: 22px; margin: 20px 0; }
        .paid-amt { font-size: 40px; font-weight: 900; color: #34d399; margin: 8px 0; }
        .details-box { background: #1f2937; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px; text-align: left; }
        .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #374151; }
        .details-row:last-child { border-bottom: none; }
        .label { color: #9ca3af; font-weight: 600; }
        .val { color: #ffffff; font-weight: 700; }
        .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; margin: 16px 0; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); text-align: center; }
        .footer { padding: 18px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE REWARDS SETTLEMENT</h1>
        </div>
        <div class="content">
          <div class="badge">✅ PAYMENT TRANSFERRED SUCCESSFULLY</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Hi ${referrerName || "Topline Partner"}, Your Referral Payout is Completed!</h2>
          <p style="color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 0 0 16px 0;">
            Great news! Our administrative team has processed your referral cash reward for inviting <strong style="color: #ffffff;">${refereeName}</strong>.
          </p>

          <div class="paid-card">
            <div style="font-size: 12px; font-weight: 700; color: #a7f3d0; text-transform: uppercase;">Amount Deposited</div>
            <div class="paid-amt">₹${paidAmount}</div>
            <div style="font-size: 12px; color: #6ee7b7; font-weight: 600;">Status: Paid to UPI</div>
          </div>

          <div class="details-box">
            <div class="details-row">
              <span class="label">Destination UPI:</span>
              <span class="val" style="color: #6ee7b7; font-family: monospace;">${referrerUpi || "Registered UPI Handle"}</span>
            </div>
            <div class="details-row">
              <span class="label">Payment Reference / UTR:</span>
              <span class="val" style="font-family: monospace; color: #facc15;">${utrSnippet}</span>
            </div>
            <div class="details-row">
              <span class="label">Referred Friend:</span>
              <span class="val">${refereeName}</span>
            </div>
            ${eventName ? `
            <div class="details-row">
              <span class="label">Completed Event:</span>
              <span class="val">${eventName}</span>
            </div>
            ` : ""}
            ${totalLifetimeEarned !== undefined && totalLifetimeEarned !== null ? `
            <div class="details-row">
              <span class="label">Total Lifetime Referral Earnings:</span>
              <span class="val" style="color: #facc15; font-size: 14px;">₹${totalLifetimeEarned}</span>
            </div>
            ` : ""}
          </div>

          <div>
            <a href="${trackedProfileUrl}" class="btn" style="color: #ffffff;">View My Rewards Dashboard</a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin-top: 20px;">
            Thank you for being an active Topline student affiliate. Keep sharing your invite link to continue earning up to ₹150 for every friend who joins!
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management.
        </div>
      </div>
      ${getTrackingPixelHtml()}
    </body>
    </html>
    `;

    return await sendEmail({
      to: referrerEmail,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send referral payout paid email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Automated Admin Alert Email: Triggered when 5 or more candidates are pending for review / selection.
 */
export async function sendAdminPendingReviewAlertEmail({
  totalPending,
  masterPendingCount,
  eventPendingCount,
  sampleCandidates,
}: {
  totalPending: number;
  masterPendingCount: number;
  eventPendingCount: number;
  sampleCandidates: Array<{
    name: string;
    registrationNumber: string;
    university?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    source: "Master Profile" | "Event Application";
    eventName?: string | null;
  }>;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    const adminEmail = "chiluverushivaprasad02@gmail.com";
    const subject = `🔔 Topline Daily Digest: ${totalPending} 100% Complete Candidates Pending Review`;
    const appUrl = getAppBaseUrl();
    const studentsUrl = `${appUrl}/admin/students`;
    const applicationsUrl = `${appUrl}/admin/applications`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 620px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: #ED0000; padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
        .content { padding: 26px 22px; }
        .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 5px 12px; border-radius: 9999px; font-weight: 800; font-size: 12px; margin-bottom: 14px; text-transform: uppercase; }
        .stat-card { background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 14px; text-align: center; }
        .stat-num { font-size: 28px; font-weight: 900; color: #facc15; margin: 4px 0; }
        .stat-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; }
        .candidate-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .btn-primary { display: inline-block; background: #ED0000; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; font-size: 13px; margin: 6px 4px; text-align: center; }
        .btn-secondary { display: inline-block; background: #1f2937; border: 1px solid #374151; color: #f3f4f6 !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; margin: 6px 4px; text-align: center; }
        .footer { padding: 18px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE CONTROL NOTIFICATION</h1>
        </div>
        <div class="content">
          <div class="badge">⚠️ 100% Complete Profiles Pending Review</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 19px;">${totalPending} Candidates Ready for Selection</h2>
          <p style="color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 0 0 16px 0;">
            Hi Admin, you have <strong>${totalPending} candidate(s)</strong> with <strong>100% complete profiles</strong> awaiting your review in the Topline dashboard.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
            <tr>
              <td style="padding: 6px; width: 50%;">
                <div class="stat-card">
                  <div class="stat-num">${masterPendingCount}</div>
                  <div class="stat-label">Master List Profiles</div>
                </div>
              </td>
              <td style="padding: 6px; width: 50%;">
                <div class="stat-card">
                  <div class="stat-num">${eventPendingCount}</div>
                  <div class="stat-label">Event Applications</div>
                </div>
              </td>
            </tr>
          </table>

          <h3 style="color: #ffffff; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Recent Pending Candidates</h3>
          ${sampleCandidates.slice(0, 5).map(c => `
            <div class="candidate-card">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-weight: 800; color: #ffffff; font-size: 14px;">${c.name} <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">(${c.registrationNumber})</span></div>
                    <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${c.university || "University Unspecified"} • ${c.phone || "No phone"}</div>
                    ${c.eventName ? `<div style="font-size: 11px; color: #38bdf8; margin-top: 2px;">Applied for: <strong>${c.eventName}</strong></div>` : ''}
                  </td>
                  <td align="right" valign="top">
                    <span style="font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); text-transform: uppercase; display: inline-block;">
                      ${c.source}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          `).join("")}

          <div style="text-align: center; margin: 26px 0 10px 0;">
            <a href="${studentsUrl}" class="btn-primary" style="color: #ffffff;">Review Master Students (${masterPendingCount})</a>
            <a href="${applicationsUrl}" class="btn-secondary" style="color: #ffffff;">Review Event Applications (${eventPendingCount})</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management Automation.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: adminEmail,
      subject,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send admin pending review alert email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sends a high-conversion referral reminder/nudge email to students who created a referral code
 * but have not yet invited any friends.
 */
export async function sendReferralReminderEmail({
  studentName,
  email,
  referralCode,
  upiId,
  rewardAmount = 150,
  userId,
}: {
  studentName: string;
  email: string;
  referralCode: string;
  upiId?: string | null;
  rewardAmount?: number;
  userId?: string | null;
}) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Invalid recipient email" };
    }

    const baseUrl = getAppBaseUrl();
    const inviteUrl = `${baseUrl}/register?ref=${encodeURIComponent(referralCode)}`;
    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
      `Hey! Join Topline with my referral code "${referralCode}" to work premium catering and hospitality gigs: ${inviteUrl}`
    )}`;
    const profileUrl = `${baseUrl}/profile`;

    const subject = `🚀 Share your Topline Code "${referralCode}" & Earn up to ₹${rewardAmount} per Friend!`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border-radius: 24px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .header { background: linear-gradient(135deg, #4c1d95 0%, #312e81 50%, #0f172a 100%); padding: 36px 28px; text-align: center; border-bottom: 1px solid rgba(147, 51, 234, 0.2); }
        .badge { display: inline-block; background: #f59e0b; color: #020617; font-weight: 900; font-size: 11px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .title { font-size: 24px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3; }
        .subtitle { font-size: 14px; color: #c4b5fd; margin: 0; }
        .content { padding: 32px 28px; background: #111827; }
        .greeting { font-size: 16px; color: #f8fafc; font-weight: 700; margin-bottom: 16px; }
        .p-text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0; }
        
        .code-box { background: #0f172a; border: 2px dashed #9333ea; border-radius: 20px; padding: 22px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 11px; font-weight: 800; color: #a855f7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .code-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 900; color: #fbbf24; letter-spacing: 4px; margin: 4px 0 10px 0; }
        .link-text { font-size: 11px; color: #94a3b8; word-break: break-all; font-family: monospace; background: rgba(255, 255, 255, 0.05); padding: 8px 12px; border-radius: 10px; display: inline-block; margin-top: 4px; }
        
        .steps-card { background: rgba(255, 255, 255, 0.03); border: 1px solid #1f2937; border-radius: 18px; padding: 20px; margin: 24px 0; }
        .step-item { display: flex; align-items: flex-start; margin-bottom: 14px; }
        .step-num { width: 26px; height: 26px; border-radius: 8px; background: #9333ea; color: #ffffff; font-weight: 900; font-size: 12px; display: inline-block; text-align: center; line-height: 26px; margin-right: 12px; flex-shrink: 0; }
        .step-text { font-size: 13px; color: #e2e8f0; line-height: 1.4; }
        
        .btn-whatsapp { display: block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 900; font-size: 15px; padding: 15px 24px; border-radius: 16px; text-align: center; margin: 16px 0 10px 0; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.3); }
        .btn-portal { display: block; background: #374151; color: #f8fafc !important; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 20px; border-radius: 14px; text-align: center; margin-top: 8px; }
        
        .upi-badge { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 12px; padding: 10px 14px; border-radius: 12px; margin-top: 20px; text-align: center; }
        
        .footer { padding: 24px 28px; background: #0f172a; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1f2937; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="badge">🎁 Earn Unlimited Cash</div>
          <h1 class="title">Share Your Code & Start Earning</h1>
          <p class="subtitle">Topline Student Referral Program</p>
        </div>

        <div class="content">
          <div class="greeting">Hey ${studentName || "Student Partner"},</div>
          <p class="p-text">
            You have already activated your Topline referral code, but haven't invited anyone yet! 
            Invite your college batchmates and friends to earn up to <strong>₹${rewardAmount} in cash</strong> for every friend who joins and works their first event shift.
          </p>

          <div class="code-box">
            <div class="code-label">Your Unique Referral Code</div>
            <div class="code-val">${referralCode}</div>
            <div class="link-text">${inviteUrl}</div>
          </div>

          <div class="steps-card">
            <div style="font-weight: 800; color: #f8fafc; font-size: 13px; text-transform: uppercase; margin-bottom: 12px;">How to earn in 3 easy steps:</div>
            
            <div class="step-item">
              <span class="step-num">1</span>
              <div class="step-text"><strong>Share your link or code</strong> with your college classmates on WhatsApp, Instagram, or Telegram.</div>
            </div>
            
            <div class="step-item">
              <span class="step-num">2</span>
              <div class="step-text"><strong>Friend completes 1st shift:</strong> Your friend signs up, applies for a catering gig, and attends duty.</div>
            </div>
            
            <div class="step-item" style="margin-bottom: 0;">
              <span class="step-num">3</span>
              <div class="step-text"><strong>Receive up to ₹${rewardAmount} Cash:</strong> Reward is deposited directly to your registered UPI ID!</div>
            </div>
          </div>

          <a href="${whatsappShareUrl}" target="_blank" class="btn-whatsapp">
            📲 Share Code on WhatsApp Now
          </a>

          <a href="${profileUrl}" target="_blank" class="btn-portal">
            📊 View Your Rewards Hub
          </a>

          ${upiId ? `
            <div class="upi-badge">
              💳 Payouts are deposited directly to your UPI: <strong>${upiId}</strong>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Hospitality Operations.<br>
          For questions or assistance, contact student support at <strong>7986955634</strong>.
        </div>
      </div>
    </body>
    </html>
    `;

    const res = await sendEmail({ to: email, subject, html });

    // Track in EmailLog
    if (res.success && userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          recipientEmail: email,
          recipientName: studentName,
          templateName: "Referral Activation & Boost Reminder",
          subject,
          bodyPreview: `Referral code: ${referralCode}. Earn up to ₹${rewardAmount} per friend.`,
          sentAt: new Date(),
        },
      }).catch((err) => console.error("Error logging referral reminder email:", err));
    }

    return res;
  } catch (error: any) {
    console.error("sendReferralReminderEmail error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Sends a progress nudge email to the student referrer regarding their referred friend:
 * - Case 1 ("ASK_FRIEND_APPLY"): Friend signed up with their code, but hasn't applied for any event. Referrer is asked to push their friend to apply so they can earn up to ₹150.
 * - Case 2 ("FRIEND_APPLIED"): Friend applied for an event. Referrer is notified that reward (up to ₹150) will unlock once their friend attends and marks attendance.
 */
export async function sendReferralProgressNudgeEmail({
  referrerName,
  referrerEmail,
  referrerPhone,
  referrerUpi,
  referrerCode,
  refereeName,
  refereePhone,
  refereeId,
  nudgeType,
  eventName,
  eventDate,
  rewardAmount = 150,
  userId,
}: {
  referrerName: string;
  referrerEmail: string;
  referrerPhone?: string | null;
  referrerUpi?: string | null;
  referrerCode?: string | null;
  refereeName: string;
  refereePhone?: string | null;
  refereeId?: string | null;
  nudgeType: "ASK_FRIEND_APPLY" | "FRIEND_APPLIED";
  eventName?: string | null;
  eventDate?: string | Date | null;
  rewardAmount?: number;
  userId?: string | null;
}) {
  try {
    if (!referrerEmail || !referrerEmail.includes("@")) {
      return { success: false, message: "Invalid referrer email address." };
    }

    const baseUrl = getAppBaseUrl();
    const cleanRefereePhone = (refereePhone || "").replace(/\D/g, "");
    const profileUrl = `${baseUrl}/profile`;
    const eventsUrl = `${baseUrl}/events`;

    const isAskApply = nudgeType === "ASK_FRIEND_APPLY";

    const subject = isAskApply
      ? `📢 ${refereeName} joined with your code "${referrerCode || "Topline"}"! Ask them to apply for an event`
      : `🎉 Great news! ${refereeName} applied for ${eventName || "an event"} with your referral code`;

    const formattedEventDate = eventDate
      ? new Date(eventDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

    const whatsappFriendText = encodeURIComponent(
      `Hi ${refereeName}! I saw you joined Topline with my referral code. Check out the upcoming events here and apply so we can work together: ${eventsUrl}`
    );
    const whatsappFriendUrl = cleanRefereePhone
      ? `https://wa.me/91${cleanRefereePhone}?text=${whatsappFriendText}`
      : `https://wa.me/?text=${whatsappFriendText}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #e2e8f0; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border-radius: 24px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .header { background: ${isAskApply ? "linear-gradient(135deg, #b45309 0%, #78350f 50%, #0f172a 100%)" : "linear-gradient(135deg, #047857 0%, #065f46 50%, #0f172a 100%)"}; padding: 36px 28px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .badge { display: inline-block; background: ${isAskApply ? "#f59e0b" : "#10b981"}; color: #020617; font-weight: 900; font-size: 11px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .title { font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3; }
        .subtitle { font-size: 14px; color: ${isAskApply ? "#fde68a" : "#a7f3d0"}; margin: 0; }
        .content { padding: 32px 28px; background: #111827; }
        .greeting { font-size: 16px; color: #f8fafc; font-weight: 700; margin-bottom: 16px; }
        .p-text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0; }
        
        .status-box { background: #0f172a; border: 2px solid ${isAskApply ? "#f59e0b" : "#10b981"}; border-radius: 20px; padding: 22px; margin: 24px 0; }
        .status-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .status-hero { font-size: 18px; font-weight: 900; color: #ffffff; margin-bottom: 6px; }
        .status-detail { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        
        .reward-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.4); color: #fde047; font-weight: 900; font-size: 13px; padding: 6px 14px; border-radius: 12px; margin-top: 10px; }
        
        .btn-action { display: block; background: ${isAskApply ? "#25D366" : "#2563eb"}; color: #ffffff !important; text-decoration: none; font-weight: 900; font-size: 15px; padding: 15px 24px; border-radius: 16px; text-align: center; margin: 20px 0 10px 0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3); }
        .btn-portal { display: block; background: #374151; color: #f8fafc !important; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 20px; border-radius: 14px; text-align: center; margin-top: 8px; }
        
        .upi-badge { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 12px; padding: 10px 14px; border-radius: 12px; margin-top: 20px; text-align: center; }
        
        .footer { padding: 24px 28px; background: #0f172a; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1f2937; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="badge">${isAskApply ? "📢 Referral Milestone Update" : "🎉 Referral Milestone Update"}</div>
          <h1 class="title">${isAskApply ? `Remind ${refereeName} to Apply for an Event` : `${refereeName} Applied for an Event!`}</h1>
          <p class="subtitle">Topline Student Referral Program</p>
        </div>

        <div class="content">
          <div class="greeting">Hey ${referrerName || "Student Partner"},</div>

          ${isAskApply ? `
            <p class="p-text">
              Great job sharing your referral code! Your friend <strong>${refereeName}</strong> registered on Topline using your code <strong>"${referrerCode || "Topline"}"</strong>, but has not applied for any event gig yet.
            </p>

            <div class="status-box">
              <div class="status-label">Referral Status</div>
              <div class="status-hero">👥 ${refereeName} has Registered</div>
              <div class="status-detail">
                To unlock your referral reward of <strong>up to ₹${rewardAmount}</strong>, your friend must apply for an upcoming catering gig and complete their duty attendance.
              </div>
              <div class="reward-pill">
                💰 Potential Reward: Up to ₹${rewardAmount} Cash
              </div>
            </div>

            <p class="p-text">
              👉 Give <strong>${refereeName}</strong> a quick nudge on WhatsApp to explore the live events catalog and apply today!
            </p>

            <a href="${whatsappFriendUrl}" target="_blank" class="btn-action">
              💬 Text ${refereeName} on WhatsApp
            </a>
          ` : `
            <p class="p-text">
              Exciting progress! Your friend <strong>${refereeName}</strong> has applied for <strong>${eventName || "an upcoming event"}</strong>${formattedEventDate ? ` on <strong>${formattedEventDate}</strong>` : ""} using your referral code <strong>"${referrerCode || "Topline"}"</strong>!
            </p>

            <div class="status-box">
              <div class="status-label">Referral Status</div>
              <div class="status-hero">🎟️ ${refereeName} Applied for ${eventName || "Event"}</div>
              <div class="status-detail">
                Once <strong>${refereeName}</strong> attends duty and is marked present by the event coordinator, your referral reward of <strong>up to ₹${rewardAmount}</strong> will be unlocked and credited to your UPI!
              </div>
              <div class="reward-pill">
                ✨ Reward Unlocks After Event Attendance
              </div>
            </div>

            <p class="p-text">
              Stay in touch with <strong>${refereeName}</strong> so they report on time for their scheduled duty shift!
            </p>

            <a href="${profileUrl}" target="_blank" class="btn-action">
              📊 View Your Referral Rewards Hub
            </a>
          `}

          <a href="${eventsUrl}" target="_blank" class="btn-portal">
            🎪 Browse Upcoming Events Directory
          </a>

          ${referrerUpi ? `
            <div class="upi-badge">
              💳 Unlocked referral rewards will be credited directly to your UPI: <strong>${referrerUpi}</strong>
            </div>
          ` : `
            <div class="upi-badge" style="color: #fbbf24; border-color: rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.1);">
              ⚠️ Don&apos;t forget to save your UPI ID in your <a href="${profileUrl}" style="color: #60a5fa; font-weight: bold; text-decoration: underline;">Topline Profile</a> so you can receive your cash payout promptly!
            </div>
          `}
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Hospitality Operations.<br>
          For questions or assistance, contact student support at <strong>7986955634</strong>.
        </div>
      </div>
    </body>
    </html>
    `;

    const res = await sendEmail({ to: referrerEmail, subject, html });

    // Track in EmailLog
    if (res.success && userId) {
      await prisma.emailLog.create({
        data: {
          userId,
          recipientEmail: referrerEmail,
          recipientName: referrerName,
          templateName: isAskApply ? "Referral Progress Nudge (Ask to Apply)" : "Referral Progress Notice (Friend Applied)",
          subject,
          bodyPreview: `[refereeId:${refereeId || ""}|refereeName:${refereeName || ""}] ${isAskApply
            ? `${refereeName} registered with code ${referrerCode}. Ask them to apply for an event to earn up to ₹${rewardAmount}.`
            : `${refereeName} applied for ${eventName || "event"}. Reward unlocks after attendance.`}`,
          sentAt: new Date(),
        },
      }).catch((err) => console.error("Error logging referral progress email:", err));
    }

    return res;
  } catch (error: any) {
    console.error("sendReferralProgressNudgeEmail error:", error);
    return { success: false, message: error.message };
  }
}

