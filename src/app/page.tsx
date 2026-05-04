"use client";
import { useState } from "react";
// Using relative path to avoid "Module not found" errors
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
    <main className="min-h-screen flex items-center justify-center bg-[#050505] p-4 font-sans">
      <div className="glass-card p-8 w-full max-w-md purple-glow border border-[#8b5cf6]/20 bg-white/5 backdrop-blur-xl rounded-2xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">ARIDE</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Agent Sticker Portal</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Agent ID</label>
            <input 
              type="text" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#8b5cf6] outline-none transition-all placeholder:text-gray-600"
              placeholder="e.g. aride001"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#8b5cf6] outline-none transition-all placeholder:text-gray-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}