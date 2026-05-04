"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Image as ImageIcon, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { ThemeToggle } from "../../components/theme-toggle";

type StickerUpload = {
  id?: string | number;
  agent_name?: string;
  plate_number?: string;
  driver_name?: string;
  driver_phone?: string;
  image_url?: string;
  created_at?: string;
};

const formatPlateForDisplay = (plate?: string) => {
  if (!plate) return "Unknown Plate";

  const compact = plate.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const match = compact.match(/^(01|03)([ABC]?)(\d{5})$/);
  if (!match) return plate;

  const [, region, series, digits] = match;
  return `${region}${series ? ` ${series}` : ""} ${digits}`;
};

export default function AdminDashboardPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [totalUploads, setTotalUploads] = useState(0);
  const [rows, setRows] = useState<StickerUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    if (localStorage.getItem("is_admin") !== "true") {
      router.push("/");
      return;
    }

    setAdminName(localStorage.getItem("admin_name") || "Beka");

    const fetchAllUploads = async () => {
      setLoading(true);
      setError(null);

      const { count, error: countError } = await supabase
        .from("sticker_uploads")
        .select("id", { count: "exact", head: true });

      if (countError) {
        if (mounted) {
          setError(countError.message);
          setLoading(false);
        }
        return;
      }

      const { data, error: dataError } = await supabase
        .from("sticker_uploads")
        .select("id, agent_name, plate_number, driver_name, driver_phone, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (dataError) {
        if (mounted) {
          setError(dataError.message);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setTotalUploads(count || 0);
        setRows((data as StickerUpload[]) || []);
        setLoading(false);
      }
    };

    fetchAllUploads();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("is_admin");
    localStorage.removeItem("admin_name");
    router.push("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-4xl border theme-shell p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-5">
          <div className="flex items-center gap-3">
            <Image src="/little.png" alt="Little logo" width={48} height={48} className="rounded-xl border border-white/10 bg-white/10 p-1" priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Admin</p>
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">Welcome, {adminName}</h1>
              <p className="text-xs text-gray-400 sm:text-sm">Little control center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-4xl border theme-shell p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total Uploads</p>
            <p className="mt-3 text-4xl font-black text-white">{totalUploads}</p>
          </div>
          <div className="rounded-4xl border theme-shell p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Visibility</p>
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldCheck size={18} className="text-emerald-400" /> All agents
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
              <Users size={14} /> Showing latest 100 uploads
            </p>
          </div>
        </div>

        <div className="rounded-4xl border theme-shell p-4 shadow-2xl shadow-black/25 backdrop-blur-2xl sm:p-6">
          <h2 className="mb-4 text-xl font-bold">All Uploads</h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-12 text-gray-500">
              <p>Loading uploads...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-500/20 py-12 text-red-400">
              <p>Could not load uploads</p>
              <p className="mt-1 text-xs text-red-300/80">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-12 text-gray-600">
              <ImageIcon size={40} className="mb-2 opacity-20" />
              <p>No uploads yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rows.map((row) => (
                  <div key={String(row.id)} className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/10">
                    <div className="flex items-start gap-3">
                      {row.image_url ? (
                        <a href={row.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Open full photo">
                          <img
                            src={row.image_url}
                            alt={`Sticker ${row.plate_number || "upload"}`}
                            className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                          <ImageIcon size={18} className="text-gray-500" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Agent</p>
                        <p className="text-sm text-gray-300">{row.agent_name || "Unknown Agent"}</p>
                        <p className="mt-1 text-lg font-bold text-white">{formatPlateForDisplay(row.plate_number)}</p>
                        <p className="text-sm text-gray-300">{row.driver_name || "Unknown Driver"}</p>
                        <p className="text-sm text-gray-400">{row.driver_phone || "-"}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {row.created_at ? `Uploaded: ${new Date(row.created_at).toLocaleString()}` : "Uploaded: -"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-3xl border border-white/10 md:block">
                <table className="w-full min-w-180 text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Agent</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Driver</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Uploaded</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={String(row.id)} className="border-t border-white/10 transition-colors hover:bg-white/5">
                        <td className="px-4 py-4 text-gray-200">{row.agent_name || "Unknown Agent"}</td>
                        <td className="px-4 py-4 font-medium text-white">{formatPlateForDisplay(row.plate_number)}</td>
                        <td className="px-4 py-4 text-gray-200">{row.driver_name || "Unknown Driver"}</td>
                        <td className="px-4 py-4 text-gray-300">{row.driver_phone || "-"}</td>
                        <td className="px-4 py-4 text-gray-300">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                        <td className="px-4 py-4">
                          {row.image_url ? (
                            <a href={row.image_url} target="_blank" rel="noopener noreferrer" className="inline-block" title="Open full photo">
                              <img
                                src={row.image_url}
                                alt={`Sticker ${row.plate_number || "upload"}`}
                                className="h-12 w-12 rounded-xl border border-white/10 object-cover transition-colors hover:border-sky-400"
                              />
                            </a>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                              <ImageIcon size={16} className="text-gray-500" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
