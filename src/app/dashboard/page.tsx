"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Image as ImageIcon, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

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
    <main className="min-h-screen bg-[#050505] text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold">Welcome, <span className="text-[#8b5cf6]">{agentName}</span></h1>
          <p className="text-gray-500 text-sm">Aride Agent Dashboard</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <LogOut size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Main Action Card (Bento Style) */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <button 
          onClick={() => router.push("/dashboard/upload")}
          className="md:col-span-2 glass-card p-8 flex flex-col items-center justify-center border border-[#8b5cf6]/30 hover:border-[#8b5cf6] transition-all bg-[#8b5cf6]/5 group rounded-3xl"
        >
          <div className="w-16 h-16 bg-[#8b5cf6] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-purple-500/40 group-hover:scale-110 transition-transform">
            <Plus size={32} strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold">New Sticker Upload</h2>
          <p className="text-gray-400 text-sm mt-2">Register a new vehicle sticker</p>
        </button>

        <div className="glass-card p-6 border border-white/10 rounded-3xl flex flex-col justify-center">
          <p className="text-gray-500 text-sm mb-1">Total Uploads</p>
          <p className="text-4xl font-bold text-white">{totalUploads}</p>
          <div className="mt-4 flex items-center text-xs text-green-400">
            <CheckCircle size={14} className="mr-1" />
            <span>Syncing live with database</span>
          </div>
        </div>

        {/* Recent History Placeholder */}
        <div className="md:col-span-3 glass-card p-6 border border-white/5 bg-white/2 rounded-3xl">
          <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>

          {loadingUploads ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
              <p>Loading recent uploads...</p>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center justify-center py-10 text-red-400 border-2 border-dashed border-red-500/20 rounded-2xl">
              <p>Could not load uploads</p>
              <p className="text-xs mt-1 text-red-300/80">{uploadError}</p>
            </div>
          ) : recentUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-600 border-2 border-dashed border-white/5 rounded-2xl">
              <ImageIcon size={40} className="mb-2 opacity-20" />
              <p>No stickers uploaded yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {recentUploads.map((upload) => (
                  <div
                    key={String(upload.id ?? `${upload.plate_number}-${upload.driver_name}`)}
                    className="rounded-2xl border border-white/10 bg-white/3 p-4"
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
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Code</p>
                        <p className="font-semibold text-white text-lg">{formatPlateForDisplay(upload.plate_number)}</p>
                        <p className="text-sm text-gray-400 mt-1">{upload.driver_name || "Unknown Driver"}</p>
                        <p className="text-sm text-gray-300">{upload.driver_phone || "-"}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {upload.created_at ? `Uploaded: ${new Date(upload.created_at).toLocaleString()}` : "Uploaded: -"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-180 text-sm">
                <thead className="bg-white/5 text-gray-300">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Driver Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold">Uploaded</th>
                    <th className="text-left px-4 py-3 font-semibold">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploads.map((upload) => (
                    <tr key={String(upload.id ?? `${upload.plate_number}-${upload.driver_name}`)} className="border-t border-white/10">
                      <td className="px-4 py-3 text-white font-medium">{formatPlateForDisplay(upload.plate_number)}</td>
                      <td className="px-4 py-3 text-gray-200">{upload.driver_name || "Unknown Driver"}</td>
                      <td className="px-4 py-3 text-gray-300">{upload.driver_phone || "-"}</td>
                      <td className="px-4 py-3 text-gray-300">{upload.created_at ? new Date(upload.created_at).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">
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
                              className="w-12 h-12 rounded-lg object-cover border border-white/10 hover:border-[#8b5cf6] transition-colors"
                            />
                          </a>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
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