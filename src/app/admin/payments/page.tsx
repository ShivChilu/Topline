"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Truck,
  Coffee,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  Printer,
  Download,
  AlertCircle,
  X,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Phone,
  HelpCircle,
  DollarSign,
  PieChart,
  Layers,
  ArrowRight,
  Heart,
  UserCheck,
  Crown,
} from "lucide-react";

interface PresentWorker {
  applicationId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  registrationNumber: string;
  university: string;
  upiId: string;
  gender?: string;
  attendanceStatus: string;
  checkInTime: string | null;
  payoutAmount: number;
  paymentStatus: "PAID" | "UNPAID";
  paidReference?: string;
  notes?: string;
}

interface CaptainItem {
  id: string; // userId
  name: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
  upiId?: string;
  gender?: string;
  role?: string;
  roleTitle: string;
  payoutAmount: number;
  paymentStatus: "PAID" | "UNPAID";
  paidReference?: string;
  retainInProfit?: boolean;
}

interface MiscExpenseItem {
  id: string;
  label: string;
  amount: number;
}

interface ClientCustomRoleBilling {
  id: string;
  roleName: string;
  headcount: number;
  ratePerPerson: number;
  totalAmount: number;
}

interface EventFinancials {
  billingMode?: "LUMP_SUM" | "ITEMIZED";
  clientRevenue: number;
  clientStewardRate?: number;
  clientCaptainRate?: number;
  clientVehiclesCount?: number;
  clientVehicleRate?: number;
  clientTravelBilling?: number;
  clientCustomRoles?: ClientCustomRoleBilling[];
  clientPaymentStatus: "PAID" | "PARTIAL" | "PENDING";
  clientInvoiceRef: string;
  clientNotes: string;
  defaultWorkerPayout: number;
  totalWorkerPayouts: number;
  captains: CaptainItem[];
  totalCaptainPayouts: number;
  travelVehiclesCount?: number;
  travelCostPerVehicle?: number;
  travelExpenses: number;
  travelNotes: string;
  foodExpenses: number;
  foodNotes: string;
  miscExpenses: MiscExpenseItem[];
  totalDirectExpenses: number;
  netProfit: number;
  profitMarginPct: number;
  costPerWorker: number;
  revenuePerWorker: number;
}

interface EventSheet {
  id: string;
  name: string;
  date: string;
  location: string;
  workType: string;
  workersRequired: number;
  client: any;
  status: string;
  attendanceTokenEnabled: boolean;
  isAttendanceClosed: boolean;
  presentCount: number;
  presentWorkers: PresentWorker[];
  financials: EventFinancials;
}

const PRESET_STAFF_ROLES = [
  "Event Lead Captain",
  "Hostess / Female Steward (Girls)",
  "Floor Supervisor",
  "Bartender / Beverage Lead",
  "Security / Bouncer",
  "VIP Table Attendant",
  "Kitchen / Buffet Coordinator",
];

const DRAFT_STORAGE_PREFIX = "topline_payment_draft_";

