import React, { useState } from "react";
import { User, Task } from "../types";
import { 
  UserPlus, 
  LogIn, 
  LogOut, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  CheckCircle,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AccountAuthProps {
  currentUser: User | null;
  onLoginSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  currentLocalTasks: Task[];
  onMigrateLocalTasks: () => Promise<void>;
  showToast: (msg: string) => void;
}

export function AccountAuth({
  currentUser,
  onLoginSuccess,
  onLogout,
  currentLocalTasks,
  onMigrateLocalTasks,
  showToast,
}: AccountAuthProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please complete all requested fields.");
      return;
    }
    if (password.length < 4) {
      setErrorMsg("Password security key must be at least 4 characters.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication request aborted");
      }

      if (authMode === "register") {
        setSuccessMsg("⚡ Portal entry registered successfully!");
        showToast("✨ Identity registered! Please log in.");
        // Auto transition to login mode
        setTimeout(() => {
          setAuthMode("login");
          setPassword("");
          setSuccessMsg(null);
        }, 1200);
      } else {
        // Logging in
        showToast(`⚡ Identity verified. Welcome back, ${data.user.username}!`);
        onLoginSuccess(data.user, data.token);
        setIsExpanded(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Credential verification sync timed out.");
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationTrigger = async () => {
    try {
      setLoading(true);
      await onMigrateLocalTasks();
    } catch {
      showToast("⚠️ Task migration interrupted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="account-auth-identity-widget" className="w-full max-w-2xl mx-auto mb-6">
      {/* Widget Header Strip */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-dark-surface/60 border border-brand-border/60 backdrop-blur-sm shadow-md">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${currentUser ? "bg-brand-cyan/10 text-brand-cyan" : "bg-brand-muted/10 text-brand-muted"}`}>
            <UserIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted block">Identity Portal</span>
            {currentUser ? (
              <span className="text-xs font-mono font-bold text-brand-neon">
                {currentUser.username}@tasko-active
              </span>
            ) : (
              <span className="text-xs font-mono text-gray-400">
                Anonymous Session
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && currentLocalTasks.length > 0 && (
            <button
              id="migrate-tasks-btn"
              onClick={handleMigrationTrigger}
              disabled={loading}
              className="text-[10px] font-mono font-medium text-brand-cyan hover:text-white border border-brand-cyan/30 hover:border-brand-cyan bg-brand-cyan/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              title="Synchronise local session tasks with your online cloud database"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync {currentLocalTasks.length} offline files</span>
            </button>
          )}

          <button
            id="expand-profile-portal-btn"
            onClick={() => {
              setIsExpanded(!isExpanded);
              resetForm();
            }}
            className="text-xs font-mono font-semibold uppercase px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-dark-panel text-gray-300 hover:text-brand-neon cursor-pointer transition-all flex items-center gap-1"
          >
            {currentUser ? (
              <>
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Register</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Collapse Panels */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-2"
          >
            <div className="bg-brand-dark-surface/90 border border-brand-border backdrop-blur-md rounded-2xl p-5 shadow-xl">
              {currentUser ? (
                // Verified Logged in dashboard state
                <div className="space-y-4 py-2 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <h4 className="font-display font-medium text-gray-200 text-sm">Active Sync Encryption Enabled</h4>
                      </div>
                      <p className="text-xs text-brand-muted max-w-md font-mono">
                        Your tasks are bound to account <span className="text-brand-cyan font-bold">{currentUser.username}</span>. You can access them securely from any machine using this password key.
                      </p>
                    </div>

                    <button
                      id="account-sign-out-trigger-btn"
                      onClick={() => {
                        onLogout();
                        setIsExpanded(false);
                        showToast("Disconnected safe session.");
                      }}
                      className="border border-red-500/30 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-mono font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Confirm Disconnect</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Auth form interactive state
                <div id="auth-forms-interactive-container">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-display font-semibold text-gray-200">
                      {authMode === "login" ? "Verify Digital Identity" : "Generate Mainframe Keys"}
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAuthMode("login");
                          setErrorMsg(null);
                        }}
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded transition-all cursor-pointer ${
                          authMode === "login"
                            ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                            : "text-brand-muted hover:text-gray-300"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode("register");
                          setErrorMsg(null);
                        }}
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded transition-all cursor-pointer ${
                          authMode === "register"
                            ? "bg-brand-neon/20 text-brand-neon border border-brand-neon/30"
                            : "text-brand-muted hover:text-gray-300"
                        }`}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Username Field */}
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-muted" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Unique Username handle..."
                          className="w-full bg-brand-dark border border-brand-border hover:border-brand-border-muted focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/35 text-xs font-mono pl-10 pr-4 py-2.5 rounded-xl text-gray-200 outline-none transition-all placeholder:text-brand-muted/70"
                          id="input-auth-username"
                          autoComplete="username"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-muted" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Secret Password key..."
                          className="w-full bg-brand-dark border border-brand-border hover:border-brand-border-muted focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/35 text-xs font-mono pl-10 pr-10 py-2.5 rounded-xl text-gray-200 outline-none transition-all placeholder:text-brand-muted/70"
                          id="input-auth-password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-gray-300 p-1 cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-xs font-mono flex items-center gap-1.5"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </motion.div>
                      )}

                      {successMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-xl text-xs font-mono flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <span>{successMsg}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      id="auth-submission-action-sumbit-btn"
                      className="w-full bg-gradient-to-r from-brand-neon to-brand-cyan text-brand-dark text-xs font-mono font-bold uppercase py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing cryptographic access...</span>
                        </>
                      ) : (
                        <>
                          {authMode === "login" ? (
                            <>
                              <LogIn className="h-3.5 w-3.5" />
                              <span>Authorize Connection</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Register Digital Identity</span>
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
