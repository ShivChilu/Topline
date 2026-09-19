"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Phone,
  Clock,
  Shirt,
  MapPin,
  HelpCircle,
} from "lucide-react";

export interface EventAssistantChatbotProps {
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  needsEscalation?: boolean;
}

const EVENT_HEAD_PHONE = "7986955634";

export default function EventAssistantChatbot({
  eventId,
  eventName = "Topline Event",
  eventDate,
  eventLocation,
}: EventAssistantChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: `Hello! I am your **Topline Event Guide** for **${eventName}**.\n\nAsk me any questions about:\n- Reporting time and venue location\n- Required dress code and grooming rules\n- Duty responsibilities and supervisor instructions\n- General dos and don'ts\n\nIf you have a special request, tap **Ask Event Head on WhatsApp** anytime!`,
      needsEscalation: false,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickQuestions = [
    { label: "Reporting Time & Venue", text: "What is the reporting time and venue location for this event?" },
    { label: "Dress Code & Uniform", text: "What is the mandatory dress code and grooming rule?" },
    { label: "Duty Instructions", text: "What are the job responsibilities and rules for this shift?" },
    { label: "Payout Policy", text: "How does the student payout process work?" },
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMessageId, role: "user", content: textToSend },
    ];

    setMessages(newMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat/event-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.reply,
            needsEscalation: !!data.needsEscalation,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `For immediate help regarding this event, please connect with the **Event Head directly on WhatsApp at ${EVENT_HEAD_PHONE}**.`,
            needsEscalation: true,
          },
        ]);
      }
    } catch (err) {
      console.error("[EventAssistantChatbot] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `Could not reach the assistant. Please contact the **Event Head on WhatsApp at ${EVENT_HEAD_PHONE}** for urgent doubts.`,
          needsEscalation: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "initial",
        role: "assistant",
        content: `Hello! I am your **Topline Event Guide** for **${eventName}**.\n\nAsk me any questions about:\n- Reporting time and venue location\n- Required dress code and grooming rules\n- Duty responsibilities and supervisor instructions\n- General dos and don'ts\n\nIf you have a special request, tap **Ask Event Head on WhatsApp** anytime!`,
        needsEscalation: false,
      },
    ]);
  };

  const getWhatsAppLink = (customText?: string) => {
    const text = customText
      ? `Hi Event Head, I have a doubt regarding ${eventName}: ${customText}`
      : `Hi Event Head, I have a query regarding ${eventName}`;
    return `https://wa.me/91${EVENT_HEAD_PHONE}?text=${encodeURIComponent(text)}`;
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-red-600 via-red-700 to-slate-900 hover:from-red-500 hover:to-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl transition duration-200 cursor-pointer active:scale-95 border border-red-400/30 group"
            title="Ask Event Doubts & Instructions"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide uppercase leading-tight">
                Event Assistant
              </span>
              <span className="text-[10px] text-red-150 font-semibold leading-none">
                Ask Doubts &amp; Rules
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Chat Window Modal / Flyout */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-[410px] max-h-[85vh] h-[620px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                  <span>Event Guide</span>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                    AI
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  {eventName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/70 text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 leading-relaxed ${
                      isUser
                        ? "bg-red-600 text-white rounded-br-xs shadow-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-2xs"
                    }`}
                  >
                    <div className="whitespace-pre-line break-words space-y-1">
                      {m.content}
                    </div>

                    {/* Prominent WhatsApp Escalation Card inside assistant message */}
                    {!isUser && m.needsEscalation && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <a
                          href={getWhatsAppLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Chat with Event Head on WhatsApp</span>
                          <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-white border border-slate-200 px-3 py-2 rounded-xl w-fit">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="font-semibold text-slate-500">Checking event instructions...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="p-2.5 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendMessage(q.text)}
                  className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direct WhatsApp Escalation Banner */}
          <div className="px-3 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-900 font-semibold truncate">
              <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">Event Head: +91 {EVENT_HEAD_PHONE}</span>
            </div>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>WhatsApp</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your doubt (reporting, dress code, duties)..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-xs cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
