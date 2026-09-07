import nodemailer from "nodemailer";

interface StudentEmailPayload {
  studentName: string;
  email: string;
  registrationNumber?: string | null;
  university?: string | null;
  notes?: string | null;
}

interface EventEmailPayload {
  studentName: string;
  email: string;
  eventName: string;
  eventDate?: string | Date | null;
  eventLocation?: string | null;
  reportingTime?: string | null;
  instructions?: string | null;
  notes?: string | null;
}

function getAppBaseUrl(): string {
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
        // If from address restriction occurs on test key, log clearly
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
 * Global Student Profile Selection Confirmation Email Template
 */
export async function sendStudentSelectionEmail({
  studentName,
  email,
  registrationNumber,
  university,
  notes,
}: StudentEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for student." };
    }

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
            <a href="${getAppBaseUrl()}/events" class="btn" style="color: #ffffff;">View Available Events</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an automated system notification. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject: `🎉 Congratulations! Your Topline ODC Profile Has Been Selected`,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send selection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Global Student Profile Deselection / Status Update Email Template
 */
export async function sendStudentDeselectionEmail({
  studentName,
  email,
  registrationNumber,
  university,
  notes,
}: StudentEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for student." };
    }

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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">STATUS UPDATE</div>
          <h2 style="color: #ffffff; margin-top: 0;">Hello, ${studentName}</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            We are writing to inform you that your profile selection status for Topline ODC has been updated to <strong>Not Selected / Under Review</strong>.
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Profile Information</div>
            <div class="row"><span class="label">Full Name:</span> <span class="value">${studentName}</span></div>
            ${registrationNumber ? `<div class="row"><span class="label">Roll / Reg Number:</span> <span class="value">${registrationNumber}</span></div>` : ""}
            ${university ? `<div class="row"><span class="label">University / College:</span> <span class="value">${university}</span></div>` : ""}
            <div class="row"><span class="label">Current Status:</span> <span class="value" style="color: #ef4444;">Not Selected</span></div>
          </div>

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            You can keep your profile updated with clear recent photos and academic details. Feel free to reach out to the Topline coordination team if you have any questions.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject: `Topline ODC — Profile Selection Status Update`,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send deselection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Event-Specific Candidate Selection Email Template
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
}: EventEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for candidate." };
    }

    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

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
          <div class="badge">✓ SELECTED FOR EVENT DUTY</div>
          <h2 style="color: #ffffff; margin-top: 0;">Congratulations, ${studentName}!</h2>
          <p style="color: #d1d5db; line-height: 1.6;">
            You have been officially <strong>SELECTED</strong> for the upcoming catering & hospitality assignment:
          </p>

          <div class="card">
            <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Event Assignment Details</div>
            <div class="row"><span class="label">Event Name:</span> <span class="value">${eventName}</span></div>
            ${formattedDate ? `<div class="row"><span class="label">Date:</span> <span class="value">${formattedDate}</span></div>` : ""}
            ${eventLocation ? `<div class="row"><span class="label">Location / Venue:</span> <span class="value">${eventLocation}</span></div>` : ""}
            ${reportingTime ? `<div class="row"><span class="label">Reporting Time:</span> <span class="value">${reportingTime}</span></div>` : ""}
            <div class="row"><span class="label">Application Status:</span> <span class="value" style="color: #10b981;">Selected</span></div>
          </div>

          ${instructions ? `<div style="background: #1e293b; border: 1px solid #334155; padding: 14px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin: 16px 0;"><strong>Instructions:</strong> ${instructions}</div>` : ""}

          ${notes ? `<div style="background: #374151; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e5e7eb; margin-bottom: 20px;"><strong>Admin / Coordinator Note:</strong> ${notes}</div>` : ""}

          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            Please ensure you are punctual, in required formal grooming and uniform. You can view your event confirmation and digital pass on your student portal.
          </p>

          <div style="text-align: center;">
            <a href="${getAppBaseUrl()}/profile" class="btn" style="color: #ffffff;">View My Assignment</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an automated system notification. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject: `🎉 Congratulations! Selected for ${eventName} — Topline ODC`,
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
}: EventEmailPayload): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!email) {
      return { success: false, message: "No email address provided for candidate." };
    }

    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

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
            <a href="${getAppBaseUrl()}/events" class="btn" style="color: #ffffff;">Browse Other Events</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject: `Topline ODC — Application Status Update: ${eventName}`,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send event deselection email:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Custom Broadcast / Single Message Email Template
 */
