/**
 * Topline Granular IAM & Feature Permission Engine
 * Supports role-level defaults, per-admin custom permissions, and per-event IAM policies.
 */

export const EVENT_PERMISSIONS = [
  {
    key: "events:view_roster",
    label: "View Event Roster & Stats",
    description: "Browse candidate lists, applicant details, phone numbers, and call logs.",
    category: "View & Reporting",
    isDefault: true,
  },
  {
    key: "attendance:mark",
    label: "Mark Attendance & Live Hub",
    description: "Update candidate attendance, check-in, check-out, and access Live Attendance QR scanner.",
    category: "Attendance",
    isDefault: true,
  },
  {
    key: "attendance:close",
    label: "Close & Finalize Attendance",
    description: "Close attendance session, place absent candidates on hold, and send final status notifications.",
    category: "Attendance",
    isDefault: false,
  },
  {
    key: "events:close_resume",
    label: "Close & Resume Registration Form",
    description: "Pause student registrations or reopen the public application form.",
    category: "Form Controls",
    isDefault: false,
  },
  {
    key: "events:reopen_slots",
    label: "Reopen Event (+Seats/Slots)",
    description: "Expand candidate capacity and reopen closed events with extra slots.",
    category: "Event Operations",
    isDefault: false,
  },
  {
    key: "events:edit",
    label: "Edit Event Specifications",
    description: "Modify reporting time, shift timings, dress code, payout, and custom form questions.",
    category: "Event Operations",
    isDefault: false,
  },
  {
    key: "events:duplicate",
    label: "Duplicate / Clone Event",
    description: "Duplicate existing event configuration to create a new event draft.",
    category: "Event Operations",
    isDefault: false,
  },
  {
    key: "students:add_from_master",
    label: "Add Candidate from Directory",
    description: "Search Candidate Directory and enroll approved candidates directly to event roster.",
    category: "Candidate Management",
    isDefault: false,
  },
  {
    key: "events:export_data",
    label: "Export Roster & Contacts",
    description: "Export candidate rosters to Excel/CSV and export contact cards (.vcf).",
    category: "View & Reporting",
    isDefault: false,
  },
  {
    key: "events:email_broadcast",
    label: "Send Selection & Custom Emails",
    description: "Send selection/rejection emails and broadcast custom notifications to candidates.",
    category: "Communication",
    isDefault: false,
  },
  {
    key: "events:manage_templates",
    label: "Create & Manage Templates",
    description: "Create and edit reusable email templates for communications.",
    category: "Communication",
    isDefault: false,
  },
] as const;

export type EventPermissionKey = (typeof EVENT_PERMISSIONS)[number]["key"];

export interface PermissionPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  permissions: EventPermissionKey[];
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: "attendance_only",
    name: "Attendance Operator (Standard)",
    badge: "Basic",
    description: "View roster and mark candidate check-in / live attendance QR only.",
    permissions: ["events:view_roster", "attendance:mark"],
  },
  {
    id: "roster_coordinator",
    name: "Roster Coordinator",
    badge: "Roster + Directory",
    description: "Mark attendance, export rosters, and enroll candidates directly from Candidate Directory.",
    permissions: [
      "events:view_roster",
      "attendance:mark",
      "students:add_from_master",
      "events:export_data",
    ],
  },
  {
    id: "operations_lead",
    name: "Operations Lead",
    badge: "Full Form Operations",
    description: "Close/resume forms, reopen extra slots, edit event specifications, and manage roster.",
    permissions: [
      "events:view_roster",
      "attendance:mark",
      "events:close_resume",
      "events:reopen_slots",
      "events:edit",
      "students:add_from_master",
      "events:export_data",
    ],
  },
  {
    id: "full_access",
    name: "Full Event Administrator",
    badge: "All Event Features",
    description: "Unrestricted access to all event management actions and student enrollment.",
    permissions: EVENT_PERMISSIONS.map((p) => p.key),
  },
];

export interface AdminSessionUser {
  id: string;
  role: string;
  customPermissions?: string[];
  assignedEvents?: Array<{
    eventId: string;
    permissions?: string[];
  }>;
}

/**
 * Evaluates whether an admin has authorization to perform a specific granular action on an event.
 */
export function hasEventPermission(
  admin: AdminSessionUser | null | undefined,
  action: EventPermissionKey | string,
  eventId?: string
): boolean {
  if (!admin) return false;

  // 1. SUPERADMIN and ADMIN have wildcard (*) access to everything
  if (admin.role === "SUPERADMIN" || admin.role === "ADMIN") {
    return true;
  }

  // 2. Calling Admin is restricted to Calling Dashboard
  if (admin.role === "CALLING_ADMIN" || admin.role === "calling") {
    return false;
  }

  // 3. EVENT_ADMIN authorization check
  if (admin.role === "EVENT_ADMIN" || admin.role === "event_admin") {
    // Basic permissions are inherently granted to assigned events
    if (action === "events:view_roster" || action === "attendance:mark") {
      return true;
    }

    // Check per-event IAM permission assignment
    if (eventId && Array.isArray(admin.assignedEvents)) {
      const assignment = admin.assignedEvents.find((a) => a.eventId === eventId);
      if (assignment) {
        const perms = assignment.permissions || [];
        if (perms.includes("*") || perms.includes(action)) {
          return true;
        }
      }
    }

    // Check user-level global permission grants
    if (Array.isArray(admin.customPermissions)) {
      if (admin.customPermissions.includes("*") || admin.customPermissions.includes(action)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns all active permissions for an admin for a specific event.
 */
export function getActiveEventPermissions(
  admin: AdminSessionUser | null | undefined,
  eventId?: string
): Set<string> {
  const result = new Set<string>();
  if (!admin) return result;

  if (admin.role === "SUPERADMIN" || admin.role === "ADMIN") {
    EVENT_PERMISSIONS.forEach((p) => result.add(p.key));
    return result;
  }

  if (admin.role === "EVENT_ADMIN" || admin.role === "event_admin") {
    result.add("events:view_roster");
    result.add("attendance:mark");

    // Add user-level global permissions
    (admin.customPermissions || []).forEach((p) => result.add(p));

    // Add event-level permissions
    if (eventId && Array.isArray(admin.assignedEvents)) {
      const assignment = admin.assignedEvents.find((a) => a.eventId === eventId);
      (assignment?.permissions || []).forEach((p) => result.add(p));
    }
  }

  return result;
}
