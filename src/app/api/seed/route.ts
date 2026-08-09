import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Admin, Client, Event, Student, Application, Setting } from "@/models";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Clear existing database for a clean demo slate
    await Admin.deleteMany({});
    await Client.deleteMany({});
    await Event.deleteMany({});
    await Student.deleteMany({});
    await Application.deleteMany({});
    await Setting.deleteMany({});

    // 2. Create default Admin
    const defaultAdminPassword = "admin";
    const adminUser = await Admin.create({
      username: "admin",
      passwordHash: hashPassword(defaultAdminPassword),
      role: "superadmin",
    });

    // 3. Create Clients
    const client1 = await Client.create({
      name: "Grand Regency Hotel",
      contactPerson: "Rajesh Sharma",
      phone: "+91 9876543210",
      email: "events@grandregency.com",
      address: "Sector 17, Chandigarh",
      notes: "Preferred luxury resort client. Pays promptly.",
    });

    const client2 = await Client.create({
      name: "Shanti Banquets",
      contactPerson: "Monica Geller",
      phone: "+91 9999888877",
      email: "info@shantibanquets.in",
      address: "Zirakpur, Punjab",
      notes: "High volume wedding events.",
    });

    // 4. Create Students
    const student1 = await Student.create({
      name: "Rahul Kumar",
      phone: "9876543222",
      email: "rahul.k@pu.ac.in",
      university: "Panjab University",
      universityId: "PU-2024-887",
      profilePhotoUrl: "",
      status: "active",
      appliedCount: 5,
      selectedCount: 4,
      attendedCount: 3,
      cancelledCount: 1,
      totalEarnings: 2400,
    });

    const student2 = await Student.create({
      name: "Aman Preet",
      phone: "9812345678",
      email: "aman.p@chitkara.edu.in",
      university: "Chitkara University",
      universityId: "CU-2023-45",
      profilePhotoUrl: "",
      status: "active",
      appliedCount: 8,
      selectedCount: 8,
      attendedCount: 8,
      cancelledCount: 0,
      totalEarnings: 6400,
    });

    const student3 = await Student.create({
      name: "Rohit Verma",
      phone: "9000111222",
      email: "rohit@cgc.edu.in",
      university: "CGC Landran",
      universityId: "CGC-2024-90",
      profilePhotoUrl: "",
      status: "active",
      appliedCount: 2,
      selectedCount: 1,
      attendedCount: 0,
      cancelledCount: 1,
      totalEarnings: 0,
    });

    // 5. Create Events
    const weddingEvent = await Event.create({
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
        "DONT: Consume catering food/drinks in guest service zones."
      ],
      workersRequired: 50,
      maxApplications: 75,
      applicationsCount: 2,
      paymentPerStudent: 800,
      clientRevenue: 55000,
      otherExpenses: 5000,
      status: "OPEN",
      visibility: "VISIBLE",
      clientId: client1._id,
      customFormFields: [
        {
          id: "experience",
          type: "yesno",
          label: "Do you have prior hospitality experience?",
          required: true,
        },
        {
          id: "height",
          type: "number",
          label: "What is your height in cm?",
          required: false,
          placeholder: "e.g., 175",
        },
        {
          id: "shirt_size",
          type: "select",
          label: "Select your shirt size",
          required: true,
          options: ["S", "M", "L", "XL", "XXL"],
        }
      ]
    });

    const resortEvent = await Event.create({
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
        "DONT: Leave your post without supervisor permission."
      ],
      workersRequired: 15,
      maxApplications: 25,
      applicationsCount: 0,
      paymentPerStudent: 850,
      clientRevenue: 18000,
      otherExpenses: 1000,
      status: "DRAFT",
      visibility: "VISIBLE",
      clientId: client2._id,
      customFormFields: [
        {
          id: "shift_preference",
          type: "select",
          label: "Preferred shift time",
          required: true,
          options: ["Morning Only", "Full Day"],
        }
      ]
    });

    // 6. Create Applications
    await Application.create({
      eventId: weddingEvent._id,
      studentId: student1._id,
      status: "confirmed",
      customFieldsData: {
        experience: "Yes",
        height: 172,
        shirt_size: "M"
      },
      paymentOverride: 800,
    });

    await Application.create({
      eventId: weddingEvent._id,
      studentId: student2._id,
      status: "attended",
      customFieldsData: {
        experience: "Yes",
        height: 180,
        shirt_size: "L"
      },
      paymentOverride: 900, // custom override
      checkInTime: new Date("2026-08-20T15:40:00Z"),
      checkOutTime: new Date("2026-08-20T23:10:00Z"),
    });

    // 7. Seed System Settings
    await Setting.create({
      key: "homepage_content",
      value: {
        headline: "Reliable Hospitality Workforce for Events, Hotels & Resorts",
        subheadline: "Top Line Catering connects hotels, premium resorts, and hospitality organizers with high-quality, pre-screened student staff and temporary catering teams.",
        whatsappNumber: "919876543210",
        email: "contact@toplinecatering.com",
        aboutText: "Top Line Catering has been the leading supplier of student and temporary hospitality workforce solutions in the tri-state area. We bridge the gap between busy event planners and enthusiastic, hard-working students looking for flexible working opportunities.",
      }
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      credentials: {
        username: "admin",
        password: defaultAdminPassword,
      }
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
