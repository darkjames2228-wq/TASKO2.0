/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { Task, Category, Priority, User } from "./types";
import { BackdropAnimation } from "./components/BackdropAnimation";
import { TaskStats } from "./components/TaskStats";
import { TaskForm } from "./components/TaskForm";
import { TaskFilterBar, FilterType } from "./components/TaskFilterBar";
import { TaskCard } from "./components/TaskCard";
import { SettingsPanel, COLOR_PRESETS } from "./components/SettingsPanel";
import { AccountAuth } from "./components/AccountAuth";
import { motion, AnimatePresence } from "motion/react";
import { Cloud, Wifi, WifiOff, Terminal, EyeOff, LayoutGrid, Award } from "lucide-react";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Authentication & Identity States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("tasko_user_context_v2");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("tasko_auth_token_v2") || null;
  });

  // Settings State configurations
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    return localStorage.getItem("tasko_theme_preset_v1") || "volt-yellow";
  });
  const [gridEnabled, setGridEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem("tasko_grid_enabled");
    return raw !== "false";
  });
  const [animationSpeed, setAnimationSpeed] = useState<"slower" | "normal" | "static">(() => {
    return (localStorage.getItem("tasko_animation_speed") as any) || "normal";
  });

  // Filter queries
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Trigger Toast Notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Fetch initial tasks on mount
  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const headers: HeadersInit = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }
        const res = await fetch("/api/tasks", { headers });
        if (!res.ok) throw new Error("Could not fetch remote database tasks");
        const data = await res.json();
        if (isMounted) {
          setTasks(data);
          setSyncError(null);
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setSyncError("Offline: Failed to synchronise with Tasko engine.");
          showToast("⚠️ Could not load remote tasks. Local mode active.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTasks();
    return () => {
      isMounted = false;
    };
  }, [showToast, authToken]);

  // Create Task Handler
  const handleAddTask = async (text: string, category: Category, priority: Priority, due: string | null) => {
    try {
      setSubmitting(true);
      setIsSyncing(true);
      const reqHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ text, category, priority, due }),
      });

      if (!res.ok) throw new Error("Network returned non-201 response");
      const newTask = await res.json();
      
      setTasks((prev) => [...prev, newTask].sort((a, b) => a.order - b.order));
      showToast("✓ Operational task catalogued!");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Failed to write to server.");
    } finally {
      setSubmitting(false);
      setIsSyncing(false);
    }
  };

  // Toggle Done State
  const handleToggleTask = async (id: string) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const nextDoneState = !taskToToggle.done;

    // Optimistically update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: nextDoneState } : t))
    );

    if (nextDoneState) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#2dffb3", "#ff2a9d", "#0ff0ff", "#ffe600"]
      });
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2400);
    }

    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify({ done: nextDoneState }),
      });
      if (!res.ok) throw new Error("Unsuccessful status update");
      showToast(nextDoneState ? "🎉 Goal completed! Great work." : "⚡ Task reactivated.");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      // Revert optimism
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !nextDoneState } : t))
      );
      showToast("⚠️ Sync failure. Action reverted.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Task Text Inline
  const handleUpdateText = async (id: string, text: string) => {
    const oldTask = tasks.find((t) => t.id === id);
    if (!oldTask) return;

    // Optimistically update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));

    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Error amending task");
      showToast("✓ Amendment synced.");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      // Revert optimism
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: oldTask.text } : t)));
      showToast("⚠️ Editing failed to persist on remote database.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (id: string) => {
    const backup = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = {};
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(`/api/tasks/${id}`, { 
        method: "DELETE",
        headers: reqHeaders
      });
      if (!res.ok) throw new Error("Could not erase remote document");
      showToast("Erase completed successfully.");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      // Revert optimism
      setTasks(backup);
      showToast("⚠️ Deletion failed to reflect server-side.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear All Completed tasks handler
  const handleClearCompleted = async () => {
    const backup = [...tasks];
    setTasks((prev) => prev.filter((t) => !t.done));

    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = {};
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/tasks/clear-completed", { 
        method: "POST", 
        headers: reqHeaders 
      });
      if (!res.ok) throw new Error("Error purging database done");
      const result = await res.json();
      showToast(`Purged ${result.clearedCount || 0} finished targets.`);
      setSyncError(null);
    } catch (err) {
      console.error(err);
      setTasks(backup);
      showToast("⚠️ Failed to purge complete tasks.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Drag and Drop ordering handler
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragDrop = async (srcId: string, targetId: string) => {
    // If no ids, or dragging onto itself, ignore
    const finalSrcId = srcId || draggedId;
    if (!finalSrcId || finalSrcId === targetId) return;

    const sourceIdx = tasks.findIndex((t) => t.id === finalSrcId);
    const targetIdx = tasks.findIndex((t) => t.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    // Rearrange locally first
    const reorderedTasks = [...tasks];
    const [movedTask] = reorderedTasks.splice(sourceIdx, 1);
    reorderedTasks.splice(targetIdx, 0, movedTask);

    // Re-index their orders
    const newlyOrderedTasks = reorderedTasks.map((t, idx) => ({
      ...t,
      order: idx * 10,
    }));

    setTasks(newlyOrderedTasks);
    setDraggedId(null);

    // Save ordering coordinates to database
    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ orderedIds: newlyOrderedTasks.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error("Unsuccessful DB reindexing order sync");
      showToast("✓ Custom ordering successfully stored.");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Reordering failed to match remote server.");
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Settings Panel Direct Handlers ──────────────────────────────
  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    localStorage.setItem("tasko_theme_preset_v1", presetId);
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      showToast(`⚡ Color Profile shifted to ${preset.name}!`);
    }
  };

  const handleToggleGrid = (enabled: boolean) => {
    setGridEnabled(enabled);
    localStorage.setItem("tasko_grid_enabled", String(enabled));
    showToast(enabled ? "Digital Matrix Grid overlay enabled." : "Grid overlay deactivated.");
  };

  const handleToggleSpeed = (speed: "slower" | "normal" | "static") => {
    setAnimationSpeed(speed);
    localStorage.setItem("tasko_animation_speed", speed);
    const speedLabels = {
      normal: "Standard fluid drift speed.",
      slower: "Atmosphere slowed to Cosmic drift.",
      static: "Atmospheric fluidity paused entirely."
    };
    showToast(speedLabels[speed]);
  };

  const handleClearAll = async () => {
    const confirm = window.confirm("⚠️ ATTENTION: Are you sure you want to permanently erase your active files from the server?");
    if (!confirm) return;

    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = {};
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/tasks/clear-all", { 
        method: "POST",
        headers: reqHeaders
      });
      if (!res.ok) throw new Error("Could not wipe DB tasks on server");
      setTasks([]);
      showToast("💀 Tasks cleared. Ready retrospectively.");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Could not reach server to purge database.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadDemo = async () => {
    try {
      setIsSyncing(true);
      const reqHeaders: HeadersInit = {};
      if (authToken) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/tasks/seed-demo", { 
        method: "POST",
        headers: reqHeaders
      });
      if (!res.ok) throw new Error("Could not seed workspace DB");
      const result = await res.json();
      setTasks(result.tasks);
      showToast("✨ Autonomous workspace demo pack injected!");
      setSyncError(null);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Could not fetch software preset files.");
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Backup and Local JSON Export ────────────────────────────────
  const handleDownloadBackup = useCallback(() => {
    try {
      const jsonString = JSON.stringify(tasks, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const userLabel = currentUser ? currentUser.username : "anonymous";
      const dateLabel = new Date().toISOString().split("T")[0];
      
      link.href = url;
      link.download = `tasko_backup_${userLabel}_${dateLabel}.json`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("✓ Offline JSON task archive downloaded successfully!");
    } catch (err) {
      console.error("Backup download error:", err);
      showToast("⚠️ Failed to generate local JSON file.");
    }
  }, [tasks, currentUser, showToast]);

  // ─── Authentication Success, Logout, and Migration handlers ───
  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem("tasko_user_context_v2", JSON.stringify(user));
    localStorage.setItem("tasko_auth_token_v2", token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem("tasko_user_context_v2");
    localStorage.removeItem("tasko_auth_token_v2");
    setTasks([]); // Clean view queue
  };

  const handleMigrateLocalTasks = async () => {
    if (!currentUser || !authToken || tasks.length === 0) return;
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      headers["Authorization"] = `Bearer ${authToken}`;
      
      const res = await fetch("/api/tasks/migrate", {
        method: "POST",
        headers,
        body: JSON.stringify({ localTasks: tasks }),
      });
      
      if (!res.ok) throw new Error("Tasks migration failed");
      const result = await res.json();
      showToast(`✨ Synchronised ${result.migratedCount || 0} offline files onto account!`);
      
      // Load migrated tasks
      const freshRes = await fetch("/api/tasks", { headers });
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        setTasks(freshData);
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ Could not synchronise local session tasks.");
    }
  };

  // Perform dynamic filtering and query mapping
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    const q = searchQuery.trim().toLowerCase();

    // Text Search Match
    if (q) {
      result = result.filter((t) => t.text.toLowerCase().includes(q));
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Main status filtering
    switch (currentFilter) {
      case "active":
        result = result.filter((t) => !t.done);
        break;
      case "done":
        result = result.filter((t) => t.done);
        break;
      case "high":
        result = result.filter((t) => t.priority === Priority.HIGH && !t.done);
        break;
      case "today":
        result = result.filter((t) => t.due === todayStr && !t.done);
        break;
      default:
        break;
    }

    // Sort to push completed tasks to the bottom, while maintaining relative order
    return result.sort((a, b) => {
      if (a.done === b.done) return 0;
      return a.done ? 1 : -1;
    });
  }, [tasks, currentFilter, searchQuery]);

  const hasCompleted = useMemo(() => tasks.some((t) => t.done), [tasks]);

  const activePreset = useMemo(() => {
    return COLOR_PRESETS.find((p) => p.id === activePresetId) || COLOR_PRESETS[0];
  }, [activePresetId]);

  const containerStyle = useMemo(() => {
    return {
      "--color-brand-neon": activePreset.primary,
      "--color-brand-cyan": activePreset.secondary,
    } as React.CSSProperties;
  }, [activePreset]);

  return (
    <div 
      className="relative min-h-screen px-4 py-12 md:py-16 selection:bg-brand-neon selection:text-brand-dark"
      style={containerStyle}
    >
      {/* Dynamic Grid Particles Backdrop Animation Portal */}
      <BackdropAnimation gridEnabled={gridEnabled} animationSpeed={animationSpeed} />

      {/* Main Container Layout */}
      <div className="w-full max-w-2xl mx-auto z-10 relative">
        {/* Header Title Section */}
        <header className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight bg-gradient-to-r from-brand-neon via-[#f2ff8c] to-brand-cyan bg-clip-text text-transparent">
                Tasko
              </h1>
              {/* Database State Icon */}
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-dark-surface border border-brand-border text-[9px] font-mono text-brand-muted shrink-0"
                title={syncError ? "Offline fallback" : "Database Synchronized"}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${syncError ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
                <span className="hidden sm:inline">Engine {syncError ? "Offline" : "Direct"}</span>
              </div>
            </div>
            <p className="font-mono text-[10px] md:text-xs text-brand-muted tracking-[0.15em] uppercase mt-1">
              Autonomous Task OS Portal
            </p>
          </div>

          <div className="flex flex-col items-end text-right font-mono text-[10px] text-brand-muted">
            <span className="text-brand-cyan truncate max-w-[150px] sm:max-w-xs block overflow-hidden">
              {currentUser ? `${currentUser.username}@tasko` : "anonymous@tasko"}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isSyncing ? (
                <Cloud className="h-3.5 w-3.5 text-brand-neon animate-bounce" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-brand-muted" />
              )}
              <span>{isSyncing ? "Saving..." : "Synced"}</span>
            </div>
          </div>
        </header>

        {/* Account Administration Identity Portal */}
        <AccountAuth
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          currentLocalTasks={currentUser ? [] : tasks}
          onMigrateLocalTasks={handleMigrateLocalTasks}
          showToast={showToast}
        />

        {/* System Settings Configurations collapsible card */}
        <SettingsPanel
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          gridEnabled={gridEnabled}
          onToggleGrid={handleToggleGrid}
          animationSpeed={animationSpeed}
          onChangeSpeed={handleToggleSpeed}
          onClearAll={handleClearAll}
          onLoadDemo={handleLoadDemo}
          tasksCount={tasks.length}
          onDownloadBackup={handleDownloadBackup}
        />

        {/* Dynamic Metric Charts Panel */}
        <TaskStats tasks={tasks} />

        {/* Input Registration Form */}
        <TaskForm onAddTask={handleAddTask} isSubmitting={submitting} showToast={showToast} />

        {/* Filters Controls and Text Search Match */}
        <TaskFilterBar
          currentFilter={currentFilter}
          onChangeFilter={setCurrentFilter}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          onClearCompleted={handleClearCompleted}
          hasCompleted={hasCompleted}
        />

        {/* Main List Rendering Component */}
        <div id="main-tasks-layout" className="space-y-3.5">
          {loading ? (
            // Skeleton loader state
            <div className="space-y-3">
              {[1, 2, 3].map((loadingId) => (
                <div key={loadingId} className="w-full bg-brand-dark-surface/60 border border-brand-border/40 h-20 rounded-xl animate-pulse flex items-center px-4 justify-between">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="h-5 w-5 bg-brand-border rounded-full shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-3 bg-brand-border rounded w-1/2" />
                      <div className="h-2 bg-brand-border rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-8 w-12 bg-brand-border rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-brand-dark/20 border border-brand-border/50 rounded-2xl p-12 text-center text-brand-muted"
                >
                  <EyeOff className="h-8 w-8 text-brand-muted/40 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-400">Empty visual queue matching your filter</p>
                  <p className="text-xs font-mono text-brand-muted/75 mt-1">Try toggling filter tabs or adding new assignments above.</p>
                </motion.div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onUpdateText={handleUpdateText}
                    onDelete={handleDeleteTask}
                    onDragStart={handleDragStart}
                    onDragDrop={handleDragDrop}
                  />
                ))
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Offline sync error banner alert */}
        {syncError && (
          <div className="mt-8 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl px-4 py-3 text-xs font-mono text-center flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Desktop UI Hint Banner footer */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest flex items-center justify-center gap-1.5 select-none">
            <LayoutGrid className="h-3.5 w-3.5 text-brand-muted/50" />
            <span>Drag items to reorder coordinates manually</span>
          </p>
        </div>
      </div>

      {/* Slide-out Portal Toast Pop-ups */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-dark-panel/95 border border-brand-border px-5 py-3 rounded-full text-xs font-mono text-gray-200 shadow-xl shadow-black/80 flex items-center gap-2 z-50 pointer-events-none backdrop-blur-md"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-brand-neon animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Completion Celebration Logo Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-brand-neon/20 blur-3xl rounded-full" />
              <div className="bg-brand-dark-surface/80 p-8 rounded-[2rem] border border-brand-border/50 backdrop-blur-md shadow-2xl flex flex-col items-center gap-3">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Award className="h-20 w-20 text-brand-neon" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-cyan">
                    Task Accomplished!
                  </h3>
                  <p className="text-xs font-mono tracking-widest uppercase text-brand-muted mt-1">
                    System metrics improved
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
