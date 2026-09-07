"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Sparkles,
  Layers,
  Copy,
  Eye,
  Edit3,
  GripVertical,
  CheckCircle2,
  Check,
  Search,
  Filter,
} from "lucide-react";

export interface CustomEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "STUDENT" | "EVENT" | "GLOBAL";
  createdAt?: string;
  updatedAt?: string;
}

interface PlaceholderTag {
  tag: string;
  label: string;
  example: string;
  desc: string;
}

interface EmailTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope?: "STUDENT" | "EVENT" | "GLOBAL";
  placeholderTags: PlaceholderTag[];
  onTemplatesUpdated?: (templates: CustomEmailTemplate[]) => void;
  onSelectTemplate?: (template: CustomEmailTemplate) => void;
}

export default function EmailTemplateManagerModal({
  isOpen,
  onClose,
  scope = "GLOBAL",
  placeholderTags,
  onTemplatesUpdated,
  onSelectTemplate,
}: EmailTemplateManagerModalProps) {
  const [templates, setTemplates] = useState<CustomEmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "edit">("list");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"STUDENT" | "EVENT" | "GLOBAL">(scope);
  const [editorSubTab, setEditorSubTab] = useState<"compose" | "preview">("compose");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/email-templates?category=ALL");
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
        if (onTemplatesUpdated) {
          onTemplatesUpdated(data.templates);
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const handleStartCreate = () => {
    setEditingId(null);
    setName("");
    setSubject("");
    setBody("");
    setCategory(scope);
    setEditorSubTab("compose");
    setActiveTab("edit");
  };

  const handleStartEdit = (tpl: CustomEmailTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setCategory(tpl.category || "GLOBAL");
    setEditorSubTab("compose");
    setActiveTab("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please provide a template title/name.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      showToast("Subject and message body are required.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Template saved successfully!");
        setTemplates(data.templates || []);
        if (onTemplatesUpdated) {
          onTemplatesUpdated(data.templates || []);
        }
        setActiveTab("list");
      } else {
        showToast(data.message || "Failed to save template.");
      }
    } catch (err: any) {
      console.error("Error saving template:", err);
      showToast("Network error saving template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/email-templates?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Template deleted.");
        setTemplates(data.templates || []);
        if (onTemplatesUpdated) {
          onTemplatesUpdated(data.templates || []);
        }
      } else {
        showToast(data.message || "Failed to delete template.");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      showToast("Error deleting template.");
    }
  };

  // Insert tag into focused input
  const insertTagAtCursor = (tag: string) => {
    if (lastFocused === "subject" && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newVal = subject.substring(0, start) + tag + subject.substring(end);
      setSubject(newVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else if (bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newVal = body.substring(0, start) + tag + body.substring(end);
      setBody(newVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  // Drag and drop tag support
  const handleDragStart = (e: React.DragEvent, tag: string) => {
    e.dataTransfer.setData("text/plain", tag);
  };

  // Sample preview interpolation
  const renderPreview = (text: string) => {
    let result = text;
    placeholderTags.forEach((pt) => {
      const clean = pt.tag.replace(/[{}]/g, "");
      const regexDouble = new RegExp(`\\{\\{\\s*${clean}\\s*\\}\\}`, "gi");
      const regexSingle = new RegExp(`\\{\\s*${clean}\\s*\\}`, "gi");
      result = result.replace(regexDouble, pt.example).replace(regexSingle, pt.example);
    });
    return result;
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Toast inside modal */}
        {toastMsg && (
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between border-b border-slate-700 animate-in fade-in">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Email Template Manager
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  {templates.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Create reusable email templates with interactive placeholder tags that reflect in Quick Templates across dashboards.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                activeTab === "list"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Saved Templates ({templates.length})
            </button>
            <button
              onClick={handleStartCreate}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                activeTab === "edit" && !editingId
                  ? "bg-red-600 text-white shadow-sm"
                  : activeTab === "edit" && editingId
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {editingId ? "Edit Template" : "Create New Template"}
            </button>
          </div>

          {activeTab === "list" && (
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "list" ? (
            <div>
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-3"></div>
                  <p className="text-xs font-semibold text-slate-500">Loading custom templates...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Custom Templates Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {searchTerm
                      ? "No templates match your search query."
                      : "You haven't created any custom templates yet. Click '+ Create New Template' above to build your first reusable email template!"}
                  </p>
                  <button
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{tpl.name}</h4>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                tpl.category === "EVENT"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : tpl.category === "STUDENT"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {tpl.category === "GLOBAL" ? "All Dashboards" : `${tpl.category} Dashboard`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(tpl)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Template"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tpl.id, tpl.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-xs">
                          <p className="font-bold text-slate-700 truncate">
                            <span className="text-slate-400 font-normal">Subject: </span>
                            {tpl.subject}
                          </p>
                          <p className="text-slate-500 line-clamp-3 font-mono text-[11px] whitespace-pre-line">
                            {tpl.body}
                          </p>
                        </div>
                      </div>

                      {onSelectTemplate && (
                        <button
                          onClick={() => {
                            onSelectTemplate(tpl);
                            onClose();
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Apply to Email Compose
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CREATE / EDIT TAB */
            <form onSubmit={handleSave} className="space-y-5">
              {/* Interactive Placeholder Tags Section */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Interactive Placeholder Tags
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    💡 Click or drag into Title, Subject, or Message
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {placeholderTags.map((pt) => (
                    <button
                      key={pt.tag}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, pt.tag)}
                      onClick={() => insertTagAtCursor(pt.tag)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 hover:border-red-400 rounded-lg text-xs font-medium text-slate-700 shadow-xs hover:text-red-700 transition cursor-grab active:cursor-grabbing"
                      title={`${pt.desc} (Example: ${pt.example})`}
                    >
                      <GripVertical className="w-3 h-3 text-slate-400" />
                      <code className="text-[11px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded">
                        {pt.tag}
                      </code>
                      <span className="text-[11px] text-slate-500 font-normal">({pt.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Template Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Grooming Standards, Shift Briefing, Photo Request..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Dashboard Scope
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
                  >
                    <option value="GLOBAL">🌐 All Dashboards (Shared)</option>
                    <option value="STUDENT">🎓 Students Directory</option>
                    <option value="EVENT">🎪 Event Details</option>
                  </select>
                </div>
              </div>

              {/* Compose vs Preview switcher for template editor */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setEditorSubTab("compose")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    editorSubTab === "compose"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Compose Template
                </button>
                <button
                  type="button"
                  onClick={() => setEditorSubTab("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    editorSubTab === "preview"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview Sample
                </button>
              </div>

              {editorSubTab === "compose" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                      Email Subject Line *
                    </label>
                    <input
                      ref={subjectRef}
                      type="text"
                      required
                      value={subject}
                      onFocus={() => setLastFocused("subject")}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Important Update from Topline ODC — {{name}}"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                        Email Message Body *
                      </label>
                      <span className="text-[11px] text-slate-400">Line breaks will be preserved</span>
                    </div>
                    <textarea
                      ref={bodyRef}
                      required
                      rows={8}
                      value={body}
                      onFocus={() => setLastFocused("body")}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your template message body here. Use tags like {{name}}, {{registrationNumber}}, {{eventName}}..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                /* LIVE PREVIEW */
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Subject Preview</span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {renderPreview(subject) || "(Empty Subject)"}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg uppercase">
                      Preview with Sample Data
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1.5">Message Preview</span>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-inner">
                      {renderPreview(body) || "(Empty Message Body)"}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-red-500/20"
                  >
                    {saving ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                        Saving Template...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingId ? "Update Template" : "Save Template"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