export async function sendCustomBroadcastEmail({
  to,
  studentName,
  subject,
  messageBody,
  includeBranding = true,
}: {
  to: string;
  studentName: string;
  subject: string;
  messageBody: string;
  includeBranding?: boolean;
}): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    if (!to) {
      return { success: false, message: "No recipient email address provided." };
    }

    // Convert newlines in messageBody to clean HTML paragraphs/breaks
    const formattedBody = messageBody
      .split("\n\n")
      .map((para) => `<p style="margin-top: 0; margin-bottom: 16px; color: #d1d5db; line-height: 1.7;">${para.replace(/\n/g, "<br/>")}</p>`)
      .join("");

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
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 20px; }
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

          <div style="text-align: center; margin-top: 28px;">
            <a href="${getAppBaseUrl()}/events" class="btn" style="color: #ffffff;">Go to Topline Portal</a>
          </div>
        </div>
        ${includeBranding ? `
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          This is an official communication from Topline ODC Administration.
        </div>
        ` : ""}
      </div>
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
}): Promise<{ success: boolean; message?: string }> {
  try {
    const roleLabel =
      role === "EVENT_ADMIN" || role === "event_admin"
        ? "Event Administrator"
        : role === "CALLING_ADMIN" || role === "calling"
        ? "Calling Operator"
        : role === "SUPERADMIN" || role === "superadmin"
        ? "Super Administrator"
        : "Operations Admin";

    const loginUrl = `${getAppBaseUrl()}/admin/login`;

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
        .cred-box { background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 18px; margin: 20px 0; }
        .cred-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .cred-label { color: #9ca3af; font-weight: 600; }
        .cred-val { color: #f9fafb; font-family: monospace; font-weight: bold; }
        .events-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; margin: 16px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        .btn { display: inline-block; background: #ED0000; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TOPLINE ODC</h1>
        </div>
        <div class="content">
          <div class="badge">ADMINISTRATOR ONBOARDING</div>
          <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 12px; font-size: 20px;">Welcome, ${adminName}!</h2>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin-top: 0;">
            You have been granted <strong>${roleLabel}</strong> access to the Topline ODC management portal.
          </p>

          <div class="cred-box">
            <h3 style="margin-top: 0; margin-bottom: 12px; color: #f3f4f6; font-size: 15px; border-bottom: 1px solid #374151; padding-bottom: 6px;">
              Your Login Credentials
            </h3>
            <div style="font-size: 14px; line-height: 1.8;">
              <div><strong style="color: #9ca3af;">Username:</strong> <code style="color: #38bdf8; background: #111827; padding: 2px 6px; border-radius: 4px;">${username}</code></div>
              <div><strong style="color: #9ca3af;">Password:</strong> <code style="color: #38bdf8; background: #111827; padding: 2px 6px; border-radius: 4px;">${password}</code></div>
              <div><strong style="color: #9ca3af;">Role:</strong> <span style="color: #4ade80;">${roleLabel}</span></div>
            </div>
          </div>

          ${assignedEventNames.length > 0 ? `
          <div class="events-box">
            <div style="font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">
              Assigned Event Management Scope
            </div>
            <ul style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 13px; line-height: 1.7;">
              ${assignedEventNames.map(name => `<li><strong>${name}</strong></li>`).join("")}
            </ul>
          </div>
          ` : ""}

          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
            Please log in at the link below to access candidate rosters and manage your assigned events:
          </p>

          <div style="text-align: center; margin-top: 24px; margin-bottom: 10px;">
            <a href="${loginUrl}" class="btn" style="color: #ffffff;">Log In to Admin Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Topline ODC & Catering Management. All rights reserved.<br />
          For security, please change your password after logging in.
        </div>
      </div>
    </body>
    </html>
    `;

    return await sendEmail({
      to: email,
      subject: `Your Topline ODC Admin Access Credentials (${roleLabel})`,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error("Failed to send admin credentials email:", error);
    return { success: false, message: error.message };
  }
}


