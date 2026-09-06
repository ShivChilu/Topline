import mongoose from "mongoose";
import { PrismaClient, Role, EventStatus, EventVisibility, ApplicationStatus, PaymentStatus, MessageStatus, AttendanceStatus, FieldType } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const MONGODB_URI = process.env.MONGODB_URI;

export async function migrateMongoToPostgres() {
  console.log("==================================================");
  console.log("STARTING TOPLINE ODC DATA MIGRATION (MONGO -> PG)");
  console.log("==================================================");

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not configured in .env. Skipping data migration.");
    return;
  }

  const report = {
    adminsMigrated: 0,
    studentsMigrated: 0,
    clientsMigrated: 0,
    eventsMigrated: 0,
    fieldsMigrated: 0,
    applicationsMigrated: 0,
    attendancesMigrated: 0,
    settingsMigrated: 0,
    galleriesMigrated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  let mongoConn: typeof mongoose | null = null;

  try {
    console.log("Connecting to MongoDB Atlas...");
    mongoConn = await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✔ Connected to MongoDB.");
    const db = mongoConn.connection.db;
    if (!db) throw new Error("Database reference is undefined");

    // 1. MIGRATE ADMINS
    console.log("\n[1/7] Migrating Admins...");
    const adminDocs = await db.collection("admins").find({}).toArray();
    for (const a of adminDocs) {
      try {
        let roleEnum: Role = Role.ADMIN;
        if (a.role === "superadmin") roleEnum = Role.SUPERADMIN;
        else if (a.role === "calling") roleEnum = Role.CALLING_ADMIN;

        await prisma.user.upsert({
          where: { username: a.username },
          update: {
            passwordHash: a.passwordHash,
            role: roleEnum,
            isActive: a.isActive ?? true,
          },
          create: {
            username: a.username,
            name: a.username.toUpperCase(),
            passwordHash: a.passwordHash,
            role: roleEnum,
            isActive: a.isActive ?? true,
            createdAt: a.createdAt || new Date(),
          },
        });
        report.adminsMigrated++;
      } catch (err: any) {
        report.errors.push(`Admin (${a.username}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.adminsMigrated} admin records.`);

    // 2. MIGRATE CLIENTS
    console.log("\n[2/7] Migrating Clients...");
    const clientDocs = await db.collection("clients").find({}).toArray();
    for (const c of clientDocs) {
      try {
        const id = c._id.toString();
        await prisma.client.upsert({
          where: { id },
          update: {
            name: c.name,
            contactPerson: c.contactPerson || "N/A",
            phone: c.phone || "N/A",
            email: c.email || `${id}@client.topline.co.in`,
            address: c.address || "Amritsar",
            notes: c.notes,
          },
          create: {
            id,
            name: c.name,
            contactPerson: c.contactPerson || "N/A",
            phone: c.phone || "N/A",
            email: c.email || `${id}@client.topline.co.in`,
            address: c.address || "Amritsar",
            notes: c.notes,
            createdAt: c.createdAt || new Date(),
          },
        });
        report.clientsMigrated++;
      } catch (err: any) {
        report.errors.push(`Client (${c.name}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.clientsMigrated} client records.`);

    // 3. MIGRATE EVENTS & CUSTOM FORM FIELDS
    console.log("\n[3/7] Migrating Events & Form Field Templates...");
    const eventDocs = await db.collection("events").find({}).toArray();
    for (const e of eventDocs) {
      try {
        const eventId = e._id.toString();
        const statusMap: Record<string, EventStatus> = {
          DRAFT: EventStatus.DRAFT,
          OPEN: EventStatus.OPEN,
          FULL: EventStatus.FULL,
          CLOSED: EventStatus.CLOSED,
          COMPLETED: EventStatus.COMPLETED,
          ARCHIVED: EventStatus.ARCHIVED,
        };

        const eventStatus = statusMap[e.status] || EventStatus.OPEN;
        const visibility = e.visibility === "HIDDEN" ? EventVisibility.HIDDEN : EventVisibility.VISIBLE;
        const clientId = e.clientId ? e.clientId.toString() : null;

        await prisma.event.upsert({
          where: { id: eventId },
          update: {
            name: e.name,
            date: new Date(e.date),
            location: e.location,
            googleMapsUrl: e.googleMapsUrl,
            reportingTime: e.reportingTime || "08:00",
            startTime: e.startTime || "09:00",
            endTime: e.endTime || "17:00",
            workType: e.workType || "Event Staff",
            description: e.description || "",
            instructions: e.instructions,
            dressCode: e.dressCode,
            dosAndDonts: Array.isArray(e.dosAndDonts) ? e.dosAndDonts : [],
            workersRequired: Number(e.workersRequired) || 10,
            maxApplications: Number(e.maxApplications) || 20,
            applicationsCount: Number(e.applicationsCount) || 0,
            paymentPerStudent: Number(e.paymentPerStudent) || 800,
            clientRevenue: Number(e.clientRevenue) || 0,
            otherExpenses: Number(e.otherExpenses) || 0,
            status: eventStatus,
            visibility,
            clientId,
            attendanceToken: e.attendanceToken,
            attendanceTokenEnabled: Boolean(e.attendanceTokenEnabled),
            attendanceVerificationField: e.attendanceVerificationField || "registrationNumber",
            attendanceWindowStart: e.attendanceWindowStart ? new Date(e.attendanceWindowStart) : null,
            attendanceWindowEnd: e.attendanceWindowEnd ? new Date(e.attendanceWindowEnd) : null,
            gracePeriod: Number(e.gracePeriod) || 15,
            attendanceDisplayFields: Array.isArray(e.attendanceDisplayFields) ? e.attendanceDisplayFields : [],
          },
          create: {
            id: eventId,
            name: e.name,
            date: new Date(e.date),
            location: e.location,
            googleMapsUrl: e.googleMapsUrl,
            reportingTime: e.reportingTime || "08:00",
            startTime: e.startTime || "09:00",
            endTime: e.endTime || "17:00",
            workType: e.workType || "Event Staff",
            description: e.description || "",
            instructions: e.instructions,
            dressCode: e.dressCode,
            dosAndDonts: Array.isArray(e.dosAndDonts) ? e.dosAndDonts : [],
            workersRequired: Number(e.workersRequired) || 10,
            maxApplications: Number(e.maxApplications) || 20,
            applicationsCount: Number(e.applicationsCount) || 0,
            paymentPerStudent: Number(e.paymentPerStudent) || 800,
            clientRevenue: Number(e.clientRevenue) || 0,
            otherExpenses: Number(e.otherExpenses) || 0,
            status: eventStatus,
            visibility,
            clientId,
            attendanceToken: e.attendanceToken,
            attendanceTokenEnabled: Boolean(e.attendanceTokenEnabled),
            attendanceVerificationField: e.attendanceVerificationField || "registrationNumber",
            attendanceWindowStart: e.attendanceWindowStart ? new Date(e.attendanceWindowStart) : null,
            attendanceWindowEnd: e.attendanceWindowEnd ? new Date(e.attendanceWindowEnd) : null,
            gracePeriod: Number(e.gracePeriod) || 15,
            attendanceDisplayFields: Array.isArray(e.attendanceDisplayFields) ? e.attendanceDisplayFields : [],
            createdAt: e.createdAt || new Date(),
          },
        });

        // Migrate embedded customFormFields to normalized FormField & EventFormField
        if (Array.isArray(e.customFormFields)) {
          for (let idx = 0; idx < e.customFormFields.length; idx++) {
            const f = e.customFormFields[idx];
            const fieldKey = (f.label || `field_${idx}`).toLowerCase().replace(/[^a-z0-9_]/g, "_");

            const typeMap: Record<string, FieldType> = {
              text: FieldType.TEXT,
              paragraph: FieldType.PARAGRAPH,
              number: FieldType.NUMBER,
              email: FieldType.EMAIL,
              phone: FieldType.PHONE,
              date: FieldType.DATE,
              time: FieldType.TIME,
              select: FieldType.SELECT,
              checkbox: FieldType.CHECKBOX,
              radio: FieldType.RADIO,
              yesno: FieldType.YESNO,
              rating: FieldType.RATING,
              file: FieldType.FILE,
            };

            const formField = await prisma.formField.upsert({
              where: { key: fieldKey },
              update: {
                label: f.label,
                type: typeMap[f.type] || FieldType.TEXT,
                description: f.description || null,
                placeholder: f.placeholder || null,
                options: Array.isArray(f.options) ? f.options : [],
                isRequired: Boolean(f.required),
              },
              create: {
                key: fieldKey,
                label: f.label,
                type: typeMap[f.type] || FieldType.TEXT,
                description: f.description || null,
                placeholder: f.placeholder || null,
                options: Array.isArray(f.options) ? f.options : [],
                isRequired: Boolean(f.required),
                displayOrder: idx,
              },
            });

            await prisma.eventFormField.upsert({
              where: {
                eventId_fieldId: {
                  eventId,
                  fieldId: formField.id,
                },
              },
              update: {
                isRequired: Boolean(f.required),
                displayOrder: idx,
              },
              create: {
                eventId,
                fieldId: formField.id,
                isRequired: Boolean(f.required),
                displayOrder: idx,
              },
            });
            report.fieldsMigrated++;
          }
        }

        report.eventsMigrated++;
      } catch (err: any) {
        report.errors.push(`Event (${e.name}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.eventsMigrated} events and their form field definitions.`);

    // 4. MIGRATE STUDENTS TO USERS
    console.log("\n[4/7] Migrating Students to User accounts...");
    const studentDocs = await db.collection("students").find({}).toArray();
    const studentIdToUserIdMap = new Map<string, string>();

    for (const s of studentDocs) {
      try {
        const studentId = s._id.toString();
        const regNo = (s.universityId || `REG-${studentId.slice(-6)}`).trim().toUpperCase();
        const phone = s.phone ? s.phone.trim() : null;
        const email = s.email ? s.email.trim().toLowerCase() : `${regNo.toLowerCase()}@student.topline.co.in`;
        const username = `student_${regNo.toLowerCase().replace(/[^a-z0-9]/g, "")}_${studentId.slice(-4)}`;

        const user = await prisma.user.upsert({
          where: { registrationNumber: regNo },
          update: {
            name: s.name,
            phone: phone || undefined,
            email: email || undefined,
            university: s.university,
            profilePhotoUrl: s.profilePhotoUrl,
            isActive: s.status !== "blocked",
          },
          create: {
            username,
            name: s.name,
            phone,
            email,
            registrationNumber: regNo,
            university: s.university,
            profilePhotoUrl: s.profilePhotoUrl,
            passwordHash: "$2a$10$wN9P35M3Fkn15X.kO/k6reW6QW8n.6uAkgT.P9jN2uB6H9pQ8i0q.", // Default hashed password
            role: Role.USER,
            isActive: s.status !== "blocked",
            createdAt: s.createdAt || new Date(),
          },
        });

        studentIdToUserIdMap.set(studentId, user.id);
        report.studentsMigrated++;
      } catch (err: any) {
        report.errors.push(`Student (${s.name} - ${s.universityId}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.studentsMigrated} student profiles.`);

    // 5. MIGRATE APPLICATIONS
    console.log("\n[5/7] Migrating Applications...");
    const appDocs = await db.collection("applications").find({}).toArray();
    for (const app of appDocs) {
      try {
        const appId = app._id.toString();
        const eventId = app.eventId ? app.eventId.toString() : null;
        const rawStudentId = app.studentId ? app.studentId.toString() : null;

        if (!eventId || !rawStudentId) {
          report.skipped++;
          continue;
        }

        let userId = studentIdToUserIdMap.get(rawStudentId);
        if (!userId) {
          // If student master doc wasn't found, create on the fly
          const fallbackReg = (app.registrationNumber || `REG-${appId.slice(-6)}`).trim().toUpperCase();
          const fallbackUser = await prisma.user.upsert({
            where: { registrationNumber: fallbackReg },
            update: { name: app.name || `Student ${fallbackReg}` },
            create: {
              username: `user_${fallbackReg.toLowerCase().replace(/[^a-z0-9]/g, "")}_${appId.slice(-4)}`,
              name: app.name || `Student ${fallbackReg}`,
              registrationNumber: fallbackReg,
              passwordHash: "$2a$10$wN9P35M3Fkn15X.kO/k6reW6QW8n.6uAkgT.P9jN2uB6H9pQ8i0q.",
              role: Role.USER,
            },
          });
          userId = fallbackUser.id;
        }

        const statusMap: Record<string, ApplicationStatus> = {
          applied: ApplicationStatus.APPLIED,
          under_review: ApplicationStatus.UNDER_REVIEW,
          selected: ApplicationStatus.SELECTED,
          rejected: ApplicationStatus.REJECTED,
          confirmed: ApplicationStatus.CONFIRMED,
          cancelled: ApplicationStatus.CANCELLED,
          attended: ApplicationStatus.ATTENDED,
          absent: ApplicationStatus.ABSENT,
          paid: ApplicationStatus.PAID,
        };

        const appStatus = statusMap[app.status] || ApplicationStatus.APPLIED;
        const paymentStatus = app.paymentStatus === "PAID" ? PaymentStatus.PAID : PaymentStatus.UNPAID;

        // Clean phone mapping: NEVER save registration number as phone
        const rawReg = (app.registrationNumber || "").trim();
        let mobileNumber = (app.mobileNumber || "").trim();
        if (mobileNumber === rawReg || mobileNumber.replace(/[^0-9]/g, "").length < 10) {
          mobileNumber = "N/A";
        }

        const application = await prisma.application.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId,
            },
          },
          update: {
            name: app.name || "Student",
            mobileNumber,
            registrationNumber: rawReg || "N/A",
            status: appStatus,
            paymentStatus,
            paymentOverride: app.paymentOverride ? Number(app.paymentOverride) : null,
            whatsappGroupAdded: Boolean(app.whatsappGroupAdded),
            whatsappGroupAddedAt: app.whatsappGroupAddedAt ? new Date(app.whatsappGroupAddedAt) : null,
          },
          create: {
            id: appId,
            eventId,
            userId,
            name: app.name || "Student",
            mobileNumber,
            registrationNumber: rawReg || "N/A",
            status: appStatus,
            paymentStatus,
            paymentOverride: app.paymentOverride ? Number(app.paymentOverride) : null,
            whatsappGroupAdded: Boolean(app.whatsappGroupAdded),
            whatsappGroupAddedAt: app.whatsappGroupAddedAt ? new Date(app.whatsappGroupAddedAt) : null,
            createdAt: app.createdAt || new Date(),
          },
        });

        // Migrate custom field answers
        if (app.customFieldsData && typeof app.customFieldsData === "object") {
          for (const key of Object.keys(app.customFieldsData)) {
            const val = app.customFieldsData[key];
            if (val === undefined || val === null) continue;
            const fieldKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");

            const field = await prisma.formField.findUnique({ where: { key: fieldKey } });
            if (field) {
              await prisma.applicationFieldResponse.upsert({
                where: {
                  applicationId_fieldId: {
                    applicationId: application.id,
                    fieldId: field.id,
                  },
                },
                update: { value: typeof val === "object" ? JSON.stringify(val) : String(val) },
                create: {
                  applicationId: application.id,
                  fieldId: field.id,
                  value: typeof val === "object" ? JSON.stringify(val) : String(val),
                },
              });
            }
          }
        }

        report.applicationsMigrated++;
      } catch (err: any) {
        report.errors.push(`Application (${app._id}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.applicationsMigrated} event applications.`);

    // 6. MIGRATE ATTENDANCES
    console.log("\n[6/7] Migrating Attendances...");
    const attendanceDocs = await db.collection("attendances").find({}).toArray();
    for (const att of attendanceDocs) {
      try {
        const eventId = att.eventId ? att.eventId.toString() : null;
        const rawStudentId = att.studentId ? att.studentId.toString() : null;
        const appId = att.applicationId ? att.applicationId.toString() : null;

        if (!eventId || !rawStudentId || !appId) {
          report.skipped++;
          continue;
        }

        const userId = studentIdToUserIdMap.get(rawStudentId);
        if (!userId) continue;

        const statusMap: Record<string, AttendanceStatus> = {
          PRESENT: AttendanceStatus.PRESENT,
          LATE: AttendanceStatus.LATE,
          ABSENT: AttendanceStatus.ABSENT,
          CANCELLED: AttendanceStatus.CANCELLED,
        };

        await prisma.attendance.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId,
            },
          },
          update: {
            attendanceStatus: statusMap[att.attendanceStatus] || AttendanceStatus.PRESENT,
            checkInTime: att.checkInTime ? new Date(att.checkInTime) : new Date(),
            deviceMetadata: att.deviceMetadata,
            manualRemarks: att.manualRemarks,
          },
          create: {
            eventId,
            userId,
            applicationId: appId,
            registrationNumber: att.registrationNumber || "N/A",
            attendanceStatus: statusMap[att.attendanceStatus] || AttendanceStatus.PRESENT,
            checkInTime: att.checkInTime ? new Date(att.checkInTime) : new Date(),
            deviceMetadata: att.deviceMetadata,
            manualRemarks: att.manualRemarks,
            createdAt: att.createdAt || new Date(),
          },
        });
        report.attendancesMigrated++;
      } catch (err: any) {
        report.errors.push(`Attendance (${att._id}): ${err.message}`);
      }
    }
    console.log(`✔ Migrated ${report.attendancesMigrated} attendance logs.`);

    // 7. MIGRATE CMS SETTINGS & GALLERY
    console.log("\n[7/7] Migrating Website Settings & Gallery...");
    const settingDocs = await db.collection("settings").find({}).toArray();
    for (const s of settingDocs) {
      try {
        await prisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        });
        report.settingsMigrated++;
      } catch (err: any) {
        report.errors.push(`Setting (${s.key}): ${err.message}`);
      }
    }

    const galleryDocs = await db.collection("galleries").find({}).toArray();
    for (const g of galleryDocs) {
      try {
        await prisma.gallery.create({
          data: {
            imageUrl: g.imageUrl,
            caption: g.caption || "",
            category: g.category || "General",
            published: g.published ?? true,
            createdAt: g.createdAt || new Date(),
          },
        });
        report.galleriesMigrated++;
      } catch (err: any) {
        report.errors.push(`Gallery (${g.imageUrl}): ${err.message}`);
      }
    }

    console.log("\n==================================================");
    console.log("MIGRATION COMPLETED SUCCESSFULLY");
    console.log("==================================================");
    console.log(JSON.stringify(report, null, 2));

  } catch (error: any) {
    console.error("Migration fatal failure:", error);
  } finally {
    if (mongoConn) await mongoConn.disconnect();
    await prisma.$disconnect();
  }
}

// Direct execution
if (process.argv[1] && process.argv[1].includes("migrate-mongo-to-postgres")) {
  migrateMongoToPostgres();
}
