import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

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
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 });
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

      if (oldStatus !== ApplicationStatus.CANCELLED) {
        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: appId,
            oldStatus,
            newStatus: ApplicationStatus.CANCELLED,
            notes: "Candidate declined availability via email/portal RSVP (NO)",
          },
        });
      }

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        message: "You have declined this duty assignment. Your slot has been released.",
        candidateName: application.name || application.user?.name,
        eventName: application.event.name,
        eventDate: application.event.date,
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

    if (oldStatus !== newStatus) {
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: appId,
          oldStatus,
          newStatus,
          notes: notes || (isConfirm ? "Confirmed availability via portal (YES)" : "Declined availability via portal (NO)"),
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: isConfirm
        ? "Your attendance has been confirmed!"
        : "You have cancelled this assignment.",
      whatsappGroupLink: isConfirm ? application.event.whatsappGroupLink : null,
      updatedApp,
    });
  } catch (error: any) {
    console.error("RSVP POST Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
