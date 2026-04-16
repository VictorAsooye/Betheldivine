"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Folder {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  profiles?: { full_name?: string };
}

interface Doc {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  uploader_id: string;
  folder_id: string | null;
  profiles?: { full_name?: string };
}

const CATEGORIES = ["Employee Form", "Client Record", "Compliance", "License", "Other"];

function fileIcon(mime: string | null) {
  if (!mime) return "📄";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word")) return "📘";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface DocumentsPageProps {
  role: "admin" | "owner" | "employee" | "client";
}

export default function DocumentsPage({ role }: DocumentsPageProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null); // null = root view

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // New folder state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const canManageFolders = role === "admin" || role === "owner";
  const canDelete = role === "admin" || role === "owner";

  // ── Fetch ────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [fRes, dRes] = await Promise.all([
        fetch("/api/documents/folders"),
        currentFolder
          ? fetch(`/api/documents?folder_id=${currentFolder.id}`)
          : fetch("/api/documents?unorganized=1"),
      ]);
      const [fData, dData] = await Promise.all([fRes.json(), dRes.json()]);
      if (!fRes.ok) throw new Error(fData.error ?? "Failed to load folders");
      if (!dRes.ok) throw new Error(dData.error ?? "Failed to load documents");
      setFolders(Array.isArray(fData) ? fData : []);
      setDocs(Array.isArray(dData) ? dData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [currentFolder]);

  // ── Create folder ────────────────────────────────────────
  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    setCreatingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch("/api/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, description: folderDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderName("");
      setFolderDesc("");
      setShowNewFolder(false);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  // ── Delete folder ────────────────────────────────────────
  async function handleDeleteFolder(id: string) {
    if (!confirm("Delete this folder? Documents inside will become unorganized (not deleted).")) return;
    await fetch(`/api/documents/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (currentFolder?.id === id) setCurrentFolder(null);
  }

  // ── Upload ───────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("category", category);
    fd.append("description", description);
    if (currentFolder) fd.append("folder_id", currentFolder.id);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUploadSuccess(true);
      setSelectedFile(null);
      setDescription("");
      setCategory("Other");
      if (fileRef.current) fileRef.current.value = "";
      setShowUpload(false);
      fetchAll();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Download ─────────────────────────────────────────────
  async function handleDownload(doc: Doc) {
    const res = await fetch(`/api/documents/${doc.id}`);
    const data = await res.json();
    if (!res.ok || !data.url) return;
    const a = document.createElement("a");
    a.href = data.url;
    a.download = data.file_name;
    a.target = "_blank";
    a.click();
  }

  // ── Delete doc ───────────────────────────────────────────
  async function handleDeleteDoc(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload and manage forms, records, and files"
      />

      <div className="p-8">
        {uploadSuccess && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-sans font-semibold flex items-center justify-between"
            style={{ backgroundColor: "#f0faf5", border: "1px solid #a7dfc4", color: "#2d8a5e" }}>
            ✓ Document uploaded successfully.
            <button onClick={() => setUploadSuccess(false)} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setCurrentFolder(null)}
            className="text-sm font-semibold font-sans"
            style={{ color: currentFolder ? "#1a6b7c" : "#1a2e4a" }}
          >
            All Documents
          </button>
          {currentFolder && (
            <>
              <span style={{ color: "#8e9ab0" }}>/</span>
              <span className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* ── Root view: show folders + unorganized docs ── */}
        {!currentFolder && (
          <>
            {/* Folder grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Libraries</h2>
                {canManageFolders && (
                  <button
                    onClick={() => setShowNewFolder(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg border"
                    style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    New Library
                  </button>
                )}
              </div>

              {/* New folder form */}
              {showNewFolder && (
                <form onSubmit={handleCreateFolder} className="bg-white rounded-xl border p-5 mb-4 max-w-sm" style={{ borderColor: "#dce2ec" }}>
                  <p className="text-sm font-semibold font-sans mb-3" style={{ color: "#1a2e4a" }}>New Library</p>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Library name"
                    required
                    className="w-full px-3 py-2 rounded-lg border text-sm font-sans outline-none mb-2"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
                  />
                  <input
                    type="text"
                    value={folderDesc}
                    onChange={(e) => setFolderDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-sans outline-none mb-3"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
                  />
                  {folderError && <p className="text-xs font-sans mb-2" style={{ color: "#c0392b" }}>{folderError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={creatingFolder}
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-50"
                      style={{ backgroundColor: "#1a2e4a" }}>
                      {creatingFolder ? "Creating…" : "Create"}
                    </button>
                    <button type="button" onClick={() => { setShowNewFolder(false); setFolderName(""); setFolderDesc(""); }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold font-sans"
                      style={{ color: "#8e9ab0" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {folders.length === 0 && !showNewFolder ? (
                <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: "#dce2ec" }}>
                  <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>No libraries yet. {canManageFolders ? "Create one to organize your documents." : ""}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {folders.map((folder) => (
                    <div key={folder.id} className="group relative bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderColor: "#dce2ec" }}
                      onClick={() => setCurrentFolder(folder)}>
                      <div className="text-3xl mb-2">📁</div>
                      <p className="text-sm font-semibold font-sans truncate" style={{ color: "#1a2e4a" }}>{folder.name}</p>
                      {folder.description && (
                        <p className="text-xs font-sans mt-0.5 truncate" style={{ color: "#8e9ab0" }}>{folder.description}</p>
                      )}
                      {canManageFolders && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded"
                          style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unorganized docs section header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Unorganized Files</h2>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "#1a2e4a", color: "#ffffff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
            </div>
          </>
        )}

        {/* ── Inside a folder ── */}
        {currentFolder && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold font-sans" style={{ color: "#1a2e4a" }}>{currentFolder.name}</h2>
              {currentFolder.description && (
                <p className="text-sm font-sans mt-0.5" style={{ color: "#8e9ab0" }}>{currentFolder.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canManageFolders && (
                <button
                  onClick={() => handleDeleteFolder(currentFolder.id)}
                  className="text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                  style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}
                >
                  Delete Library
                </button>
              )}
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "#1a2e4a", color: "#ffffff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload to Library
              </button>
            </div>
          </div>
        )}

        {/* ── Upload form ── */}
        {showUpload && (
          <div className="bg-white rounded-xl border p-6 max-w-lg mb-6" style={{ borderColor: "#dce2ec" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold font-sans" style={{ color: "#1a2e4a" }}>
                Upload to {currentFolder ? `"${currentFolder.name}"` : "Unorganized"}
              </h3>
              <button onClick={() => setShowUpload(false)} className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Cancel</button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div
                className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer"
                style={{ borderColor: selectedFile ? "#2d8a5e" : "#dce2ec", backgroundColor: selectedFile ? "#f0faf5" : "#f7f9fc" }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                {selectedFile ? (
                  <div>
                    <div className="text-2xl mb-1">{fileIcon(selectedFile.type)}</div>
                    <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{selectedFile.name}</p>
                    <p className="text-xs font-sans mt-1" style={{ color: "#8e9ab0" }}>{formatSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e9ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Click to select a file</p>
                    <p className="text-xs font-sans mt-1" style={{ color: "#8e9ab0" }}>PDF, Word, images — up to 20MB</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                  style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>
                  Description <span style={{ color: "#8e9ab0", fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. John Smith — New Employee Form"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                  style={{ borderColor: "#dce2ec", color: "#1a2e4a" }} />
              </div>
              {uploadError && <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{uploadError}</p>}
              <button type="submit" disabled={!selectedFile || uploading}
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-50"
                style={{ backgroundColor: "#1a2e4a" }}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
          </div>
        )}

        {/* ── Document list ── */}
        {loading ? (
          <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading…</p>
        ) : error ? (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
            <button onClick={fetchAll} className="text-sm font-semibold mt-2 underline" style={{ color: "#1a2e4a" }}>Retry</button>
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: "#dce2ec" }}>
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>
              {currentFolder ? "No documents in this library yet" : "No unorganized files"}
            </p>
            <p className="text-sm font-sans mt-1" style={{ color: "#8e9ab0" }}>
              Use the Upload button to add documents{currentFolder ? ` to "${currentFolder.name}"` : ""}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>File</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden sm:table-cell" style={{ color: "#8e9ab0" }}>Category</th>
                  {canDelete && <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden md:table-cell" style={{ color: "#8e9ab0" }}>Uploaded By</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden md:table-cell" style={{ color: "#8e9ab0" }}>Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr key={doc.id} style={{ borderBottom: i < docs.length - 1 ? "1px solid #dce2ec" : undefined }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{fileIcon(doc.mime_type)}</span>
                        <div>
                          <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{doc.file_name}</p>
                          {doc.description && <p className="text-xs font-sans mt-0.5" style={{ color: "#8e9ab0" }}>{doc.description}</p>}
                          {doc.file_size && <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{formatSize(doc.file_size)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-xs font-semibold font-sans px-2 py-1 rounded-full"
                        style={{ backgroundColor: "#f7f9fc", color: "#1a2e4a", border: "1px solid #dce2ec" }}>
                        {doc.category ?? "Other"}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="px-5 py-4 text-sm font-sans hidden md:table-cell" style={{ color: "#8e9ab0" }}>
                        {doc.profiles?.full_name ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm font-sans hidden md:table-cell" style={{ color: "#8e9ab0" }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleDownload(doc)}
                          className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border"
                          style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}>
                          Download
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDeleteDoc(doc.id)}
                            className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg"
                            style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
