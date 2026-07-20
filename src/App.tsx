import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  Info,
  ExternalLink,
  X,
  Activity,
  Trash2,
  Filter,
  Loader2,
  Sparkles,
  Lock,
  Unlock,
  Calendar,
  Server,
  Hash,
  AlertTriangle,
  Download,
  CheckCircle,
  HelpCircle,
  Upload,
  FileText,
  Play,
  Pause,
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DomainMonitor, ScanResult } from "./types";
import { parseCSV, formatDate, getStatusColor, getGradeColor, isDNSZoneFormat, parseDNSZone, getRootDomain } from "./utils";

// Pre-populated default domains for an instant, interactive playground experience
const DEFAULT_MONITORS: DomainMonitor[] = [
  {
    id: "1",
    domain: "google.com",
    subdomainScanEnabled: true,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "2",
    domain: "github.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "3",
    domain: "expired.badssl.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "4",
    domain: "self-signed.badssl.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
];

const AsisLogoSymbol = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M50 12C54.5 12 85 68 85 76.5C85 85 71 83 50 72.5C29 83 15 85 15 76.5C15 68 45.5 12 50 12ZM50 35C46 45 37 60 30 65C40 60 60 60 70 65C63 60 54 45 50 35Z" 
      fill="#FCBE13" 
    />
  </svg>
);

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("asis_theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem("asis_theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  const t = useMemo(() => ({
    bgMain: isDark ? "bg-[#080a12] text-slate-300" : "bg-[#f5f7fa] text-slate-700",
    bgSidebar: isDark ? "bg-[#0d111d] border-slate-800/80" : "bg-white border-slate-200/80 shadow-xs",
    sidebarActive: isDark ? "bg-slate-800/90 text-white border-slate-700/40 shadow-sm" : "bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20 shadow-xs",
    sidebarInactive: isDark ? "text-slate-400 hover:bg-slate-800/40 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-[#1E40AF]",
    sidebarPill: isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600",
    sidebarFooter: isDark ? "bg-slate-800/10 border-slate-800/40" : "bg-slate-50 border-slate-200/60",
    textMuted: isDark ? "text-slate-500" : "text-slate-400",
    textDesc: isDark ? "text-slate-400" : "text-slate-500",
    textTitle: isDark ? "text-white" : "text-slate-900",
    card: isDark ? "bg-[#0d111d] border-slate-800/80" : "bg-white border-slate-200/60 shadow-xs",
    input: isDark ? "bg-slate-900/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-amber-500/50" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500/50",
    badge: isDark ? "bg-slate-800/60 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200",
    tableHeader: isDark ? "bg-[#111524]/60 border-b border-slate-800/80 text-slate-400" : "bg-slate-100/80 border-b border-slate-200/80 text-slate-600",
    tableRow: isDark ? "border-slate-800/40 hover:bg-slate-800/10" : "border-slate-200/40 hover:bg-slate-50/80",
    tableRowSelected: isDark ? "bg-slate-800/30" : "bg-blue-50/40",
    border: isDark ? "border-slate-800/80" : "border-slate-200/80",
    panelBg: isDark ? "bg-[#0d111d]" : "bg-white",
    modalBg: isDark ? "bg-[#0f1322] border-slate-800" : "bg-white border-slate-200",
    brandText: isDark ? "text-white" : "text-[#1E40AF]",
  }), [isDark]);

  const [monitors, setMonitors] = useState<DomainMonitor[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "chain" | "subdomain" | "alerts">("dashboard");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [ipFilter, setIpFilter] = useState<string>("all");
  const [activePassiveFilter, setActivePassiveFilter] = useState<string>("all"); // 'all', 'active', 'passive'

  // Advanced Filter Checkboxes
  const [showValid, setShowValid] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [showFailed, setShowFailed] = useState(true);

  // Sorting
  const [sortBy, setSortBy] = useState<"domain" | "daysRemaining" | "lastScan">("domain");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Performance-focused UI view controllers
  const [viewMode, setViewMode] = useState<"list" | "grouped" | "lite">("grouped");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  const [newDomain, setNewDomain] = useState("");
  const [discoverSubdomains, setDiscoverSubdomains] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const cancelScanRef = useRef(false);

  const [selectedMonitor, setSelectedMonitor] = useState<DomainMonitor | null>(null);
  const [csvInput, setCsvInput] = useState("");
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);

  // Expanded folders in Grouped view: track which root domains are expanded/collapsed
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // AI Security analysis states
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);

  // Custom non-blocking interactive states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

  const showNotification = (message: string, type: "error" | "success" | "info" = "info") => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load monitors from backend on mount
  useEffect(() => {
    async function fetchMonitors() {
      try {
        const response = await fetch("/api/monitors");
        if (response.ok) {
          const data = await response.json();
          setMonitors(data);
        } else {
          showNotification("Failed to fetch domains from server.", "error");
        }
      } catch (err) {
        console.error("Error loading monitors:", err);
        showNotification("Could not connect to backend server.", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchMonitors();
  }, []);

  // Sync monitors to server-side persistence file (debounced)
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/monitors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(monitors),
        });
        if (!response.ok) {
          console.error("Failed to save domains to backend");
        }
      } catch (err) {
        console.error("Network error while saving domains to backend:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [monitors, loading]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, gradeFilter, expiryFilter, ipFilter, activePassiveFilter, activeTab, viewMode, showValid, showWarning, showFailed, sortBy, sortOrder]);

  // Initial trigger scan for default domains if they have never been scanned
  useEffect(() => {
    if (loading) return;
    const unscanned = monitors.filter((m) => !m.lastResult);
    if (unscanned.length > 0 && unscanned.length === DEFAULT_MONITORS.length) {
      // Trigger scan for the first one automatically to show action
      scanDomain(monitors[0].id);
    }
  }, [loading]);

  // Compute metrics
  const metrics = useMemo(() => {
    let valid = 0;
    let expired = 0;
    let expiringSoon = 0;
    let failed = 0;

    monitors.forEach((m) => {
      if (!m.lastResult) return;
      const status = m.lastResult.status;
      if (status === "valid") valid++;
      else if (status === "expired") expired++;
      else if (status === "expiring_soon") expiringSoon++;
      else if (status === "connection_failed" || status === "invalid_chain") failed++;
    });

    return {
      total: monitors.length,
      scanned: monitors.filter((m) => m.lastResult).length,
      valid,
      expired,
      expiringSoon,
      failed,
    };
  }, [monitors]);

  // Compute total discovered subdomains
  const totalSubdomains = useMemo(() => {
    let count = 0;
    monitors.forEach((m) => {
      if (m.lastResult && m.lastResult.subdomainsDiscovered) {
        count += m.lastResult.subdomainsDiscovered.length;
      }
    });
    return count;
  }, [monitors]);

  // Extract all unique IP addresses from monitors
  const uniqueIps = useMemo(() => {
    const ips = new Set<string>();
    monitors.forEach((m) => {
      if (m.lastResult?.ipAddress) {
        ips.add(m.lastResult.ipAddress);
      }
    });
    return Array.from(ips).sort();
  }, [monitors]);

  // Calculate out-of-sync/outdated certificates among cohorts
  const monitorsWithCohortWarnings = useMemo(() => {
    // Group domains by root domain
    const groups: Record<string, DomainMonitor[]> = {};
    monitors.forEach((m) => {
      const root = getRootDomain(m.domain);
      if (!groups[root]) groups[root] = [];
      groups[root].push(m);
    });

    // Find the maximum valid certificate daysRemaining in each group
    const groupMaxDays: Record<string, number> = {};
    Object.entries(groups).forEach(([root, list]) => {
      let maxDays = 0;
      list.forEach((m) => {
        if (m.lastResult && m.lastResult.certDetails && m.lastResult.status === "valid") {
          if (m.lastResult.certDetails.daysRemaining > maxDays) {
            maxDays = m.lastResult.certDetails.daysRemaining;
          }
        }
      });
      groupMaxDays[root] = maxDays;
    });

    // Flag any monitor that has a valid cert but its daysRemaining is significantly lower than the group maximum
    return monitors.map((m) => {
      const root = getRootDomain(m.domain);
      const maxDays = groupMaxDays[root] || 0;
      
      let cohortWarning: string | null = null;
      if (
        m.lastResult &&
        m.lastResult.certDetails &&
        m.lastResult.status === "valid" &&
        maxDays >= 30
      ) {
        const days = m.lastResult.certDetails.daysRemaining;
        // If left behind by 15+ days, AND has less than 45 days left
        if (maxDays - days >= 15 && days < 45) {
          cohortWarning = `Out of Sync: Other certificates in the "${root}" cohort have been renewed (expiring in ${maxDays} days), but this domain's certificate has only ${days} days left. It may have been missed during the batch renewal.`;
        }
      }

      return {
        ...m,
        cohortWarning,
      };
    });
  }, [monitors]);

  // Filter monitors
  const filteredMonitors = useMemo(() => {
    const filtered = monitorsWithCohortWarnings.filter((m) => {
      // Tab-based filtering
      if (activeTab === "chain") {
        if (!m.lastResult || !m.lastResult.chain || m.lastResult.chain.length === 0) return false;
      } else if (activeTab === "subdomain") {
        if (!m.subdomainScanEnabled) return false;
      } else if (activeTab === "alerts") {
        if (!m.lastResult || !m.lastResult.certDetails || m.lastResult.certDetails.daysRemaining > 15) return false;
      }

      // Search text query (matches domain or server IP)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        m.domain.toLowerCase().includes(query) ||
        (m.lastResult?.ipAddress && m.lastResult.ipAddress.toLowerCase().includes(query));
      if (!matchesSearch) return false;

      // IP Filter
      if (ipFilter !== "all") {
        if (!m.lastResult || m.lastResult.ipAddress !== ipFilter) return false;
      }

      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "cohort_warning") {
          if (!m.cohortWarning) return false;
        } else {
          if (!m.lastResult || m.lastResult.status !== statusFilter) return false;
        }
      }

      // Security Grade Filter
      if (gradeFilter !== "all") {
        if (!m.lastResult) return false;
        const grade = m.lastResult.securityGrade;
        if (gradeFilter === "A") {
          if (grade !== "A+" && grade !== "A") return false;
        } else if (m.lastResult.securityGrade !== gradeFilter) {
          return false;
        }
      }

      // Expiry filter
      if (expiryFilter !== "all") {
        if (!m.lastResult || !m.lastResult.certDetails) return false;
        const days = m.lastResult.certDetails.daysRemaining;
        if (expiryFilter === "critical") {
          if (days > 7 || days <= 0) return false;
        } else if (expiryFilter === "warning") {
          if (days > 30 || days <= 7) return false;
        } else if (expiryFilter === "safe") {
          if (days <= 30) return false;
        }
      }

      // Active / Passive status filter
      if (activePassiveFilter !== "all") {
        const isPassive = !!m.disabled;
        if (activePassiveFilter === "active" && isPassive) return false;
        if (activePassiveFilter === "passive" && !isPassive) return false;
      }

      // Advanced Filter Checkboxes (Valid, Warning, Failed)
      if (m.lastResult) {
        const s = m.lastResult.status;
        if (s === "valid" && !showValid) return false;
        if (s === "expiring_soon" && !showWarning) return false;
        if ((s === "expired" || s === "invalid_chain" || s === "connection_failed") && !showFailed) return false;
      } else {
        // If unscanned, hide if showFailed is false
        if (!showFailed) return false;
      }

      return true;
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "domain") {
        comparison = a.domain.localeCompare(b.domain);
      } else if (sortBy === "daysRemaining") {
        // Passive or unscanned domains might not have days remaining, let's treat them as infinity or put them last/first
        const daysA = a.disabled ? 999999 : (a.lastResult?.certDetails?.daysRemaining !== undefined ? a.lastResult.certDetails.daysRemaining : 999998);
        const daysB = b.disabled ? 999999 : (b.lastResult?.certDetails?.daysRemaining !== undefined ? b.lastResult.certDetails.daysRemaining : 999998);
        comparison = daysA - daysB;
      } else if (sortBy === "lastScan") {
        const timeA = a.lastResult?.scannedAt ? new Date(a.lastResult.scannedAt).getTime() : 0;
        const timeB = b.lastResult?.scannedAt ? new Date(b.lastResult.scannedAt).getTime() : 0;
        comparison = timeA - timeB;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [monitors, monitorsWithCohortWarnings, searchQuery, statusFilter, expiryFilter, gradeFilter, ipFilter, activeTab, activePassiveFilter, showValid, showWarning, showFailed, sortBy, sortOrder]);

  // Group monitors by root domain (apex) for beautiful hierarchical folder display
  const groupedMonitors = useMemo(() => {
    const groups: Record<string, { root: string; list: typeof filteredMonitors; stats: { valid: number; failed: number; expired: number; passive: number } }> = {};
    
    filteredMonitors.forEach((m) => {
      const root = getRootDomain(m.domain);
      if (!groups[root]) {
        groups[root] = {
          root,
          list: [],
          stats: { valid: 0, failed: 0, expired: 0, passive: 0 }
        };
      }
      
      groups[root].list.push(m);
      
      if (m.disabled) {
        groups[root].stats.passive++;
      } else if (!m.lastResult) {
        // no scan records yet
      } else if (m.lastResult.status === "valid") {
        groups[root].stats.valid++;
      } else if (m.lastResult.status === "expired" || m.lastResult.status === "invalid_chain") {
        groups[root].stats.expired++;
      } else if (m.lastResult.status === "connection_failed") {
        groups[root].stats.failed++;
      }
    });

    return Object.values(groups).sort((a, b) => a.root.localeCompare(b.root));
  }, [filteredMonitors]);

  // Paginated flat list representation
  const paginatedMonitors = useMemo(() => {
    if (itemsPerPage === -1) return filteredMonitors;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMonitors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMonitors, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === -1) return 1;
    return Math.ceil(filteredMonitors.length / itemsPerPage) || 1;
  }, [filteredMonitors, itemsPerPage]);

  // Paginated groups representation
  const paginatedGroups = useMemo(() => {
    if (itemsPerPage === -1) return groupedMonitors;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedMonitors.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedMonitors, currentPage, itemsPerPage]);

  const totalGroupPages = useMemo(() => {
    if (itemsPerPage === -1) return 1;
    return Math.ceil(groupedMonitors.length / itemsPerPage) || 1;
  }, [groupedMonitors, itemsPerPage]);

  const currentTotalPages = viewMode === "grouped" ? totalGroupPages : totalPages;

  // Trigger individual scan
  async function scanDomain(id: string) {
    setScanningId(id);
    const monitor = monitors.find((m) => m.id === id);
    if (!monitor) {
      setScanningId(null);
      return;
    }

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: monitor.domain,
          discoverSubdomains: monitor.subdomainScanEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach scanner server endpoint.");
      }

      const result: ScanResult = await response.json();

      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id === id) {
            const updated = { ...m, lastResult: result };
            // Update selected inspector if it matches
            if (selectedMonitor?.id === id) {
              setSelectedMonitor(updated);
            }
            return updated;
          }
          return m;
        })
      );
    } catch (err: any) {
      console.error(err);
      const failedResult: ScanResult = {
        id: Math.random().toString(36).substring(7),
        domain: monitor.domain,
        ipAddress: null,
        port: 443,
        status: "connection_failed",
        errorMessage: err.message || "Failed to scan SSL certificate.",
        securityGrade: "Unknown",
        certDetails: null,
        chain: [],
        subdomainsDiscovered: [],
        lastScanTime: new Date().toISOString(),
      };
      setMonitors((prev) =>
        prev.map((m) => (m.id === id ? { ...m, lastResult: failedResult } : m))
      );
    } finally {
      setScanningId(null);
    }
  }

  // Stop any active batch scans
  function stopAllScans() {
    cancelScanRef.current = true;
    setScanningAll(false);
    showNotification("Batch scan halted by user.", "info");
  }

  // Scan all domains concurrently with a pool size of 8 and cancellation support
  async function scanAllDomains() {
    if (monitors.length === 0) return;
    
    // Only scan non-disabled domains
    const itemsToScan = monitors.filter((m) => !m.disabled);
    if (itemsToScan.length === 0) {
      showNotification("No active domains found to scan. (All are marked as passive)", "error");
      return;
    }

    setScanningAll(true);
    cancelScanRef.current = false;
    setScanProgress({ current: 0, total: itemsToScan.length });

    const concurrency = 8;
    const queue = [...itemsToScan];
    let activeCount = 0;
    let completedCount = 0;

    return new Promise<void>((resolve) => {
      async function runNext() {
        if (cancelScanRef.current) {
          if (activeCount === 0) {
            setScanningAll(false);
            resolve();
          }
          return;
        }

        if (queue.length === 0) {
          if (activeCount === 0) {
            setScanningAll(false);
            resolve();
            showNotification(`Completed scan of ${completedCount} domains.`, "success");
          }
          return;
        }

        const item = queue.shift()!;
        activeCount++;

        try {
          await scanDomain(item.id);
        } catch (err) {
          console.error(`Error scanning ${item.domain}:`, err);
        } finally {
          activeCount--;
          completedCount++;
          setScanProgress({ current: completedCount, total: itemsToScan.length });

          if (cancelScanRef.current) {
            if (activeCount === 0) {
              setScanningAll(false);
              resolve();
            }
          } else {
            runNext();
          }
        }
      }

      // Bootstrap initial concurrent workers
      const initialWorkers = Math.min(concurrency, queue.length);
      for (let i = 0; i < initialWorkers; i++) {
        runNext();
      }

      if (queue.length === 0 && activeCount === 0) {
        setScanningAll(false);
        resolve();
      }
    });
  }

  // Toggle individual domain active/passive status
  function toggleDomainActive(id: string) {
    setMonitors((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, disabled: !m.disabled };
          if (selectedMonitor?.id === id) {
            setSelectedMonitor(updated);
          }
          return updated;
        }
        return m;
      })
    );
    const m = monitors.find(x => x.id === id);
    if (m) {
      showNotification(
        `Domain "${m.domain}" is now set to ${!m.disabled ? "passive (no scans)" : "active (scans enabled)"}.`,
        "info"
      );
    }
  }

  // Disable all failed handshake domains (passive mode)
  function disableFailedHandshakes() {
    const failedMonitors = monitors.filter(
      (m) => m.lastResult?.status === "connection_failed" || m.lastResult?.status === "invalid_chain"
    );
    
    if (failedMonitors.length === 0) {
      showNotification("No connection-failed domains found to disable.", "info");
      return;
    }

    setMonitors((prev) =>
      prev.map((m) => {
        const isFailed = m.lastResult?.status === "connection_failed" || m.lastResult?.status === "invalid_chain";
        if (isFailed) {
          return { ...m, disabled: true };
        }
        return m;
      })
    );

    showNotification(`Set ${failedMonitors.length} connection-failed domains to passive.`, "success");
  }

  // Add single domain
  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain) return;

    // Simple sanitization
    const sanitizedDomain = newDomain.trim().toLowerCase();
    if (!sanitizedDomain) return;

    // Check duplicate
    if (monitors.some((m) => m.domain === sanitizedDomain)) {
      showNotification("This domain is already being monitored!", "error");
      return;
    }

    const newMonitor: DomainMonitor = {
      id: `mon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      domain: sanitizedDomain,
      subdomainScanEnabled: discoverSubdomains,
      addedAt: new Date().toISOString(),
      lastResult: null,
    };

    const updatedList = [newMonitor, ...monitors];
    setMonitors(updatedList);
    setNewDomain("");
    // Trigger immediate scan
    scanDomain(newMonitor.id);
  }

  // Delete Domain trigger
  function handleDeleteDomain(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteConfirmId(id);
  }

  // Actual deletion execution
  function executeDeleteDomain(id: string) {
    const updated = monitors.filter((m) => m.id !== id);
    setMonitors(updated);
    if (selectedMonitor?.id === id) {
      setSelectedMonitor(null);
    }
    setDeleteConfirmId(null);
    showNotification("Domain removed from monitoring checklist.", "success");
  }

  // File Upload Handlers
  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setCsvInput(text);
        setUploadedFile({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        });
        setCsvError(null);
        showNotification(`File "${file.name}" loaded successfully. Ready to import.`, "success");
      }
    };
    reader.onerror = () => {
      setCsvError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const clearUploadedFile = () => {
    setCsvInput("");
    setUploadedFile(null);
    setCsvError(null);
  };

  // Import CSV handler
  function handleCsvImport() {
    if (!csvInput.trim()) {
      setCsvError("Please provide CSV content first.");
      return;
    }

    const isZone = isDNSZoneFormat(csvInput);
    const parsedZone = isZone ? parseDNSZone(csvInput) : null;
    const importedDomains = isZone && parsedZone ? parsedZone.domains : parseCSV(csvInput);

    if (importedDomains.length === 0) {
      setCsvError("No valid domain names found. Make sure they contain a '.'");
      return;
    }

    let addedCount = 0;
    const newMonitors: DomainMonitor[] = [];

    importedDomains.forEach((domain, idx) => {
      const cleaned = domain.toLowerCase().trim();
      if (!monitors.some((m) => m.domain === cleaned) && !newMonitors.some((nm) => nm.domain === cleaned)) {
        newMonitors.push({
          id: `mon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${idx}`,
          domain: cleaned,
          subdomainScanEnabled: false,
          addedAt: new Date().toISOString(),
          lastResult: null,
        });
        addedCount++;
      }
    });

    if (addedCount === 0) {
      setCsvError("All domains parsed from the input are already under monitor.");
      return;
    }

    setMonitors((prev) => [...newMonitors, ...prev]);
    setCsvInput("");
    setUploadedFile(null);
    setCsvError(null);
    setShowCsvModal(false);

    if (isZone && parsedZone && parsedZone.origin) {
      showNotification(`DNS Zone database for "${parsedZone.origin}" parsed successfully. Imported ${addedCount} subdomains.`, "success");
    } else {
      showNotification(`Imported ${addedCount} domains successfully.`, "success");
    }

    // Trigger scan on all newly added domains
    newMonitors.forEach((m) => scanDomain(m.id));
  }

  // Request AI Recommendation from Gemini
  async function triggerAiAnalysis(id: string) {
    const monitor = monitors.find((m) => m.id === id);
    if (!monitor || !monitor.lastResult || !monitor.lastResult.certDetails) return;

    setAiAnalyzingId(id);

    try {
      const res = await fetch("/api/analyze-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: monitor.domain,
          certDetails: monitor.lastResult.certDetails,
          chain: monitor.lastResult.chain,
          securityGrade: monitor.lastResult.securityGrade,
        }),
      });

      if (!res.ok) throw new Error("Could not fetch security advice");
      const analysis = await res.json();

      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id === id && m.lastResult) {
            const updated = {
              ...m,
              lastResult: { ...m.lastResult, aiAnalysis: analysis },
            };
            if (selectedMonitor?.id === id) {
              setSelectedMonitor(updated);
            }
            return updated;
          }
          return m;
        })
      );
    } catch (err) {
      console.error(err);
      showNotification("Failed to analyze certificate with AI. Please check Gemini API configuration.", "error");
    } finally {
      setAiAnalyzingId(null);
    }
  }

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden font-sans ${t.bgMain} selection:bg-amber-500/30 selection:text-amber-300`}>
      
      {/* MOBILE HEADER BAR */}
      <header className={`md:hidden flex items-center justify-between ${isDark ? "bg-[#0d111d] border-b border-slate-800/80" : "bg-white border-b border-slate-200/80"} px-6 py-4 shrink-0 z-40`}>
        <div className="flex items-center gap-3">
          <AsisLogoSymbol className="w-8 h-8 shrink-0" />
          <span className={`font-extrabold tracking-wider text-xl leading-none ${isDark ? "text-white" : "text-[#1E40AF]"}`}>ASIS</span>
          <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${isDark ? "bg-slate-900 border-slate-800 text-[#FCBE13]" : "bg-blue-50 border-blue-100 text-[#1E40AF]"}`}>SSL SENTINEL</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`p-2 rounded-lg border transition-colors cursor-pointer focus:outline-none ${isDark ? "text-amber-400 border-slate-800 bg-slate-900/60 hover:text-white" : "text-[#1E40AF] border-blue-100 bg-blue-50/50 hover:bg-blue-50"}`}
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer focus:outline-none ${isDark ? "text-slate-400 border-slate-800 bg-slate-900/60 hover:text-white" : "text-slate-500 border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 ${t.bgSidebar} border-r p-6 flex flex-col z-50 transform transition-transform duration-300 md:relative md:translate-x-0
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Close Button for Mobile Sidebar */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className={`md:hidden absolute top-4 right-4 p-1.5 rounded transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Logo & Theme Toggler */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-2.5">
            <AsisLogoSymbol className="w-8 h-8 shrink-0" />
            <div className="flex flex-col">
              <span className={`font-extrabold tracking-wider text-xl leading-none ${isDark ? "text-white" : "text-[#1E40AF]"}`}>ASIS</span>
              <span className="text-[10px] font-bold tracking-widest text-[#FCBE13] mt-0.5 uppercase">SSL Sentinel</span>
            </div>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`hidden md:block p-2 rounded-lg border transition-colors cursor-pointer focus:outline-none ${
              isDark 
                ? "text-amber-400 border-slate-800 bg-slate-900/60 hover:text-white hover:bg-slate-800" 
                : "text-[#1E40AF] border-blue-100 bg-blue-50/50 hover:bg-blue-50"
            }`}
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Subtitle description */}
        <p className={`text-[11px] leading-normal mb-6 ${t.textMuted}`}>
          Cryptographic validation, DNS intelligence, and continuous trust mapping
        </p>
        
        {/* Navigation */}
        <nav className="space-y-1.5 mb-auto">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "dashboard" ? t.sidebarActive : t.sidebarInactive
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "dashboard" ? (isDark ? "bg-[#FCBE13] animate-pulse" : "bg-[#1E40AF] animate-pulse") : "bg-slate-600"}`} />
              <span>Dashboard</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${t.sidebarPill}`}>
              {monitors.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("chain");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "chain" ? t.sidebarActive : t.sidebarInactive
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "chain" ? (isDark ? "bg-[#FCBE13]" : "bg-[#1E40AF]") : "bg-slate-600"}`} />
              <span>Chain Analysis</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${t.sidebarPill}`}>
              {monitors.filter((m) => m.lastResult && m.lastResult.chain && m.lastResult.chain.length > 0).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("subdomain");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "subdomain" ? t.sidebarActive : t.sidebarInactive
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "subdomain" ? "bg-teal-400" : "bg-slate-600"}`} />
              <span>Subdomain Explorer</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${t.sidebarPill}`}>
              {monitors.filter((m) => m.subdomainScanEnabled).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("alerts");
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "alerts" ? t.sidebarActive : t.sidebarInactive
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${
                activeTab === "alerts" 
                  ? (isDark ? "bg-rose-400 animate-pulse" : "bg-rose-600 animate-pulse") 
                  : (monitors.some(m => m.lastResult?.certDetails?.daysRemaining !== undefined && m.lastResult.certDetails.daysRemaining <= 15) ? "bg-rose-500 animate-pulse" : "bg-slate-600")
              }`} />
              <span>Critical Alerts</span>
            </div>
            {monitors.some(m => m.lastResult?.certDetails?.daysRemaining !== undefined && m.lastResult.certDetails.daysRemaining <= 15) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                {monitors.filter(m => m.lastResult?.certDetails?.daysRemaining !== undefined && m.lastResult.certDetails.daysRemaining <= 15).length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowCsvModal(true);
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${t.sidebarInactive}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>Bulk Scanner</span>
          </button>
        </nav>

        {/* Sidebar Footer Status Card */}
        <div className={`mt-auto border-t pt-6 ${isDark ? "border-slate-800/80" : "border-slate-200/80"}`}>
          <div className={`${t.sidebarFooter} p-4 rounded-xl border`}>
            <p className={`text-[10px] uppercase tracking-widest mb-1.5 font-semibold ${t.textMuted}`}>Alert Status</p>
            {metrics.expired > 0 ? (
              <p className="text-xs text-rose-500 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span>{metrics.expired} Critical expiry alert!</span>
              </p>
            ) : metrics.expiringSoon > 0 ? (
              <p className="text-xs text-amber-500 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>{metrics.expiringSoon} Expiring soon</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-500 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>All certificates secure</span>
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto min-w-0">
        
        {/* Header / Actions Row */}
        <header className={`flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {activeTab === "dashboard" && "Infrastructure Health"}
              {activeTab === "chain" && "Chain of Trust Analysis"}
              {activeTab === "subdomain" && "Subdomain Discovery"}
              {activeTab === "alerts" && "Critical Expiry & Renewal Alerts"}
            </h1>
            <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              {activeTab === "dashboard" && `Monitoring ${metrics.total} domains across global networks`}
              {activeTab === "chain" && `Verifying recursive CAs and path validation for scanned endpoints`}
              {activeTab === "subdomain" && `Probing wildcard records and recursive subdomains`}
              {activeTab === "alerts" && `Remediation tracking and renewal logs for critical endpoints`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? "border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300" 
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import CSV</span>
            </button>
            {scanningAll ? (
              <button
                onClick={stopAllScans}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-lg shadow-rose-950/20"
              >
                <X className="w-4 h-4" />
                <span>Stop Scan ({scanProgress.current}/{scanProgress.total})</span>
              </button>
            ) : (
              <button
                onClick={scanAllDomains}
                disabled={monitors.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-lg text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${
                  isDark
                    ? "bg-[#FCBE13] hover:bg-[#FCBE13]/90 text-slate-900 shadow-amber-950/20"
                    : "bg-[#1E40AF] hover:bg-blue-800 text-white shadow-blue-200/40"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run Full Scan</span>
              </button>
            )}
          </div>
        </header>

        {/* SCAN PROGRESS BAR */}
        {scanningAll && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-2 shadow-inner">
            <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                Scanning Domains (Fast Concurrent Mode • 8 Workers)
              </span>
              <span>
                {scanProgress.current} / {scanProgress.total} checked ({Math.round((scanProgress.current / (scanProgress.total || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900/80 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${(scanProgress.current / (scanProgress.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {activeTab === "alerts" ? (
          /* DEDICATED ALERTS PAGE */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mb-8"
          >
            {/* Back Button and Info Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-dashed border-slate-800/40">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer self-start ${
                  isDark
                    ? "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
              <span className={`text-xs font-mono font-medium ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                Critical Level Status Threshold: &le;15 Days to Expiry
              </span>
            </div>

            {/* List of Critical Domains */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(() => {
                const criticalMonitors = monitors.filter(
                  (m) =>
                    m.lastResult &&
                    m.lastResult.certDetails &&
                    m.lastResult.certDetails.daysRemaining <= 15
                );

                if (criticalMonitors.length === 0) {
                  return (
                    <div className={`col-span-full border p-12 text-center rounded-xl ${isDark ? "bg-[#0d111d] border-slate-800/80" : "bg-white border-slate-200 shadow-xs"}`}>
                      <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4 animate-bounce" />
                      <h3 className={`text-base font-bold mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                        No Critical Expiry Alerts Active!
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        All monitored domains have valid certificates with secure, long-term validity. No immediate renewals are needed at this time.
                      </p>
                    </div>
                  );
                }

                return criticalMonitors.map((m) => {
                  const cert = m.lastResult!.certDetails!;
                  const isExpired = cert.daysRemaining <= 0;
                  return (
                    <div
                      key={m.id}
                      className={`border rounded-xl p-5 flex flex-col justify-between transition-all relative ${
                        isDark 
                          ? "bg-[#0d111d] border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/5" 
                          : "bg-white border-rose-200 hover:border-rose-300 shadow-md shadow-rose-100/30"
                      }`}
                    >
                      <div>
                        {/* Status Label & Countdown */}
                        <div className="flex items-center justify-between gap-3 mb-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider ${
                            isExpired
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}>
                            {isExpired ? "EXPIRED" : "EXPIRING SOON"}
                          </span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 font-mono ${
                            isExpired ? "text-rose-500 animate-pulse" : "text-amber-500"
                          }`}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {isExpired ? "Expired" : `${cert.daysRemaining} days left`}
                          </span>
                        </div>

                        {/* Domain Title */}
                        <h3 className={`text-lg font-bold tracking-tight mb-1 truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                          {m.domain}
                        </h3>
                        <p className={`text-xs mb-4 font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          Issuer: {typeof cert.issuer === "object" ? (cert.issuer.CN || cert.issuer.O || "Unknown") : (cert.issuer || "Unknown")}
                        </p>

                        {/* Quick Specs */}
                        <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 mb-4 ${
                          isDark ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}>
                          <div className="flex justify-between">
                            <span>Subject CN:</span>
                            <span className="font-semibold text-right truncate max-w-[150px]">{cert.subject?.CN || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IP Address:</span>
                            <span className="font-semibold">{m.lastResult?.ipAddress || "Unresolved"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valid To UTC:</span>
                            <span className="font-semibold">{formatDate(cert.validTo).split(",")[0]}</span>
                          </div>
                        </div>

                        {/* Remediation Guide */}
                        <div className={`p-3.5 rounded-lg border text-xs mb-4 ${
                          isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/50 border-slate-200"
                        }`}>
                          <p className={`font-semibold mb-1 ${isDark ? "text-rose-300" : "text-rose-800"}`}>
                            Suggested Remediation:
                          </p>
                          <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {isExpired 
                              ? "The certificate has EXPIRED. Services hosted on this domain will show secure warnings in major browsers. Force renew using Certbot or your DNS authority control panel immediately." 
                              : `This endpoint expires in less than 15 days. Plan a scheduled maintenance window to update and push the TLS credentials to production before ${formatDate(cert.validTo).split(",")[0]}.`
                            }
                          </p>
                          {/* Recommended CLI command */}
                          <div className={`mt-2.5 p-2 rounded font-mono text-[10px] break-all border flex items-center justify-between ${
                            isDark ? "bg-black/50 border-slate-850 text-emerald-400" : "bg-slate-100 border-slate-200 text-emerald-700"
                          }`}>
                            <span>certbot certonly --standalone -d {m.domain}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons inside alert card */}
                      <div className={`flex items-center gap-2 pt-3 border-t border-dashed ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                        <button
                          onClick={() => {
                            scanDomain(m.id);
                            showNotification(`Triggered verification scan for ${m.domain}`, "info");
                          }}
                          disabled={scanningId === m.id}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isDark
                              ? "bg-slate-800 hover:bg-slate-750 text-slate-200"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {scanningId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>Verify SSL</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMonitor(m);
                            setActiveTab("chain");
                            showNotification(`Switched to Chain of Trust for ${m.domain}`, "success");
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isDark
                              ? "bg-[#FCBE13]/15 hover:bg-[#FCBE13]/25 text-[#FCBE13] border border-[#FCBE13]/25"
                              : "bg-[#1E40AF]/10 hover:bg-[#1E40AF]/20 text-[#1E40AF]"
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Check Path</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        ) : (
          /* NORMAL DASHBOARD VIEW */
          <>
            {/* METRIC CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className={`${t.card} p-5 rounded-xl shadow-sm transition-all hover:border-slate-500/30`}>
                <p className={`text-xs uppercase tracking-wider mb-1 font-semibold ${t.textMuted}`}>Total Domains</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${t.textTitle}`}>{metrics.total}</span>
                  <span className={`text-xs font-mono ${t.textMuted}`}>tracked</span>
                </div>
              </div>
              <div className={`${t.card} p-5 rounded-xl shadow-sm transition-all hover:border-slate-500/30`}>
                <p className={`text-xs uppercase tracking-wider mb-1 font-semibold ${t.textMuted}`}>Subdomains Discovered</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${t.textTitle}`}>{totalSubdomains}</span>
                  <span className={`text-xs font-mono ${t.textMuted}`}>active DNS</span>
                </div>
              </div>
              <div className={`${t.card} p-5 rounded-xl shadow-sm border-l-4 border-l-amber-500 transition-all hover:border-slate-500/30`}>
                <p className={`text-xs uppercase tracking-wider mb-1 font-semibold ${t.textMuted}`}>Warning Status</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${t.textTitle}`}>
                    {metrics.expired + metrics.expiringSoon + monitorsWithCohortWarnings.filter((m) => m.cohortWarning).length}
                  </span>
                  <span className="text-xs text-amber-500 font-semibold font-mono">
                    {(() => {
                      const oosCount = monitorsWithCohortWarnings.filter((m) => m.cohortWarning).length;
                      return oosCount > 0 ? `incl. ${oosCount} out of sync` : "unresolved";
                    })()}
                  </span>
                </div>
              </div>
              <div className={`${t.card} p-5 rounded-xl shadow-sm border-l-4 border-l-emerald-500 transition-all hover:border-slate-500/30`}>
                <p className={`text-xs uppercase tracking-wider mb-1 font-semibold ${t.textMuted}`}>Avg Security Grade</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>A+</span>
                  <span className={`text-xs font-semibold font-mono ${isDark ? "text-emerald-500/80" : "text-emerald-600/80"}`}>Industry Std</span>
                </div>
              </div>
            </div>

            {/* REAL-TIME EXPIRY CRITICAL BANNER WITH NAVIGATION BUTTON */}
            {monitors.some(
              (m) =>
                  m.lastResult &&
                  m.lastResult.certDetails &&
                  m.lastResult.certDetails.daysRemaining <= 15
            ) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-8 border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${isDark ? "border-rose-500/30 bg-rose-500/5" : "border-rose-200 bg-rose-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`h-5 w-5 shrink-0 mt-0.5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                  <div>
                    <h4 className={`text-sm font-semibold ${isDark ? "text-rose-300" : "text-rose-800"}`}>
                      Critical Infrastructure Expiry Alert Active
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      One or more of your monitored domain certificates has expired or is expiring within the next 15 days.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-md ${
                    isDark 
                      ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30" 
                      : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/50"
                  }`}
                >
                  <span>Go to Expiry Alert Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </>
        )}

        {/* TWO-COLUMN CONTROL & WORKSPACE CENTER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1 min-h-0">
          
          {/* LEFT CONTAINER: LIST AND OPERATIONAL CONTROLS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Domain Addition Card */}
            <form
              onSubmit={handleAddDomain}
              className={`${t.card} p-5 rounded-xl shadow-sm`}
            >
              <h3 className={`text-sm font-bold mb-3 ${t.textTitle}`}>Add Domain to Sentinel Monitors</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g. secure.enterprise.com, badssl.com"
                    className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all ${isDark ? "bg-[#0a0b0d] border-slate-800 text-white placeholder-slate-600 focus:border-amber-500/60" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500/60"}`}
                  />
                </div>
                <div className={`flex items-center gap-2 border rounded-lg shrink-0 px-4 py-2.5 ${isDark ? "bg-[#0a0b0d] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <input
                    type="checkbox"
                    id="subdomain_disc"
                    checked={discoverSubdomains}
                    onChange={(e) => setDiscoverSubdomains(e.target.checked)}
                    className={`w-4 h-4 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer ${isDark ? "border-slate-800 text-amber-500 bg-[#0f1115]" : "border-slate-200 text-blue-600 bg-white"}`}
                  />
                  <label htmlFor="subdomain_disc" className={`text-xs select-none cursor-pointer font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Discover Subdomains
                  </label>
                </div>
                <button
                  type="submit"
                  className={`font-semibold text-sm px-5 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0 ${
                    isDark 
                      ? "bg-[#FCBE13] hover:bg-[#FCBE13]/90 text-slate-900 shadow-amber-950/20" 
                      : "bg-[#1E40AF] hover:bg-blue-800 text-white shadow-blue-200/50"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Monitor</span>
                </button>
              </div>
            </form>

            {/* Dynamic Filters & Grid Table Container */}
            <div className={`${t.card} rounded-xl overflow-hidden flex flex-col shadow-sm`}>
              
              {/* Filter Row */}
              <div className={`p-4 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${isDark ? "border-slate-800/80 bg-slate-900/10" : "border-slate-200/80 bg-slate-50/50"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`text-xs px-3 py-2 cursor-pointer rounded-lg ${t.input}`}
                  >
                    <option value="all">Status: All</option>
                    <option value="cohort_warning">Out of Sync Only</option>
                    <option value="valid">Valid Only</option>
                    <option value="expired">Expired Only</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="connection_failed">Failed Connections</option>
                  </select>

                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className={`text-xs px-3 py-2 cursor-pointer rounded-lg ${t.input}`}
                  >
                    <option value="all">Grade: All</option>
                    <option value="A">Grade A / A+</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="D">Grade D</option>
                    <option value="F">Grade F</option>
                  </select>

                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value)}
                    className={`text-xs px-3 py-2 cursor-pointer rounded-lg ${t.input}`}
                  >
                    <option value="all">Expiry: Any</option>
                    <option value="critical">Within 7 Days</option>
                    <option value="warning">Within 30 Days</option>
                    <option value="safe">Safe (&gt;30d)</option>
                  </select>

                  <select
                    value={activePassiveFilter}
                    onChange={(e) => setActivePassiveFilter(e.target.value)}
                    className={`text-xs px-3 py-2 cursor-pointer rounded-lg ${t.input}`}
                  >
                    <option value="all">Checks: All</option>
                    <option value="active">Active Only</option>
                    <option value="passive">Passive Only</option>
                  </select>

                  <select
                    value={ipFilter}
                    onChange={(e) => setIpFilter(e.target.value)}
                    className={`text-xs px-3 py-2 cursor-pointer rounded-lg max-w-[150px] ${t.input}`}
                  >
                    <option value="all">IP: All</option>
                    {uniqueIps.map((ip, index) => (
                      <option key={`${ip}-${index}`} value={ip}>
                        {ip}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter domains or IPs..."
                    className={`text-xs pl-9 pr-3 py-2 rounded-lg w-full md:w-56 focus:outline-none transition-all ${t.input}`}
                  />
                </div>
              </div>

              {/* Operational Toolbar for display styles & bulk actions */}
              <div className={`px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs ${isDark ? "border-slate-800/80 bg-slate-900/25 text-slate-400" : "border-slate-200/80 bg-slate-100/30 text-slate-600"}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Display Mode:</span>
                  <div className={`p-0.5 rounded-lg border flex ${isDark ? "bg-[#0a0b0d] border-slate-800/80" : "bg-slate-100 border-slate-200"}`}>
                    <button
                      onClick={() => setViewMode("grouped")}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "grouped"
                          ? (isDark ? "bg-slate-800 text-[#FCBE13] shadow-sm" : "bg-white text-[#1E40AF] shadow-xs")
                          : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                      }`}
                      title="Group subdomains under wildcard/apex domain folders"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Grouped View</span>
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "list"
                          ? (isDark ? "bg-slate-800 text-[#FCBE13] shadow-sm" : "bg-white text-[#1E40AF] shadow-xs")
                          : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                      }`}
                      title="Flat checklist grid view"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Flat List</span>
                    </button>
                    <button
                      onClick={() => setViewMode("lite")}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "lite"
                          ? (isDark ? "bg-slate-800 text-[#FCBE13] shadow-sm" : "bg-white text-[#1E40AF] shadow-xs")
                          : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                      }`}
                      title="NOC style high density Lite monitoring view"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Lite NOC View</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={disableFailedHandshakes}
                    className={`px-3.5 py-1.5 rounded-lg border transition-all font-semibold cursor-pointer flex items-center gap-1.5 ${
                      isDark
                        ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border-rose-500/20"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                    }`}
                    title="Set all domains failing TLS handshake to passive mode"
                  >
                    <EyeOff className={`w-3.5 h-3.5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                    <span>Disable Failed Handshakes</span>
                  </button>
                </div>
              </div>

              {/* ADVANCED STATUS FILTER CHECKBOXES AND SORTING */}
              <div className={`px-6 py-4 border-b flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-xs ${isDark ? "border-slate-800/80 bg-slate-900/15" : "border-slate-200/80 bg-slate-50/30"}`}>
                {/* Checkbox Status Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className={`font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    <Filter className="h-3.5 w-3.5 text-blue-500" />
                    Status Visibility:
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Valid Checkbox */}
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                      showValid 
                        ? (isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold" : "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold") 
                        : (isDark ? "bg-slate-900/20 border-slate-800/60 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                    }`}>
                      <input
                        type="checkbox"
                        checked={showValid}
                        onChange={(e) => setShowValid(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${showValid ? "bg-emerald-500 shadow-xs" : "bg-slate-400"}`} />
                      <span>Valid ({monitors.filter(m => m.lastResult?.status === "valid").length})</span>
                    </label>

                    {/* Warning Checkbox */}
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                      showWarning 
                        ? (isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold" : "bg-amber-50 border-amber-200 text-amber-850 font-semibold") 
                        : (isDark ? "bg-slate-900/20 border-slate-800/60 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                    }`}>
                      <input
                        type="checkbox"
                        checked={showWarning}
                        onChange={(e) => setShowWarning(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${showWarning ? "bg-amber-500 shadow-xs" : "bg-slate-400"}`} />
                      <span>Warning ({monitors.filter(m => m.lastResult?.status === "expiring_soon").length})</span>
                    </label>

                    {/* Failed / Expired Checkbox */}
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                      showFailed 
                        ? (isDark ? "bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold" : "bg-rose-50 border-rose-200 text-rose-800 font-semibold") 
                        : (isDark ? "bg-slate-900/20 border-slate-800/60 text-slate-500" : "bg-white border-slate-200 text-slate-400")
                    }`}>
                      <input
                        type="checkbox"
                        checked={showFailed}
                        onChange={(e) => setShowFailed(e.target.checked)}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full ${showFailed ? "bg-rose-500 shadow-xs" : "bg-slate-400"}`} />
                      <span>Failed/Expired ({monitors.filter(m => !m.lastResult || m.lastResult.status === "expired" || m.lastResult.status === "invalid_chain" || m.lastResult.status === "connection_failed").length})</span>
                    </label>
                  </div>
                </div>

                {/* Advanced Sorting Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className={`font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Sıralama / Sort:
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className={`text-xs px-3 py-2 cursor-pointer rounded-lg font-semibold border ${
                        isDark ? "bg-[#0f111a] border-slate-800 text-slate-200 focus:border-amber-500/40" : "bg-white border-slate-200 text-slate-700 focus:border-blue-550/40"
                      }`}
                    >
                      <option value="domain">Domain Name (A-Z)</option>
                      <option value="daysRemaining">Expiry Timeline (Kalan Gün)</option>
                      <option value="lastScan">Last Scan Timestamp</option>
                    </select>

                    <button
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className={`px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-xs ${
                        isDark 
                          ? "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
                      }`}
                      title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
                    >
                      <span>{sortOrder === "asc" ? "Asc (Artan)" : "Desc (Azalan)"}</span>
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </button>

                    {sortBy === "daysRemaining" && sortOrder === "asc" && (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isDark ? "bg-[#FCBE13]/10 text-[#FCBE13] border border-[#FCBE13]/30 animate-pulse" : "bg-[#1E40AF]/10 text-[#1E40AF] border border-[#1E40AF]/20"
                      }`}>
                        ⏳ Bitmesi En Yakın
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header block showing active tab metadata */}
              <div className={`px-6 py-3 border-b flex items-center justify-between text-xs ${isDark ? "bg-slate-800/20 border-slate-800/60 text-slate-400" : "bg-slate-50/50 border-slate-200/60 text-slate-600"}`}>
                <span className="font-medium">
                  Showing {filteredMonitors.length} of {monitors.length} domains
                  {activeTab !== "dashboard" && ` (filtered by ${activeTab} view)`}
                </span>
                {(filteredMonitors.length !== monitors.length || activeTab !== "dashboard" || ipFilter !== "all" || searchQuery !== "") && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setExpiryFilter("all");
                      setGradeFilter("all");
                      setIpFilter("all");
                      setSearchQuery("");
                      setActiveTab("dashboard");
                    }}
                    className={`font-semibold cursor-pointer ${isDark ? "text-[#FCBE13] hover:text-amber-300" : "text-[#1E40AF] hover:text-blue-800"}`}
                  >
                    Reset view
                  </button>
                )}
              </div>

              {/* Table list */}
              {viewMode === "lite" ? (
                <div className="p-6">
                  <div className={`flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b text-xs ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                        <span className={isDark ? "text-slate-300 font-bold" : "text-slate-700 font-bold"}>
                          NOC MONITORING BOARD (LITE VIEW)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Valid</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Warning</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> Failed/Expired</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Passive</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {loading ? (
                      <div className="col-span-full py-16 text-center text-slate-500">
                        <Loader2 className={`h-8 w-8 mx-auto mb-3 animate-spin ${isDark ? "text-[#FCBE13]" : "text-[#1E40AF]"}`} />
                        <p className={`font-medium text-xs ${t.textDesc}`}>Loading domains list from volume persistence...</p>
                      </div>
                    ) : paginatedMonitors.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-500">
                        <Globe className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No monitored endpoints found in this view.</p>
                      </div>
                    ) : (
                      paginatedMonitors.map((m, index) => {
                        const result = m.lastResult;
                        const cert = result?.certDetails;
                        const isPassive = !!m.disabled;
                        const isSelected = selectedMonitor?.id === m.id;
                        
                        let statusColor = isDark ? "bg-slate-700" : "bg-slate-300";
                        let pulse = "";
                        
                        if (!isPassive && result) {
                          if (result.status === "valid") {
                            statusColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                          } else if (result.status === "expiring_soon") {
                            statusColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                          } else {
                            statusColor = "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                            pulse = "animate-pulse";
                          }
                        }

                        return (
                          <motion.div
                            key={`${m.id}-${index}`}
                            whileHover={{ y: -2 }}
                            onClick={() => setSelectedMonitor(m)}
                            className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? (isDark ? "border-[#FCBE13] bg-amber-500/5 shadow-[0_0_12px_rgba(252,190,19,0.1)]" : "border-[#1E40AF] bg-blue-50/50 shadow-sm")
                                : (isDark ? "border-slate-800/80 bg-[#0a0b0d] hover:border-slate-700 hover:bg-slate-900/30" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50")
                            } ${isPassive ? "opacity-55" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <span className={`text-[9px] font-bold tracking-wider font-mono uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                {isPassive ? "PASSIVE" : (result?.securityGrade ? `GRADE ${result.securityGrade}` : "NO SCAN")}
                              </span>
                              <span className={`w-2.5 h-2.5 rounded-full ${statusColor} ${pulse} shrink-0 mt-0.5`} />
                            </div>
                            
                            <h4 className={`text-xs font-bold truncate ${isDark ? "text-slate-100" : "text-slate-800"}`} title={m.domain}>
                              {m.domain}
                            </h4>
                            
                            <div className={`flex items-center justify-between text-[9px] font-mono mt-2 pt-1 border-t text-slate-500 ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
                              <span className={isPassive ? "text-slate-600" : cert?.daysRemaining && cert.daysRemaining <= 15 ? "text-amber-500 font-bold" : cert?.daysRemaining && cert.daysRemaining <= 0 ? "text-rose-500 font-bold" : "text-slate-400"}>
                                {isPassive ? "OFFLINE" : (cert ? `${cert.daysRemaining}d` : "N/A")}
                              </span>
                              <span className={`truncate max-w-[70px] text-[8px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>{result?.ipAddress || "no-dns"}</span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className={t.tableHeader}>
                    <tr>
                      <th className="px-6 py-4">Domain &amp; DNS Status</th>
                      <th className="px-6 py-4">Security Grade</th>
                      <th className="px-6 py-4">Expiry Timeline</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-sm ${isDark ? "divide-slate-800/40" : "divide-slate-200/40"}`}>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                          <Loader2 className={`h-8 w-8 mx-auto mb-3 animate-spin ${isDark ? "text-[#FCBE13]" : "text-[#1E40AF]"}`} />
                          <p className={`font-medium text-xs ${t.textDesc}`}>Loading domains list from volume persistence...</p>
                        </td>
                      </tr>
                    ) : viewMode === "grouped" ? (
                      /* GROUPED VIEW */
                      paginatedGroups.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                            <Folder className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs">No grouped domains found in this view.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedGroups.map((group, index) => {
                          const isExpanded = !!expandedGroups[group.root];
                          
                          return (
                            <React.Fragment key={`${group.root}-${index}`}>
                              {/* Parent Root Domain Row */}
                              <tr
                                onClick={() => {
                                  setExpandedGroups((prev) => ({
                                    ...prev,
                                    [group.root]: !prev[group.root],
                                  }));
                                }}
                                className={`cursor-pointer transition-colors border-l-2 border-l-emerald-500/40 ${isDark ? "bg-slate-900/40 hover:bg-slate-900/60" : "bg-slate-50 hover:bg-slate-100"}`}
                              >
                                <td colSpan={3} className="px-6 py-3.5">
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    )}
                                    {isExpanded ? (
                                      <FolderOpen className="h-4 w-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Folder className="h-4 w-4 text-emerald-500 shrink-0" />
                                    )}
                                    <div>
                                      <span className={`font-bold tracking-wide text-xs uppercase font-mono ${isDark ? "text-white" : "text-slate-800"}`}>
                                        {group.root}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium font-mono ml-2">
                                        ({group.list.length} {group.list.length === 1 ? "endpoint" : "endpoints"})
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Stats Highlights */}
                                    {group.stats.valid > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                        {group.stats.valid} OK
                                      </span>
                                    )}
                                    {group.stats.expired > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                        {group.stats.expired} Expired
                                      </span>
                                    )}
                                    {group.stats.failed > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                                        {group.stats.failed} Failed
                                      </span>
                                    )}
                                    {group.stats.passive > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700/50 font-mono">
                                        {group.stats.passive} Passive
                                      </span>
                                    )}
                                    
                                    <button
                                      onClick={async () => {
                                        const activeInGroup = group.list.filter(m => !m.disabled);
                                        if (activeInGroup.length === 0) {
                                          showNotification("No active domains to scan in this group.", "error");
                                          return;
                                        }
                                        showNotification(`Scanning ${activeInGroup.length} domains in ${group.root}...`, "info");
                                        for (const m of activeInGroup) {
                                          await scanDomain(m.id);
                                        }
                                      }}
                                      disabled={scanningAll}
                                      className={`px-2 py-1 text-[10px] font-bold rounded transition-all border cursor-pointer ${
                                        isDark 
                                          ? "bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-750" 
                                          : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs"
                                      }`}
                                      title="Scan all active domains in this root domain folder"
                                    >
                                      Scan Group
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Nested Children Domains */}
                              {isExpanded && (
                                group.list.map((m, mIdx) => {
                                  const result = m.lastResult;
                                  const cert = result?.certDetails;
                                  const isSelected = selectedMonitor?.id === m.id;
                                  const isPassive = !!m.disabled;

                                  return (
                                    <tr
                                      key={`${m.id}-${mIdx}`}
                                      onClick={() => setSelectedMonitor(m)}
                                      className={`group transition-colors cursor-pointer ${
                                        isDark ? "hover:bg-slate-800/20" : "hover:bg-slate-100/60"
                                      } ${
                                        isSelected ? t.tableRowSelected : ""
                                      } ${isPassive ? (isDark ? "opacity-60 bg-slate-950/20" : "opacity-60 bg-slate-100/35") : ""}`}
                                    >
                                      <td className={`px-6 py-3 pl-12 border-l-2 ${isDark ? "border-l-slate-800" : "border-l-slate-200"}`}>
                                        <div className="flex items-center gap-3">
                                          {isPassive ? (
                                            <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                                          ) : result?.status === "valid" ? (
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                          ) : result?.status === "expired" || result?.status === "invalid_chain" ? (
                                            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                          ) : result?.status === "expiring_soon" ? (
                                            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                          ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                                          )}
                                          <div>
                                            <div className={`font-medium transition-colors flex items-center gap-2 flex-wrap text-xs ${isDark ? "text-white group-hover:text-emerald-300" : "text-slate-900 group-hover:text-blue-700"}`}>
                                              <span>{m.domain}</span>
                                              {isPassive && (
                                                <span className={`text-[9px] font-mono italic px-1.5 py-0.2 rounded border ${isDark ? "text-slate-500 bg-slate-950 border-slate-900" : "text-slate-550 bg-slate-100 border-slate-200"}`}>
                                                  passive
                                                </span>
                                              )}
                                              {m.cohortWarning && (
                                                <span className="inline-flex items-center gap-1 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider font-mono shrink-0">
                                                  Out of Sync
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                                              <span>IP: {result?.ipAddress || "Unresolved"}</span>
                                              {m.subdomainScanEnabled && (
                                                <>
                                                  <span>•</span>
                                                  <span className="text-emerald-400 font-medium">Subdomains active</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3">
                                        {isPassive ? (
                                          <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${isDark ? "text-slate-500 bg-slate-950 border-slate-900" : "text-slate-600 bg-slate-100 border-slate-200"}`}>PASSIVE</span>
                                        ) : result ? (
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getGradeColor(
                                              result.securityGrade
                                            )}`}
                                          >
                                            {result.securityGrade}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-500 font-mono">-</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3">
                                        {isPassive ? (
                                          <span className="text-xs text-slate-500 italic">No scheduled checks</span>
                                        ) : result ? (
                                          cert ? (
                                            <div>
                                              <div
                                                className={`text-[11px] font-medium ${
                                                  cert.daysRemaining <= 0
                                                    ? "text-rose-500 font-bold"
                                                    : cert.daysRemaining <= 15
                                                    ? "text-amber-500"
                                                    : "text-slate-300"
                                                }`}
                                              >
                                                {cert.daysRemaining <= 0
                                                  ? "EXPIRED"
                                                  : `${cert.daysRemaining} days remaining`}
                                              </div>
                                              <div className="text-[9px] text-slate-500 font-mono">
                                                {formatDate(cert.validTo).split(",")[0]}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-rose-400 font-semibold font-mono">Handshake Failed</span>
                                          )
                                        ) : (
                                          <span className="text-xs text-slate-500 italic">No scan record</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                          {/* Toggle Active/Passive */}
                                          <button
                                            onClick={() => toggleDomainActive(m.id)}
                                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all cursor-pointer"
                                            title={isPassive ? "Set to Active (Enable Checks)" : "Set to Passive (Skip Checks)"}
                                          >
                                            {isPassive ? (
                                              <EyeOff className="h-3.5 w-3.5 text-rose-400" />
                                            ) : (
                                              <Eye className="h-3.5 w-3.5 text-emerald-400" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => scanDomain(m.id)}
                                            disabled={scanningId === m.id || scanningAll || isPassive}
                                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Audit Now"
                                          >
                                            {scanningId === m.id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                                            ) : (
                                              <RefreshCw className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                          <button
                                            onClick={(e) => handleDeleteDomain(m.id, e)}
                                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-all cursor-pointer"
                                            title="Remove Domain"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </React.Fragment>
                          );
                        })
                      )
                    ) : (
                      /* FLAT LIST VIEW */
                      paginatedMonitors.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                            <Globe className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs">No monitored endpoints found in this view.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedMonitors.map((m, index) => {
                          const result = m.lastResult;
                          const cert = result?.certDetails;
                          const isSelected = selectedMonitor?.id === m.id;
                          const isPassive = !!m.disabled;

                          return (
                            <tr
                              key={`${m.id}-${index}`}
                              onClick={() => setSelectedMonitor(m)}
                              className={`group cursor-pointer transition-colors ${
                                isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-100/60"
                              } ${
                                isSelected ? (isDark ? "bg-slate-800/40" : "bg-slate-100") : ""
                              } ${isPassive ? (isDark ? "opacity-60 bg-slate-950/20" : "opacity-60 bg-slate-100/35") : ""}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {isPassive ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                                  ) : result?.status === "valid" ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                  ) : result?.status === "expired" || result?.status === "invalid_chain" ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                  ) : result?.status === "expiring_soon" ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
                                  )}
                                  <div>
                                    <div className={`font-semibold transition-colors flex items-center gap-2 flex-wrap ${isDark ? "text-white group-hover:text-emerald-300" : "text-slate-900 group-hover:text-blue-700"}`}>
                                      <span>{m.domain}</span>
                                      {isPassive && (
                                        <span className={`text-[9px] font-mono italic px-1.5 py-0.2 rounded border ${isDark ? "text-slate-500 bg-slate-950 border-slate-900" : "text-slate-550 bg-slate-100 border-slate-200"}`}>
                                          passive
                                        </span>
                                      )}
                                      {m.cohortWarning && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider font-mono shrink-0">
                                          <AlertTriangle className="h-2.5 w-2.5" />
                                          Out of Sync
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                                      <span>IP: {result?.ipAddress || "Unresolved"}</span>
                                      {m.subdomainScanEnabled && (
                                        <>
                                          <span>•</span>
                                          <span className="text-emerald-400 font-medium">Subdomains active</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {isPassive ? (
                                  <span className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${isDark ? "text-slate-500 bg-slate-950 border-slate-900" : "text-slate-600 bg-slate-100 border-slate-200"}`}>PASSIVE</span>
                                ) : result ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold border ${getGradeColor(
                                      result.securityGrade
                                    )}`}
                                  >
                                    {result.securityGrade}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500 font-mono">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isPassive ? (
                                  <span className="text-xs text-slate-500 italic">No scheduled checks</span>
                                ) : result ? (
                                  cert ? (
                                    <div>
                                      <div
                                        className={`text-xs font-medium ${
                                          cert.daysRemaining <= 0
                                            ? "text-rose-500 font-bold"
                                            : cert.daysRemaining <= 15
                                            ? "text-amber-500"
                                            : "text-slate-300"
                                        }`}
                                      >
                                        {cert.daysRemaining <= 0
                                          ? "EXPIRED"
                                          : `${cert.daysRemaining} days remaining`}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {formatDate(cert.validTo).split(",")[0]}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-rose-400 font-semibold font-mono">Failed Handshake</span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-500 italic">No scan record</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  {/* Toggle Active/Passive */}
                                  <button
                                    onClick={() => toggleDomainActive(m.id)}
                                    className={`p-1.5 rounded transition-all cursor-pointer ${
                                      isDark 
                                        ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                                    title={isPassive ? "Set to Active (Enable Checks)" : "Set to Passive (Skip Checks)"}
                                  >
                                    {isPassive ? (
                                      <EyeOff className="h-4 w-4 text-rose-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-emerald-500" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => scanDomain(m.id)}
                                    disabled={scanningId === m.id || scanningAll || isPassive}
                                    className={`p-1.5 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                      isDark 
                                        ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                                    title="Audit Now"
                                  >
                                    {scanningId === m.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteDomain(m.id, e)}
                                    className={`p-1.5 rounded transition-all cursor-pointer ${
                                      isDark 
                                        ? "text-slate-500 hover:text-rose-450 hover:bg-slate-800" 
                                        : "text-slate-500 hover:text-rose-650 hover:bg-slate-100"
                                    }`}
                                    title="Remove Domain"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )
                    )}
                  </tbody>
                </table>
              </div>
              )}

              {/* PAGINATION BAR */}
              <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${isDark ? "border-slate-800/80 bg-slate-900/10 text-slate-400" : "border-slate-200 bg-slate-50/50 text-slate-600"}`}>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`rounded px-2.5 py-1 focus:outline-none cursor-pointer font-semibold border ${
                      isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700 shadow-xs"
                    }`}
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                    <option value={-1}>All items</option>
                  </select>
                  <span>per page</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded border transition-all font-semibold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                      isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                    }`}
                  >
                    Previous
                  </button>
                  <span className={`px-3 py-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Page <strong className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{currentPage}</strong> of <strong className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{currentTotalPages}</strong>
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(currentTotalPages, p + 1))}
                    disabled={currentPage === currentTotalPages}
                    className={`px-3 py-1.5 rounded border transition-all font-semibold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                      isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CONTAINER: DETAILED INSPECTOR DRAWER */}
          <div className="lg:col-span-1 sticky top-6">
            <AnimatePresence mode="wait">
              {selectedMonitor ? (
                <motion.div
                  key={selectedMonitor.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`${t.card} border rounded-xl divide-y overflow-hidden shadow-xl ${isDark ? "divide-slate-800/80" : "divide-slate-200/80"}`}
                >
                  {/* Inspector Header */}
                  <div className={`p-5 flex items-start justify-between ${isDark ? "bg-slate-900/20" : "bg-slate-50/50"}`}>
                    <div className="min-w-0 flex-1 pr-4">
                      <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        Cryptographic Audit
                      </p>
                      <h3 className={`text-lg font-bold truncate mt-0.5 ${t.textTitle}`} title={selectedMonitor.domain}>
                        {selectedMonitor.domain}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${isDark ? "text-slate-400 bg-slate-900/80 border-slate-800/60" : "text-slate-600 bg-slate-100 border-slate-200"}`}>
                          IP: {selectedMonitor.lastResult?.ipAddress || "Unresolved"}
                        </span>
                        {selectedMonitor.lastResult && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                              selectedMonitor.lastResult.status === "valid"
                                ? (isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                                : (isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-700 border border-rose-200")
                            }`}
                          >
                            {selectedMonitor.lastResult.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMonitor(null)}
                      className={`p-1 rounded transition-all shrink-0 cursor-pointer ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inspector Data Body */}
                  {selectedMonitor.lastResult ? (
                    <div className={`divide-y max-h-[70vh] overflow-y-auto ${isDark ? "divide-slate-800/80" : "divide-slate-200/80"}`}>
                      
                      {(() => {
                        const activeMon = monitorsWithCohortWarnings.find((x) => x.id === selectedMonitor.id);
                        if (activeMon?.cohortWarning) {
                          return (
                            <div className={`p-4 border-b text-xs flex items-start gap-2.5 ${isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                              <div>
                                <span className="font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Out of Sync Expiry Warning</span>
                                {activeMon.cohortWarning}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Vitals metrics */}
                      {selectedMonitor.lastResult.certDetails ? (
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className={`p-3 rounded-lg border ${isDark ? "bg-[#0a0b0d] border-slate-800/60" : "bg-slate-50 border-slate-200/60"}`}>
                              <span className={`text-[9px] uppercase font-semibold block mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                SSL Grade
                              </span>
                              <span
                                className={`text-xl font-black ${
                                  selectedMonitor.lastResult.securityGrade.startsWith("A")
                                    ? (isDark ? "text-emerald-400" : "text-emerald-600")
                                    : (isDark ? "text-rose-400" : "text-rose-600")
                                }`}
                              >
                                {selectedMonitor.lastResult.securityGrade}
                              </span>
                            </div>
                            <div className={`p-3 rounded-lg border ${isDark ? "bg-[#0a0b0d] border-slate-800/60" : "bg-slate-50 border-slate-200/60"}`}>
                              <span className={`text-[9px] uppercase font-semibold block mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                Days Left
                              </span>
                              <span
                                className={`text-xl font-black ${
                                  selectedMonitor.lastResult.certDetails.daysRemaining <= 15
                                    ? (isDark ? "text-rose-400 animate-pulse" : "text-rose-600 animate-pulse")
                                    : (isDark ? "text-emerald-400" : "text-emerald-600")
                                }`}
                              >
                                {selectedMonitor.lastResult.certDetails.daysRemaining}d
                              </span>
                            </div>
                          </div>

                          {/* Technical list parameters */}
                          <div className="space-y-2.5 pt-2 text-xs">
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Issuer CA</span>
                              <span className={`font-mono text-right truncate max-w-[180px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {selectedMonitor.lastResult.certDetails.issuer.CN || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Organization</span>
                              <span className={`text-right truncate max-w-[180px] ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {selectedMonitor.lastResult.certDetails.issuer.O || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Signature</span>
                              <span className={`font-mono text-[10px] break-all max-w-[160px] text-right ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {selectedMonitor.lastResult.certDetails.signatureAlgorithm || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Key Strength</span>
                              <span className={`font-mono text-right ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                                {selectedMonitor.lastResult.certDetails.keyType}{" "}
                                {selectedMonitor.lastResult.certDetails.keySize &&
                                  `(${selectedMonitor.lastResult.certDetails.keySize} bits)`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Issued On</span>
                              <span className={`font-mono text-[11px] text-right ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {formatDate(selectedMonitor.lastResult.certDetails.validFrom).split(",")[0]}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className={`font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Expires On</span>
                              <span className={`font-mono text-[11px] font-semibold text-right ${isDark ? "text-rose-300" : "text-rose-600"}`}>
                                {formatDate(selectedMonitor.lastResult.certDetails.validTo).split(",")[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center space-y-3">
                          <AlertTriangle className={`h-8 w-8 mx-auto ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                          <h4 className={`text-sm font-semibold ${isDark ? "text-rose-400" : "text-rose-600"}`}>DNS/TLS Connection Failed</h4>
                          <p className={`text-xs px-2 leading-relaxed ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {selectedMonitor.lastResult.errorMessage || "SSL analysis connection could not be completed."}
                          </p>
                        </div>
                      )}

                      {/* AI Advisor reports */}
                      {selectedMonitor.lastResult.certDetails && (
                        <div className={`p-5 space-y-3 ${isDark ? "bg-slate-900/10" : "bg-slate-50/50"}`}>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              <Sparkles className={`h-4 w-4 animate-pulse ${isDark ? "text-emerald-400" : "text-[#1E40AF]"}`} />
                              <span>AI Security Advisor</span>
                            </h4>
                            {!selectedMonitor.lastResult.aiAnalysis && (
                              <button
                                onClick={() => triggerAiAnalysis(selectedMonitor.id)}
                                disabled={aiAnalyzingId === selectedMonitor.id}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 transition-colors rounded-lg border text-[10px] font-bold cursor-pointer ${
                                  isDark 
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border-emerald-500/20" 
                                    : "bg-blue-50 hover:bg-blue-100 text-[#1E40AF] border-[#1E40AF]/20"
                                }`}
                              >
                                {aiAnalyzingId === selectedMonitor.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Analyzing...</span>
                                  </>
                                ) : (
                                  <span>Generate Report</span>
                                )}
                              </button>
                            )}
                          </div>

                          {selectedMonitor.lastResult.aiAnalysis ? (
                            <div className={`space-y-3.5 text-xs p-4 rounded-xl border ${isDark ? "bg-[#0a0b0d] border-slate-800/80" : "bg-white border-slate-200/80 shadow-xs"}`}>
                              <div>
                                <span className={`text-[10px] uppercase block mb-1 font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                  Audit Executive Summary
                                </span>
                                <p className={`leading-relaxed text-[11px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {selectedMonitor.lastResult.aiAnalysis.summary}
                                </p>
                              </div>

                              {selectedMonitor.lastResult.aiAnalysis.vulnerabilities.length > 0 && (
                                <div>
                                  <span className={`text-[10px] font-bold uppercase block mb-1.5 ${isDark ? "text-rose-400" : "text-rose-600"}`}>
                                    Identified Vulnerabilities
                                  </span>
                                  <ul className={`space-y-1 text-[11px] pl-1 list-none ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                    {selectedMonitor.lastResult.aiAnalysis.vulnerabilities.map(
                                      (v, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="text-rose-500 mt-0.5">•</span>
                                          <span>{v}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-1.5">
                                  Recommended Protocols
                                </span>
                                <ul className="space-y-1 text-slate-400 text-[11px] pl-1 list-none">
                                  {selectedMonitor.lastResult.aiAnalysis.recommendations.map(
                                    (r, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-emerald-500 mt-0.5">•</span>
                                        <span>{r}</span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            aiAnalyzingId !== selectedMonitor.id && (
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Click Generate Report to request a Gemini-powered audit on security
                                strengths, upcoming compliance issues, and protocol upgrades.
                              </p>
                            )
                          )}
                        </div>
                      )}

                      {/* Chain of Trust Tree visual representation */}
                      {selectedMonitor.lastResult.chain.length > 0 && (
                        <div className="p-5 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-emerald-400" />
                            <span>Chain of Trust Path</span>
                          </h4>
                          <div className="space-y-5 pl-2.5 border-l-2 border-slate-800">
                            {selectedMonitor.lastResult.chain.map((cert, index) => {
                              const isLeaf = index === 0;
                              const isRoot = index === selectedMonitor.lastResult!.chain.length - 1;

                              return (
                                <div key={`${cert.fingerprint || ""}-${index}`} className="relative pl-5 space-y-1">
                                  <div
                                    className={`absolute -left-[26px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-[#0f1115] ${
                                      isLeaf
                                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        : isRoot
                                        ? "bg-indigo-500"
                                        : "bg-teal-500"
                                    }`}
                                  />
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-white block truncate max-w-[190px]" title={cert.subject?.CN}>
                                      {cert.subject?.CN || "Root CA / Authority"}
                                    </span>
                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase shrink-0 border border-slate-800">
                                      {isLeaf ? "Leaf Cert" : isRoot ? "Root CA" : "Intermediate"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Issuer:</span>
                                      <span className="truncate max-w-[160px]" title={cert.issuer?.CN}>
                                        {cert.issuer?.CN || cert.issuer?.O || "Self-signed"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">SHA1:</span>
                                      <span className="font-mono text-[9px] truncate max-w-[160px]">
                                        {cert.fingerprint}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Validity:</span>
                                      <span className="text-[9px]">
                                        Until {cert.valid_to ? formatDate(cert.valid_to).split(",")[0] : "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Subdomains list table */}
                      {selectedMonitor.subdomainScanEnabled && (
                        <div className="p-5 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-emerald-400" />
                              <span>Discovered Subdomains</span>
                            </span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-800">
                              {selectedMonitor.lastResult.subdomainsDiscovered.length} mapped
                            </span>
                          </h4>

                          {selectedMonitor.lastResult.subdomainsDiscovered.length === 0 ? (
                            <p className="text-xs text-slate-500 leading-normal italic bg-[#0a0b0d] p-3 rounded-lg border border-slate-800/60">
                              No active subdomains resolved on port 443 during probe.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {selectedMonitor.lastResult.subdomainsDiscovered.map((sub, i) => (
                                <div
                                  key={i}
                                  className="bg-[#0a0b0d] p-3 rounded-lg border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-200 font-mono truncate" title={sub.fqdn}>
                                      {sub.fqdn}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span>IP: {sub.ip}</span>
                                      <span>•</span>
                                      <span
                                        className={
                                          sub.daysRemaining <= 0
                                            ? "text-rose-400"
                                            : sub.daysRemaining <= 15
                                            ? "text-amber-400"
                                            : "text-slate-400"
                                        }
                                      >
                                        {sub.daysRemaining <= 0 ? "Expired" : `${sub.daysRemaining}d left`}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                                        sub.status === "valid"
                                          ? (isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                                          : (isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-700 border border-rose-200")
                                      }`}
                                    >
                                      {sub.status}
                                    </span>
                                    <div
                                      className={`h-6.5 w-6.5 font-mono font-bold text-[10px] flex items-center justify-center rounded border ${getGradeColor(
                                        sub.securityGrade
                                      )}`}
                                    >
                                      {sub.securityGrade}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-8 text-center space-y-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      <HelpCircle className="h-8 w-8 mx-auto text-slate-500" />
                      <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-700"}`}>No scan data available</p>
                      <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                        Click the validation trigger below to query SSL certificate.
                      </p>
                    </div>
                  )}

                  {/* Inspector Footer Panel */}
                  <div className={`p-5 flex items-center gap-2 ${isDark ? "bg-slate-900/20" : "bg-slate-50/50"}`}>
                    <button
                      onClick={() => scanDomain(selectedMonitor.id)}
                      disabled={scanningId === selectedMonitor.id || scanningAll}
                      className={`flex-1 inline-flex items-center justify-center gap-2 font-bold text-sm py-2.5 rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-40 ${
                        isDark
                          ? "bg-[#FCBE13] hover:bg-[#FCBE13]/90 text-slate-900 shadow-amber-950/20"
                          : "bg-[#1E40AF] hover:bg-blue-800 text-white shadow-blue-200/50"
                      }`}
                    >
                      {scanningId === selectedMonitor.id ? (
                        <>
                          <Loader2 className={`h-4 w-4 animate-spin ${isDark ? "text-black" : "text-white"}`} />
                          <span>Auditing Infrastructure...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span>Audit Domain Now</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        setSelectedMonitor(null);
                        handleDeleteDomain(selectedMonitor.id, e);
                      }}
                      className={`p-2.5 border transition-all rounded-lg cursor-pointer shrink-0 ${isDark ? "border-slate-800 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-rose-400" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-rose-600"}`}
                      title="Stop Monitoring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`border p-8 text-center text-slate-500 border-dashed rounded-xl ${isDark ? "bg-[#0f1115]/50 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}
                >
                  <Globe className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <h4 className={`text-sm font-semibold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-700"}`}>
                    Select Domain for Deeper Inspection
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Click any monitored domain in the checklist table to explore leaf/root validity path hierarchies, analyze active subdomain records, or prompt Gemini AI for deep hardening suggestions.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* DETAILED BULK IMPORT CSV MODAL */}
      <AnimatePresence>
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCsvModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`relative max-w-lg w-full rounded-xl overflow-hidden shadow-2xl z-10 border ${t.card} ${isDark ? "border-slate-800/80" : "border-slate-200"}`}
            >
              <div className={`p-4 border-b flex items-center justify-between ${isDark ? "border-slate-800/80 bg-slate-900/20" : "border-slate-200 bg-slate-50"}`}>
                <div className={`flex items-center gap-2 font-bold ${t.textTitle}`}>
                  <FileSpreadsheet className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <h3>Bulk Import Domains / Zone Files</h3>
                </div>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className={`p-1.5 rounded transition-all cursor-pointer ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Upload a CSV file, plain text list, or a DNS BIND Zone database export. The system will automatically parse and discover all valid domains/subdomains.
                </p>

                {/* Drag and Drop Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? (isDark ? "border-amber-500 bg-amber-500/10" : "border-blue-500 bg-blue-50/50")
                      : (isDark 
                          ? "border-slate-800 bg-[#0a0b0d] hover:border-slate-700 hover:bg-[#0c0d10]" 
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50")
                  }`}
                  onClick={() => document.getElementById("csv-file-picker")?.click()}
                >
                  <input
                    id="csv-file-picker"
                    type="file"
                    accept=".csv,.txt,.zone"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileChange(files[0]);
                      }
                    }}
                  />
                  {uploadedFile ? (
                    <>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className={`text-sm font-semibold truncate max-w-[280px] ${isDark ? "text-white" : "text-slate-900"}`}>{uploadedFile.name}</p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{uploadedFile.size} • Loaded Successfully</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearUploadedFile();
                        }}
                        className="mt-1 px-2.5 py-1 text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/20 transition-all cursor-pointer"
                      >
                        Remove File
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-slate-800/50 text-slate-400" : "bg-slate-200 text-slate-500"}`}>
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          Drag &amp; Drop File Here or Click to Browse
                        </p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          Supports CSV, TXT or DNS Zone databases (.zone, .txt)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {uploadedFile ? "Parsed File Content Preview" : "Or Paste Domains / Zone Data Manually"}
                    </label>
                    {uploadedFile && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-700 bg-emerald-50"}`}>
                        Auto-detected
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="example.com, github.com, myinfra.dev&#10;cloudflare.com; google.com&#10;https://microsoft.com"
                    className={`w-full border rounded-lg p-3 text-xs font-mono focus:outline-none transition-all ${
                      isDark 
                        ? "bg-[#0a0b0d] border-slate-800 text-white placeholder-slate-700 focus:border-amber-500/50" 
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500/50"
                    }`}
                  />
                </div>

                {csvError && (
                  <div className="text-xs text-rose-500 bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{csvError}</span>
                  </div>
                )}
              </div>

              <div className={`p-4 border-t flex items-center justify-end gap-2 ${isDark ? "bg-slate-900/20 border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                <button
                  onClick={() => setShowCsvModal(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvImport}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isDark
                      ? "bg-[#FCBE13] hover:bg-[#FCBE13]/90 text-slate-900 shadow-sm"
                      : "bg-[#1E40AF] hover:bg-blue-800 text-white shadow-sm"
                  }`}
                >
                  Extract &amp; Import
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmId && (() => {
          const m = monitors.find(x => x.id === deleteConfirmId);
          if (!m) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmId(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-xs"
              />
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className={`relative max-w-sm w-full rounded-xl overflow-hidden shadow-2xl z-10 p-6 text-center border ${t.card} ${isDark ? "border-slate-800/80" : "border-slate-200"}`}
              >
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${t.textTitle}`}>Stop Monitoring Domain?</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Are you sure you want to stop monitoring <span className={`font-mono font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{m.domain}</span>? This will clear its diagnostic logs and active subdomain map.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className={`flex-1 px-4 py-2 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                        : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeDeleteDomain(deleteConfirmId)}
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    Stop Monitoring
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0f1115] border border-slate-800/80 p-4 rounded-xl shadow-2xl flex items-start gap-3"
          >
            {notification.type === "success" ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">✓</span>
              </div>
            ) : notification.type === "error" ? (
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 leading-normal">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
