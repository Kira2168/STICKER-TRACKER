"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Image as ImageIcon, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

const canRenderRemoteImage = (url?: string) => {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

type AgentRow = {
  id?: string;
  agent_id?: string;
  full_name?: string;
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

type AgentEditForm = {
  id: string;
  agent_id: string;
  full_name: string;
};

type UploadEditForm = {
  id: string;
  agent_id: string;
  agent_name: string;
  plate_code: "01" | "03" | "";
  plate_series: "A" | "B" | "C" | "";
  plate_digits: string;
  driver_name: string;
  driver_phone: string;
  image_url: string;
};

const composePlateNumber = (code: string, series: string, digits: string) => {
  const trimmedDigits = digits.replace(/\D/g, "").slice(0, 5);
  return `${code}${series ? ` ${series}` : ""} ${trimmedDigits}`.trim();
};

export default function AgentDetailsPage() {
  const params = useParams<{ agentId: string }>();
  const router = useRouter();
  const agentKey = useMemo(() => decodeURIComponent(params?.agentId || ""), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [uploads, setUploads] = useState<StickerUpload[]>([]);
  const [editAgentForm, setEditAgentForm] = useState<AgentEditForm | null>(null);
  const [savingAgent, setSavingAgent] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [uploadEditForm, setUploadEditForm] = useState<UploadEditForm | null>(null);
  const [savingUpload, setSavingUpload] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);

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

  const parsePlateParts = (plate?: string) => {
    if (!plate) return { code: "-", series: "None", number: "-" };

    const compact = plate.toUpperCase().replace(/[^0-9A-Z]/g, "");
    const match = compact.match(/^(01|03)([ABC]?)(\d{5})$/);

    if (!match) return { code: plate, series: "None", number: "-" };

    const [, code, series, number] = match;
    return { code, series: series || "None", number };
  };

  const openAgentEdit = () => {
    if (!agent) return;
    setEditAgentForm({
      id: String(agent.id || agent.agent_id || ""),
      agent_id: agent.agent_id || "",
      full_name: agent.full_name || agent.name || agent.agent_name || "",
    });
  };

  const handleAgentUpdate = async () => {
    if (!editAgentForm) return;

    if (!editAgentForm.agent_id.trim() || !editAgentForm.full_name.trim()) {
      alert("Agent ID and name are required.");
      return;
    }

    setSavingAgent(true);
    try {
      const resp = await fetch('/api/admin/agents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editAgentForm),
      });

      const result = await resp.json();
      if (!resp.ok) {
        alert(`Update failed: ${result?.error || 'server error'}`);
        setSavingAgent(false);
        return;
      }

      const updatedAgent = result?.data?.[0] || null;
      if (updatedAgent) {
        setAgent(updatedAgent);
      }
      setEditAgentForm(null);
      setSavingAgent(false);
    } catch (err: unknown) {
      alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
      setSavingAgent(false);
    }
  };

  const handleAgentDelete = async () => {
    if (!agent) return;
    const confirmDelete = confirm("Delete this agent permanently?");
    if (!confirmDelete) return;

    setDeletingAgent(true);
    try {
      const resp = await fetch('/api/admin/agents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: agent.id || agent.agent_id }),
      });

      const result = await resp.json();
      if (!resp.ok) {
        alert(`Delete failed: ${result?.error || 'server error'}`);
        setDeletingAgent(false);
        return;
      }

      router.push('/admin');
    } catch (err: unknown) {
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingAgent(false);
    }
  };

  const openUploadEdit = (upload: StickerUpload) => {
    const plate = parsePlateParts(upload.plate_number);
    setUploadEditForm({
      id: String(upload.id || ""),
      agent_id: upload.agent_id || agent?.agent_id || "",
      agent_name: upload.agent_name || agent?.agent_name || "",
      plate_code: plate.code === "01" || plate.code === "03" ? (plate.code as "01" | "03") : "",
      plate_series: plate.series === "A" || plate.series === "B" || plate.series === "C" ? (plate.series as "A" | "B" | "C") : "",
      plate_digits: plate.number === "-" ? "" : plate.number,
      driver_name: upload.driver_name || "",
      driver_phone: upload.driver_phone || "",
      image_url: upload.image_url || "",
    });
  };

  const handleUploadUpdate = async () => {
    if (!uploadEditForm) return;

    if (!uploadEditForm.agent_id.trim() || !uploadEditForm.agent_name.trim()) {
      alert("Agent ID and name are required.");
      return;
    }

    setSavingUpload(true);
    try {
      const resp = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: uploadEditForm.id,
          changes: {
            agent_id: uploadEditForm.agent_id.trim(),
            agent_name: uploadEditForm.agent_name.trim(),
            plate_number: composePlateNumber(uploadEditForm.plate_code, uploadEditForm.plate_series, uploadEditForm.plate_digits),
            driver_name: uploadEditForm.driver_name.trim(),
            driver_phone: uploadEditForm.driver_phone.trim(),
            image_url: uploadEditForm.image_url.trim(),
          },
        }),
      });

      const result = await resp.json();
      if (!resp.ok) {
        alert(`Update failed: ${result?.error || 'server error'}`);
        setSavingUpload(false);
        return;
      }

      const updated = (result?.data && Array.isArray(result.data) ? result.data[0] : null) as StickerUpload | null;
      if (updated) {
        setUploads((cur) => cur.map((u) => (String(u.id) === String(updated.id) ? { ...u, ...updated } : u)));
      } else {
        const uploadsResult = await supabase
          .from('sticker_uploads')
          .select('id, agent_id, agent_name, plate_number, driver_name, driver_phone, image_url, created_at')
          .eq('agent_id', agent?.agent_id || agent?.id || agentKey)
          .order('created_at', { ascending: false })
          .limit(200);
        if (!uploadsResult.error) setUploads((uploadsResult.data as StickerUpload[]) || []);
      }

      setUploadEditForm(null);
    } catch (err: unknown) {
      alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingUpload(false);
    }
  };

  const handleUploadDelete = async (id: string) => {
    const confirmDelete = confirm('Delete this upload permanently?');
    if (!confirmDelete) return;
    setDeletingUploadId(id);

    try {
      const resp = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const result = await resp.json();
      if (!resp.ok) {
        alert(`Delete failed: ${result?.error || 'server error'}`);
        setDeletingUploadId(null);
        return;
      }

      setUploads((cur) => cur.filter((u) => String(u.id) !== id));
      setDeletingUploadId(null);
    } catch (err: unknown) {
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
      setDeletingUploadId(null);
    }
  };

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
            <h1 className="text-xl font-bold sm:text-2xl">{agent?.full_name || agent?.name || agent?.agent_name || agentKey}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openAgentEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={handleAgentDelete}
              disabled={deletingAgent}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-60"
            >
              <Trash2 size={14} /> {deletingAgent ? 'Deleting...' : 'Delete'}
            </button>
            <Image src="/little.png" alt="Little logo" width={48} height={48} className="rounded-xl border border-white/10 bg-white/10 p-1" priority />
          </div>
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
                  <p><span className="text-gray-400">Name:</span> {agent?.full_name || agent?.name || agent?.agent_name || agentKey}</p>
                  <p><span className="text-gray-400">Agent ID:</span> {agent?.agent_id || agent?.id || agentKey}</p>
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
                              <a href={upload.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Open full photo">
                                {canRenderRemoteImage(upload.image_url) ? (
                                  <Image
                                    src={upload.image_url}
                                    alt={upload.plate_number || "upload"}
                                    width={64}
                                    height={64}
                                    className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                                  />
                                ) : (
                                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                    <ImageIcon size={18} className="text-gray-500" />
                                  </div>
                                )}
                              </a>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                <ImageIcon size={18} className="text-gray-500" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              {(() => {
                                const plate = parsePlateParts(upload.plate_number);
                                return (
                                  <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                                      <p className="uppercase tracking-[0.2em] text-gray-500">Code</p>
                                      <p className="mt-1 font-semibold text-white">{plate.code}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                                      <p className="uppercase tracking-[0.2em] text-gray-500">Series</p>
                                      <p className="mt-1 font-semibold text-white">{plate.series}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                                      <p className="uppercase tracking-[0.2em] text-gray-500">Number</p>
                                      <p className="mt-1 font-semibold text-white">{plate.number}</p>
                                    </div>
                                  </div>
                                );
                              })()}
                              <p className="mt-1 text-sm text-gray-300">Driver: {upload.driver_name || '-'}</p>
                              <p className="text-sm text-gray-400">Phone: {upload.driver_phone || '-'}</p>
                              <p className="mt-1 text-xs text-gray-500">{upload.created_at ? new Date(upload.created_at).toLocaleString() : '-'}</p>
                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => openUploadEdit(upload)}
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => handleUploadDelete(String(upload.id || ""))}
                                  disabled={deletingUploadId === String(upload.id || "")}
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                                >
                                  <Trash2 size={12} /> {deletingUploadId === String(upload.id || "") ? "Deleting..." : "Delete"}
                                </button>
                              </div>
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
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Series</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Number</th>
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
                              {(() => {
                                const plate = parsePlateParts(upload.plate_number);
                                return (
                                  <>
                                    <td className="px-4 py-4 font-medium text-white">{plate.code}</td>
                                    <td className="px-4 py-4 text-gray-200">{plate.series}</td>
                                    <td className="px-4 py-4 text-gray-200">{plate.number}</td>
                                  </>
                                );
                              })()}
                              <td className="px-4 py-4 text-gray-200">{upload.driver_name || '-'}</td>
                              <td className="px-4 py-4 text-gray-300">{upload.driver_phone || '-'}</td>
                              <td className="px-4 py-4 text-gray-300">{upload.created_at ? new Date(upload.created_at).toLocaleString() : '-'}</td>
                              <td className="px-4 py-4">
                                {upload.image_url ? (
                                  <a href={upload.image_url} target="_blank" rel="noopener noreferrer" className="inline-block" title="Open full photo">
                                    {canRenderRemoteImage(upload.image_url) ? (
                                      <Image
                                        src={upload.image_url}
                                        alt={upload.plate_number || "upload"}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-xl border border-white/10 object-cover transition-colors hover:border-sky-400"
                                      />
                                    ) : (
                                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                        <ImageIcon size={16} className="text-gray-500" />
                                      </div>
                                    )}
                                  </a>
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                    <ImageIcon size={16} className="text-gray-500" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openUploadEdit(upload)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleUploadDelete(String(upload.id || ""))}
                                    disabled={deletingUploadId === String(upload.id || "")}
                                    className="inline-flex items-center gap-1 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                                  >
                                    <Trash2 size={12} /> {deletingUploadId === String(upload.id || "") ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
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

        {editAgentForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4">
            <div className="w-full max-w-xl rounded-t-3xl border theme-shell p-4 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold sm:text-xl">Edit Agent</h3>
                <button
                  onClick={() => setEditAgentForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300"
                  aria-label="Close editor"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Agent ID</span>
                  <input
                    value={editAgentForm.agent_id}
                    onChange={(e) => setEditAgentForm({ ...editAgentForm, agent_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Agent ID"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Full Name</span>
                  <input
                    value={editAgentForm.full_name}
                    onChange={(e) => setEditAgentForm({ ...editAgentForm, full_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Full Name"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setEditAgentForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 sm:py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAgentUpdate}
                  disabled={savingAgent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-3 text-sm text-sky-200 disabled:opacity-60 sm:py-2"
                >
                  <Save size={14} /> {savingAgent ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
        {uploadEditForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4">
            <div className="w-full max-w-2xl rounded-t-3xl border theme-shell p-4 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold sm:text-xl">Edit Upload</h3>
                <button
                  onClick={() => setUploadEditForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300"
                  aria-label="Close editor"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                Editing record for <span className="font-semibold text-white">{uploadEditForm.driver_name || 'Unknown Driver'}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Agent ID</span>
                  <input
                    value={uploadEditForm.agent_id}
                    onChange={(e) => setUploadEditForm({ ...uploadEditForm, agent_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Agent ID"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Agent Name</span>
                  <input
                    value={uploadEditForm.agent_name}
                    onChange={(e) => setUploadEditForm({ ...uploadEditForm, agent_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Agent Name"
                  />
                </label>
                <div className="space-y-1 text-sm text-gray-300 sm:col-span-2">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Plate Number</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="space-y-1 text-sm text-gray-300">
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-gray-500">Code</span>
                      <select
                        value={uploadEditForm.plate_code}
                        onChange={(e) => setUploadEditForm({ ...uploadEditForm, plate_code: e.target.value as UploadEditForm['plate_code'] })}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select</option>
                        <option value="01">01</option>
                        <option value="03">03</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm text-gray-300">
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-gray-500">Series</span>
                      <select
                        value={uploadEditForm.plate_series}
                        onChange={(e) => setUploadEditForm({ ...uploadEditForm, plate_series: e.target.value as UploadEditForm['plate_series'] })}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      >
                        <option value="">None / Optional</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm text-gray-300">
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-gray-500">Number</span>
                      <input
                        value={uploadEditForm.plate_digits}
                        onChange={(e) => setUploadEditForm({ ...uploadEditForm, plate_digits: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                        inputMode="numeric"
                        maxLength={5}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                        placeholder="12345"
                      />
                    </label>
                  </div>
                </div>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Driver Name</span>
                  <input
                    value={uploadEditForm.driver_name}
                    onChange={(e) => setUploadEditForm({ ...uploadEditForm, driver_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Driver Name"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Driver Phone</span>
                  <input
                    value={uploadEditForm.driver_phone}
                    onChange={(e) => setUploadEditForm({ ...uploadEditForm, driver_phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Driver Phone"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Image URL</span>
                  <input
                    value={uploadEditForm.image_url}
                    onChange={(e) => setUploadEditForm({ ...uploadEditForm, image_url: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Image URL"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setUploadEditForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 sm:py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadUpdate}
                  disabled={savingUpload}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-3 text-sm text-sky-200 disabled:opacity-60 sm:py-2"
                >
                  <Save size={14} /> {savingUpload ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
