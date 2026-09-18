import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { COPILOT_TOOLS } from "@/lib/copilot/tools";
import { executeCopilotTool } from "@/lib/copilot/executor";

const SYSTEM_PROMPT = `You are Topline Super Admin AI Copilot — an expert, real-time autonomous operations assistant embedded inside the Topline ODC Admin Dashboard.
You have FULL ACCESS to the company's real-time PostgreSQL database via function tools.

Your capabilities include:
1. Unlimited Data Querying: querying student accounts, contact details, dynamic profile fields, event applications, multi-event comparisons (common attendees/applicants), email broadcasts & click actions, referrals, clients, and revenue.
2. Direct Action Execution: marking attendance (check-in, check-out, status overrides, remarks), updating candidate selection statuses (SELECTED, UNDER_REVIEW, NOT_SELECTED, ON_HOLD), creating/updating events, editing student profile data, and approving referral payouts.

Guidelines:
- When a user asks to query or filter data, ALWAYS invoke the appropriate tool(s) to fetch live data from the database.
- When a user asks to perform an action (e.g. "Mark Ram as present for 21st event", "Select Priya Sharma", "Create event..."), ALWAYS call the write/mutation tool and confirm the execution clearly.
- For multi-event queries (e.g. "Who attended both 17th and 21st September events?"), use the \`compare_multi_event_attendance\` tool with the appropriate mode (\`COMMON_ATTENDED\` or \`COMMON_APPLIED\`).
- Present data cleanly using GitHub markdown: format lists of candidates as neat Markdown tables with columns: Name, Phone / Roll No, College, Status / Attendance.
- Provide direct navigation links or context when helpful (e.g. \`[View Student Profile](/admin/students)\`, \`[Event Attendance](/admin/events)\`).
- Be concise, professional, accurate, and ultra-responsive.`;

