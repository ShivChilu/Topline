import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { sendStudentDeclineHoldEmail, sendAdminCandidateDeclinedAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") || searchParams.get("id");
    const action = searchParams.get("action")?.toUpperCase(); // "CONFIRM" or "DECLINE"

    if (!appId) {
      return NextResponse.json({ success: false, message: "Missing application ID." }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: appId },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            registrationNumber: true,
            university: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 });
    }

    // If application was already declined / cancelled, candidate cannot re-confirm (Permanent Decline)
    if (application.status === ApplicationStatus.CANCELLED) {
      if (action === "CONFIRM" || action === "YES") {
        return NextResponse.json({
          success: false,
          status: "CANCELLED",
          message: "This duty assignment has been permanently declined and the slot was released. It cannot be re-confirmed.",
          candidateName: application.name || application.user?.name,
          eventName: application.event.name,
          eventDate: application.event.date,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        message: "You have permanently declined this duty assignment. Your slot has been released.",
        candidateName: application.name || application.user?.name,
        eventName: application.event.name,
        eventDate: application.event.date,
      });
    }

    // If an action was provided, process the response
    if (action === "CONFIRM" || action === "YES") {
      const now = new Date();
      const oldStatus = application.status;
      
      const updatedApp = await prisma.application.update({
        where: { id: appId },
        data: {
          status: ApplicationStatus.CONFIRMED,
          confirmedAt: now,
          lastActionAt: now,
        },
        include: {
          event: true,
        },
      });

      if (oldStatus !== ApplicationStatus.CONFIRMED) {
        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: appId,
            oldStatus,
            newStatus: ApplicationStatus.CONFIRMED,
            notes: "Candidate confirmed availability via email/portal RSVP (YES)",
          },
        });
      }

      return NextResponse.json({
        success: true,
        status: "CONFIRMED",
        message: "Your duty attendance has been successfully confirmed!",
        candidateName: application.name || application.user?.name,
        eventName: application.event.name,
        eventDate: application.event.date,
        eventLocation: application.event.location,
        reportingTime: application.event.reportingTime,
        whatsappGroupLink: application.event.whatsappGroupLink,
        updatedApp,
      });
    }

    if (action === "DECLINE" || action === "NO" || action === "CANCEL") {
      const now = new Date();
      const oldStatus = application.status;

      const updatedApp = await prisma.application.update({
        where: { id: appId },
        data: {
          status: ApplicationStatus.CANCELLED,
          lastActionAt: now,
        },
        include: {
          event: true,
        },
      });

      // Update student user to ON_HOLD per Topline policy
      if (application.userId) {
        await prisma.user.update({
          where: { id: application.userId },
          data: {
            selectionStatus: "ON_HOLD",
            adminRemarks: `Placed ON HOLD: Declined selected event "${application.event.name}" on ${now.toLocaleDateString("en-GB")}. Reason pending review.`,
          },
        }).catch((err) => console.error("Error updating user to ON_HOLD:", err));
      }

      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: appId,
          oldStatus,
          newStatus: ApplicationStatus.CANCELLED,
          notes: "Candidate declined availability via email/portal RSVP (NO). Account automatically placed ON HOLD per Topline policy.",
        },
      });

      const studentName = application.name || application.user?.name || "Student";
      const studentEmail = application.user?.email || null;
      const studentPhone = application.mobileNumber || application.user?.phone || null;
      const regNo = application.registrationNumber || application.user?.registrationNumber || null;
      const university = (application.user as any)?.university || null;

      const formattedDate = application.event.date
        ? new Date(application.event.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Upcoming Event";

      const whatsappAppealMessage = encodeURIComponent(
        `Hi Admin, my name is ${studentName} (Reg No: ${regNo || "N/A"}, Phone: ${studentPhone || "N/A"}). My Topline profile was placed ON HOLD after declining the selected slot for "${application.event.name}" on ${formattedDate}. Here is my reason for declining:\n\n[Please explain your reason here]`
      );
      const whatsappAdminUrl = `https://wa.me/917986955634?text=${whatsappAppealMessage}`;

      // Automatically dispatch Hold Email to Candidate
      if (studentEmail) {
        sendStudentDeclineHoldEmail({
          studentName,
          email: studentEmail,
          phone: studentPhone,
          registrationNumber: regNo,
          eventName: application.event.name,
          eventDate: application.event.date,
          eventLocation: application.event.location,
          applicationId: application.id,
          userId: application.userId,
          eventId: application.eventId,
        }).catch((err) => console.error("Failed to send student decline hold email:", err));
      }

      // Automatically dispatch Alert Email to Admin / Super Admin
      sendAdminCandidateDeclinedAlertEmail({
        studentName,
        studentEmail,
        studentPhone,
        registrationNumber: regNo,
        university,
        eventName: application.event.name,
        eventDate: application.event.date,
        eventLocation: application.event.location,
        reportingTime: application.event.reportingTime,
        eventId: application.eventId,
        applicationId: application.id,
        userId: application.userId,
      }).catch((err) => console.error("Failed to send admin decline alert email:", err));

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        onHold: true,
        message: "You have declined this duty assignment. As per Topline policy, your account has been placed ON HOLD. Please message the admin on WhatsApp to explain your reason.",
        candidateName: studentName,
        eventName: application.event.name,
        eventDate: application.event.date,
        whatsappAdminUrl,
        updatedApp,
      });
    }

    // Just fetch status without modifying
    return NextResponse.json({
      success: true,
      status: application.status,
      candidateName: application.name || application.user?.name,
      eventName: application.event.name,
      eventDate: application.event.date,
      eventLocation: application.event.location,
      reportingTime: application.event.reportingTime,
      whatsappGroupLink: application.event.whatsappGroupLink,
      application,
    });
  } catch (error: any) {
    console.error("RSVP API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to process RSVP." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, action, notes } = body;

    if (!appId || !action) {
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: appId },
      include: {
        event: true,
        user: true,
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 });
    }

    // Permanently locked if declined
    if (application.status === ApplicationStatus.CANCELLED) {
      return NextResponse.json({
        success: false,
        status: "CANCELLED",
        message: "This assignment has been permanently declined and the slot was released. It cannot be modified.",
      }, { status: 400 });
    }

    const now = new Date();
    const isConfirm = action.toUpperCase() === "CONFIRM" || action.toUpperCase() === "YES";
    const newStatus = isConfirm ? ApplicationStatus.CONFIRMED : ApplicationStatus.CANCELLED;
    const oldStatus = application.status;

    const updatedApp = await prisma.application.update({
      where: { id: appId },
      data: {
        status: newStatus,
        ...(isConfirm && { confirmedAt: now }),
        lastActionAt: now,
      },
      include: {
        event: true,
      },
    });

    const studentName = application.name || application.user?.name || "Student";
    const studentEmail = application.user?.email || null;
    const studentPhone = application.mobileNumber || application.user?.phone || null;
    const regNo = application.registrationNumber || application.user?.registrationNumber || null;
    const university = (application.user as any)?.university || null;

    const formattedDate = application.event.date
      ? new Date(application.event.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Upcoming Event";

    const whatsappAppealMessage = encodeURIComponent(
      `Hi Admin, my name is ${studentName} (Reg No: ${regNo || "N/A"}, Phone: ${studentPhone || "N/A"}). My Topline profile was placed ON HOLD after declining the selected slot for "${application.event.name}" on ${formattedDate}. Here is my reason for declining:\n\n[Please explain your reason here]`
    );
    const whatsappAdminUrl = `https://wa.me/917986955634?text=${whatsappAppealMessage}`;

    if (!isConfirm) {
      // Mark student as ON_HOLD
      if (application.userId) {
        await prisma.user.update({
          where: { id: application.userId },
          data: {
            selectionStatus: "ON_HOLD",
            adminRemarks: `Placed ON HOLD: Declined selected event "${application.event.name}" on ${now.toLocaleDateString("en-GB")}. Reason pending review.`,
          },
        }).catch((err) => console.error("Error updating user to ON_HOLD:", err));
      }

      // Automatically dispatch Hold Email to Candidate
      if (studentEmail) {
        sendStudentDeclineHoldEmail({
          studentName,
          email: studentEmail,
          phone: studentPhone,
          registrationNumber: regNo,
          eventName: application.event.name,
          eventDate: application.event.date,
          eventLocation: application.event.location,
          applicationId: application.id,
          userId: application.userId,
          eventId: application.eventId,
        }).catch((err) => console.error("Failed to send student decline hold email:", err));
      }

      // Automatically dispatch Alert Email to Admin / Super Admin
      sendAdminCandidateDeclinedAlertEmail({
        studentName,
        studentEmail,
        studentPhone,
        registrationNumber: regNo,
        university,
        eventName: application.event.name,
        eventDate: application.event.date,
        eventLocation: application.event.location,
        reportingTime: application.event.reportingTime,
        eventId: application.eventId,
        applicationId: application.id,
        userId: application.userId,
      }).catch((err) => console.error("Failed to send admin decline alert email:", err));
    }

    if (oldStatus !== newStatus) {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: appId,
          oldStatus,
          newStatus,
          notes: notes || (isConfirm ? "Confirmed availability via portal (YES)" : "Declined availability via portal (NO). Account placed ON HOLD per policy."),
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      onHold: !isConfirm,
      message: isConfirm
        ? "Your attendance has been confirmed!"
        : "You have declined this assignment. As per Topline policy, your account has been placed ON HOLD. Please contact admin on WhatsApp to explain your reason.",
      whatsappGroupLink: isConfirm ? application.event.whatsappGroupLink : null,
      whatsappAdminUrl: !isConfirm ? whatsappAdminUrl : null,
      updatedApp,
    });
  } catch (error: any) {
    console.error("RSVP POST Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
