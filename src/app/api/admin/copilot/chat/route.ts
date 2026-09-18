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

    if (!adminUser || !adminUser.isActive || !["ADMIN", "SUPERADMIN"].includes(adminUser.role)) {
      return NextResponse.json({ success: false, message: "Access restricted to Super Admin." }, { status: 403 });
    }

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
        reply: `⚠️ **Groq API Key Required**\n\nTo enable the Super Admin AI Copilot, please set your Groq API key in the \`.env\` file:\n\`\`\`bash\nGROQ_API_KEY="gsk_..."\n\`\`\`\nYou can generate a free API key at [console.groq.com](https://console.groq.com/keys).`,
        toolExecutions: [],
      });
    }

    // 3. Initialize Groq SDK & Determine Available Model
    const groq = new Groq({ apiKey });

    let chosenModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    try {
      const modelsList = await groq.models.list();
      const allIds = (modelsList.data || []).map((m: any) => m.id as string);

      // Filter out moderation, whisper, vision, safeguard, and embedding models
      const validChatModels = allIds.filter((id) => {
        const lower = id.toLowerCase();
        return (
          !lower.includes("guard") &&
          !lower.includes("whisper") &&
          !lower.includes("embed") &&
          !lower.includes("vision") &&
          !lower.includes("safeguard") &&
          !lower.includes("prompt-guard")
        );
      });

      const preferred = [
        process.env.GROQ_MODEL,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "gemma2-9b-it",
        "mixtral-8x7b-32768",
        "deepseek-r1-distill-llama-70b",
        "qwen-2.5-32b",
      ].filter(Boolean) as string[];

      const match = preferred.find((p) => validChatModels.includes(p));
      if (match) {
        chosenModel = match;
      } else if (validChatModels.length > 0) {
        chosenModel =
          validChatModels.find((id) => id.toLowerCase().includes("llama") || id.toLowerCase().includes("mixtral") || id.toLowerCase().includes("gemma")) ||
          validChatModels[0];
      }
    } catch (modelErr) {
      console.warn("[AdminCopilot] Could not list models, defaulting to fallback:", chosenModel);
    }

    // 4. Construct Message Chain
    const formattedMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Append conversation history (limited to last 10 messages for context efficiency)
    const recentHistory = history.slice(-10);
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

    // 5. Recursive Tool-Calling Loop
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const completion = await groq.chat.completions.create({
        model: chosenModel,
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

          // Execute tool directly against database
          const toolResult = await executeCopilotTool(toolName, parsedArgs);
          toolExecutions.push({
            toolName,
            args: parsedArgs,
            result: toolResult,
          });

          // Feed tool execution output back to Groq
          formattedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
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
        message: error?.message || "An error occurred while communicating with the AI Copilot.",
      },
      { status: 500 }
    );
  }
}
