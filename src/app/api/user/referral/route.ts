import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { generateUniqueReferralCode, getUserReferralStats } from "@/lib/referral";
import { isValidUPI } from "@/lib/validation";
import { getStudentProfileCompletion } from "@/lib/profile-completion";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;
  return decoded;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        referralCode: true,
        upiId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found." }, { status: 404 });
    }

    const headerList = await headers();
    const host = headerList.get("host") || "topline.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const stats = await getUserReferralStats(user.id);
    const completeness = await getStudentProfileCompletion(user.id);
    const inviteUrl = user.referralCode ? `${baseUrl}/register?ref=${user.referralCode}` : "";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        referralCode: user.referralCode || null,
        upiId: user.upiId || null,
        hasCode: Boolean(user.referralCode),
        inviteUrl,
      },
      stats,
      completeness,
    });
  } catch (error: any) {
    console.error("Student referral GET error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found." }, { status: 404 });
    }

    // PROFILE COMPLETENESS GATE: Must have 100% completed profile to activate/create referral code
    const completeness = await getStudentProfileCompletion(user.id);
    if (!user.referralCode && !completeness.isComplete) {
      const missingList = [...completeness.missingFields, ...completeness.missingPhotos];
      return NextResponse.json(
        {
          success: false,
          message: `Only students with 100% completed profiles can create referral codes. Please complete your profile first (${completeness.percentage}% completed). Missing: ${missingList.join(", ")}`,
          completeness,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { upiId, customCode } = body;

    // 1. Mandatory UPI validation to ensure student can receive offline payments
    if (!upiId || typeof upiId !== "string" || !isValidUPI(upiId.trim())) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid UPI ID is required to activate your referral payouts (e.g., 9876543210@paytm or yourname@oksbi).",
        },
        { status: 400 }
      );
    }
    const cleanUpi = upiId.trim();

    // 2. Referral Code Assignment / Customization
    let finalCode = user.referralCode;

    if (customCode && typeof customCode === "string" && customCode.trim()) {
      const cleanCustom = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanCustom.length < 3 || cleanCustom.length > 12) {
        return NextResponse.json(
          { success: false, message: "Referral code must be between 3 and 12 alphanumeric characters." },
          { status: 400 }
        );
      }

      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: {
          referralCode: cleanCustom,
          id: { not: user.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, message: "This referral code is already taken. Please choose another code." },
          { status: 409 }
        );
      }

      finalCode = cleanCustom;
    } else if (!finalCode) {
      finalCode = await generateUniqueReferralCode(user.name);
    }

    // 3. Save to database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        upiId: cleanUpi,
        referralCode: finalCode,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        upiId: true,
      },
    });

    const headerList = await headers();
    const host = headerList.get("host") || "topline.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const inviteUrl = `${protocol}://${host}/register?ref=${updatedUser.referralCode}`;

    return NextResponse.json({
      success: true,
      message: "Referral program activated successfully! Share your link to start earning up to ₹150 per friend.",
      user: {
        ...updatedUser,
        hasCode: true,
        inviteUrl,
      },
    });
  } catch (error: any) {
    console.error("Student referral POST error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
