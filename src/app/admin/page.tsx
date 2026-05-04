"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Image as ImageIcon, ShieldCheck, Users, Pencil, Trash2, X, Save, Menu } from "lucide-react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { ThemeToggle } from "../../components/theme-toggle";

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

type EditForm = {
  id: string;
  agent_id: string;
  agent_name: string;
  plate_number: string;
  driver_name: string;
  driver_phone: string;
  image_url: string;
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
  const [adminName, setAdminName] = useState("Mr Beka Melese");
  const [totalUploads, setTotalUploads] = useState(0);
  const [rows, setRows] = useState<StickerUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const router = useRouter();

  const fetchAllUploads = async () => {
    setLoading(true);
    setError(null);

    const { count, error: countError } = await supabase
      .from("sticker_uploads")
      .select("id", { count: "exact", head: true });

    if (countError) {
      setError(countError.message);
      setLoading(false);
      return;
    }

    const { data, error: dataError } = await supabase
      .from("sticker_uploads")
      .select("id, agent_id, agent_name, plate_number, driver_name, driver_phone, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (dataError) {
      setError(dataError.message);
      setLoading(false);
      return;
    }

    setTotalUploads(count || 0);
    setRows((data as StickerUpload[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (localStorage.getItem("is_admin") !== "true") {
      router.push("/");
      return;
    }

    setAdminName(localStorage.getItem("admin_name") || "Mr Beka Melese");

    fetchAllUploads();
  }, [router]);

  const openEdit = (row: StickerUpload) => {
    setEditForm({
      id: String(row.id || ""),
      agent_id: row.agent_id || "",
      agent_name: row.agent_name || "",
      plate_number: row.plate_number || "",
      driver_name: row.driver_name || "",
      driver_phone: row.driver_phone || "",
      image_url: row.image_url || "",
    });
  };

  const handleUpdate = async () => {
    if (!editForm) return;

    const requiredFields = [
      editForm.agent_id,
      editForm.agent_name,
      editForm.plate_number,
      editForm.driver_name,
      editForm.driver_phone,
      editForm.image_url,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      alert("Please fill all fields before updating.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const resp = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          changes: {
            agent_id: editForm.agent_id.trim(),
            agent_name: editForm.agent_name.trim(),
            plate_number: editForm.plate_number.trim(),
            driver_name: editForm.driver_name.trim(),
            driver_phone: editForm.driver_phone.trim(),
            image_url: editForm.image_url.trim(),
          },
        }),
      });

      const result = await resp.json();
      console.log('Server update response', resp.status, result);

      if (!resp.ok) {
        alert(`Update failed: ${result?.error || 'server error'}`);
        setSaving(false);
        return;
      }

      const updatedRows = result?.data;
      if (!updatedRows || (Array.isArray(updatedRows) && updatedRows.length === 0)) {
        setStatusMessage('Update completed but returned no rows from server.');
        setSaving(false);
        return;
      }

      setEditForm(null);
      setSaving(false);
      setStatusMessage('Upload updated successfully. Reloading latest data...');
      await fetchAllUploads();
    } catch (err: any) {
      alert(`Update failed: ${String(err)}`);
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Delete this upload permanently?");
    if (!confirmDelete) return;
    setDeletingId(id);

    try {
      const resp = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await resp.json();
      console.log('Server delete response', resp.status, result);

      if (!resp.ok) {
        alert(`Delete failed: ${result?.error || 'server error'}`);
        setDeletingId(null);
        return;
      }

      setRows((currentRows) => currentRows.filter((row) => String(row.id) !== id));
      setTotalUploads((current) => Math.max(0, current - 1));
      setDeletingId(null);
      setStatusMessage('Upload deleted successfully.');
    } catch (err: any) {
      alert(`Delete failed: ${String(err)}`);
      setDeletingId(null);
    }
  };

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
              <button
                onClick={() => setShowAgentsModal((s) => !s)}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 text-gray-300 hover:border-white/20"
                title="Menu"
              >
                <Menu size={18} />
              </button>
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

          {/* Agents dropdown (simple) */}
          {showAgentsModal && (
            <div className="fixed left-4 top-20 z-40 w-72 rounded-2xl border theme-shell bg-black/70 p-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Menu</h4>
                <button onClick={() => setShowAgentsModal(false)} className="p-1 rounded">
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3">
                <button
                  onClick={async () => {
                    setAgentsLoading(true);
                    setSelectedAgent(null);
                    try {
                      const { data, error } = await supabase.from('agents').select('*').limit(200);
                      if (error) {
                        alert(`Failed to load agents: ${error.message}`);
                        setAgents([]);
                      } else {
                        setAgents((data as any[]) || []);
                      }
                    } catch (err: any) {
                      alert(String(err));
                      setAgents([]);
                    } finally {
                      setAgentsLoading(false);
                      // open the full modal viewer
                      setShowAgentsModal(false);
                      // show detailed modal
                      setTimeout(() => setShowAgentsModal(true), 120);
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-200"
                >
                  Agents
                </button>
              </div>
            </div>
          )}

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

        {statusMessage && (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {statusMessage}
          </div>
        )}

        {/* Agents list modal */}
        {showAgentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-3xl border theme-shell p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">Agents</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAgents([]);
                      setSelectedAgent(null);
                      setShowAgentsModal(false);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300"
                    aria-label="Close agents"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="col-span-1 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Agent list</p>
                    <button
                      onClick={async () => {
                        setAgentsLoading(true);
                        try {
                          const { data, error } = await supabase.from('agents').select('*').limit(200);
                          if (error) {
                            alert(`Failed to load agents: ${error.message}`);
                            setAgents([]);
                          } else {
                            setAgents((data as any[]) || []);
                          }
                        } catch (err: any) {
                          alert(String(err));
                        } finally {
                          setAgentsLoading(false);
                        }
                      }}
                      className="text-xs text-gray-300"
                    >
                      Refresh
                    </button>
                  </div>

                  {agentsLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : agents.length === 0 ? (
                    <p className="text-sm text-gray-400">No agents found</p>
                  ) : (
                    <ul className="space-y-2">
                      {agents.map((a) => (
                        <li key={String(a.id)}>
                          <button
                            onClick={() => setSelectedAgent(a)}
                            className="w-full text-left rounded-md px-2 py-2 hover:bg-white/5"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white">{a.agent_name || a.name || a.agent_id}</p>
                                <p className="text-xs text-gray-400">{a.agent_id || '-'}</p>
                              </div>
                              <div className="text-xs text-gray-400">{a.email || ''}</div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 p-4">
                  {selectedAgent ? (
                    <div>
                      <h4 className="text-lg font-semibold">{selectedAgent.agent_name || selectedAgent.name || selectedAgent.agent_id}</h4>
                      <p className="text-sm text-gray-400 mt-1">ID: {selectedAgent.agent_id || selectedAgent.id}</p>
                      {selectedAgent.email && <p className="text-sm text-gray-300 mt-2">Email: {selectedAgent.email}</p>}
                      {selectedAgent.phone && <p className="text-sm text-gray-300 mt-1">Phone: {selectedAgent.phone}</p>}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => {
                            // open a simple edit modal pre-filled with selected agent? For now keep read-only
                            alert('Agent editing not implemented yet.');
                          }}
                          className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm text-sky-200"
                        >
                          Edit Agent
                        </button>
                        <button
                          onClick={() => setSelectedAgent(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200"
                        >
                          Back to list
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Select an agent to see details</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                        <p className="text-xs text-gray-500">ID: {row.agent_id || "-"}</p>
                        <p className="mt-1 text-lg font-bold text-white">{formatPlateForDisplay(row.plate_number)}</p>
                        <p className="text-sm text-gray-300">{row.driver_name || "Unknown Driver"}</p>
                        <p className="text-sm text-gray-400">{row.driver_phone || "-"}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {row.created_at ? `Uploaded: ${new Date(row.created_at).toLocaleString()}` : "Uploaded: -"}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(String(row.id || ""))}
                            disabled={deletingId === String(row.id || "")}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                          >
                            <Trash2 size={12} /> {deletingId === String(row.id || "") ? "Deleting..." : "Delete"}
                          </button>
                        </div>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={String(row.id)} className="border-t border-white/10 transition-colors hover:bg-white/5">
                        <td className="px-4 py-4 text-gray-200">
                          <p>{row.agent_name || "Unknown Agent"}</p>
                          <p className="text-xs text-gray-500">{row.agent_id || "-"}</p>
                        </td>
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
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(String(row.id || ""))}
                              disabled={deletingId === String(row.id || "")}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                            >
                              <Trash2 size={12} /> {deletingId === String(row.id || "") ? "Deleting..." : "Delete"}
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

        {editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-3xl border theme-shell p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">Update Upload Record</h3>
                <button
                  onClick={() => setEditForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300"
                  aria-label="Close editor"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                Editing record for <span className="font-semibold text-white">{editForm.driver_name || "Unknown Driver"}</span>
                {editForm.plate_number ? (
                  <span> with plate <span className="font-semibold text-white">{formatPlateForDisplay(editForm.plate_number)}</span></span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Agent ID</span>
                  <input
                    value={editForm.agent_id}
                    onChange={(e) => setEditForm({ ...editForm, agent_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Agent ID"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Agent Name</span>
                  <input
                    value={editForm.agent_name}
                    onChange={(e) => setEditForm({ ...editForm, agent_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Agent Name"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Plate Number</span>
                  <input
                    value={editForm.plate_number}
                    onChange={(e) => setEditForm({ ...editForm, plate_number: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Plate Number"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Driver Name</span>
                  <input
                    value={editForm.driver_name}
                    onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Driver Name"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Driver Phone</span>
                  <input
                    value={editForm.driver_phone}
                    onChange={(e) => setEditForm({ ...editForm, driver_phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Driver Phone"
                  />
                </label>
                <label className="space-y-1 text-sm text-gray-300">
                  <span className="block text-xs uppercase tracking-[0.25em] text-gray-500">Image URL</span>
                  <input
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="Image URL"
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditForm(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm text-sky-200 disabled:opacity-60"
                >
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
