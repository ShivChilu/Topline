import { prisma } from "@/lib/prisma";

export async function executeCopilotTool(
  toolName: string,
  args: any,
  context?: { userRole?: string; adminUserId?: string; allowedEventIds?: string[] }
): Promise<any> {
  try {
    switch (toolName) {
      // 1. SYSTEM OVERVIEW
      case "get_system_overview": {
        if (context?.userRole === "EVENT_ADMIN") {
          const allowedIds = context.allowedEventIds || [];
          const [totalApplications, attendedApplications, pendingReviewCount] = await Promise.all([
            prisma.application.count({ where: { eventId: { in: allowedIds } } }),
            prisma.application.count({
              where: {
                eventId: { in: allowedIds },
                OR: [{ status: "ATTENDED" }, { attendance: { attendanceStatus: "PRESENT" } }],
              },
            }),
            prisma.application.count({
              where: { eventId: { in: allowedIds }, status: "UNDER_REVIEW" },
            }),
          ]);

          const assignedEvents = await prisma.event.findMany({
            where: { id: { in: allowedIds } },
            orderBy: { date: "desc" },
            select: { id: true, name: true, date: true, status: true, workersRequired: true, applicationsCount: true },
          });

          return {
            success: true,
            stats: {
              assignedEventsCount: assignedEvents.length,
              totalApplications,
              attendedApplications,
              pendingReviewCount,
            },
            assignedEvents: assignedEvents.map((e) => ({
              ...e,
              date: e.date.toISOString().split("T")[0],
            })),
          };
        }

        const [totalStudents, selectedStudents, underReviewStudents, activeEvents, totalApplications, attendedApplications, pendingReferrals] = await Promise.all([
          prisma.user.count({ where: { role: "USER" } }),
          prisma.user.count({ where: { role: "USER", selectionStatus: "SELECTED" } }),
          prisma.user.count({ where: { role: "USER", selectionStatus: "UNDER_REVIEW" } }),
          prisma.event.count({ where: { status: { in: ["OPEN", "SCHEDULED"] } } }),
          prisma.application.count(),
          prisma.application.count({ where: { OR: [{ status: "ATTENDED" }, { attendance: { attendanceStatus: "PRESENT" } }] } }),
          prisma.referral.count({ where: { status: "PENDING" } }),
        ]);

        const recentEvents = await prisma.event.findMany({
          orderBy: { date: "desc" },
          take: 4,
          select: { id: true, name: true, date: true, status: true, workersRequired: true, applicationsCount: true },
        });

        return {
          success: true,
          stats: {
            totalStudents,
            selectedStudents,
            underReviewStudents,
            activeEvents,
            totalApplications,
            attendedApplications,
            pendingReferrals,
          },
          recentEvents: recentEvents.map((e) => ({
            ...e,
            date: e.date.toISOString().split("T")[0],
          })),
        };
      }

      // 2. QUERY STUDENTS
      case "query_students": {
        const { searchQuery, selectionStatus, gender, university, city, minCompleteness, limit = 25 } = args;
        const where: any = { role: "USER" };

        // Role-based scope: Event Admins can only query candidates who applied to their assigned events
        if (context?.userRole === "EVENT_ADMIN") {
          where.applications = {
            some: {
              eventId: { in: context.allowedEventIds || [] },
            },
          };
        }

        if (selectionStatus && selectionStatus !== "ALL") {
          where.selectionStatus = selectionStatus;
        }

        if (gender && gender !== "ALL") {
          where.gender = { equals: gender, mode: "insensitive" };
        }

        if (university) {
          where.university = { contains: university, mode: "insensitive" };
        }

        if (city) {
          where.city = { contains: city, mode: "insensitive" };
        }

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim();
          where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { registrationNumber: { contains: q, mode: "insensitive" } },
            { university: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ];
        }

        const students = await prisma.user.findMany({
          where,
          take: Math.min(Number(limit) || 25, 100),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            registrationNumber: true,
            university: true,
            city: true,
            gender: true,
            height: true,
            weight: true,
            age: true,
            upiId: true,
            selectionStatus: true,
            isActive: true,
            profilePhotoUrl: true,
            adminRemarks: true,
            createdAt: true,
            _count: {
              select: {
                applications: true,
                studentPhotos: true,
              },
            },
            applications: {
              select: {
                id: true,
                eventId: true,
                status: true,
                attendance: {
                  select: { attendanceStatus: true, checkInTime: true },
                },
                event: {
                  select: { id: true, name: true, date: true },
                },
              },
            },
          },
        });

        // Compute completeness & attendance summary
        const formatted = students.map((s) => {
          let score = 0;
          if (s.name) score += 10;
          if (s.phone) score += 15;
          if (s.email) score += 15;
          if (s.registrationNumber) score += 15;
          if (s.university) score += 10;
          if (s.city) score += 5;
          if (s.gender) score += 10;
          if (s.height) score += 5;
          if (s.upiId) score += 5;
          if (s.profilePhotoUrl || s._count.studentPhotos > 0) score += 10;

          const attendedCount = s.applications.filter(
            (a: any) => a.status === "ATTENDED" || a.attendance?.attendanceStatus === "PRESENT"
          ).length;

          return {
            id: s.id,
            name: s.name,
            phone: s.phone || "N/A",
            email: s.email || "N/A",
            registrationNumber: s.registrationNumber || "N/A",
            university: s.university || "N/A",
            city: s.city || "N/A",
            gender: s.gender || "N/A",
            height: s.height || "N/A",
            selectionStatus: s.selectionStatus,
            completenessScore: score,
            totalApplications: s._count.applications,
            attendedCount,
            adminRemarks: s.adminRemarks,
            appliedEvents: s.applications.map((a: any) => ({
              eventName: a.event.name,
              eventDate: a.event.date.toISOString().split("T")[0],
              attended: a.status === "ATTENDED" || a.attendance?.attendanceStatus === "PRESENT",
              status: a.status,
            })),
          };
        });

        const filtered = minCompleteness ? formatted.filter((s) => s.completenessScore >= Number(minCompleteness)) : formatted;

        return {
          success: true,
          totalMatches: filtered.length,
          students: filtered,
        };
      }

      // 3. MULTI-EVENT COMPARISON / INTERSECTION
      case "compare_multi_event_attendance": {
        const { eventSearchTerms = [], eventIds = [], mode = "COMMON_ATTENDED" } = args;

        // Resolve Target Events
        let targetEvents: { id: string; name: string; date: Date }[] = [];

        if (Array.isArray(eventIds) && eventIds.length > 0) {
          targetEvents = await prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, name: true, date: true },
          });
        }

        if (targetEvents.length === 0 && Array.isArray(eventSearchTerms) && eventSearchTerms.length > 0) {
          for (const term of eventSearchTerms) {
            if (!term || !term.trim()) continue;
            const q = term.trim();
            const found = await prisma.event.findFirst({
              where: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
              select: { id: true, name: true, date: true },
            });
            if (found && !targetEvents.some((e) => e.id === found.id)) {
              targetEvents.push(found);
            }
          }
        }

        if (targetEvents.length === 0) {
          targetEvents = await prisma.event.findMany({
            orderBy: { date: "desc" },
            take: 3,
            select: { id: true, name: true, date: true },
          });
        }

        const resolvedEventIds = targetEvents.map((e) => e.id);

        // Fetch candidates with applications for these events
        const candidates = await prisma.user.findMany({
          where: {
            role: "USER",
            applications: {
              some: {
                eventId: { in: resolvedEventIds },
              },
            },
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            registrationNumber: true,
            university: true,
            city: true,
            selectionStatus: true,
            applications: {
              where: { eventId: { in: resolvedEventIds } },
              select: {
                eventId: true,
                status: true,
                attendance: { select: { attendanceStatus: true } },
                event: { select: { id: true, name: true, date: true } },
              },
            },
          },
        });

        // Helper checks
        const didAttend = (c: any, evId: string) =>
          c.applications.some(
            (a: any) => a.eventId === evId && (a.status === "ATTENDED" || a.attendance?.attendanceStatus === "PRESENT")
          );

        const didApply = (c: any, evId: string) => c.applications.some((a: any) => a.eventId === evId);

        let matchedCandidates = candidates.filter((c) => {
          if (mode === "COMMON_ATTENDED") {
            return resolvedEventIds.every((evId) => didAttend(c, evId));
          }
          if (mode === "COMMON_APPLIED") {
            return resolvedEventIds.every((evId) => didApply(c, evId));
          }
          if (mode === "ANY_ATTENDED") {
            return resolvedEventIds.some((evId) => didAttend(c, evId));
          }
          if (mode === "ANY_APPLIED") {
            return resolvedEventIds.some((evId) => didApply(c, evId));
          }
          if (mode === "NOT_ATTENDED") {
            return resolvedEventIds.every((evId) => !didAttend(c, evId));
          }
          return true;
        });

        return {
          success: true,
          mode,
          comparedEvents: targetEvents.map((e) => ({
            id: e.id,
            name: e.name,
            date: e.date.toISOString().split("T")[0],
          })),
          totalMatchingCount: matchedCandidates.length,
          students: matchedCandidates.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "N/A",
            email: c.email || "N/A",
            rollNo: c.registrationNumber || "N/A",
            university: c.university || "N/A",
            selectionStatus: c.selectionStatus,
            attendanceBreakdown: targetEvents.map((ev) => ({
              eventName: ev.name,
              attended: didAttend(c, ev.id),
              applied: didApply(c, ev.id),
            })),
          })),
        };
      }

      // 4. QUERY EVENTS
      case "query_events": {
        const { searchQuery, status, limit = 20 } = args;
        const where: any = {};

        if (context?.userRole === "EVENT_ADMIN") {
          where.id = { in: context.allowedEventIds || [] };
        }

        if (status && status !== "ALL") {
          where.status = status;
        }

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim();
          where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { workType: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ];
        }

        const events = await prisma.event.findMany({
          where,
          take: Math.min(Number(limit) || 20, 50),
          orderBy: { date: "desc" },
          select: {
            id: true,
            name: true,
            date: true,
            location: true,
            reportingTime: true,
            startTime: true,
            endTime: true,
            workType: true,
            workersRequired: true,
            paymentPerStudent: true,
            status: true,
            applicationsCount: true,
            client: { select: { id: true, name: true } },
            _count: {
              select: {
                applications: true,
                attendanceRecords: true,
              },
            },
          },
        });

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            name: e.name,
            date: e.date.toISOString().split("T")[0],
            location: e.location,
            reportingTime: e.reportingTime,
            workType: e.workType,
            payoutPerStudent: `₹${e.paymentPerStudent}`,
            requiredHeadcount: e.workersRequired,
            totalApplications: e._count.applications,
            status: e.status,
            clientName: e.client?.name || "Direct",
          })),
        };
      }

      // 5. QUERY EMAIL ANALYTICS
      case "query_email_analytics": {
        const { eventId, clickedAction, status } = args;
        const where: any = {};

        if (eventId) {
          where.eventId = eventId;
        }
        if (clickedAction && clickedAction !== "ALL") {
          where.clickedAction = clickedAction;
        }
        if (status === "OPENED") {
          where.OR = [{ openCount: { gt: 0 } }, { openedAt: { not: null } }];
        } else if (status === "UNOPENED") {
          where.openCount = 0;
          where.openedAt = null;
        } else if (status === "CLICKED") {
          where.clickCount = { gt: 0 };
        }

        const logs = await prisma.emailLog.findMany({
          where,
          take: 50,
          orderBy: { sentAt: "desc" },
          select: {
            id: true,
            subject: true,
            templateName: true,
            sentAt: true,
            openedAt: true,
            openCount: true,
            clickedAction: true,
            clickCount: true,
            user: {
              select: { id: true, name: true, email: true, phone: true, registrationNumber: true },
            },
            event: {
              select: { id: true, name: true, date: true },
            },
          },
        });

        return {
          success: true,
          totalLogs: logs.length,
          logs: logs.map((l) => ({
            id: l.id,
            subject: l.subject,
            template: l.templateName || "Custom Broadcast",
            sentAt: l.sentAt.toISOString(),
            opened: Boolean(l.openedAt || l.openCount > 0),
            clickedAction: l.clickedAction || "NONE",
            recipientName: l.user?.name || "Unknown",
            recipientEmail: l.user?.email || "N/A",
            eventName: l.event?.name || "General Notification",
          })),
        };
      }

      // 6. QUERY REFERRALS
      case "query_referrals": {
        if (context?.userRole === "EVENT_ADMIN") {
          return { success: false, message: "Permission Denied: Event Admins cannot view referral chains or payouts." };
        }

        const { status, referrerNameOrPhone } = args;
        const where: any = {};

        if (status && status !== "ALL") {
          where.status = status;
        }

        if (referrerNameOrPhone && referrerNameOrPhone.trim()) {
          const q = referrerNameOrPhone.trim();
          where.referrer = {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { referralCode: { contains: q, mode: "insensitive" } },
            ],
          };
        }

        const referrals = await prisma.referral.findMany({
          where,
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            referrer: { select: { id: true, name: true, phone: true, upiId: true, referralCode: true } },
            referee: { select: { id: true, name: true, phone: true, registrationNumber: true } },
            qualifyingEvent: { select: { id: true, name: true, date: true } },
          },
        });

        return {
          success: true,
          count: referrals.length,
          referrals: referrals.map((r) => ({
            id: r.id,
            codeUsed: r.codeUsed,
            bonusAmount: `₹${r.rewardAmount}`,
            status: r.status,
            referrerName: r.referrer.name,
            referrerPhone: r.referrer.phone || "N/A",
            referrerUpi: r.referrer.upiId || "N/A",
            refereeName: r.referee.name,
            refereeRollNo: r.referee.registrationNumber || "N/A",
            eventName: r.qualifyingEvent?.name || "General Signup",
          })),
        };
      }

      // 7. MARK EVENT ATTENDANCE (WRITE)
      case "mark_event_attendance": {
        const { eventId, eventNameKeyword, studentIdentifiers = [], attendanceStatus = "PRESENT", remarks } = args;

        // Resolve Event
        let targetEvent = null;
        if (eventId) {
          targetEvent = await prisma.event.findUnique({ where: { id: eventId } });
        }
        if (!targetEvent && eventNameKeyword) {
          targetEvent = await prisma.event.findFirst({
            where: { name: { contains: eventNameKeyword.trim(), mode: "insensitive" } },
            orderBy: { date: "desc" },
          });
        }
        if (!targetEvent) {
          if (context?.userRole === "EVENT_ADMIN" && context.allowedEventIds && context.allowedEventIds.length > 0) {
            targetEvent = await prisma.event.findFirst({
              where: { id: { in: context.allowedEventIds } },
              orderBy: { date: "desc" },
            });
          } else {
            targetEvent = await prisma.event.findFirst({ orderBy: { date: "desc" } });
          }
        }
        if (!targetEvent) {
          return { success: false, message: "Could not find any active event to mark attendance for." };
        }

        if (context?.userRole === "EVENT_ADMIN" && context.allowedEventIds && !context.allowedEventIds.includes(targetEvent.id)) {
          return { success: false, message: "Permission Denied: You do not have access to mark attendance for this event." };
        }

        // Resolve Students
        const updatedStudents: any[] = [];
        const notFound: string[] = [];

        for (const ident of studentIdentifiers) {
          const q = String(ident).trim();
          if (!q) continue;

          const student = await prisma.user.findFirst({
            where: {
              role: "USER",
              OR: [
                { id: q },
                { name: { contains: q, mode: "insensitive" } },
                { registrationNumber: { equals: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { equals: q, mode: "insensitive" } },
              ],
            },
          });

          if (!student) {
            notFound.push(q);
            continue;
          }

          const isPresent = attendanceStatus === "PRESENT" || attendanceStatus === "LATE";
          const now = new Date();

          // Check if application exists
          let app = await prisma.application.findFirst({
            where: { eventId: targetEvent.id, userId: student.id },
          });

          if (!app) {
            app = await prisma.application.create({
              data: {
                eventId: targetEvent.id,
                userId: student.id,
                name: student.name,
                mobileNumber: student.phone || "0000000000",
                registrationNumber: student.registrationNumber || `REG-${student.id.slice(0, 8)}`,
                status: isPresent ? "ATTENDED" : "ABSENT",
              },
            });
          } else {
            app = await prisma.application.update({
              where: { id: app.id },
              data: {
                status: isPresent ? "ATTENDED" : "ABSENT",
              },
            });
          }

          // Upsert Attendance record
          await prisma.attendance.upsert({
            where: {
              eventId_userId: {
                eventId: targetEvent.id,
                userId: student.id,
              },
            },
            create: {
              eventId: targetEvent.id,
              userId: student.id,
              applicationId: app.id,
              registrationNumber: student.registrationNumber || app.registrationNumber,
              attendanceStatus: attendanceStatus as any,
              checkInTime: now,
              manualRemarks: remarks || "Marked via Admin AI Copilot",
            },
            update: {
              attendanceStatus: attendanceStatus as any,
              checkInTime: now,
              manualRemarks: remarks || "Updated via Admin AI Copilot",
            },
          });

          updatedStudents.push({
            id: student.id,
            name: student.name,
            rollNo: student.registrationNumber || "N/A",
            attendanceStatus,
          });
        }

        return {
          success: true,
          message: `✓ Attendance marked as ${attendanceStatus} for ${updatedStudents.length} candidate(s) for event: "${targetEvent.name}".`,
          event: { id: targetEvent.id, name: targetEvent.name, date: targetEvent.date.toISOString().split("T")[0] },
          updatedStudents,
          notFoundIdentifiers: notFound.length > 0 ? notFound : undefined,
        };
      }

      // 8. UPDATE CANDIDATE SELECTION STATUS (WRITE)
      case "update_candidate_selection_status": {
        const { studentIdentifiers = [], status, adminRemarks } = args;
        const updated: any[] = [];
        const notFound: string[] = [];

        for (const ident of studentIdentifiers) {
          const q = String(ident).trim();
          if (!q) continue;

          const student = await prisma.user.findFirst({
            where: {
              role: "USER",
              OR: [
                { id: q },
                { name: { contains: q, mode: "insensitive" } },
                { registrationNumber: { equals: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { equals: q, mode: "insensitive" } },
              ],
            },
          });

          if (!student) {
            notFound.push(q);
            continue;
          }

          const updatedUser = await prisma.user.update({
            where: { id: student.id },
            data: {
              selectionStatus: status,
              selectedAt: status === "SELECTED" ? new Date() : undefined,
              adminRemarks: adminRemarks || student.adminRemarks,
            },
          });

          updated.push({
            id: updatedUser.id,
            name: updatedUser.name,
            rollNo: updatedUser.registrationNumber || "N/A",
            newStatus: status,
          });
        }

        return {
          success: true,
          message: `✓ Updated selection status to ${status} for ${updated.length} candidate(s).`,
          updatedCandidates: updated,
          notFoundIdentifiers: notFound.length > 0 ? notFound : undefined,
        };
      }

      // 9. MANAGE EVENT (WRITE)
      case "manage_event": {
        const { action, eventId, name, date, location, workType, reportingTime, startTime, endTime, workersRequired, paymentPerStudent, description } = args;

        if (action === "CREATE") {
          if (!name || !date) {
            return { success: false, message: "Event name and date are required to create an event." };
          }
          const created = await prisma.event.create({
            data: {
              name,
              date: new Date(date),
              location: location || "Grand Palace, Jalandhar",
              workType: workType || "STEWARDS REQUIRED",
              reportingTime: reportingTime || "3:30 PM",
              startTime: startTime || "4:00 PM",
              endTime: endTime || "11:00 PM",
              workersRequired: Number(workersRequired) || 20,
              maxApplications: (Number(workersRequired) || 20) * 2,
              paymentPerStudent: Number(paymentPerStudent) || 800,
              description: description || "Topline ODC Event guidelines and briefing.",
              status: "OPEN",
            },
          });
          return {
            success: true,
            message: `✓ Event "${created.name}" created successfully for ${created.date.toISOString().split("T")[0]}.`,
            event: created,
          };
        }

        if (action === "REOPEN" || action === "CLOSE" || action === "PUBLISH") {
          if (!eventId) return { success: false, message: "Event ID is required." };
          const statusMap: Record<string, any> = {
            REOPEN: "OPEN",
            CLOSE: "CLOSED",
            PUBLISH: "OPEN",
          };
          const updated = await prisma.event.update({
            where: { id: eventId },
            data: { status: statusMap[action] },
          });
          return {
            success: true,
            message: `✓ Event "${updated.name}" status updated to ${updated.status}.`,
            event: updated,
          };
        }

        if (action === "UPDATE") {
          if (!eventId) return { success: false, message: "Event ID is required for UPDATE." };
          const dataToUpdate: any = {};
          if (name) dataToUpdate.name = name;
          if (date) dataToUpdate.date = new Date(date);
          if (location) dataToUpdate.location = location;
          if (workType) dataToUpdate.workType = workType;
          if (reportingTime) dataToUpdate.reportingTime = reportingTime;
          if (workersRequired) dataToUpdate.workersRequired = Number(workersRequired);
          if (paymentPerStudent) dataToUpdate.paymentPerStudent = Number(paymentPerStudent);
          if (description) dataToUpdate.description = description;

          const updated = await prisma.event.update({
            where: { id: eventId },
            data: dataToUpdate,
          });
          return {
            success: true,
            message: `✓ Event "${updated.name}" updated successfully.`,
            event: updated,
          };
        }

        return { success: false, message: `Unsupported action: ${action}` };
      }

      // 10. UPDATE STUDENT PROFILE (WRITE)
      case "update_student_profile": {
        const { studentIdentifier, phone, university, city, upiId, adminRemarks, isActive } = args;
        const q = String(studentIdentifier).trim();

        const student = await prisma.user.findFirst({
          where: {
            role: "USER",
            OR: [
              { id: q },
              { name: { contains: q, mode: "insensitive" } },
              { registrationNumber: { equals: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { equals: q, mode: "insensitive" } },
            ],
          },
        });

        if (!student) {
          return { success: false, message: `Student matching "${q}" not found.` };
        }

        const dataToUpdate: any = {};
        if (phone) dataToUpdate.phone = phone;
        if (university) dataToUpdate.university = university;
        if (city) dataToUpdate.city = city;
        if (upiId) dataToUpdate.upiId = upiId;
        if (adminRemarks !== undefined) dataToUpdate.adminRemarks = adminRemarks;
        if (isActive !== undefined) dataToUpdate.isActive = isActive;

        const updated = await prisma.user.update({
          where: { id: student.id },
          data: dataToUpdate,
        });

        return {
          success: true,
          message: `✓ Profile for candidate "${updated.name}" (${updated.registrationNumber || "No Roll No"}) updated successfully.`,
          student: updated,
        };
      }

      // 11. PROCESS REFERRAL PAYOUT (WRITE)
      case "process_referral_payout": {
        if (context?.userRole === "EVENT_ADMIN") {
          return { success: false, message: "Permission Denied: Event Admins cannot process referral payouts." };
        }

        const { referralId, status } = args;
        const updated = await prisma.referral.update({
          where: { id: referralId },
          data: {
            status: status as any,
            paidAt: status === "PAID" ? new Date() : undefined,
          },
          include: {
            referrer: { select: { name: true, phone: true, upiId: true } },
            referee: { select: { name: true } },
          },
        });

        return {
          success: true,
          message: `✓ Referral reward of ₹${updated.rewardAmount} for referrer "${updated.referrer.name}" set to ${status}.`,
          referral: updated,
        };
      }

      // 12. QUERY EVENT CALLING & CANDIDATE LOGS (READ)
      case "query_event_calling_candidates": {
        const { eventId, eventNameKeyword, callStatus, remarksKeyword, whatsappStatus, applicationStatus, searchQuery, limit = 50 } = args;

        // Resolve target event
        let targetEventId = eventId;
        if (!targetEventId && eventNameKeyword) {
          const matched = await prisma.event.findFirst({
            where: {
              OR: [
                { name: { contains: eventNameKeyword, mode: "insensitive" } },
                { description: { contains: eventNameKeyword, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true },
          });
          if (matched) targetEventId = matched.id;
        }

        // Scope check for EVENT_ADMIN
        if (context?.userRole === "EVENT_ADMIN") {
          if (!targetEventId && context.allowedEventIds && context.allowedEventIds.length === 1) {
            targetEventId = context.allowedEventIds[0];
          }
          if (targetEventId && context.allowedEventIds && !context.allowedEventIds.includes(targetEventId)) {
            return { success: false, message: "Permission Denied: You do not have access to this event." };
          }
        }

        const where: any = {};
        if (targetEventId) {
          where.eventId = targetEventId;
        } else if (context?.userRole === "EVENT_ADMIN" && context.allowedEventIds) {
          where.eventId = { in: context.allowedEventIds };
        }

        // Call status filtering
        if (callStatus) {
          switch (callStatus) {
            case "FIRST_CALL_DONE":
              where.call1Done = true;
              break;
            case "FIRST_CALL_PENDING":
              where.call1Done = false;
              break;
            case "SECOND_CALL_DONE":
              where.call2Done = true;
              break;
            case "SECOND_CALL_PENDING":
              where.call2Done = false;
              break;
            case "SWITCH_OFF":
              where.OR = [
                { call1Remarks: { contains: "switch", mode: "insensitive" } },
                { call2Remarks: { contains: "switch", mode: "insensitive" } },
                { callingRemarks: { contains: "switch", mode: "insensitive" } },
              ];
              break;
            case "NOT_REACHABLE":
              where.OR = [
                { call1Remarks: { contains: "reachable", mode: "insensitive" } },
                { call2Remarks: { contains: "reachable", mode: "insensitive" } },
                { callingRemarks: { contains: "reachable", mode: "insensitive" } },
              ];
              break;
            case "INTERESTED":
              where.OR = [
                { call1Remarks: { contains: "interested", mode: "insensitive" } },
                { call2Remarks: { contains: "interested", mode: "insensitive" } },
                { callingRemarks: { contains: "interested", mode: "insensitive" } },
              ];
              break;
            case "NOT_INTERESTED":
              where.OR = [
                { call1Remarks: { contains: "not interested", mode: "insensitive" } },
                { call2Remarks: { contains: "not interested", mode: "insensitive" } },
                { callingRemarks: { contains: "not interested", mode: "insensitive" } },
              ];
              break;
            case "CONFIRMED":
              where.OR = [
                { status: "CONFIRMED" },
                { call1Remarks: { contains: "confirm", mode: "insensitive" } },
                { call2Remarks: { contains: "confirm", mode: "insensitive" } },
              ];
              break;
          }
        }

        if (remarksKeyword && remarksKeyword.trim()) {
          const kw = remarksKeyword.trim();
          where.OR = [
            { call1Remarks: { contains: kw, mode: "insensitive" } },
            { call2Remarks: { contains: kw, mode: "insensitive" } },
            { callingRemarks: { contains: kw, mode: "insensitive" } },
          ];
        }

        if (whatsappStatus && whatsappStatus !== "ALL") {
          where.whatsappGroupAdded = whatsappStatus === "ADDED";
        }

        if (applicationStatus && applicationStatus !== "ALL") {
          where.status = applicationStatus;
        }

        if (searchQuery && searchQuery.trim()) {
          const sq = searchQuery.trim();
          where.AND = [
            {
              OR: [
                { name: { contains: sq, mode: "insensitive" } },
                { mobileNumber: { contains: sq, mode: "insensitive" } },
                { registrationNumber: { contains: sq, mode: "insensitive" } },
              ],
            },
          ];
        }

        const applications = await prisma.application.findMany({
          where,
          take: Math.min(Number(limit) || 50, 150),
          orderBy: [{ lastActionAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            mobileNumber: true,
            registrationNumber: true,
            status: true,
            callCount: true,
            call1Done: true,
            call1At: true,
            call1Remarks: true,
            call2Done: true,
            call2At: true,
            call2Remarks: true,
            callingRemarks: true,
            whatsappGroupAdded: true,
            lastActionAt: true,
            event: {
              select: { id: true, name: true, date: true, location: true },
            },
            attendance: {
              select: { attendanceStatus: true, checkInTime: true },
            },
            user: {
              select: { university: true, city: true, gender: true, height: true },
            },
          },
        });

        return {
          success: true,
          count: applications.length,
          candidates: applications.map((a) => ({
            id: a.id,
            name: a.name,
            phone: a.mobileNumber,
            rollNo: a.registrationNumber,
            status: a.status,
            university: a.user?.university || "N/A",
            gender: a.user?.gender || "N/A",
            height: a.user?.height || "N/A",
            eventName: a.event?.name,
            eventDate: a.event?.date?.toISOString().split("T")[0],
            firstCall: a.call1Done ? `Done (${a.call1Remarks || "No remarks"})` : "Pending",
            secondCall: a.call2Done ? `Done (${a.call2Remarks || "No remarks"})` : "Pending",
            whatsappAdded: a.whatsappGroupAdded ? "Yes" : "No",
            generalRemarks: a.callingRemarks || "None",
            attendanceStatus: a.attendance?.attendanceStatus || (a.status === "ATTENDED" ? "PRESENT" : "Not marked"),
          })),
        };
      }

      // 13. UPDATE CANDIDATE CALL STATUS & REMARKS (WRITE)
      case "update_candidate_call_status": {
        const { studentIdentifiers = [], eventId, eventNameKeyword, callRound = "CALL_1", isDone = true, remarks, whatsappGroupAdded, applicationStatus } = args;

        if (!studentIdentifiers || studentIdentifiers.length === 0) {
          return { success: false, message: "No candidate specified to update." };
        }

        // Resolve target event
        let targetEventId = eventId;
        if (!targetEventId && eventNameKeyword) {
          const matched = await prisma.event.findFirst({
            where: {
              OR: [
                { name: { contains: eventNameKeyword, mode: "insensitive" } },
                { description: { contains: eventNameKeyword, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true },
          });
          if (matched) targetEventId = matched.id;
        }

        // Scope check for EVENT_ADMIN
        if (context?.userRole === "EVENT_ADMIN") {
          if (!targetEventId && context.allowedEventIds && context.allowedEventIds.length === 1) {
            targetEventId = context.allowedEventIds[0];
          }
          if (targetEventId && context.allowedEventIds && !context.allowedEventIds.includes(targetEventId)) {
            return { success: false, message: "Permission Denied: You do not have access to this event." };
          }
        }

        const updateResults: any[] = [];

        for (const rawId of studentIdentifiers) {
          const idStr = String(rawId).trim();
          const appWhere: any = {
            OR: [
              { id: idStr },
              { userId: idStr },
              { name: { contains: idStr, mode: "insensitive" } },
              { mobileNumber: { contains: idStr } },
              { registrationNumber: { equals: idStr, mode: "insensitive" } },
            ],
          };

          if (targetEventId) {
            appWhere.eventId = targetEventId;
          } else if (context?.userRole === "EVENT_ADMIN" && context.allowedEventIds) {
            appWhere.eventId = { in: context.allowedEventIds };
          }

          const matchedApps = await prisma.application.findMany({
            where: appWhere,
            include: { event: { select: { id: true, name: true } } },
          });

          if (matchedApps.length === 0) {
            updateResults.push({ identifier: idStr, status: "NOT_FOUND" });
            continue;
          }

          for (const app of matchedApps) {
            const dataToSet: any = {
              lastActionAt: new Date(),
            };

            if (callRound === "CALL_1") {
              dataToSet.call1Done = Boolean(isDone);
              dataToSet.call1At = new Date();
              if (remarks) dataToSet.call1Remarks = remarks;
              dataToSet.callCount = { increment: 1 };
            } else if (callRound === "CALL_2") {
              dataToSet.call2Done = Boolean(isDone);
              dataToSet.call2At = new Date();
              if (remarks) dataToSet.call2Remarks = remarks;
              dataToSet.callCount = { increment: 1 };
            } else {
              if (remarks) dataToSet.callingRemarks = remarks;
            }

            if (whatsappGroupAdded !== undefined) {
              dataToSet.whatsappGroupAdded = Boolean(whatsappGroupAdded);
              dataToSet.whatsappGroupAddedAt = Boolean(whatsappGroupAdded) ? new Date() : null;
            }

            if (applicationStatus) {
              dataToSet.status = applicationStatus;
            }

            const updatedApp = await prisma.application.update({
              where: { id: app.id },
              data: dataToSet,
            });

            updateResults.push({
              identifier: idStr,
              studentName: app.name,
              rollNo: app.registrationNumber,
              eventName: app.event.name,
              status: "UPDATED",
              callRound,
              remarksRecorded: remarks || "None",
              newAppStatus: updatedApp.status,
            });
          }
        }

        return {
          success: true,
          message: `✓ Successfully updated call status/remarks for ${updateResults.filter((r) => r.status === "UPDATED").length} candidate(s).`,
          details: updateResults,
        };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    console.error(`[CopilotExecutor] Error executing ${toolName}:`, err);
    return {
      success: false,
      error: err.message || "Failed to execute database operation.",
    };
  }
}

