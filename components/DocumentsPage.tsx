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
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);

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

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Share link state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManageFolders = role === "admin" || role === "owner";
  const canDelete = role === "admin" || role === "owner";
  const canRename = role === "admin" || role === "owner";

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

  useEffect(() => { fetchAll(); }, [currentFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open preview ─────────────────────────────────────────
  async function openPreview(doc: Doc) {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const res = await fetch(`/api/documents/${doc.id}`);
    const data = await res.json();
    if (res.ok && data.url) setPreviewUrl(data.url);
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewDoc(null);
    setPreviewUrl(null);
  }

  // ── Rename ───────────────────────────────────────────────
  function startRename(doc: Doc, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditingName(doc.file_name);
    setTimeout(() => renameRef.current?.select(), 30);
  }

  async function commitRename(docId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) { setEditingId(null); return; }
    setEditingId(null);
    setRenameError(null);
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: trimmed }),
    });
    if (res.ok) {
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, file_name: trimmed } : d));
      if (previewDoc?.id === docId) setPreviewDoc((p) => p ? { ...p, file_name: trimmed } : p);
    } else {
      const err = await res.json().catch(() => ({}));
      setRenameError(err.error ?? "Failed to rename. Please try again.");
    }
  }

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
      setFolderName(""); setFolderDesc(""); setShowNewFolder(false);
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
    setUploading(true); setUploadError(null); setUploadSuccess(false);
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
      setSelectedFile(null); setDescription(""); setCategory("Other");
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
  async function handleDownload(doc: Doc, e?: React.MouseEvent) {
    e?.stopPropagation();
    const res = await fetch(`/api/documents/${doc.id}`);
    const data = await res.json();
    if (!res.ok || !data.url) return;
    const a = document.createElement("a");
    a.href = data.url; a.download = data.file_name; a.target = "_blank"; a.click();
  }

  // ── Share — copy link to hosted viewer page ──────────────
  async function handleShare(doc: Doc, e: React.MouseEvent) {
    e.stopPropagation();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    // Use filename as the URL slug so it reads like /view/caregiver-evaluation-form?d=uuid
    const slug = doc.file_name
      .replace(/\.[^/.]+$/, "")          // strip extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")       // replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, "");          // trim leading/trailing dashes
    const url = `${base}/view/${slug || "document"}?d=${doc.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // ── Delete doc ───────────────────────────────────────────
  async function handleDeleteDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (previewDoc?.id === id) closePreview();
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Documents" subtitle="Upload and manage forms, records, and files" />

      <div className="p-8">
        {uploadSuccess && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-sans font-semibold flex items-center justify-between"
            style={{ backgroundColor: "#f0faf5", border: "1px solid #a7dfc4", color: "#2d8a5e" }}>
            ✓ Document uploaded successfully.
            <button onClick={() => setUploadSuccess(false)} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}

        {renameError && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm font-sans flex items-center justify-between"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#c0392b" }}>
            {renameError}
            <button onClick={() => setRenameError(null)} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setCurrentFolder(null)}
            className="text-sm font-semibold font-sans"
            style={{ color: currentFolder ? "#2AADAD" : "#1a2e4a" }}>
            All Documents
          </button>
          {currentFolder && (
            <>
              <span style={{ color: "#8e9ab0" }}>/</span>
              <span className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* ── Root view: folders + unorganized ── */}
        {!currentFolder && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Libraries</h2>
                {canManageFolders && (
                  <button onClick={() => setShowNewFolder(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg border"
                    style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    New Library
                  </button>
                )}
              </div>

              {showNewFolder && (
                <form onSubmit={handleCreateFolder} className="bg-white rounded-xl border p-5 mb-4 max-w-sm" style={{ borderColor: "#dce2ec" }}>
                  <p className="text-sm font-semibold font-sans mb-3" style={{ color: "#1a2e4a" }}>New Library</p>
                  <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Library name" required
                    className="w-full px-3 py-2 rounded-lg border text-sm font-sans outline-none mb-2"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }} />
                  <input type="text" value={folderDesc} onChange={(e) => setFolderDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-sans outline-none mb-3"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }} />
                  {folderError && <p className="text-xs font-sans mb-2" style={{ color: "#c0392b" }}>{folderError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={creatingFolder}
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-50"
                      style={{ backgroundColor: "#1a2e4a" }}>
                      {creatingFolder ? "Creating…" : "Create"}
                    </button>
                    <button type="button" onClick={() => { setShowNewFolder(false); setFolderName(""); setFolderDesc(""); }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold font-sans" style={{ color: "#8e9ab0" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {folders.length === 0 && !showNewFolder ? (
                <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: "#dce2ec" }}>
                  <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>
                    No libraries yet. {canManageFolders ? "Create one to organize your documents." : ""}
                  </p>
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
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded"
                          style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>Unorganized Files</h2>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "#1a2e4a", color: "#ffffff" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>
            </div>
          </>
        )}

        {/* ── Inside a folder header ── */}
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
                <button onClick={() => handleDeleteFolder(currentFolder.id)}
                  className="text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                  style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}>
                  Delete Library
                </button>
              )}
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "#1a2e4a", color: "#ffffff" }}>
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
              <div className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer"
                style={{ borderColor: selectedFile ? "#2d8a5e" : "#dce2ec", backgroundColor: selectedFile ? "#f0faf5" : "#f7f9fc" }}
                onClick={() => fileRef.current?.click()}>
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
                  <tr key={doc.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < docs.length - 1 ? "1px solid #dce2ec" : undefined }}
                    onClick={() => openPreview(doc)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{fileIcon(doc.mime_type)}</span>
                        <div className="min-w-0">
                          {/* Inline rename */}
                          {editingId === doc.id && canRename ? (
                            <input
                              ref={renameRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => commitRename(doc.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(doc.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-semibold font-sans px-1.5 py-0.5 rounded border outline-none w-full"
                              style={{ color: "#1a2e4a", borderColor: "#2AADAD", backgroundColor: "#f0fdfe" }}
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <p className="text-sm font-semibold font-sans truncate" style={{ color: "#1a2e4a" }}>{doc.file_name}</p>
                              {canRename && (
                                <button
                                  onClick={(e) => startRename(doc, e)}
                                  className="opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded"
                                  title="Rename"
                                  style={{ color: "#8e9ab0" }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                          {doc.description && <p className="text-xs font-sans mt-0.5 truncate" style={{ color: "#8e9ab0" }}>{doc.description}</p>}
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
                        {/* Share — copy 24-hour link */}
                        <button onClick={(e) => handleShare(doc, e)}
                          className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors"
                          style={copiedId === doc.id ? {
                            borderColor: "#a7dfc4", color: "#2d8a5e", backgroundColor: "#f0faf5",
                          } : {
                            borderColor: "#dce2ec", color: "#2AADAD", backgroundColor: "transparent",
                          }}>
                          {copiedId === doc.id ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              Share
                            </>
                          )}
                        </button>
                        <button onClick={(e) => handleDownload(doc, e)}
                          className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border"
                          style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}>
                          Download
                        </button>
                        {canDelete && (
                          <button onClick={(e) => handleDeleteDoc(doc.id, e)}
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

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(10,20,40,0.7)" }}
          onClick={closePreview}>
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(860px, 95vw)", height: "min(700px, 92vh)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#dce2ec" }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{fileIcon(previewDoc.mime_type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold font-sans truncate" style={{ color: "#1a2e4a" }}>{previewDoc.file_name}</p>
                  {previewDoc.file_size && (
                    <p className="text-xs font-sans" style={{ color: "#8e9ab0" }}>{formatSize(previewDoc.file_size)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={(e) => handleShare(previewDoc, e)}
                  className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg border transition-colors"
                  style={copiedId === previewDoc.id ? {
                    borderColor: "#a7dfc4", color: "#2d8a5e", backgroundColor: "#f0faf5",
                  } : {
                    borderColor: "#dce2ec", color: "#2AADAD",
                  }}>
                  {copiedId === previewDoc.id ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Share
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => handleDownload(previewDoc, e)}
                  className="flex items-center gap-1.5 text-sm font-semibold font-sans px-3 py-1.5 rounded-lg border"
                  style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
                <button onClick={closePreview}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: "#8e9ab0" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>

            {/* Preview body */}
            <div className="flex-1 overflow-hidden bg-gray-50 relative">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2AADAD" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading preview…</p>
                  </div>
                </div>
              )}

              {!previewLoading && previewUrl && previewDoc.mime_type === "application/pdf" && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  style={{ border: "none" }}
                  title={previewDoc.file_name}
                />
              )}

              {!previewLoading && previewUrl && previewDoc.mime_type?.startsWith("image/") && (
                <div className="w-full h-full flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={previewDoc.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow"
                  />
                </div>
              )}

              {!previewLoading && previewUrl &&
                previewDoc.mime_type !== "application/pdf" &&
                !previewDoc.mime_type?.startsWith("image/") && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-6">
                    <div className="text-5xl mb-4">{fileIcon(previewDoc.mime_type)}</div>
                    <p className="text-base font-semibold font-sans mb-2" style={{ color: "#1a2e4a" }}>
                      Preview not available for this file type
                    </p>
                    <p className="text-sm font-sans mb-5" style={{ color: "#8e9ab0" }}>
                      Click Download to open this file on your device.
                    </p>
                    <button onClick={(e) => handleDownload(previewDoc, e)}
                      className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold font-sans"
                      style={{ backgroundColor: "#1a2e4a" }}>
                      Download File
                    </button>
                  </div>
                </div>
              )}

              {!previewLoading && !previewUrl && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm font-sans" style={{ color: "#c0392b" }}>Failed to load preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
