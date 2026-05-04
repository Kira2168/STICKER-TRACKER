"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Image as ImageIcon, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Image from "next/image";
import { ThemeToggle } from "../../components/theme-toggle";

type StickerUpload = {
  id?: string | number;
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

export default function Dashboard() {
  const [agentName, setAgentName] = useState("");
  const [totalUploads, setTotalUploads] = useState(0);
  const [recentUploads, setRecentUploads] = useState<StickerUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Get the name we saved during login
    const name = localStorage.getItem("agent_name");
    const agentId = localStorage.getItem("agent_id");

    if (!name) {
      router.push("/"); // Send back to login if not logged in
      return;
    }

    setAgentName(name);

    const fetchUploads = async () => {
      if (!agentId) {
        if (isMounted) {
          setLoadingUploads(false);
          setUploadError("Agent session missing. Please log in again.");
        }
        return;
      }

      setLoadingUploads(true);
      setUploadError(null);

      const { count, error: countError } = await supabase
        .from("sticker_uploads")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agentId);

      if (countError) {
        if (isMounted) {
          setUploadError(countError.message);
          setLoadingUploads(false);
        }
        return;
      }

      // Prefer newest-first using created_at. Fall back when that column is unavailable.
      const recentWithCreatedAt = await supabase
        .from("sticker_uploads")
        .select("id, plate_number, driver_name, driver_phone, image_url, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(5);

      let recentData: StickerUpload[] = [];
      let recentError: string | null = null;

      if (recentWithCreatedAt.error) {
        const recentFallback = await supabase
          .from("sticker_uploads")
          .select("id, plate_number, driver_name, driver_phone, image_url")
          .eq("agent_id", agentId)
          .limit(5);

        recentData = (recentFallback.data as StickerUpload[]) || [];
        recentError = recentFallback.error?.message || null;
      } else {
        recentData = (recentWithCreatedAt.data as StickerUpload[]) || [];
      }

      if (recentError) {
        if (isMounted) {
          setUploadError(recentError);
          setLoadingUploads(false);
        }
        return;
      }

      if (isMounted) {
        setTotalUploads(count || 0);
        setRecentUploads(recentData);
        setLoadingUploads(false);
      }
    };

    fetchUploads();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#8b5cf6]/15 blur-3xl" />
        <div className="absolute right-0 top-32 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-4xl border theme-shell p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-5">
          <div className="flex items-center gap-3">
            <Image src="/little.png" alt="Little logo" width={48} height={48} className="rounded-xl border border-white/10 bg-white/10 p-1" priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4b5fd]">Little</p>
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">Welcome, <span className="text-[#c4b5fd]">{agentName}</span></h1>
              <p className="text-xs text-gray-400 sm:text-sm">Field sticker operations dashboard</p>
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

        {/* Main Action Card (Bento Style) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
          <button
            onClick={() => router.push("/dashboard/upload")}
            className="group md:col-span-2 rounded-4xl border border-[#8b5cf6]/25 bg-linear-to-br from-[#8b5cf6]/15 via-white/5 to-cyan-400/10 p-6 text-left shadow-2xl shadow-black/20 transition-all hover:-translate-y-1 hover:border-[#8b5cf6]/50 hover:shadow-[#8b5cf6]/10 sm:p-8"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br from-[#8b5cf6] to-[#a855f7] shadow-lg shadow-[#8b5cf6]/30 transition-transform group-hover:scale-105">
              <Plus size={30} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">New Sticker Upload</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-gray-300 sm:text-base">Register a new vehicle sticker in a few taps and sync it instantly to the dashboard.</p>
          </button>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-4xl border theme-shell p-6 backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total Uploads</p>
              <p className="mt-3 text-4xl font-black text-white">{totalUploads}</p>
              <div className="mt-4 flex items-center text-xs text-emerald-400">
                <CheckCircle size={14} className="mr-1" />
                <span>Syncing live with database</span>
              </div>
            </div>

            <div className="rounded-4xl border theme-shell p-6 backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Status</p>
              <p className="mt-3 text-lg font-semibold text-white">Ready for mobile capture</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">Open the upload flow, capture a sticker, and confirm it appears in recent submissions.</p>
            </div>
          </div>

        </div>

        {/* Recent History Placeholder */}
        <div className="rounded-4xl border theme-shell p-4 shadow-2xl shadow-black/25 backdrop-blur-2xl sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4b5fd]">Recent</p>
              <h3 className="mt-1 text-xl font-bold">Submissions</h3>
            </div>
            <p className="text-xs text-gray-400">Latest 5 uploads</p>
          </div>

          {loadingUploads ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-12 text-gray-500">
              <p>Loading recent uploads...</p>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-500/20 py-12 text-red-400">
              <p>Could not load uploads</p>
              <p className="text-xs mt-1 text-red-300/80">{uploadError}</p>
            </div>
          ) : recentUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-12 text-gray-600">
              <ImageIcon size={40} className="mb-2 opacity-20" />
              <p>No stickers uploaded yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {recentUploads.map((upload) => (
                  <div
                    key={String(upload.id ?? `${upload.plate_number}-${upload.driver_name}`)}
                    className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/10"
                  >
                    <div className="flex items-start gap-3">
                      {upload.image_url ? (
                        <a
                          href={upload.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                          title="Open full photo"
                        >
                          <img
                            src={upload.image_url}
                            alt={`Sticker ${upload.plate_number || "upload"}`}
                            className="w-16 h-16 rounded-xl object-cover border border-white/10"
                          />
                        </a>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <ImageIcon size={18} className="text-gray-500" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-1">Code</p>
                        <p className="text-lg font-bold text-white">{formatPlateForDisplay(upload.plate_number)}</p>
                        <p className="mt-1 text-sm text-gray-300">{upload.driver_name || "Unknown Driver"}</p>
                        <p className="text-sm text-gray-400">{upload.driver_phone || "-"}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {upload.created_at ? `Uploaded: ${new Date(upload.created_at).toLocaleString()}` : "Uploaded: -"}
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
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-xs">Code</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-xs">Driver Name</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-xs">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-xs">Uploaded</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-xs">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploads.map((upload) => (
                    <tr key={String(upload.id ?? `${upload.plate_number}-${upload.driver_name}`)} className="border-t border-white/10 transition-colors hover:bg-white/5">
                      <td className="px-4 py-4 font-medium text-white">{formatPlateForDisplay(upload.plate_number)}</td>
                      <td className="px-4 py-4 text-gray-200">{upload.driver_name || "Unknown Driver"}</td>
                      <td className="px-4 py-4 text-gray-300">{upload.driver_phone || "-"}</td>
                      <td className="px-4 py-4 text-gray-300">{upload.created_at ? new Date(upload.created_at).toLocaleString() : "-"}</td>
                      <td className="px-4 py-4">
                        {upload.image_url ? (
                          <a
                            href={upload.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                            title="Open full photo"
                          >
                            <img
                              src={upload.image_url}
                              alt={`Sticker ${upload.plate_number || "upload"}`}
                              className="h-12 w-12 rounded-xl object-cover border border-white/10 transition-colors hover:border-[#8b5cf6] hover:scale-[1.02]"
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