"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Minimize2,
  Maximize2,
  Activity,
  CheckCircle2,
  CalendarDays,
  Users,
  Search,
  ArrowRight,
  Bot,
  User as UserIcon,
  Mic,
  MicOff,
  Radio,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolExecutions?: any[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  "🔥 Who attended both 17th Sept and 21st Sept events?",
  "📊 Show 100% complete candidates pending review",
  "✓ Mark Ram as present for 21st September event",
  "👥 Which candidates applied for 2 or more events?",
  "💰 Referral bonus breakdown & pending payouts",
  "📈 Email open rate & WhatsApp join counts",
];

export default function AdminCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **Hello Super Admin!**\n\nI am your **AI Operations Copilot** powered by Groq Llama. I have full live access to your database to **query any data** or **execute any administrative action**.\n\nTry asking me or tap the **Mic (🎙️)** to speak:\n- *\"Who attended both the 17th and 21st September events?\"*\n- *\"Mark student Ram as present for 21st September event\"*\n- *\"Show me all female candidates from SRM University above 5'4\"\"*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Web Speech API for real-time live preview while recording
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let liveTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            liveTranscript += event.results[i][0].transcript;
          }
          if (liveTranscript.trim()) {
            setInput(liveTranscript);
          }
        };

        recognition.onerror = () => {
          // Fall back to Whisper audio recording
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopMediaTracks();
    };
  }, []);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      setInput("");
      setIsListening(true);

      // 1. Start live speech recognition preview if available
      try {
        recognitionRef.current?.start();
      } catch {}

      // 2. Start MediaRecorder for high-accuracy Groq Whisper transcription
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          stopMediaTracks();
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            await sendAudioToWhisper(audioBlob);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250); // collect 250ms chunks
      }
    } catch (err: any) {
      console.warn("[AdminCopilot] Mic access error:", err);
      setIsListening(false);
      stopMediaTracks();
      alert("Microphone access was denied or not available. Please allow mic permission in your browser settings.");
    }
  };

  const stopVoiceRecording = () => {
    setIsListening(false);

    try {
      recognitionRef.current?.stop();
    } catch {}

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopMediaTracks();
    }
  };

  const sendAudioToWhisper = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const fileExt = audioBlob.type.includes("mp4") ? "mp4" : "webm";
      formData.append("file", audioBlob, `voice_query.${fileExt}`);

      const res = await fetch("/api/admin/copilot/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text && data.text.trim()) {
        setInput(data.text.trim());
      }
    } catch (err) {
      console.warn("[AdminCopilot] Whisper transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+J / Cmd+J to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          toolExecutions: data.toolExecutions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Error:** ${data.message || "Failed to process request."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Network Error:** Could not connect to AI Copilot API.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear current Copilot conversation history?")) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "✨ Conversation cleared. What would you like to inspect or update?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  // Simple Markdown Parser for Tables & Formatting
  const renderFormattedMarkdown = (text: string) => {
    // If text contains Markdown tables, format them nicely
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const renderTable = (rows: string[], key: number) => {
      const parsedRows = rows
        .map((r) => r.trim())
        .filter((r) => r.startsWith("|") && r.endsWith("|"))
        .map((r) =>
          r
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        );

      if (parsedRows.length < 2) return null;
      const headers = parsedRows[0];
      const dataRows = parsedRows.slice(2); // Skip separator

      return (
        <div key={key} className="w-full max-w-full overflow-x-auto my-2 rounded-xl border border-slate-700/60 shadow-xs touch-pan-x">
          <table className="min-w-full text-left text-[11px] sm:text-xs bg-slate-950/80 text-slate-200">
            <thead className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/50 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 sm:px-3 py-1.5 whitespace-nowrap font-medium text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    lines.forEach((line, idx) => {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        tableBuffer.push(line);
      } else {
        if (inTable) {
          elements.push(renderTable(tableBuffer, idx));
          tableBuffer = [];
          inTable = false;
        }

        // Render standard line formatting
        if (line.startsWith("### ")) {
          elements.push(
            <h4 key={idx} className="text-xs sm:text-sm font-extrabold text-amber-300 mt-2 mb-1 break-words">
              {line.replace("### ", "")}
            </h4>
          );
        } else if (line.startsWith("## ")) {
          elements.push(
            <h3 key={idx} className="text-xs sm:text-sm font-extrabold text-white mt-2 mb-1 break-words">
              {line.replace("## ", "")}
            </h3>
          );
        } else if (line.startsWith("• ") || line.startsWith("- ")) {
          elements.push(
            <div key={idx} className="flex items-start gap-1.5 ml-1 sm:ml-2 text-[11px] sm:text-xs text-slate-300 my-0.5 break-words [overflow-wrap:anywhere]">
              <span className="text-amber-400 font-bold shrink-0">•</span>
              <span className="min-w-0 flex-1">{renderInlineStyles(line.replace(/^[•\-]\s*/, ""))}</span>
            </div>
          );
        } else if (line.trim()) {
          elements.push(
            <p key={idx} className="text-[11px] sm:text-xs text-slate-200 leading-relaxed my-1 break-words [overflow-wrap:anywhere]">
              {renderInlineStyles(line)}
            </p>
          );
        }
      }
    });

    if (inTable && tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, 9999));
    }

    return elements;
  };

  const renderInlineStyles = (str: string) => {
    // Bold **text**
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-white font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono text-[10px] sm:text-[11px] break-all">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const label = part.match(/\[(.*?)\]/)?.[1] || "Link";
        const url = part.match(/\((.*?)\)/)?.[1] || "#";
        return (
          <a
            key={i}
            href={url}
            className="text-amber-400 underline hover:text-amber-300 font-bold ml-0.5 inline-flex items-center gap-0.5 break-all"
          >
            {label} ↗
          </a>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-red-400/40 border border-white/20 group"
          title="Open Super Admin AI Copilot (Ctrl+J)"
        >
          <div className="relative shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin-slow" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-black tracking-wide uppercase flex items-center gap-1 sm:gap-1.5">
              <span>Admin AI Copilot</span>
              <span className="bg-white/20 text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-extrabold uppercase">Groq</span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/80 font-semibold hidden xs:inline">Live Data & Actions (Ctrl+J)</span>
          </div>
        </button>
      )}

      {/* EXPANDABLE CHAT DRAWER */}
      {isOpen && (
        <div
          className={`fixed z-50 bottom-2 left-2 right-2 sm:left-auto sm:bottom-4 sm:right-4 w-[calc(100vw-16px)] sm:w-[460px] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden animate-in fade-in slide-in-from-bottom-5 max-w-full ${
            isExpanded
              ? "sm:w-[650px] lg:w-[800px] h-[90vh] sm:h-[86vh]"
              : "h-[85vh] sm:h-[600px] max-h-[92dvh]"
          }`}
        >
          {/* TOP HEADER */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 sm:p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider truncate">
                    Admin AI Copilot
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Live DB
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                  Groq AI • Real-time DB Queries & Actions
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 cursor-pointer hidden sm:block"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Close Copilot"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* QUICK PROMPT SUGGESTION PILLS */}
          <div className="bg-slate-950/60 p-2 sm:p-2.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase shrink-0 flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-500" />
              Quick:
            </span>
            {QUICK_PROMPTS.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* MESSAGE FEED */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-red-600 to-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-2.5 sm:p-3.5 shadow-md space-y-1.5 break-words [overflow-wrap:anywhere] overflow-hidden ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium rounded-tr-none"
                      : "bg-slate-800/90 border border-slate-700 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {/* Tool Execution Badge */}
                  {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2 pb-1 sm:pb-1.5 border-b border-slate-700/60">
                      {msg.toolExecutions.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold text-emerald-300 break-all"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Executed: {t.toolName}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 overflow-hidden">
                    {msg.role === "user" ? (
                      <p className="break-words [overflow-wrap:anywhere]">{msg.content}</p>
                    ) : (
                      renderFormattedMarkdown(msg.content)
                    )}
                  </div>

                  <div
                    className={`text-[8px] sm:text-[9px] font-medium pt-0.5 sm:pt-1 ${
                      msg.role === "user" ? "text-white/60 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 sm:gap-2.5 items-center text-slate-400 animate-pulse">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-red-600 to-amber-500 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin-slow" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5 sm:gap-2 max-w-[85%]">
                  <div className="flex gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce delay-200"></span>
                  </div>
                  <span className="font-semibold text-slate-300 text-[10px] sm:text-[11px] truncate">Executing DB query & actions...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* LIVE LISTENING / TRANSCRIBING BANNER */}
          {isListening && (
            <div className="bg-gradient-to-r from-red-500/20 via-rose-500/20 to-amber-500/20 border-t border-red-500/30 px-3 py-1.5 flex items-center justify-between text-red-300 text-[11px] animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="font-bold flex items-center gap-1.5">
                  <span>Recording voice... Speak clearly</span>
                  <span className="text-white/60 font-normal">(tap Done to finish)</span>
                </span>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="text-[10px] uppercase font-black bg-red-500/40 hover:bg-red-500/60 text-white px-2.5 py-1 rounded-lg cursor-pointer transition border border-red-400/50 active:scale-95 shadow-xs"
              >
                Done ✓
              </button>
            </div>
          )}

          {isTranscribing && (
            <div className="bg-amber-500/10 border-t border-amber-500/30 px-3 py-1.5 flex items-center gap-2 text-amber-300 text-[11px] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span className="font-semibold">Transcribing speech with Groq Whisper AI...</span>
            </div>
          )}

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isListening) {
                stopVoiceRecording();
              }
              handleSend();
            }}
            className="p-2 sm:p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5 sm:gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? "🎙️ Recording voice... Click 'Done' or Mic when finished..."
                  : isTranscribing
                  ? "Transcribing your voice..."
                  : "Ask AI Copilot or request action..."
              }
              className={`flex-1 min-w-0 bg-slate-900 border text-slate-100 text-xs rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 focus:outline-none transition ${
                isListening
                  ? "border-red-500/60 ring-2 ring-red-500/30 placeholder:text-red-400 font-medium"
                  : isTranscribing
                  ? "border-amber-500/50 placeholder:text-amber-400"
                  : "border-slate-700 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 placeholder:text-slate-500"
              }`}
              disabled={loading || isTranscribing}
            />

            {/* MIC BUTTON */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading || isTranscribing}
              className={`p-2 sm:p-2.5 rounded-xl transition shadow-md cursor-pointer active:scale-95 shrink-0 border ${
                isListening
                  ? "bg-red-600 text-white border-red-400 ring-4 ring-red-500/40 animate-pulse"
                  : isTranscribing
                  ? "bg-amber-600 text-white border-amber-400 animate-spin"
                  : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-amber-400 hover:border-amber-500/50"
              }`}
              title={isListening ? "Stop Recording" : "Voice Input (Speech-to-Text)"}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-bounce" />
              ) : isTranscribing ? (
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-spin" />
              ) : (
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            {/* SEND BUTTON */}
            <button
              type="submit"
              disabled={loading || isTranscribing || !input.trim()}
              className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 text-white p-2 sm:p-2.5 rounded-xl transition shadow-md cursor-pointer active:scale-95 shrink-0"
              title="Send to Copilot"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
