import { PrismaClient, Role, EventStatus, EventVisibility, ApplicationStatus, PaymentStatus, MessageStatus, AttendanceStatus, FieldType } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function hashPassword(pwd: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pwd, salt);
}

async function main() {
  console.log("Seeding PostgreSQL database...");

  // 1. Clear database
  await prisma.attendance.deleteMany({});
  await prisma.applicationFieldResponse.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.eventFormField.deleteMany({});
  await prisma.formField.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.adminAssignedEvent.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.gallery.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Administrators
  const defaultAdminPassword = "admin";
  const adminPasswordHash = await hashPassword(defaultAdminPassword);
  const shivatpaPasswordHash = await hashPassword("shivatpa");

  const superAdmin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      name: "Super Administrator",
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });

  const shivatpaAdmin = await prisma.user.create({
    data: {
      username: "shivatpa",
      passwordHash: shivatpaPasswordHash,
      name: "Shiva Prasad (Super Admin)",
      role: Role.SUPERADMIN,
      isActive: true,
    },
  });

  const callingAdmin = await prisma.user.create({
    data: {
      username: "calling",
      passwordHash: adminPasswordHash,
      name: "Calling Coordinator",
      role: Role.CALLING_ADMIN,
      isActive: true,
    },
  });

  console.log("✔ Admin users created: admin, shivatpa, calling");

  // 3. Create Clients
  const client1 = await prisma.client.create({
    data: {
      name: "Grand Regency Hotel",
      contactPerson: "Rajesh Sharma",
      phone: "+91 9876543210",
      email: "events@grandregency.com",
      address: "Sector 17, Chandigarh",
      notes: "Preferred luxury resort client. Pays promptly.",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Shanti Banquets",
      contactPerson: "Monica Geller",
      phone: "+91 9999888877",
      email: "info@shantibanquets.in",
      address: "Zirakpur, Punjab",
      notes: "High volume wedding events.",
    },
  });

  // 4. Create Students
  const studentPasswordHash = await hashPassword("student123");
  const student1 = await prisma.user.create({
    data: {
      username: "PU-2024-887",
      name: "Rahul Kumar",
      phone: "9876543222",
      email: "rahul.k@pu.ac.in",
      university: "Panjab University",
      registrationNumber: "PU-2024-887",
      role: Role.USER,
      passwordHash: studentPasswordHash,
      city: "Chandigarh",
      age: 21,
      upiId: "rahul@okaxis",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      username: "CU-2023-45",
      name: "Aman Preet",
      phone: "9812345678",
      email: "aman.p@chitkara.edu.in",
      university: "Chitkara University",
      registrationNumber: "CU-2023-45",
      role: Role.USER,
      passwordHash: studentPasswordHash,
      city: "Mohali",
      age: 22,
      upiId: "aman@paytm",
    },
  });

  const student3 = await prisma.user.create({
    data: {
      username: "CGC-2024-90",
      name: "Rohit Verma",
      phone: "9000111222",
      email: "rohit@cgc.edu.in",
      university: "CGC Landran",
      registrationNumber: "CGC-2024-90",
      role: Role.USER,
      passwordHash: studentPasswordHash,
      city: "Amritsar",
      age: 20,
    },
  });

  console.log("✔ Students created.");

  // 5. Create Events
  const weddingEvent = await prisma.event.create({
    data: {
      name: "Grand Royal Wedding",
      date: new Date("2026-08-20"),
      location: "Chandigarh Club, Sector 1, Chandigarh",
      googleMapsUrl: "https://maps.google.com",
      reportingTime: "15:45",
      startTime: "17:00",
      endTime: "23:00",
      workType: "Catering & Service Staff",
      description: "A prestigious high-profile wedding catering setup requiring well-groomed service and buffet operations staff.",
      instructions: "Must bring physical College ID card. Report to captain Amanpreet at entry gate.",
      dressCode: "White shirt, black trousers, black formal shoes, clean-shaven, hair neatly groomed.",
      dosAndDonts: [
        "DO: Arrive 15 minutes before reporting time.",
        "DO: Greet guests politely with a smile.",
        "DONT: Use mobile phones while on service duty.",
        "DONT: Consume catering food/drinks in guest service zones.",
      ],
      workersRequired: 50,
      maxApplications: 75,
      applicationsCount: 2,
      paymentPerStudent: 800,
      clientRevenue: 55000,
      otherExpenses: 5000,
      status: EventStatus.OPEN,
      visibility: EventVisibility.VISIBLE,
      clientId: client1.id,
    },
  });

  const resortEvent = await prisma.event.create({
    data: {
      name: "Independence Day Gala",
      date: new Date("2026-08-15"),
      location: "Aura Resort, Zirakpur",
      googleMapsUrl: "https://maps.google.com",
      reportingTime: "11:30",
      startTime: "12:30",
      endTime: "19:30",
      workType: "Banquet Staff",
      description: "Independence Day VIP brunch gathering. Fast-paced buffet operations.",
      instructions: "Report to Captain Geller. Black apron will be provided on site.",
      dressCode: "Black shirt, black trousers, black leather shoes.",
      dosAndDonts: [
        "DO: Keep service stations clean.",
        "DONT: Leave your post without supervisor permission.",
      ],
      workersRequired: 15,
      maxApplications: 25,
      applicationsCount: 0,
      paymentPerStudent: 850,
      clientRevenue: 18000,
      otherExpenses: 1000,
      status: EventStatus.OPEN,
      visibility: EventVisibility.VISIBLE,
      clientId: client2.id,
    },
  });

  // Assign calling duties
  await prisma.adminAssignedEvent.create({
    data: {
      adminId: callingAdmin.id,
      eventId: weddingEvent.id,
    },
  });

  // Form Fields
  const expField = await prisma.formField.create({
    data: {
      key: "experience",
      label: "Do you have prior hospitality experience?",
      type: FieldType.YESNO,
      isRequired: true,
    },
  });

  const heightField = await prisma.formField.create({
    data: {
      key: "height",
      label: "What is your height in cm?",
      type: FieldType.NUMBER,
      isRequired: false,
      placeholder: "e.g., 175",
    },
  });

  const shirtField = await prisma.formField.create({
    data: {
      key: "shirt_size",
      label: "Select your shirt size",
      type: FieldType.SELECT,
      isRequired: true,
      options: ["S", "M", "L", "XL", "XXL"],
    },
  });

  await prisma.eventFormField.createMany({
    data: [
      { eventId: weddingEvent.id, fieldId: expField.id, displayOrder: 0, isRequired: true },
      { eventId: weddingEvent.id, fieldId: heightField.id, displayOrder: 1, isRequired: false },
      { eventId: weddingEvent.id, fieldId: shirtField.id, displayOrder: 2, isRequired: true },
    ],
  });

  // Applications
  const app1 = await prisma.application.create({
    data: {
      eventId: weddingEvent.id,
      userId: student1.id,
      name: student1.name,
      mobileNumber: student1.phone || "",
      registrationNumber: student1.registrationNumber || "PU-2024-887",
      status: ApplicationStatus.CONFIRMED,
      paymentOverride: 800,
      callPriority: 10,
    },
  });

  await prisma.applicationFieldResponse.createMany({
    data: [
      { applicationId: app1.id, fieldId: expField.id, value: "Yes" },
      { applicationId: app1.id, fieldId: heightField.id, value: "172" },
      { applicationId: app1.id, fieldId: shirtField.id, value: "M" },
    ],
  });

  const app2 = await prisma.application.create({
    data: {
      eventId: weddingEvent.id,
      userId: student2.id,
      name: student2.name,
      mobileNumber: student2.phone || "",
      registrationNumber: student2.registrationNumber || "CU-2023-45",
      status: ApplicationStatus.ATTENDED,
      paymentOverride: 900,
      callPriority: 10,
    },
  });

  await prisma.applicationFieldResponse.createMany({
    data: [
      { applicationId: app2.id, fieldId: expField.id, value: "Yes" },
      { applicationId: app2.id, fieldId: heightField.id, value: "180" },
      { applicationId: app2.id, fieldId: shirtField.id, value: "L" },
    ],
  });

  await prisma.attendance.create({
    data: {
      eventId: weddingEvent.id,
      applicationId: app2.id,
      userId: student2.id,
      registrationNumber: student2.registrationNumber || "N/A",
      attendanceStatus: AttendanceStatus.PRESENT,
      checkInTime: new Date("2026-08-20T15:40:00Z"),
    },
  });

  // Settings
  await prisma.setting.create({
    data: {
      key: "homepage_content",
      value: {
        headline: "Reliable Hospitality Workforce for Events, Hotels & Resorts",
        subheadline: "TOPLINE ODC connects hotels, premium resorts, and hospitality organizers with high-quality, pre-screened student staff and temporary catering teams.",
        whatsappNumber: "919876543210",
        whatsappLink: "https://chat.whatsapp.com/Fo4S0lA5xYULLJCm9p0oPh",
        email: "contact@toplinecatering.com",
        aboutText: "TOPLINE ODC has been the leading supplier of student and temporary hospitality workforce solutions in the tri-state area. We bridge the gap between busy event planners and enthusiastic, hard-working students looking for flexible working opportunities.",
      },
    },
  });

  // Gallery Photos
  await prisma.gallery.createMany({
    data: [
      {
        imageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=60",
        caption: "Buffet Operations & Food Presentation",
        category: "Catering Setup",
        published: true,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop&q=60",
        caption: "Banquet Hall Grand Layout & Dining Service Setup",
        category: "Banquets",
        published: true,
      },
    ],
  });

  console.log("==================================================");
  console.log("POSTGRESQL SEED COMPLETED SUCCESSFULLY!");
  console.log("Admin accounts ready:");
  console.log(" - admin / admin");
  console.log(" - shivatpa / shivatpa (or admin)");
  console.log(" - calling / admin");
  console.log("==================================================");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