const getSavedDraft = (eventId: string) => {
  if (typeof window === "undefined" || !eventId) return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_PREFIX + eventId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const saveDraftToStorage = (eventId: string, finance: EventFinancials, workers: PresentWorker[]) => {
  if (typeof window === "undefined" || !eventId) return;
  try {
    localStorage.setItem(
      DRAFT_STORAGE_PREFIX + eventId,
      JSON.stringify({
        finance,
        workers,
        updatedAt: Date.now(),
      })
    );
  } catch (e) {}
};

const clearDraftFromStorage = (eventId: string) => {
  if (typeof window === "undefined" || !eventId) return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_PREFIX + eventId);
  } catch (e) {}
};

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Active Event Working Draft State
  const [activeFinance, setActiveFinance] = useState<EventFinancials | null>(null);
  const [activeWorkers, setActiveWorkers] = useState<PresentWorker[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add Staff Role / Captain Modal States
  const [showAddCaptainModal, setShowAddCaptainModal] = useState(false);
  const [captainSearchTerm, setCaptainSearchTerm] = useState("");
  const [captainGenderFilter, setCaptainGenderFilter] = useState<"ALL" | "SUPERADMIN" | "FEMALE" | "MALE">("ALL");
  const [selectedStudentForCaptain, setSelectedStudentForCaptain] = useState<any>(null);
  const [captainRoleInput, setCaptainRoleInput] = useState("Event Lead Captain");
  const [captainPayoutInput, setCaptainPayoutInput] = useState<string>("1000");
  const [captainRetainInProfitInput, setCaptainRetainInProfitInput] = useState<boolean>(true);

  // Print Statement Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Copied states
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Auto-save and lifecycle refs
  const isInitializingRef = React.useRef<boolean>(false);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const activeFinanceRef = React.useRef<EventFinancials | null>(null);
  const activeWorkersRef = React.useRef<PresentWorker[]>([]);
  const selectedEventIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    activeFinanceRef.current = activeFinance;
  }, [activeFinance]);

  useEffect(() => {
    activeWorkersRef.current = activeWorkers;
  }, [activeWorkers]);

  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  const fetchPaymentsData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payments?t=" + Date.now());
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        // Default select first event if none selected
        if (json.events && json.events.length > 0 && !selectedEventId) {
          const firstWithPresent = json.events.find((e: EventSheet) => e.presentCount > 0) || json.events[0];
          setSelectedEventId(firstWithPresent.id);
          initWorkingDraft(firstWithPresent);
        }
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to load payments data." });
      }
    } catch (err: any) {
      console.error("Fetch payments error:", err);
      setFeedback({ type: "error", message: "Network error loading payments data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const initWorkingDraft = (ev: EventSheet) => {
    isInitializingRef.current = true;
    const localDraft = getSavedDraft(ev.id);

    const baseServerFinance: EventFinancials = {
      ...ev.financials,
      billingMode: ev.financials.billingMode || "ITEMIZED",
      clientStewardRate: ev.financials.clientStewardRate !== undefined ? ev.financials.clientStewardRate : (ev.financials.defaultWorkerPayout || 500) + 200,
      clientCaptainRate: ev.financials.clientCaptainRate !== undefined ? ev.financials.clientCaptainRate : 1500,
      clientVehiclesCount: ev.financials.clientVehiclesCount !== undefined ? ev.financials.clientVehiclesCount : (ev.financials.travelVehiclesCount || 1),
      clientVehicleRate: ev.financials.clientVehicleRate !== undefined ? ev.financials.clientVehicleRate : 2000,
      clientTravelBilling: ev.financials.clientTravelBilling !== undefined ? ev.financials.clientTravelBilling : (ev.financials.travelExpenses || 2000),
      clientCustomRoles: ev.financials.clientCustomRoles || [],
      travelVehiclesCount: ev.financials.travelVehiclesCount !== undefined ? ev.financials.travelVehiclesCount : 1,
      travelCostPerVehicle: ev.financials.travelCostPerVehicle !== undefined ? ev.financials.travelCostPerVehicle : 1500,
    };

    if (localDraft?.finance) {
      // Draft found in localStorage! Restore exact user modifications
      setActiveFinance({
        ...baseServerFinance,
        ...localDraft.finance,
      });

      if (localDraft.workers && Array.isArray(localDraft.workers)) {
        const draftMap = new Map<string, PresentWorker>(
          localDraft.workers.map((w: PresentWorker) => [w.applicationId, w])
        );
        const merged = ev.presentWorkers.map((w) => {
          const d = draftMap.get(w.applicationId);
          return d
            ? {
                ...w,
                payoutAmount: d.payoutAmount,
                paymentStatus: d.paymentStatus,
                paidReference: d.paidReference,
                notes: d.notes,
              }
            : w;
        });
        setActiveWorkers(merged);
      } else {
        setActiveWorkers([...ev.presentWorkers]);
      }
      setHasUnsavedDraft(true);
      setAutoSaveStatus("saved");
      if (localDraft.updatedAt) {
        setLastSavedTime(new Date(localDraft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } else {
      setActiveFinance(baseServerFinance);
      setActiveWorkers([...ev.presentWorkers]);
      setHasUnsavedDraft(false);
      setAutoSaveStatus("idle");
    }

    setTimeout(() => {
      isInitializingRef.current = false;
    }, 200);
  };

  const handleSelectEvent = (ev: EventSheet) => {
    setSelectedEventId(ev.id);
    initWorkingDraft(ev);
  };

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter((ev: EventSheet) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        ev.name.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        (ev.client?.name && ev.client.name.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === "CLOSED_ATTENDANCE") {
        return ev.isAttendanceClosed && ev.presentCount > 0;
      }
      if (statusFilter === "WITH_PRESENT") {
        return ev.presentCount > 0;
      }
      if (statusFilter === "PROFITABLE") {
        return ev.financials.netProfit > 0;
      }
      if (statusFilter === "PENDING_REVENUE") {
        return ev.financials.clientPaymentStatus !== "PAID";
      }

      return true;
    });
  }, [data, searchTerm, statusFilter]);

  const currentEvent: EventSheet | null = useMemo(() => {
    if (!data?.events || !selectedEventId) return null;
    return data.events.find((e: EventSheet) => e.id === selectedEventId) || null;
  }, [data, selectedEventId]);

  // Main Dashboard Navigation Tabs (Event Sheets vs All Captains Directory)
  const [activeMainTab, setActiveMainTab] = useState<"sheets" | "all_captains">("sheets");
  const [allCaptainsSearch, setAllCaptainsSearch] = useState("");
  const [allCaptainsFilter, setAllCaptainsFilter] = useState("ALL");

  // Filtered Stewards List (Strictly excludes Captains and Super Admins from Base Crew List)
  const activeStewards = useMemo(() => {
    if (!activeFinance) return activeWorkers;
    const captainIds = new Set((activeFinance.captains || []).map((c) => String(c.id)));
    return activeWorkers.filter((w) => {
      const wUserId = String((w as any).userId || "");
      const wAppId = String(w.applicationId || "");
      if (captainIds.has(wUserId) || captainIds.has(wAppId)) return false;
      return true;
    });
  }, [activeWorkers, activeFinance]);

  // Aggregate All Captains Across All Events
  const allCaptainsAcrossEvents = useMemo(() => {
    if (!data?.events) return [];
    const list: Array<{
      captain: CaptainItem;
      event: EventSheet;
    }> = [];

    data.events.forEach((ev: EventSheet) => {
      (ev.financials?.captains || []).forEach((cap) => {
        list.push({
          captain: cap,
          event: ev,
        });
      });
    });

    return list;
  }, [data?.events]);

  // Filtered list of captains across all events
  const filteredCaptainsAcrossEvents = useMemo(() => {
    return allCaptainsAcrossEvents.filter((item) => {
      const q = allCaptainsSearch.toLowerCase().trim();
      const cap = item.captain;
      const ev = item.event;
      const roleStr = (cap.role || cap.roleTitle || "").toUpperCase();

      const matchesSearch =
        !q ||
        (cap.name && cap.name.toLowerCase().includes(q)) ||
        (cap.phone && cap.phone.toLowerCase().includes(q)) ||
        (cap.email && cap.email.toLowerCase().includes(q)) ||
        roleStr.toLowerCase().includes(q) ||
        (ev.name && ev.name.toLowerCase().includes(q)) ||
        (ev.client && ev.client.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (allCaptainsFilter === "SUPERADMIN") {
        return !!cap.retainInProfit || roleStr === "SUPERADMIN";
      }
      if (allCaptainsFilter === "CAPTAIN") {
        return roleStr.includes("CAPTAIN") && !cap.retainInProfit;
      }
      if (allCaptainsFilter === "FEMALE") {
        return (
          roleStr.includes("GIRL") ||
          roleStr.includes("HOSTESS") ||
          roleStr.includes("FEMALE")
        );
      }
      if (allCaptainsFilter === "EXTERNAL") {
        return !cap.retainInProfit && roleStr !== "SUPERADMIN";
      }

      return true;
    });
  }, [allCaptainsAcrossEvents, allCaptainsSearch, allCaptainsFilter]);

  // Real-time Auto Calculator for Working Draft & Itemized Revenue
  const calculatedSums = useMemo(() => {
    if (!activeFinance) {
      return {
        itemizedStewardsRevenue: 0,
        itemizedCaptainsRevenue: 0,
        itemizedTravelRevenue: 0,
        itemizedCustomRolesRevenue: 0,
        itemizedTotalRevenue: 0,
        effectiveRevenue: 0,
        totalWorkerPayouts: 0,
        externalCaptainPayouts: 0,
        superAdminRetainedCaptainProfit: 0,
        totalCaptainPayouts: 0,
        travelExp: 0,
        foodExp: 0,
        miscExp: 0,
        totalDirectExpenses: 0,
        netProfit: 0,
        profitMarginPct: 0,
        costPerWorker: 0,
        revenuePerWorker: 0,
      };
    }

    // 1. Client Itemized Inflow Calculations
    const stewardRate = Number(activeFinance.clientStewardRate) || 0;
    const captainRate = Number(activeFinance.clientCaptainRate) || 0;
    const vehicleCount = Number(activeFinance.clientVehiclesCount) || 0;
    const vehicleRate = Number(activeFinance.clientVehicleRate) || 0;
    const travelBilling = vehicleCount > 0 && vehicleRate > 0 ? vehicleCount * vehicleRate : Number(activeFinance.clientTravelBilling) || 0;

    const itemizedStewardsRevenue = stewardRate * activeStewards.length;
    const itemizedCaptainsRevenue = captainRate * (activeFinance.captains || []).length;
    const itemizedTravelRevenue = travelBilling;
    const itemizedCustomRolesRevenue = (activeFinance.clientCustomRoles || []).reduce(
      (sum, r) => sum + (Number(r.headcount || 0) * Number(r.ratePerPerson || 0)),
      0
    );

    const itemizedTotalRevenue =
      itemizedStewardsRevenue + itemizedCaptainsRevenue + itemizedTravelRevenue + itemizedCustomRolesRevenue;

    const effectiveRevenue =
      activeFinance.billingMode === "ITEMIZED" && itemizedTotalRevenue > 0
        ? itemizedTotalRevenue
        : Number(activeFinance.clientRevenue) || 0;

    // 2. Direct Outflow Expenses Calculations
    const totalWorkerPayouts = activeStewards.reduce((sum, w) => sum + (Number(w.payoutAmount) || 0), 0);
    const externalCaptainPayouts = (activeFinance.captains || [])
      .filter((c) => !c.retainInProfit && c.role !== "SUPERADMIN")
      .reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);
    const superAdminRetainedCaptainProfit = (activeFinance.captains || [])
      .filter((c) => !!c.retainInProfit || c.role === "SUPERADMIN")
      .reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);
    const totalCaptainPayouts = (activeFinance.captains || []).reduce((sum, c) => sum + (Number(c.payoutAmount) || 0), 0);

    const travelExp = Number(activeFinance.travelExpenses) || 0;
    const foodExp = Number(activeFinance.foodExpenses) || 0;
    const miscExp = (activeFinance.miscExpenses || []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    // Direct out-of-pocket expenses only deduct external crew/third-party expenses
    const totalDirectExpenses = totalWorkerPayouts + externalCaptainPayouts + travelExp + foodExp + miscExp;
    const netProfit = effectiveRevenue - totalDirectExpenses;
    const profitMarginPct = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;
    const costPerWorker = activeStewards.length > 0 ? Math.round(totalDirectExpenses / activeStewards.length) : 0;
    const revenuePerWorker = activeStewards.length > 0 ? Math.round(effectiveRevenue / activeStewards.length) : 0;

    return {
      itemizedStewardsRevenue,
      itemizedCaptainsRevenue,
      itemizedTravelRevenue,
      itemizedCustomRolesRevenue,
      itemizedTotalRevenue,
      effectiveRevenue,
      totalWorkerPayouts,
      externalCaptainPayouts,
      superAdminRetainedCaptainProfit,
      totalCaptainPayouts,
      travelExp,
      foodExp,
      miscExp,
      totalDirectExpenses,
      netProfit,
      profitMarginPct: Number(profitMarginPct.toFixed(1)),
      costPerWorker,
      revenuePerWorker,
    };
  }, [activeFinance, activeStewards]);

  // Execute Auto-Save to Backend API
  const executeAutoSave = async (eventId: string, finance: EventFinancials, workers: PresentWorker[]) => {
    try {
      setAutoSaveStatus("saving");
      const workerOverridesMap: Record<string, any> = {};
      workers.forEach((w) => {
        workerOverridesMap[w.applicationId] = {
          payoutAmount: w.payoutAmount,
          paymentStatus: w.paymentStatus,
          paidReference: w.paidReference,
          notes: w.notes,
        };
      });

      const stewardRate = Number(finance.clientStewardRate) || 0;
      const captainRate = Number(finance.clientCaptainRate) || 0;
      const vehicleCount = Number(finance.clientVehiclesCount) || 0;
      const vehicleRate = Number(finance.clientVehicleRate) || 0;
      const travelBilling = vehicleCount > 0 && vehicleRate > 0 ? vehicleCount * vehicleRate : Number(finance.clientTravelBilling) || 0;
      const itemizedCustomRolesRevenue = (finance.clientCustomRoles || []).reduce(
        (sum, r) => sum + (Number(r.headcount || 0) * Number(r.ratePerPerson || 0)),
        0
      );
      const computedItemizedRevenue = (stewardRate * workers.length) + (captainRate * (finance.captains || []).length) + travelBilling + itemizedCustomRolesRevenue;
      const effectiveClientRevenue = finance.billingMode === "ITEMIZED" && computedItemizedRevenue > 0 ? computedItemizedRevenue : Number(finance.clientRevenue) || 0;

      const payloadFinanceData = {
        ...finance,
        clientRevenue: effectiveClientRevenue,
        workerOverrides: workerOverridesMap,
      };

      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          financeData: payloadFinanceData,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAutoSaveStatus("saved");
        const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(nowTime);
        saveDraftToStorage(eventId, finance, workers);
      } else {
        setAutoSaveStatus("error");
      }
    } catch (e) {
      console.error("Auto-save network error:", e);
      setAutoSaveStatus("error");
    }
  };

  // Trigger Local Storage Persistence & Debounced Auto-Save
  useEffect(() => {
    if (isInitializingRef.current || !selectedEventId || !activeFinance) return;

    // 1. Immediately persist locally so browser refresh / close retains exact state
    saveDraftToStorage(selectedEventId, activeFinance, activeWorkers);
    setHasUnsavedDraft(true);
    setAutoSaveStatus("saving");

    // 2. Debounce auto-save to database (1.2s delay after user stops typing)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      executeAutoSave(selectedEventId, activeFinance, activeWorkers);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeFinance, activeWorkers, selectedEventId]);

  // Sync Itemized Revenue to Total Client Revenue
  const handleSyncItemizedRevenue = () => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      clientRevenue: calculatedSums.itemizedTotalRevenue,
    });
    setFeedback({
      type: "success",
      message: `Updated total client revenue to ₹${calculatedSums.itemizedTotalRevenue.toLocaleString("en-IN")} based on itemized steward, captain, vehicle & custom role rates.`,
    });
  };

  // Revert / Discard Draft
  const handleResetDraft = () => {
    if (!currentEvent) return;
    clearDraftFromStorage(currentEvent.id);
    isInitializingRef.current = true;
    setActiveFinance({
      ...currentEvent.financials,
      billingMode: currentEvent.financials.billingMode || "ITEMIZED",
      clientStewardRate: currentEvent.financials.clientStewardRate !== undefined ? currentEvent.financials.clientStewardRate : (currentEvent.financials.defaultWorkerPayout || 500) + 200,
      clientCaptainRate: currentEvent.financials.clientCaptainRate !== undefined ? currentEvent.financials.clientCaptainRate : 1500,
      clientVehiclesCount: currentEvent.financials.clientVehiclesCount !== undefined ? currentEvent.financials.clientVehiclesCount : (currentEvent.financials.travelVehiclesCount || 1),
      clientVehicleRate: currentEvent.financials.clientVehicleRate !== undefined ? currentEvent.financials.clientVehicleRate : 2000,
      clientTravelBilling: currentEvent.financials.clientTravelBilling !== undefined ? currentEvent.financials.clientTravelBilling : (currentEvent.financials.travelExpenses || 2000),
      clientCustomRoles: currentEvent.financials.clientCustomRoles || [],
      travelVehiclesCount: currentEvent.financials.travelVehiclesCount !== undefined ? currentEvent.financials.travelVehiclesCount : 1,
      travelCostPerVehicle: currentEvent.financials.travelCostPerVehicle !== undefined ? currentEvent.financials.travelCostPerVehicle : 1500,
    });
    setActiveWorkers([...currentEvent.presentWorkers]);
    setHasUnsavedDraft(false);
    setAutoSaveStatus("idle");
    setFeedback({ type: "success", message: "Reverted changes back to saved database version." });
    setTimeout(() => {
      isInitializingRef.current = false;
    }, 200);
  };

  // Handler: Add Custom Role Inflow in Client Billing
  const handleAddClientCustomRole = () => {
    if (!activeFinance) return;
    const newRole: ClientCustomRoleBilling = {
      id: "role_" + Date.now(),
      roleName: "Hostess / Female Steward (Girls)",
      headcount: 2,
      ratePerPerson: 1200,
      totalAmount: 2400,
    };
    setActiveFinance({
      ...activeFinance,
      clientCustomRoles: [...(activeFinance.clientCustomRoles || []), newRole],
    });
  };

  const handleUpdateClientCustomRole = (id: string, field: keyof ClientCustomRoleBilling, val: any) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      clientCustomRoles: (activeFinance.clientCustomRoles || []).map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        updated.totalAmount = (Number(updated.headcount) || 0) * (Number(updated.ratePerPerson) || 0);
        return updated;
      }),
    });
  };

  const handleRemoveClientCustomRole = (id: string) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      clientCustomRoles: (activeFinance.clientCustomRoles || []).filter((r) => r.id !== id),
    });
  };

  // Handler: Apply default worker payout to all workers
  const handleApplyDefaultToAllWorkers = () => {
    if (!activeFinance) return;
    const defaultAmt = Number(activeFinance.defaultWorkerPayout) || 500;
    setActiveWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        payoutAmount: defaultAmt,
      }))
    );
    setFeedback({
      type: "success",
      message: `Updated all ${activeWorkers.length} workers to standard base rate of ₹${defaultAmt}.`,
    });
  };

  // Handler: Mark all workers as PAID
  const handleMarkAllWorkersPaid = () => {
    setActiveWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        paymentStatus: "PAID",
        paidReference: w.paidReference || "Bank / UPI Batch Payout Completed",
      }))
    );
    setFeedback({
      type: "success",
      message: `Marked all ${activeWorkers.length} worker payouts as PAID. Click "Save Financial Sheet" to persist.`,
    });
  };

  // Handler: Worker wage override change
  const handleWorkerAmountChange = (appId: string, val: string) => {
    const num = Number(val);
    setActiveWorkers((prev) =>
      prev.map((w) => (w.applicationId === appId ? { ...w, payoutAmount: isNaN(num) ? 0 : num } : w))
    );
  };

  // Handler: Worker payment status toggle
  const handleToggleWorkerPaymentStatus = (appId: string) => {
    setActiveWorkers((prev) =>
      prev.map((w) => {
        if (w.applicationId !== appId) return w;
        const newStatus = w.paymentStatus === "PAID" ? "UNPAID" : "PAID";
        return {
          ...w,
          paymentStatus: newStatus,
          paidReference: newStatus === "PAID" ? w.paidReference || "UPI Transfer" : "",
        };
      })
    );
  };

  // Handler: Add Custom Misc Expense Line Item
  const handleAddMiscExpense = () => {
    if (!activeFinance) return;
    const newItem: MiscExpenseItem = {
      id: "misc_" + Date.now(),
      label: "Logistics / Operational Item",
      amount: 500,
    };
    setActiveFinance({
      ...activeFinance,
      miscExpenses: [...(activeFinance.miscExpenses || []), newItem],
    });
  };

  const handleUpdateMiscExpense = (id: string, field: "label" | "amount", val: any) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      miscExpenses: (activeFinance.miscExpenses || []).map((m) =>
        m.id === id ? { ...m, [field]: field === "amount" ? Number(val) || 0 : val } : m
      ),
    });
  };

  const handleRemoveMiscExpense = (id: string) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      miscExpenses: (activeFinance.miscExpenses || []).filter((m) => m.id !== id),
    });
  };

  // Handler: Add Captain / Staff Role from Master List
  const handleAddCaptainConfirm = () => {
    if (!selectedStudentForCaptain || !activeFinance) return;
    const captainAmt = Number(captainPayoutInput) || 1000;
    const isSuperAdminUser = ["SUPERADMIN", "ADMIN", "EVENT_ADMIN"].includes(selectedStudentForCaptain.role);
    const retainInProfit = isSuperAdminUser ? captainRetainInProfitInput : false;

    const newCap: CaptainItem = {
      id: selectedStudentForCaptain.id,
      name: selectedStudentForCaptain.name,
      phone: selectedStudentForCaptain.phone || "N/A",
      registrationNumber: selectedStudentForCaptain.registrationNumber || "N/A",
      upiId: selectedStudentForCaptain.upiId || "Not Provided",
      gender: selectedStudentForCaptain.gender || "N/A",
      role: selectedStudentForCaptain.role || "USER",
      roleTitle: captainRoleInput.trim() || "Event Lead Captain",
      payoutAmount: captainAmt,
      paymentStatus: "UNPAID",
      paidReference: "",
      retainInProfit,
    };

    // Check if already in list
    const existing = (activeFinance.captains || []).find((c) => c.id === newCap.id);
    if (existing) {
      setFeedback({ type: "error", message: `${newCap.name} is already assigned to a role in this event.` });
      return;
    }

    setActiveFinance({
      ...activeFinance,
      captains: [...(activeFinance.captains || []), newCap],
    });

    setShowAddCaptainModal(false);
    setSelectedStudentForCaptain(null);
    setCaptainRoleInput("Event Lead Captain");
    setCaptainPayoutInput("1000");
    setCaptainRetainInProfitInput(true);
    setFeedback({
      type: "success",
      message: `Assigned ${newCap.name} as ${newCap.roleTitle} (₹${captainAmt}${retainInProfit ? " • Retained in Net Profit" : ""}).`,
    });
  };

  const handleToggleCaptainRetainInProfit = (captainId: string) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      captains: (activeFinance.captains || []).map((c) =>
        c.id === captainId
          ? {
              ...c,
              retainInProfit: !c.retainInProfit,
            }
          : c
      ),
    });
  };

  const handleRemoveCaptain = (captainId: string) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      captains: (activeFinance.captains || []).filter((c) => c.id !== captainId),
    });
  };

  const handleToggleCaptainPaid = (captainId: string) => {
    if (!activeFinance) return;
    setActiveFinance({
      ...activeFinance,
      captains: (activeFinance.captains || []).map((c) =>
        c.id === captainId
          ? {
              ...c,
              paymentStatus: c.paymentStatus === "PAID" ? "UNPAID" : "PAID",
              paidReference: c.paymentStatus === "UNPAID" ? "Direct UPI Transfer" : "",
            }
          : c
      ),
    });
  };

  // Save Event Financials Sheet
  const handleSaveFinancialSheet = async () => {
    if (!currentEvent || !activeFinance) return;
    setSaving(true);
    try {
      // Clear pending debounce
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Build worker overrides map
      const workerOverridesMap: Record<string, any> = {};
      activeWorkers.forEach((w) => {
        workerOverridesMap[w.applicationId] = {
          payoutAmount: w.payoutAmount,
          paymentStatus: w.paymentStatus,
          paidReference: w.paidReference,
          notes: w.notes,
        };
      });

      const effectiveClientRevenue =
        activeFinance.billingMode === "ITEMIZED" && calculatedSums.itemizedTotalRevenue > 0
          ? calculatedSums.itemizedTotalRevenue
          : Number(activeFinance.clientRevenue) || 0;

      const payloadFinanceData = {
        ...activeFinance,
        clientRevenue: effectiveClientRevenue,
        workerOverrides: workerOverridesMap,
      };

      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: currentEvent.id,
          financeData: payloadFinanceData,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAutoSaveStatus("saved");
        const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(nowTime);
        saveDraftToStorage(currentEvent.id, activeFinance, activeWorkers);
        setFeedback({
          type: "success",
          message: `🎉 Financial sheet for "${currentEvent.name}" successfully saved! Net Profit: ₹${calculatedSums.netProfit} (${calculatedSums.profitMarginPct}% Margin)`,
        });
        fetchPaymentsData();
      } else {
        setFeedback({ type: "error", message: json.message || "Failed to save financial sheet." });
      }
    } catch (err: any) {
      console.error("Save finance sheet error:", err);
      setFeedback({ type: "error", message: "Network error saving financial sheet." });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUpi = (upi: string) => {
    if (!upi || upi === "Not Provided" || upi === "N/A") return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(upi);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  const metrics = data?.metrics || {
    totalEventsCount: 0,
    closedEventsCount: 0,
    totalRevenue: 0,
    totalWorkerPayouts: 0,
    totalCaptainPayouts: 0,
    totalTravelExpenses: 0,
    totalFoodMiscExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMarginPct: 0,
    totalPresentWorkersCount: 0,
  };

  return (
    <div className="space-y-6 text-slate-900 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-red-600 uppercase font-sans">
              Payments & Event P&L
            </h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profit Margin: {metrics.profitMarginPct}%</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time Profit & Loss engine. Track client billing by steward, captain, vehicles & custom roles, audit worker shift payouts, assign captains & female crew, log travel expenses, and auto-calculate net profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentEvent && (
            <>
              {/* Auto-Save Live Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold shadow-2xs">
                {autoSaveStatus === "saving" && (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span className="text-amber-700 font-bold">Auto-saving...</span>
                  </>
                )}
                {autoSaveStatus === "saved" && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Auto-saved {lastSavedTime ? `(${lastSavedTime})` : ""}</span>
                  </>
                )}
                {autoSaveStatus === "idle" && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-600 font-medium">Auto-save active</span>
                  </>
                )}
                {autoSaveStatus === "error" && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-rose-600 font-bold">Offline / Save pending</span>
                  </>
                )}
              </div>

              {hasUnsavedDraft && (
                <button
                  onClick={handleResetDraft}
                  className="bg-white hover:bg-slate-100 text-slate-600 hover:text-rose-600 font-bold px-3 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Discard local changes and revert to database values"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Discard Draft</span>
                </button>
              )}

              <button
                onClick={() => setShowPrintModal(true)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title="View printable executive P&L statement"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Statement</span>
              </button>

              <button
                onClick={handleSaveFinancialSheet}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Save className="w-4 h-4 text-white" />
                )}
                <span>Save Financial Sheet</span>
              </button>
            </>
          )}

          <button
            onClick={fetchPaymentsData}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-in fade-in ${
            feedback.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 High-Level KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">₹{metrics.totalRevenue.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400">Total client billing received</p>
        </div>

        {/* Worker Wages */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Worker Wages</p>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">₹{metrics.totalWorkerPayouts.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400">{metrics.totalPresentWorkersCount} duty shifts completed</p>
        </div>

        {/* Captains Payouts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Captains & Roles</p>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">₹{metrics.totalCaptainPayouts.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400">Supervisors & specialized crew</p>
        </div>

        {/* Logistics & Ops */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Travel & Operations</p>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            ₹{(metrics.totalTravelExpenses + metrics.totalFoodMiscExpenses).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400">Vehicles, food, refreshments, misc</p>
        </div>

        {/* Net Profit */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs space-y-1 col-span-2 sm:col-span-1 ${
          metrics.netProfit >= 0
            ? "bg-gradient-to-br from-emerald-950 to-slate-900 text-white border-emerald-800"
            : "bg-gradient-to-br from-rose-950 to-slate-900 text-white border-rose-800"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Net Profit</p>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            {metrics.netProfit >= 0 ? "+" : "-"}₹{Math.abs(metrics.netProfit).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-300 font-bold">
            {metrics.profitMarginPct}% Overall Net Margin
          </p>
        </div>
      </div>

      {/* Tab Navigation: Event Sheets vs All Captains Directory */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMainTab("sheets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer ${
            activeMainTab === "sheets"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Event Financial Sheets & P&L</span>
        </button>

        <button
          onClick={() => setActiveMainTab("all_captains")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer ${
            activeMainTab === "all_captains"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Crown className="w-4 h-4 text-amber-300" />
          <span>Captains of All Events</span>
          <span
            className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
              activeMainTab === "all_captains" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
            }`}
          >
            {allCaptainsAcrossEvents.length}
          </span>
        </button>
      </div>

      {activeMainTab === "sheets" ? (
        /* Main Workspace: Left Event Selector & Right Financial Sheet */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: EVENTS BROWSER (4 cols) */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header & Filter Search */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Events Directory</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {filteredEvents.length} Events
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event, client, venue..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10.5px]">
              {[
                { id: "ALL", label: "All" },
                { id: "CLOSED_ATTENDANCE", label: "Closed Attendance" },
                { id: "WITH_PRESENT", label: "Has Presentees" },
                { id: "PROFITABLE", label: "Profitable" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === f.id
                      ? "bg-red-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Events Scrollable List */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No matching events found</p>
                <p className="text-[11px]">Adjust your search query or filters.</p>
              </div>
            ) : (
              filteredEvents.map((ev: EventSheet) => {
                const isSelected = selectedEventId === ev.id;
                const isProfit = ev.financials.netProfit >= 0;

                return (
                  <button
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev)}
                    className={`w-full text-left p-3.5 rounded-2xl transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-red-50/80 border-2 border-red-600 shadow-xs"
                        : "bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1">
                        {ev.name}
                      </h4>
                      {ev.isAttendanceClosed ? (
                        <span className="shrink-0 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          ✓ Closed ({ev.presentCount})
                        </span>
                      ) : (
                        <span className="shrink-0 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {ev.status} ({ev.presentCount})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">
                        {new Date(ev.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[140px]">{ev.location}</span>
                    </div>

                    {/* Quick Financial Glance */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Revenue</span>
                        <span className="font-black text-slate-800">
                          ₹{ev.financials.clientRevenue.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Net Margin</span>
                        <span className={`font-black ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                          {isProfit ? "+" : ""}₹{ev.financials.netProfit.toLocaleString("en-IN")} ({ev.financials.profitMarginPct}%)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: EVENT FINANCIAL SHEET & P&L WORKSPACE (8 cols) */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-8 space-y-6">
          {!currentEvent || !activeFinance ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-extrabold text-slate-700 text-base">Select an event from the left directory</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select any catering or hospitality event to view and manage client billing, worker wages, supervisor fees, travel expenses, and profit margins.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event Header Banner Card */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-red-400" />
                      Active Financial Sheet
                    </span>
                    {currentEvent.isAttendanceClosed ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold">
                        ✓ Attendance Closed • {activeWorkers.length} Verified Present
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold">
                        Attendance In Progress • {activeWorkers.length} Present
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white !text-white">
                    {currentEvent.name}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(currentEvent.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {currentEvent.location}
                    </span>
                    {currentEvent.client?.name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-red-300 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-red-400" />
                          Client: {currentEvent.client.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSaveFinancialSheet}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Sheet</span>
                  </button>
                </div>
              </div>

              {/* Real-time Profit & Loss Summary Hero Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gross Client Revenue
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">
                    ₹{calculatedSums.effectiveRevenue.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">Total Inflow</span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Direct Expenses
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">
                    ₹{calculatedSums.totalDirectExpenses.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">All Outflows</span>
                </div>

                <div className="col-span-2 sm:col-span-2 bg-slate-900 p-3.5 rounded-2xl text-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                        Net Profit Earned
                      </span>
                      {calculatedSums.superAdminRetainedCaptainProfit > 0 && (
                        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          👑 ₹{calculatedSums.superAdminRetainedCaptainProfit.toLocaleString("en-IN")} Founder/Admin Fee Included
                        </span>
                      )}
                    </div>
                    <p className={`text-2xl font-black ${calculatedSums.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {calculatedSums.netProfit >= 0 ? "+" : ""}₹{calculatedSums.netProfit.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-black">
                      {calculatedSums.profitMarginPct}% Margin
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Avg Cost: ₹{calculatedSums.costPerWorker} / worker
                    </span>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------ */}
              {/* SECTION 1: REVENUE & CLIENT BILLING INFLOW */}
              {/* ------------------------------------------------ */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        1. Client Billing & Revenue Inflow
                      </h3>
                      <p className="text-xs text-slate-500">
                        Contract rates charged to client for stewards, captains, vehicles & custom roles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Billing Mode Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveFinance({ ...activeFinance, billingMode: "ITEMIZED" })}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          activeFinance.billingMode === "ITEMIZED"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Itemized Billing
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFinance({ ...activeFinance, billingMode: "LUMP_SUM" })}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          activeFinance.billingMode === "LUMP_SUM"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Lump-Sum
                      </button>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                      activeFinance.clientPaymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : activeFinance.clientPaymentStatus === "PARTIAL"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}>
                      Status: {activeFinance.clientPaymentStatus}
                    </span>
                  </div>
                </div>

                {/* Itemized Client Billing Breakdown Grid */}
                {activeFinance.billingMode === "ITEMIZED" && (
                  <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Client Contract Rates (Inflow Unit Rates)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddClientCustomRole}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Role (e.g. Girls / Hostesses)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                      {/* 1. Steward Rate from Client */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-[11px] uppercase">
                            Per Steward Rate
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-500 font-mono">
                            {activeWorkers.length} Stewards
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={activeFinance.clientStewardRate || ""}
                            onChange={(e) =>
                              setActiveFinance({
                                ...activeFinance,
                                clientStewardRate: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-slate-900"
                            placeholder="800"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">Total Stewards Inflow:</span>
                          <span className="font-black text-emerald-700">
                            ₹{calculatedSums.itemizedStewardsRevenue.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* 2. Captain Rate from Client */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-[11px] uppercase">
                            Per Captain Rate
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-500 font-mono">
                            {(activeFinance.captains || []).length} Captain(s)
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={activeFinance.clientCaptainRate || ""}
                            onChange={(e) =>
                              setActiveFinance({
                                ...activeFinance,
                                clientCaptainRate: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-slate-900"
                            placeholder="1500"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">Total Captains Inflow:</span>
                          <span className="font-black text-emerald-700">
                            ₹{calculatedSums.itemizedCaptainsRevenue.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* 3. Travel Billing from Client (Vehicles) */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-[11px] uppercase">
                            Travel / Vehicles Inflow
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-500 font-mono">
                            {activeFinance.clientVehiclesCount || 1} Vehicle(s)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Vehicles</label>
                            <input
                              type="number"
                              min="0"
                              value={activeFinance.clientVehiclesCount || 1}
                              onChange={(e) =>
                                setActiveFinance({
                                  ...activeFinance,
                                  clientVehiclesCount: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">₹ / Vehicle</label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={activeFinance.clientVehicleRate || 2000}
                              onChange={(e) =>
                                setActiveFinance({
                                  ...activeFinance,
                                  clientVehicleRate: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center text-slate-900"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">Total Travel Inflow:</span>
                          <span className="font-black text-emerald-700">
                            ₹{calculatedSums.itemizedTravelRevenue.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Roles Inflow (Girls, Bouncers, Bartenders) */}
                    {(activeFinance.clientCustomRoles || []).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-emerald-200">
                        <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider block">
                          Additional Custom Staff Roles Billed to Client:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activeFinance.clientCustomRoles?.map((cr) => (
                            <div
                              key={cr.id}
                              className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex-1 space-y-1">
                                <input
                                  type="text"
                                  value={cr.roleName}
                                  onChange={(e) =>
                                    handleUpdateClientCustomRole(cr.id, "roleName", e.target.value)
                                  }
                                  placeholder="Role Title"
                                  className="w-full font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                />
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <input
                                    type="number"
                                    min="1"
                                    value={cr.headcount}
                                    onChange={(e) =>
                                      handleUpdateClientCustomRole(cr.id, "headcount", Number(e.target.value) || 1)
                                    }
                                    className="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-black text-slate-800"
                                  />
                                  <span className="text-slate-400">&times;</span>
                                  <span className="text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={cr.ratePerPerson}
                                    onChange={(e) =>
                                      handleUpdateClientCustomRole(cr.id, "ratePerPerson", Number(e.target.value) || 0)
                                    }
                                    className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-black text-slate-800"
                                  />
                                </div>
                              </div>

                              <div className="text-right space-y-1">
                                <span className="font-black text-emerald-700 block text-xs">
                                  ₹{(Number(cr.headcount || 0) * Number(cr.ratePerPerson || 0)).toLocaleString("en-IN")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClientCustomRole(cr.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete Custom Role"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sync Itemized Total to Main Revenue Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-900">
                          Auto-Calculated Total Itemized Client Inflow:
                        </span>
                        <span className="text-base font-black text-emerald-700">
                          ₹{calculatedSums.itemizedTotalRevenue.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSyncItemizedRevenue}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sync as Contract Total (₹{calculatedSums.itemizedTotalRevenue.toLocaleString("en-IN")})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Core Revenue & Payment Info Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Total Revenue Received (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={activeFinance.clientRevenue}
                        onChange={(e) =>
                          setActiveFinance({ ...activeFinance, clientRevenue: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-600"
                        placeholder="50000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Payment Status
                    </label>
                    <select
                      value={activeFinance.clientPaymentStatus}
                      onChange={(e) =>
                        setActiveFinance({
                          ...activeFinance,
                          clientPaymentStatus: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="PAID">PAID (Full Settlement Received)</option>
                      <option value="PARTIAL">PARTIAL (Advance Received)</option>
                      <option value="PENDING">PENDING (Invoice Raised / Awaiting Payment)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Invoice / UTR Reference
                    </label>
                    <input
                      type="text"
                      value={activeFinance.clientInvoiceRef}
                      onChange={(e) =>
                        setActiveFinance({ ...activeFinance, clientInvoiceRef: e.target.value })
                      }
                      placeholder="e.g. INV-2026-084 or GPay UTR 42910"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------ */}
              {/* SECTION 2: WORKER SHIFT PAYOUTS (Base Crew) */}
              {/* ------------------------------------------------ */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        2. Base Crew / Worker Shift Payouts (Stewards)
                      </h3>
                      <p className="text-xs text-slate-500">
                        {activeStewards.length} stewards marked present • Total Payout: ₹{calculatedSums.totalWorkerPayouts.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Standard Base Rate Controller */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500">Standard Rate:</span>
                      <span className="text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="100"
                        step="50"
                        value={activeFinance.defaultWorkerPayout}
                        onChange={(e) =>
                          setActiveFinance({
                            ...activeFinance,
                            defaultWorkerPayout: Number(e.target.value) || 500,
                          })
                        }
                        className="w-16 bg-white border border-slate-300 rounded-lg px-1.5 py-0.5 text-xs font-black text-center text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDefaultToAllWorkers}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] px-2 py-1 rounded-lg transition cursor-pointer active:scale-95"
                        title="Set this base rate for all workers in this list"
                      >
                        Apply to All
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkAllWorkersPaid}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Mark All as Paid
                    </button>
                  </div>
                </div>

                {/* Workers Table */}
                {activeStewards.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No present attendees marked for this event yet.</p>
                    <p className="text-slate-400">
                      Once attendance is verified or marked present via the QR Scanner, candidates will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3">Student Name & Contact</th>
                          <th className="p-3">College & Roll No</th>
                          <th className="p-3">UPI Payment ID</th>
                          <th className="p-3 text-center">Payout Wage (₹)</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeStewards.map((w, idx) => {
                          const isPaid = w.paymentStatus === "PAID";
                          const hasUpi = w.upiId && w.upiId !== "Not Provided" && w.upiId !== "N/A";

                          return (
                            <tr key={w.applicationId || idx} className={`transition ${isPaid ? "bg-purple-50/20" : "hover:bg-slate-50/80"}`}>
                              <td className="p-3 text-center font-bold text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="p-3">
                                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                  <span>{w.name}</span>
                                  {w.gender && w.gender.toUpperCase().includes("FEMALE") && (
                                    <span className="bg-pink-100 text-pink-700 text-[9.5px] font-black px-1.5 py-0.2 rounded-full">
                                      Female
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                  <span>{w.phone}</span>
                                </div>
                              </td>

                              <td className="p-3">
                                <div className="font-medium text-slate-800">{w.university || "—"}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{w.registrationNumber || "—"}</div>
                              </td>

                              <td className="p-3">
                                {hasUpi ? (
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                      {w.upiId}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyUpi(w.upiId)}
                                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition cursor-pointer"
                                      title="Copy UPI ID"
                                    >
                                      {copiedUpi === w.upiId ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-bold">
                                    No UPI
                                  </span>
                                )}
                              </td>

                              {/* Editable Payout Amount */}
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-slate-400 font-bold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={w.payoutAmount}
                                    onChange={(e) => handleWorkerAmountChange(w.applicationId, e.target.value)}
                                    className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 focus:outline-none focus:border-blue-600 text-center shadow-2xs"
                                    title="Edit specific wage for this worker"
                                  />
                                </div>
                              </td>

                              {/* Payment Status Toggle */}
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleWorkerPaymentStatus(w.applicationId)}
                                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95 flex items-center gap-1 ml-auto shadow-2xs ${
                                    isPaid
                                      ? "bg-purple-100 text-purple-900 border border-purple-300"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  }`}
                                  title={isPaid ? "Click to toggle UNPAID" : "Click to mark as PAID"}
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Paid</span>
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Mark Paid</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------ */}
              {/* SECTION 3: EVENT CAPTAINS & SPECIALIZED ROLES */}
              {/* ------------------------------------------------ */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        3. Event Captains & Specialized Roles (Supervisors, Hostesses / Girls, Leads)
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-0.5">
                        <span>{(activeFinance.captains || []).length} assigned</span>
                        <span>•</span>
                        <span>Outward Crew Expense: ₹{calculatedSums.externalCaptainPayouts.toLocaleString("en-IN")}</span>
                        {calculatedSums.superAdminRetainedCaptainProfit > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-800 bg-amber-100 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10.5px] flex items-center gap-1">
                              👑 ₹{calculatedSums.superAdminRetainedCaptainProfit.toLocaleString("en-IN")} Retained in Net Profit (Founder/Admin)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddCaptainModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Staff / Captain from Master List</span>
                  </button>
                </div>

                {(!activeFinance.captains || activeFinance.captains.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 text-xs space-y-1.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Award className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No captains or specialized roles assigned to this event yet.</p>
                    <p className="text-slate-400">
                      Click &quot;Add Staff / Captain from Master List&quot; above to assign lead captains, Super Admins (Founders), girls/hostesses, bartenders or bouncers.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activeFinance.captains.map((cap, cIdx) => {
                      const isSuperAdmin = cap.role === "SUPERADMIN" || cap.role === "ADMIN";
                      const isFounderRetained = isSuperAdmin || !!cap.retainInProfit;
                      return (
                        <div
                          key={cap.id || cIdx}
                          className={`p-4 rounded-2xl border shadow-2xs space-y-3 relative transition ${
                            isFounderRetained
                              ? "bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-300 ring-1 ring-amber-400/20"
                              : "bg-purple-50/50 border-purple-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  isFounderRetained ? "bg-amber-200 text-amber-950" : "bg-purple-200 text-purple-900"
                                }`}>
                                  {cap.roleTitle || "Captain"}
                                </span>

                                {cap.role === "SUPERADMIN" && (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9.5px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                    👑 Super Admin
                                  </span>
                                )}
                                {cap.role === "ADMIN" && (
                                  <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[9.5px] font-black px-1.5 py-0.2 rounded-full">
                                    🛡️ Admin
                                  </span>
                                )}
                                {cap.gender && cap.gender.toUpperCase().includes("FEMALE") && (
                                  <span className="bg-pink-100 text-pink-700 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                    Female
                                  </span>
                                )}
                              </div>

                              <h4 className="font-black text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                                <span>{cap.name}</span>
                              </h4>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {cap.phone} • {cap.registrationNumber || "Topline Founder / Admin"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCaptain(cap.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Remove Captain"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Accounting Info Strip */}
                          {isFounderRetained ? (
                            <div className="bg-amber-100/80 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-1.5 text-amber-950 font-black">
                                <span className="text-amber-700 font-bold">👑</span>
                                <span>Retained in Net Profit (Self-Draw)</span>
                              </div>
                              <span className="text-[10px] text-amber-800 font-extrabold bg-white/90 px-2 py-0.5 rounded-md border border-amber-200">
                                No Outward Payout
                              </span>
                            </div>
                          ) : (
                            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-700">Accounting:</span>
                                <span className="text-slate-600 font-bold">
                                  <span>💸 Outward Crew Expense</span>
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleCaptainRetainInProfit(cap.id)}
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg border bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 transition cursor-pointer active:scale-95"
                                title="Toggle whether this captain payout is retained as company profit or paid out as expense"
                              >
                                Switch to Retained Profit
                              </button>
                            </div>
                          )}

                          {/* Action & Rate Footer */}
                          {isFounderRetained ? (
                            <div className="flex items-center justify-between pt-1 border-t border-amber-200/80 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-amber-900 font-bold">Client Inflow: ₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={cap.payoutAmount}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setActiveFinance({
                                      ...activeFinance,
                                      captains: activeFinance.captains.map((c) =>
                                        c.id === cap.id ? { ...c, payoutAmount: val } : c
                                      ),
                                    });
                                  }}
                                  className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-xs font-black text-slate-900 text-center"
                                />
                              </div>

                              <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-2xs">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+₹{cap.payoutAmount.toLocaleString("en-IN")} To Net Profit</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-1 border-t border-purple-200/60 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 font-bold">Fee: ₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={cap.payoutAmount}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setActiveFinance({
                                      ...activeFinance,
                                      captains: activeFinance.captains.map((c) =>
                                        c.id === cap.id ? { ...c, payoutAmount: val } : c
                                      ),
                                    });
                                  }}
                                  className="w-20 bg-white border border-purple-300 rounded-lg px-2 py-0.5 text-xs font-black text-slate-900 text-center"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleCaptainPaid(cap.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                                  cap.paymentStatus === "PAID"
                                    ? "bg-purple-700 text-white"
                                    : "bg-white text-purple-700 border border-purple-300 hover:bg-purple-100"
                                }`}
                              >
                                {cap.paymentStatus === "PAID" ? "✓ Paid" : "Mark Paid"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------ */}
              {/* SECTION 4 & 5: LOGISTICS, TRAVEL & OPERATIONAL EXPENSES */}
              {/* ------------------------------------------------ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Travel & Vehicles Expenses */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">4. Travel & Vehicles Outflow</h4>
                      <p className="text-[11px] text-slate-500">Cab, auto, bus, fuel costs per vehicle</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">No. of Vehicles</label>
                        <input
                          type="number"
                          min="0"
                          value={activeFinance.travelVehiclesCount || 1}
                          onChange={(e) => {
                            const cnt = Number(e.target.value) || 0;
                            const costPer = activeFinance.travelCostPerVehicle || 1500;
                            setActiveFinance({
                              ...activeFinance,
                              travelVehiclesCount: cnt,
                              travelExpenses: cnt * costPer,
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-black text-slate-900 text-center"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">₹ / Vehicle Cost</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={activeFinance.travelCostPerVehicle || 1500}
                          onChange={(e) => {
                            const costPer = Number(e.target.value) || 0;
                            const cnt = activeFinance.travelVehiclesCount || 1;
                            setActiveFinance({
                              ...activeFinance,
                              travelCostPerVehicle: costPer,
                              travelExpenses: cnt * costPer,
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-black text-slate-900 text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Total Travel Outflow (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={activeFinance.travelExpenses}
                          onChange={(e) =>
                            setActiveFinance({ ...activeFinance, travelExpenses: Number(e.target.value) || 0 })
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-900"
                          placeholder="2500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Logistics Details</label>
                      <input
                        type="text"
                        value={activeFinance.travelNotes}
                        onChange={(e) =>
                          setActiveFinance({ ...activeFinance, travelNotes: e.target.value })
                        }
                        placeholder="e.g. 2 Autos for morning shift + 1 Cab"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Food & Refreshments */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">5. Food & Refreshments</h4>
                      <p className="text-[11px] text-slate-500">Snacks, tea, water bottles</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Food / Snacks (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={activeFinance.foodExpenses}
                          onChange={(e) =>
                            setActiveFinance({ ...activeFinance, foodExpenses: Number(e.target.value) || 0 })
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-900"
                          placeholder="1200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Food Notes</label>
                      <input
                        type="text"
                        value={activeFinance.foodNotes}
                        onChange={(e) =>
                          setActiveFinance({ ...activeFinance, foodNotes: e.target.value })
                        }
                        placeholder="e.g. Tea & snacks during evening shift"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------ */}
              {/* SECTION 6: DYNAMIC MISCELLANEOUS EXPENSE ITEMS */}
              {/* ------------------------------------------------ */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      6. Other Operational & Misc Expenses
                    </h4>
                    <p className="text-xs text-slate-500">
                      Uniform dry cleaning, equipment rent, bouncer fees, breakages, etc.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMiscExpense}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense Item</span>
                  </button>
                </div>

                {(!activeFinance.miscExpenses || activeFinance.miscExpenses.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No miscellaneous line items added.</p>
                ) : (
                  <div className="space-y-2">
                    {activeFinance.miscExpenses.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m.label}
                          onChange={(e) => handleUpdateMiscExpense(m.id, "label", e.target.value)}
                          placeholder="e.g. Uniform cleaning or equipment rent"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={m.amount}
                            onChange={(e) => handleUpdateMiscExpense(m.id, "amount", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-1.5 text-xs font-black text-slate-900 text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMiscExpense(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl shadow-lg border border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                    Calculated Summary
                  </span>
                  <p className="text-base font-black">
                    Revenue: ₹{calculatedSums.effectiveRevenue.toLocaleString("en-IN")} • Expenses: ₹{calculatedSums.totalDirectExpenses.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-emerald-400 font-bold">
                    Net Profit: +₹{calculatedSums.netProfit.toLocaleString("en-IN")} ({calculatedSums.profitMarginPct}% Margin)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition border border-white/20 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Statement</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveFinancialSheet}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Save className="w-4 h-4 text-white" />
                    )}
                    <span>Save Financial Sheet</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* ---------------------------------------------------- */
        /* ALL CAPTAINS & SPECIAL STAFF DIRECTORY WORKSPACE */
        /* ---------------------------------------------------- */
        <div className="space-y-6">
          {/* Top Directory Header & Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black">
                    <Crown className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    Captains & Special Staff Directory Across All Events
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Master centralized registry of all Captains, Super Admins / Founders, and Specialized Crew assigned across all event sheets.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={allCaptainsSearch}
                  onChange={(e) => setAllCaptainsSearch(e.target.value)}
                  placeholder="Search captain name, phone, role, event..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filter by:</span>
              {[
                { id: "ALL", label: `All Roles (${allCaptainsAcrossEvents.length})` },
                {
                  id: "SUPERADMIN",
                  label: `👑 Super Admins / Founders (${allCaptainsAcrossEvents.filter((c) => !!c.captain.retainInProfit || (c.captain.role || c.captain.roleTitle) === "SUPERADMIN").length})`,
                },
                {
                  id: "CAPTAIN",
                  label: `Captains (${allCaptainsAcrossEvents.filter((c) => (c.captain.role || c.captain.roleTitle || "").toUpperCase().includes("CAPTAIN") && !c.captain.retainInProfit).length})`,
                },
                {
                  id: "FEMALE",
                  label: `Female Crew / Hostesses (${allCaptainsAcrossEvents.filter((c) => {
                    const r = (c.captain.role || c.captain.roleTitle || "").toUpperCase();
                    return r.includes("GIRL") || r.includes("HOSTESS") || r.includes("FEMALE");
                  }).length})`,
                },
                {
                  id: "EXTERNAL",
                  label: `External Paid Shifts (${allCaptainsAcrossEvents.filter((c) => !c.captain.retainInProfit && (c.captain.role || c.captain.roleTitle) !== "SUPERADMIN").length})`,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAllCaptainsFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    allCaptainsFilter === f.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mini Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Captain Deployments</span>
                <Crown className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{allCaptainsAcrossEvents.length}</p>
              <p className="text-[11px] text-slate-500">Across {data?.events?.length || 0} event sheets</p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">👑 Super Admin Retained Profit</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600">
                +₹
                {allCaptainsAcrossEvents
                  .filter((c) => !!c.captain.retainInProfit || c.captain.role === "SUPERADMIN")
                  .reduce((sum, c) => sum + (Number(c.captain.payoutAmount) || 1000), 0)
                  .toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">Retained directly into Event Net Profit</p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">External Captain Payouts</span>
                <Banknote className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹
                {allCaptainsAcrossEvents
                  .filter((c) => !c.captain.retainInProfit && c.captain.role !== "SUPERADMIN")
                  .reduce((sum, c) => sum + (Number(c.captain.payoutAmount) || 1000), 0)
                  .toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500">Direct outward shift disbursements</p>
            </div>
          </div>

          {/* Captains Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Captains Roster ({filteredCaptainsAcrossEvents.length})
                </h3>
              </div>
            </div>

            {filteredCaptainsAcrossEvents.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <Crown className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">No Captains Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {allCaptainsSearch
                    ? `No captains or events matched "${allCaptainsSearch}". Try clearing your search.`
                    : "No captains have been assigned to event financial sheets yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Captain / Supervisor</th>
                      <th className="py-3 px-4">Role Assigned</th>
                      <th className="py-3 px-4">Event & Client</th>
                      <th className="py-3 px-4">Date & Venue</th>
                      <th className="py-3 px-4">Compensation & Accounting</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCaptainsAcrossEvents.map((item, idx) => {
                      const isSuperAdmin =
                        !!item.captain.retainInProfit || item.captain.role === "SUPERADMIN";
                      return (
                        <tr key={`${item.event.id}-${item.captain.id}-${idx}`} className="hover:bg-slate-50/80 transition">
                          {/* Captain Name & Contact */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  isSuperAdmin
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {isSuperAdmin ? "👑" : item.captain.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-slate-900">{item.captain.name}</span>
                                  {isSuperAdmin && (
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded">
                                      SUPERADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  {item.captain.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {item.captain.phone}
                                    </span>
                                  )}
                                  {item.captain.email && (
                                    <span className="text-slate-400 hidden sm:inline truncate max-w-[150px]">
                                      {item.captain.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Assigned */}
                          <td className="py-3 px-4">
                            {(() => {
                              const roleLabel = item.captain.role || item.captain.roleTitle || "CAPTAIN";
                              const isFemale = roleLabel.includes("Girls") || roleLabel.includes("Hostess") || roleLabel.includes("Female");
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                    isSuperAdmin
                                      ? "bg-amber-50 text-amber-900 border border-amber-300"
                                      : isFemale
                                      ? "bg-pink-50 text-pink-800 border border-pink-200"
                                      : "bg-purple-50 text-purple-800 border border-purple-200"
                                  }`}
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  {roleLabel}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Event & Client */}
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-extrabold text-slate-900 block truncate max-w-[200px]">
                                {item.event.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Client: {item.event.client || "Direct Client"}
                              </span>
                            </div>
                          </td>

                          {/* Date & Venue */}
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {item.event.date
                                  ? new Date(item.event.date).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Date TBA"}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[180px] block">
                                {item.event.location || "Hyderabad"}
                              </span>
                            </div>
                          </td>

                          {/* Compensation & Accounting */}
                          <td className="py-3 px-4">
                            {isSuperAdmin ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                                  Retained in Profit (+₹{Number(item.captain.payoutAmount || 1000).toLocaleString("en-IN")})
                                </span>
                                <p className="text-[10.5px] text-emerald-700 font-medium mt-0.5">
                                  Founder share • No cash deduction
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black">
                                  ₹{Number(item.captain.payoutAmount || 1000).toLocaleString("en-IN")} Outward Payout
                                </span>
                                {item.captain.upiId && item.captain.upiId !== "Not Provided" && (
                                  <button
                                    onClick={() => handleCopyUpi(item.captain.upiId!)}
                                    className="flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-purple-700 font-mono mt-0.5 cursor-pointer"
                                    title="Click to copy UPI ID"
                                  >
                                    <span>UPI: {item.captain.upiId}</span>
                                    {copiedUpi === item.captain.upiId ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-slate-400" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedEventId(item.event.id);
                                setActiveMainTab("sheets");
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-600 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <span>Open Sheet</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ADD STAFF ROLE / CAPTAIN FROM MASTER LIST MODAL */}
      {/* ---------------------------------------------------- */}
      {showAddCaptainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 relative flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add Staff Role / Captain</h3>
                  <p className="text-xs text-slate-500">Assign Captains, Hostesses/Girls, Bartenders or Bouncers</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddCaptainModal(false);
                  setSelectedStudentForCaptain(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Role Selection Badges */}
            <div className="space-y-1.5 shrink-0">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Quick Role Presets</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_STAFF_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setCaptainRoleInput(role);
                      if (role.includes("Girls") || role.includes("Hostess")) {
                        setCaptainGenderFilter("FEMALE");
                        setCaptainPayoutInput("1200");
                      } else {
                        setCaptainPayoutInput("1000");
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer ${
                      captainRoleInput === role
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Title & Payout Inputs */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Role / Title</label>
                <input
                  type="text"
                  value={captainRoleInput}
                  onChange={(e) => setCaptainRoleInput(e.target.value)}
                  placeholder="e.g. Hostess / Female Steward"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Staff Payout (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={captainPayoutInput}
                    onChange={(e) => setCaptainPayoutInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-900"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            {/* Master Student Search Box & Gender Filter */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Search Candidate</label>
                <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap">
                  <span>Filter:</span>
                  <button
                    type="button"
                    onClick={() => setCaptainGenderFilter("ALL")}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${captainGenderFilter === "ALL" ? "bg-purple-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptainGenderFilter("SUPERADMIN")}
                    className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer ${captainGenderFilter === "SUPERADMIN" ? "bg-amber-500 text-white font-black" : "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"}`}
                  >
                    👑 Super Admins / Founders
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptainGenderFilter("FEMALE")}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${captainGenderFilter === "FEMALE" ? "bg-pink-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    Female (Girls)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptainGenderFilter("MALE")}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${captainGenderFilter === "MALE" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    Male
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={captainSearchTerm}
                  onChange={(e) => setCaptainSearchTerm(e.target.value)}
                  placeholder="Search candidate by name, roll no, college, role..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Search Results List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200 rounded-2xl p-1 max-h-48">
              {((data?.masterStudents || []).filter((s: any) => {
                const q = captainSearchTerm.toLowerCase();
                const matchSearch =
                  s.name.toLowerCase().includes(q) ||
                  (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q)) ||
                  (s.university && s.university.toLowerCase().includes(q)) ||
                  (s.phone && s.phone.toLowerCase().includes(q)) ||
                  (s.role && s.role.toLowerCase().includes(q));

                if (!matchSearch) return false;

                if (captainGenderFilter === "SUPERADMIN") {
                  return s.role === "SUPERADMIN" || s.role === "ADMIN";
                }
                if (captainGenderFilter === "FEMALE") {
                  return s.gender && s.gender.toUpperCase().includes("FEMALE");
                }
                if (captainGenderFilter === "MALE") {
                  return s.gender && s.gender.toUpperCase().includes("MALE");
                }

                return true;
              })).map((stud: any) => {
                const isSelected = selectedStudentForCaptain?.id === stud.id;
                const isFemale = stud.gender && stud.gender.toUpperCase().includes("FEMALE");
                const isSuperAdmin = stud.role === "SUPERADMIN";
                const isAdmin = stud.role === "ADMIN";

                return (
                  <button
                    key={stud.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentForCaptain(stud);
                      if (isSuperAdmin || isAdmin) {
                        setCaptainRetainInProfitInput(true);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? "bg-purple-100 border border-purple-400"
                        : isSuperAdmin
                        ? "bg-amber-50/40 hover:bg-amber-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900">{stud.name}</span>
                        {isSuperAdmin && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            👑 Super Admin
                          </span>
                        )}
                        {isAdmin && (
                          <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                            🛡️ Admin
                          </span>
                        )}
                        {isFemale && (
                          <span className="bg-pink-100 text-pink-700 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                            Female
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-mono">
                        {stud.registrationNumber || (isSuperAdmin ? "Topline Founder/SuperAdmin" : "Internal Staff")} • {stud.university || "Topline HQ"}
                      </span>
                    </div>

                    <div className="text-right">
                      {isSelected ? (
                        <span className="bg-purple-700 text-white font-bold text-[10px] px-2 py-0.5 rounded-md">
                          Selected
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">{stud.phone}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Retain into Net Profit Checkbox */}
            {selectedStudentForCaptain && (
              <label className="flex items-start gap-2.5 p-3 rounded-2xl border bg-amber-50/80 border-amber-300 cursor-pointer shrink-0 transition">
                <input
                  type="checkbox"
                  checked={captainRetainInProfitInput}
                  onChange={(e) => setCaptainRetainInProfitInput(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-xs text-amber-950 block">
                    👑 Retain Captain Fee into Net Profit (Founder / Super Admin)
                  </span>
                  <span className="text-[11px] text-amber-800 leading-snug block">
                    When checked, this captain fee is charged to the client but <strong>NOT deducted as external crew expense</strong> — it is retained directly in your Net Profit!
                  </span>
                </div>
              </label>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddCaptainModal(false);
                  setSelectedStudentForCaptain(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedStudentForCaptain}
                onClick={handleAddCaptainConfirm}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
              >
                Assign as {captainRoleInput} (₹{captainPayoutInput || "1000"})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EXECUTIVE PRINTABLE STATEMENT MODAL */}
      {/* ---------------------------------------------------- */}
      {showPrintModal && currentEvent && activeFinance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 relative flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Header with Print Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">
                  Topline ODC & Hospitality Operations
                </span>
                <h3 className="text-lg font-black text-slate-900">Event Financial Statement & P&L Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Statement Content */}
            <div className="space-y-4 text-xs">
              {/* Event Metadata Table */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Event Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{currentEvent.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Event Date</span>
                  <span className="font-bold text-slate-800">
                    {new Date(currentEvent.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Location</span>
                  <span className="font-medium text-slate-800">{currentEvent.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Client / Banquet</span>
                  <span className="font-bold text-slate-800">{currentEvent.client?.name || "Corporate Client"}</span>
                </div>
              </div>

              {/* Financial Ledger Summary Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-3">Financial Category</th>
                      <th className="p-3">Details / Quantity</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="bg-emerald-50/50">
                      <td className="p-3 font-extrabold text-emerald-900">Total Client Revenue (Inflow)</td>
                      <td className="p-3 text-slate-600">
                        {activeFinance.billingMode === "ITEMIZED"
                          ? `₹${activeFinance.clientStewardRate || 800}/steward • ₹${activeFinance.clientCaptainRate || 1500}/captain • ${activeFinance.clientVehiclesCount || 1} vehicle(s)`
                          : `Contract billing (${activeFinance.clientPaymentStatus})`}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        ₹{calculatedSums.effectiveRevenue.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800">Base Crew / Worker Wages</td>
                      <td className="p-3 text-slate-500">{activeWorkers.length} verified present workers</td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        ₹{calculatedSums.totalWorkerPayouts.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800">Captains, Hostesses & Supervisors (Outflows)</td>
                      <td className="p-3 text-slate-500">
                        {(activeFinance.captains || []).filter(c => !c.retainInProfit).length} external crew members
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        ₹{calculatedSums.externalCaptainPayouts.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {calculatedSums.superAdminRetainedCaptainProfit > 0 && (
                      <tr className="bg-amber-50/60">
                        <td className="p-3 font-extrabold text-amber-950">
                          👑 Super Admin / Founder Retained Captain Profit
                        </td>
                        <td className="p-3 text-amber-800">
                          {(activeFinance.captains || []).filter(c => !!c.retainInProfit).length} founder captain(s) • Retained directly into Net Profit
                        </td>
                        <td className="p-3 text-right font-black text-amber-900">
                          +₹{calculatedSums.superAdminRetainedCaptainProfit.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-3 font-bold text-slate-800">Travel & Logistics</td>
                      <td className="p-3 text-slate-500">
                        {activeFinance.travelVehiclesCount || 1} Vehicle(s) • {activeFinance.travelNotes || "Cab / Bus / Petrol"}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        ₹{calculatedSums.travelExp.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800">Food & Refreshments</td>
                      <td className="p-3 text-slate-500">{activeFinance.foodNotes || "Snacks & Water"}</td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        ₹{calculatedSums.foodExp.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    {(activeFinance.miscExpenses || []).map((m) => (
                      <tr key={m.id}>
                        <td className="p-3 font-medium text-slate-700">Misc: {m.label}</td>
                        <td className="p-3 text-slate-400">Operational expense</td>
                        <td className="p-3 text-right font-medium text-slate-700">
                          ₹{Number(m.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-extrabold text-slate-900">
                      <td className="p-3">Total Direct Expenses</td>
                      <td className="p-3 text-slate-500">Direct Outflow (excluding retained profit)</td>
                      <td className="p-3 text-right font-black">
                        ₹{calculatedSums.totalDirectExpenses.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td className="p-3.5 text-emerald-400">NET GROSS PROFIT</td>
                      <td className="p-3.5 text-emerald-300 text-xs font-bold">
                        {calculatedSums.profitMarginPct}% Net Margin
                      </td>
                      <td className="p-3.5 text-right text-emerald-400 text-base">
                        +₹{calculatedSums.netProfit.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-400 text-center">
              &copy; {new Date().getFullYear()} Topline ODC & Catering Operations Management • Official Financial Statement
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
