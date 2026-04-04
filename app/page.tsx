"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Eye, EyeOff, Zap, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { login, signup, isAuthenticated, isAuthLoading } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in — skip to app
  if (!isAuthLoading && isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "signup") {
      if (!name) { setError("Please enter your name."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const success = await login(email, password);
        if (success) {
          router.push("/dashboard");
        } else {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        const result = await signup(name, email, password);
        if (result.success) {
          router.push("/dashboard");
        } else {
          setError(result.error || "Signup failed. Please try again.");
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#fafaf7" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: "#111827" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b" }}>
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-white text-xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>One&All</span>
        </div>

        <div>
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Zap className="w-8 h-8" style={{ color: "#f59e0b" }} />
            </div>
            <h2 className="text-white mb-4" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
              Collaborate better.<br />Achieve more together.
            </h2>
            <p style={{ color: "#9ca3af", lineHeight: 1.7 }}>
              One&All brings your team, tasks, and projects into one unified workspace. Stay aligned, move faster, and celebrate wins together.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { emoji: "⚡", title: "Real-time collaboration", desc: "Work alongside your team in perfect sync" },
              { emoji: "📊", title: "Powerful analytics", desc: "Track progress with beautiful visualizations" },
              { emoji: "🗓️", title: "Unified calendar", desc: "Never miss a deadline or meeting again" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl">{f.emoji}</span>
                <div>
                  <p className="text-white" style={{ fontWeight: 500 }}>{f.title}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "#4b5563", fontSize: "0.875rem" }}>© 2026 One&All. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b" }}>
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>One&All</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="mb-1" style={{ fontSize: "1.5rem", color: "#111827" }}>
              {mode === "login" ? "Welcome back!" : "Create your account"}
            </h1>
            <p className="mb-6" style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              {mode === "login" ? "Sign in to your workspace" : "Start collaborating with your team today"}
            </p>

            {/* Toggle */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: "#f3f4f6" }}>
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2 rounded-lg transition-all duration-200"
                  style={{
                    background: mode === m ? "white" : "transparent",
                    color: mode === m ? "#111827" : "#6b7280",
                    fontWeight: mode === m ? 600 : 400,
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    fontSize: "0.875rem",
                  }}>
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Full Name</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                    style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}
                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              )}
              <div>
                <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                  style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}
                  onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all pr-11"
                    style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}
                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {mode === "signup" && (
                <div>
                  <label className="block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Confirm Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border outline-none transition-all"
                    style={{ borderColor: "#e5e7eb", fontSize: "0.875rem" }}
                    onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626", fontSize: "0.875rem" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2"
                style={{
                  background: loading ? "#d97706" : "#f59e0b",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  opacity: loading ? 0.8 : 1,
                }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
