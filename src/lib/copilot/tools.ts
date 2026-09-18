import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

export const COPILOT_TOOLS: ChatCompletionTool[] = [
  // 1. GET SYSTEM OVERVIEW
  {
    type: "function",
    function: {
      name: "get_system_overview",
      description: "Get real-time dashboard statistics: total students, approved/selected count, pending review count, active events, total applications, attended count, open broadcasts, and recent activity.",
      parameters: {
        type: "object",
        properties: {
          includeRecentActivity: {
            type: "boolean",
            description: "Whether to include recent events & activity log in the metrics overview (default: true).",
          },
        },
      },
    },
  },

  // 2. QUERY & FILTER STUDENTS
  {
    type: "function",
    function: {
      name: "query_students",
      description: "Search and filter registered students with high flexibility. Supports searching by name, phone, email, university, roll no, city, gender, height, age, selection status, completeness, or whether they have photos.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: {
            type: "string",
            description: "Search keyword matching name, phone, email, university, roll number, or city.",
          },
          selectionStatus: {
            type: "string",
            enum: ["ALL", "SELECTED", "UNDER_REVIEW", "NOT_SELECTED", "ON_HOLD"],
            description: "Filter by global candidate selection status.",
          },
          gender: {
            type: "string",
            enum: ["ALL", "MALE", "FEMALE", "OTHER"],
            description: "Filter by candidate gender.",
          },
          university: {
            type: "string",
            description: "Filter by university or college name (case-insensitive substring).",
          },
          city: {
            type: "string",
            description: "Filter by city.",
          },
          minHeightCm: {
            type: "number",
            description: "Minimum candidate height threshold in cm (e.g. 162 for ~5'4\").",
          },
          minCompleteness: {
            type: "number",
            description: "Minimum profile completeness percentage (e.g. 100 for 100% complete only).",
          },
          limit: {
            type: "number",
            description: "Max number of students to return (default: 25, max: 100).",
          },
        },
      },
    },
  },

  // 3. MULTI-EVENT COMPARISON / INTERSECTION
  {
    type: "function",
    function: {
      name: "compare_multi_event_attendance",
      description: "Compare students across multiple specific events (by event name keywords or event IDs) to find common students who came (attended), applied, or were no-shows across ALL or ANY of the chosen events.",
      parameters: {
        type: "object",
        properties: {
          eventSearchTerms: {
            type: "array",
            items: { type: "string" },
            description: "List of event names, keywords, or dates to identify events (e.g. ['17 September', '21 September']).",
          },
          eventIds: {
            type: "array",
            items: { type: "string" },
            description: "Exact Event UUIDs if known.",
          },
          mode: {
            type: "string",
            enum: ["COMMON_ATTENDED", "COMMON_APPLIED", "ANY_ATTENDED", "ANY_APPLIED", "NOT_ATTENDED"],
            description: "Matching mode: COMMON_ATTENDED (came for both/all), COMMON_APPLIED (applied for both/all), ANY_ATTENDED (came for at least one), etc.",
          },
        },
        required: ["mode"],
      },
    },
  },

  // 4. QUERY EVENTS
  {
    type: "function",
    function: {
      name: "query_events",
      description: "Fetch events list with dates, locations, requirements, payouts, application counts, and attendance stats.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: {
            type: "string",
            description: "Search by event name, date, location, or work type.",
          },
          status: {
            type: "string",
            enum: ["ALL", "OPEN", "SCHEDULED", "DRAFT", "COMPLETED", "CLOSED", "FULL"],
            description: "Event status filter.",
          },
          limit: {
            type: "number",
            description: "Max number of events to return.",
          },
        },
      },
    },
  },

  // 5. QUERY EMAIL CAMPAIGNS & BROADCASTS
  {
    type: "function",
    function: {
      name: "query_email_analytics",
      description: "Query email broadcast batches, delivery logs, open rates, clicked actions (CONFIRM_YES, DECLINE_NO, JOIN_WHATSAPP) for students and events.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "Filter email logs by specific event ID.",
          },
          clickedAction: {
            type: "string",
            enum: ["ALL", "CONFIRM_YES", "DECLINE_NO", "JOIN_WHATSAPP"],
            description: "Filter by candidate interactive response button action.",
          },
          status: {
            type: "string",
            enum: ["ALL", "OPENED", "UNOPENED", "CLICKED"],
            description: "Filter by open/read status.",
          },
        },
      },
    },
  },

  // 6. QUERY REFERRALS
  {
    type: "function",
    function: {
      name: "query_referrals",
      description: "Query referral codes, who referred whom, bonus payout statuses, and earned rewards.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ALL", "PENDING", "QUALIFIED", "PAID", "REJECTED"],
            description: "Referral bonus status.",
          },
          referrerNameOrPhone: {
            type: "string",
            description: "Search by referrer candidate's name or mobile phone.",
          },
        },
      },
    },
  },

  // 7. MARK EVENT ATTENDANCE (WRITE)
  {
    type: "function",
    function: {
      name: "mark_event_attendance",
      description: "Mark attendance for one or multiple students for an event. Can mark as PRESENT, ABSENT, or NO_SHOW, update check-in/out timestamps, and record admin remarks.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "Event UUID (or provide eventNameKeyword).",
          },
          eventNameKeyword: {
            type: "string",
            description: "Event name or date keyword if exact ID is not known (e.g. '21st September').",
          },
          studentIdentifiers: {
            type: "array",
            items: { type: "string" },
            description: "Student names, roll numbers, phone numbers, or user IDs to mark attendance for.",
          },
          attendanceStatus: {
            type: "string",
            enum: ["PRESENT", "ABSENT", "CANCELLED", "LATE"],
            description: "Attendance status to record (default: PRESENT).",
          },
          remarks: {
            type: "string",
            description: "Optional remarks or notes about the attendance marking.",
          },
        },
        required: ["studentIdentifiers"],
      },
    },
  },

  // 8. UPDATE CANDIDATE SELECTION STATUS (WRITE)
  {
    type: "function",
    function: {
      name: "update_candidate_selection_status",
      description: "Update the permanent selection status of one or multiple candidates (SELECTED, UNDER_REVIEW, NOT_SELECTED, ON_HOLD).",
      parameters: {
        type: "object",
        properties: {
          studentIdentifiers: {
            type: "array",
            items: { type: "string" },
            description: "Student names, roll numbers, phone numbers, or user IDs.",
          },
          status: {
            type: "string",
            enum: ["SELECTED", "UNDER_REVIEW", "NOT_SELECTED", "ON_HOLD"],
            description: "The target selection status.",
          },
          adminRemarks: {
            type: "string",
            description: "Optional remarks or evaluation notes to attach to the candidate.",
          },
        },
        required: ["studentIdentifiers", "status"],
      },
    },
  },

  // 9. MANAGE / CREATE / EDIT EVENT (WRITE)
  {
    type: "function",
    function: {
      name: "manage_event",
      description: "Create a new event, or update an existing event's details (status, date, timings, required headcount, payout per student, location, description).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["CREATE", "UPDATE", "REOPEN", "CLOSE", "PUBLISH"],
            description: "Action to perform on the event.",
          },
          eventId: {
            type: "string",
            description: "Event ID for UPDATE/REOPEN/CLOSE/PUBLISH actions.",
          },
          name: { type: "string", description: "Event title/name." },
          date: { type: "string", description: "Event date in YYYY-MM-DD format." },
          location: { type: "string", description: "Venue / location." },
          workType: { type: "string", description: "Role / work description (e.g. 'STEWARDS REQUIRED')." },
          reportingTime: { type: "string", description: "Reporting / pickup time (e.g. '3:30 PM')." },
          startTime: { type: "string", description: "Event start time." },
          endTime: { type: "string", description: "Event end time." },
          workersRequired: { type: "number", description: "Total students required." },
          paymentPerStudent: { type: "number", description: "Payout per student in INR." },
          description: { type: "string", description: "Event details or guidelines." },
        },
        required: ["action"],
      },
    },
  },

  // 10. UPDATE STUDENT PROFILE (WRITE)
  {
    type: "function",
    function: {
      name: "update_student_profile",
      description: "Edit candidate's profile details such as phone, university, UPI ID, admin remarks, or block/unblock account.",
      parameters: {
        type: "object",
        properties: {
          studentIdentifier: {
            type: "string",
            description: "Student name, phone, email, or roll number.",
          },
          phone: { type: "string" },
          university: { type: "string" },
          city: { type: "string" },
          upiId: { type: "string" },
          adminRemarks: { type: "string" },
          isActive: { type: "boolean", description: "true to unblock, false to block" },
        },
        required: ["studentIdentifier"],
      },
    },
  },

  // 11. PROCESS REFERRAL PAYOUT (WRITE)
  {
    type: "function",
    function: {
      name: "process_referral_payout",
      description: "Approve or update payout status for referral rewards.",
      parameters: {
        type: "object",
        properties: {
          referralId: { type: "string" },
          status: {
            type: "string",
            enum: ["QUALIFIED", "PAID", "REJECTED"],
            description: "Target referral status.",
          },
          remarks: { type: "string" },
        },
        required: ["referralId", "status"],
      },
    },
  },
];