export async function POST(req: Request) {
  try {
    // 1. Verify Super Admin / Admin Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin session token required." }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, role: true, isActive: true },
    });

    if (!adminUser || !adminUser.isActive || !["ADMIN", "SUPERADMIN", "EVENT_ADMIN"].includes(adminUser.role)) {
      return NextResponse.json({ success: false, message: "Access restricted to authorized Admin / Event Admin." }, { status: 403 });
    }

    const isEventAdmin = adminUser.role === "EVENT_ADMIN";
    const assignedEvents = isEventAdmin
      ? await prisma.adminAssignedEvent.findMany({
          where: { adminId: adminUser.id },
          select: { eventId: true, event: { select: { id: true, name: true, date: true, location: true } } },
        })
      : [];
    const allowedEventIds = assignedEvents.map((a) => a.eventId);

    const activeSystemPrompt = isEventAdmin
      ? `You are Topline Event Admin AI Copilot.
You assist Event Admin "${adminUser.name}" with managing candidates, checking 2-call logs (first call done, switch off, not reachable, interested, confirmed), adding calling remarks, verifying WhatsApp group status, and marking event attendance for their assigned events.

Assigned Events for this Event Admin:
${assignedEvents.map((a) => `- ${a.event.name} (ID: ${a.eventId}, Date: ${a.event.date.toISOString().split("T")[0]})`).join("\n") || "No assigned events yet."}

SECURITY & ACCESS RULES:
1. Candidate & Calling Logs: You can answer any question regarding candidate calling progress (e.g. "who are marked as switch off", "show students where first call is done", "which students are confirmed", "mark Ram as switch off"). Use the \`query_event_calling_candidates\` and \`update_candidate_call_status\` tools.
2. Attendance: You can check and mark check-in/check-out/attendance for assigned events using \`mark_event_attendance\`.
3. Strict Restrictions: You MUST NOT disclose company revenue, client billing/contracts, referral payout chains, or master student list profiles who haven't applied to these assigned events.
4. Output: Format candidate lists as clean, neat Markdown tables.`
      : SYSTEM_PROMPT;

    // 2. Parse User Query
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: "Message content cannot be empty." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your-groq-api-key-here") {
      return NextResponse.json({
        success: true,
        reply: `⚠️ **AI Service Unavailable**\n\nThe AI Copilot service is currently not configured. Please contact the administrator.`,
        toolExecutions: [],
      });
    }

    // 3. Initialize Groq SDK & Discover Active Models for this API Key
    const groq = new Groq({ apiKey });

    let availableModelIds: string[] = [];
    try {
      const modelsList = await groq.models.list();
      availableModelIds = (modelsList.data || []).map((m: any) => m.id as string);
    } catch (listErr: any) {
      console.warn("[AdminCopilot] Could not list models from Groq:", listErr?.message);
    }

    // Filter out moderation guardrails, audio whisper, and third-party partner lab models that require terms
    const usableModels = availableModelIds.filter((id) => {
      const lower = id.toLowerCase();
      return (
        !lower.includes("guard") &&
        !lower.includes("whisper") &&
        !lower.includes("canopylabs") &&
        !lower.includes("orpheus") &&
        !lower.includes("safeguard") &&
        !lower.includes("embed")
      );
    });

    // Build prioritized candidate list based on what the user's key actually has access to
    const candidatePool: string[] = [];

    // 1. Explicit user override if configured
    if (process.env.GROQ_MODEL) {
      candidatePool.push(process.env.GROQ_MODEL);
    }

    // 2. High priority standard models (if in usableModels)
    const priorityStandard = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.2-11b-vision-preview",
      "llama-3.2-3b-preview",
      "llama-3.2-1b-preview",
      "deepseek-r1-distill-llama-70b",
      "gemma2-9b-it",
    ];

    for (const model of priorityStandard) {
      if (usableModels.includes(model) && !candidatePool.includes(model)) {
        candidatePool.push(model);
      }
    }

    // 3. Add any other usable chat models discovered on their account
    for (const model of usableModels) {
      if (!candidatePool.includes(model)) {
        candidatePool.push(model);
      }
    }

    // 4. If usableModels was empty (e.g. list failed), fall back to standard candidates
    if (candidatePool.length === 0) {
      candidatePool.push(
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.2-11b-vision-preview",
        "llama-3.2-3b-preview",
        "deepseek-r1-distill-llama-70b"
      );
    }

    const createCompletionWithFallback = async (params: any) => {
      const modelErrors: string[] = [];

      // Pass 1: Try candidate models with function calling tools
      for (const candidate of candidatePool) {
        try {
          const res = await groq.chat.completions.create({
            ...params,
            model: candidate,
          });
          return res;
        } catch (err: any) {
          const msg = err?.message || JSON.stringify(err);
          console.warn(`[AdminCopilot] Model ${candidate} with tools failed: ${msg}`);
          modelErrors.push(`${candidate}: ${msg}`);
        }
      }

      // Pass 2: If tool calling failed or not supported on this model (e.g. DeepSeek/Gemma/restricted tier), try direct conversational completion
      if (params.tools && params.tools.length > 0) {
        for (const candidate of candidatePool) {
          try {
            console.warn(`[AdminCopilot] Retrying ${candidate} as direct chat completion...`);
            const res = await groq.chat.completions.create({
              messages: params.messages,
              model: candidate,
              temperature: 0.3,
              max_tokens: params.max_tokens || 2048,
            });
            return res;
          } catch (noToolErr: any) {
            console.warn(`[AdminCopilot] Direct chat retry failed on ${candidate}: ${noToolErr?.message}`);
          }
        }
      }

      console.error(
        `[AdminCopilot] All models failed. Available: [${availableModelIds.join(", ")}]. Errors: ${modelErrors.join(" | ")}`
      );
      throw new Error("Unable to complete request at this time.");
    };

    // 4. Construct Message Chain
    const formattedMessages: any[] = [
      { role: "system", content: activeSystemPrompt },
    ];

    // Append conversation history (ignore prior error messages to prevent prompt contamination)
    const recentHistory = history
      .slice(-10)
      .filter((msg: any) => !msg.content?.startsWith("⚠️ Error:") && !msg.content?.startsWith("Error:"));

    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    formattedMessages.push({
      role: "user",
      content: message,
    });

    const toolExecutions: any[] = [];
    let iterations = 0;
    const MAX_ITERATIONS = 6;
    let finalReply = "";

    const executionContext = {
      userRole: adminUser.role,
      adminUserId: adminUser.id,
      allowedEventIds,
    };

    // 5. Recursive Tool-Calling Loop
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const completion = await createCompletionWithFallback({
        messages: formattedMessages,
        tools: COPILOT_TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 2048,
      });

      const responseMessage = completion.choices[0]?.message;
      if (!responseMessage) break;

      formattedMessages.push(responseMessage);

      // Check if tool calls were requested by Groq
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }

          // Execute tool directly against database with role security context
          const toolResult = await executeCopilotTool(toolName, parsedArgs, executionContext);
          toolExecutions.push({
            toolName,
            args: parsedArgs,
            result: toolResult,
          });

          // Feed tool execution output back to LLM
          formattedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
        // No more tool calls, final response generated
        finalReply = responseMessage.content || "";
        break;
      }
    }

    if (!finalReply) {
      finalReply = "I have processed your request. Please let me know if you would like any further updates or actions.";
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      toolExecutions,
    });
  } catch (error: any) {
    console.error("[AdminCopilotAPI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}
