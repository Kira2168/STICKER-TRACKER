"use client";
import { useState } from "react";
// Using relative path to avoid "Module not found" errors
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle";
import { InstallToPhone } from "../components/install-to-phone";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const readApiError = async (resp: Response) => {
    try {
      const data = (await resp.json()) as { error?: string };
      return data.error || null;
    } catch {
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try admin login first. If it fails, fall back to agent lookup.
      const adminResp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
        credentials: "include",
      });

      if (adminResp.ok) {
        localStorage.setItem("is_admin", "true");
        localStorage.setItem("admin_name", "Admin");
        localStorage.removeItem("agent_id");
        localStorage.removeItem("agent_name");
        router.push("/admin");
        return;
      }

      if (adminResp.status >= 500) {
        const serverMessage = await readApiError(adminResp);
        alert(
          serverMessage ||
            "Admin login is not configured on the server. Set ADMIN_LOGIN_ID, ADMIN_LOGIN_PASSWORD, and ADMIN_JWT_SECRET, then redeploy."
        );
        setLoading(false);
        return;
      }

      // Direct lookup in your custom 'agents' table
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('agent_id', id)
        .eq('password', password)
        .single();

      if (error || !data) {
        alert("Invalid ID or Password");
        setLoading(false);
      } else {
        // Save agent details in local storage for the dashboard to use
        localStorage.removeItem("is_admin");
        localStorage.removeItem("admin_name");
        localStorage.setItem("agent_id", data.agent_id);
        localStorage.setItem("agent_name", data.full_name);
        
        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong with the connection");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white font-sans" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-4xl border theme-shell p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          <div className="mb-5 flex justify-end">
            <ThemeToggle />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-lg shadow-black/30">
              <Image src="/little.png" alt="Little logo" width={72} height={72} className="rounded-2xl" priority />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#c4b5fd]">Little</p>
            <h1 className="text-4xl font-black tracking-tight text-white">Agent Portal</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-gray-300">
              Sign in to register sticker uploads and keep your field work synced with the database.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-gray-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mobile optimized</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Live database sync</span>
            </div>

            <InstallToPhone />
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Agent ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition-all placeholder:text-gray-500 focus:border-[#8b5cf6] focus:bg-black/30"
                placeholder="e.g. little001"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 pl-4 pr-12 text-white outline-none transition-all placeholder:text-gray-500 focus:border-[#8b5cf6] focus:bg-black/30"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-2xl px-4 text-gray-400 transition-colors hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl theme-button py-4 font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Login to Little"}</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}