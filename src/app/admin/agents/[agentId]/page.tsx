"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

type AgentRow = {
  id?: string;
  agent_id?: string;
  agent_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  region?: string;
};

type StickerUpload = {
  id?: string | number;
  agent_id?: string;
  agent_name?: string;
  plate_number?: string;
  driver_name?: string;
  driver_phone?: string;
  image_url?: string;
  created_at?: string;
};

export default function AgentDetailsPage() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();
  const agentKey = useMemo(() => decodeURIComponent(params?.agentId || ""), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [uploads, setUploads] = useState<StickerUpload[]>([]);

  useEffect(() => {
    if (localStorage.getItem("is_admin") !== "true") {
      router.push("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const byAgentId = await supabase.from("agents").select("*").eq("agent_id", agentKey).maybeSingle();
      const agentResult = byAgentId.error ? await supabase.from("agents").select("*").eq("id", agentKey).maybeSingle() : byAgentId;

      if (agentResult.error) {
        setError(agentResult.error.message);
        setLoading(false);
        return;
      }

      const foundAgent = (agentResult.data as AgentRow | null) || null;
      setAgent(foundAgent);

      const lookupKey = foundAgent?.agent_id || foundAgent?.id || agentKey;
      const uploadsResult = await supabase
        .from("sticker_uploads")
        .select("id, agent_id, agent_name, plate_number, driver_name, driver_phone, image_url, created_at")
        .eq("agent_id", lookupKey)
        .order("created_at", { ascending: false })
        .limit(200);

      if (uploadsResult.error) {
        setError(uploadsResult.error.message);
        setLoading(false);
        return;
      }

      setUploads((uploadsResult.data as StickerUpload[]) || []);
      setLoading(false);
    };

    load();
  }, [agentKey, router]);

  return (
    <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border theme-shell p-4 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-2 inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-200 sm:py-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Agent Detail</p>
            <h1 className="text-xl font-bold sm:text-2xl">{agent?.agent_name || agent?.name || agentKey}</h1>
          </div>
          <Image src="/little.png" alt="Little logo" width={48} height={48} className="rounded-xl border border-white/10 bg-white/10 p-1" priority />
        </div>

        {loading ? (
          <div className="rounded-3xl border theme-shell p-6 text-gray-400">Loading agent information...</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-3xl border theme-shell p-4 sm:p-5 md:col-span-1">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Agent Info</p>
                <div className="mt-4 space-y-2 text-sm text-gray-200">
                  <p><span className="text-gray-400">Name:</span> {agent?.agent_name || agent?.name || '-'}</p>
                  <p><span className="text-gray-400">Agent ID:</span> {agent?.agent_id || agent?.id || '-'}</p>
                  <p><span className="text-gray-400">Email:</span> {agent?.email || '-'}</p>
                  <p><span className="text-gray-400">Phone:</span> {agent?.phone || '-'}</p>
                  <p><span className="text-gray-400">Role:</span> {agent?.role || '-'}</p>
                  <p><span className="text-gray-400">Region:</span> {agent?.region || '-'}</p>
                </div>
              </div>

              <div className="rounded-3xl border theme-shell p-4 sm:p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Uploads</p>
                <p className="mt-2 text-sm text-gray-300">Showing records linked to this agent.</p>

                {uploads.length === 0 ? (
                  <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-gray-500">
                    <div className="text-center">
                      <ImageIcon size={36} className="mx-auto mb-2 opacity-20" />
                      <p>No uploads found for this agent</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-3 md:hidden">
                      {uploads.map((upload) => (
                        <div key={String(upload.id)} className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            {upload.image_url ? (
                              <a href={upload.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <img
                                  src={upload.image_url}
                                  alt={upload.plate_number || "upload"}
                                  className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                <ImageIcon size={18} className="text-gray-500" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Code</p>
                              <p className="text-base font-semibold text-white sm:text-lg">{upload.plate_number || '-'}</p>
                              <p className="mt-1 text-sm text-gray-300">Driver: {upload.driver_name || '-'}</p>
                              <p className="text-sm text-gray-400">Phone: {upload.driver_phone || '-'}</p>
                              <p className="mt-1 text-xs text-gray-500">{upload.created_at ? new Date(upload.created_at).toLocaleString() : '-'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
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
                          {uploads.map((upload) => (
                            <tr key={String(upload.id)} className="border-t border-white/10 transition-colors hover:bg-white/5">
                              <td className="px-4 py-4 text-gray-200">{agent?.agent_name || agent?.name || agentKey}</td>
                              <td className="px-4 py-4 font-medium text-white">{upload.plate_number || '-'}</td>
                              <td className="px-4 py-4 text-gray-200">{upload.driver_name || '-'}</td>
                              <td className="px-4 py-4 text-gray-300">{upload.driver_phone || '-'}</td>
                              <td className="px-4 py-4 text-gray-300">{upload.created_at ? new Date(upload.created_at).toLocaleString() : '-'}</td>
                              <td className="px-4 py-4">
                                {upload.image_url ? (
                                  <a href={upload.image_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                                    <img
                                      src={upload.image_url}
                                      alt={upload.plate_number || "upload"}
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
          </>
        )}
      </div>
    </main>
  );
}
