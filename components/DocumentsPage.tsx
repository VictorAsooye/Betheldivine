"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";

interface Doc {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  uploader_id: string;
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canDelete = role === "admin" || role === "owner";

  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load documents");
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

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
      fetchDocs();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload and manage forms, records, and files"
      />

      <div className="p-8">
        {/* Success banner */}
        {uploadSuccess && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-sans font-semibold flex items-center justify-between"
            style={{ backgroundColor: "#f0faf5", border: "1px solid #a7dfc4", color: "#2d8a5e" }}>
            ✓ Document uploaded successfully.
            <button onClick={() => setUploadSuccess(false)} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}

        {/* Upload button + form */}
        <div className="mb-6">
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold font-sans"
              style={{ backgroundColor: "#1a2e4a" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Document
            </button>
          ) : (
            <div className="bg-white rounded-xl border p-6 max-w-lg" style={{ borderColor: "#dce2ec" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold font-sans" style={{ color: "#1a2e4a" }}>Upload Document</h3>
                <button onClick={() => setShowUpload(false)} className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Cancel</button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* File picker */}
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer"
                  style={{ borderColor: selectedFile ? "#2d8a5e" : "#dce2ec", backgroundColor: selectedFile ? "#f0faf5" : "#f7f9fc" }}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
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

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5 font-sans" style={{ color: "#1a2e4a" }}>Description <span style={{ color: "#8e9ab0", fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. John Smith — New Employee Form"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm font-sans outline-none"
                    style={{ borderColor: "#dce2ec", color: "#1a2e4a" }}
                  />
                </div>

                {uploadError && (
                  <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{uploadError}</p>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold font-sans disabled:opacity-50"
                  style={{ backgroundColor: "#1a2e4a" }}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <p className="text-sm font-sans" style={{ color: "#8e9ab0" }}>Loading…</p>
        ) : error ? (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#dce2ec" }}>
            <p className="text-sm font-sans" style={{ color: "#c0392b" }}>{error}</p>
            <button onClick={fetchDocs} className="text-sm font-semibold mt-2 underline" style={{ color: "#1a2e4a" }}>Retry</button>
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: "#dce2ec" }}>
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-semibold font-sans" style={{ color: "#1a2e4a" }}>No documents yet</p>
            <p className="text-sm font-sans mt-1" style={{ color: "#8e9ab0" }}>Upload your first document using the button above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#dce2ec" }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #dce2ec", backgroundColor: "#f7f9fc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide" style={{ color: "#8e9ab0" }}>File</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden sm:table-cell" style={{ color: "#8e9ab0" }}>Category</th>
                  {(role === "admin" || role === "owner") && (
                    <th className="text-left px-5 py-3 text-xs font-semibold font-sans uppercase tracking-wide hidden md:table-cell" style={{ color: "#8e9ab0" }}>Uploaded By</th>
                  )}
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
                    {(role === "admin" || role === "owner") && (
                      <td className="px-5 py-4 text-sm font-sans hidden md:table-cell" style={{ color: "#8e9ab0" }}>
                        {doc.profiles?.full_name ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm font-sans hidden md:table-cell" style={{ color: "#8e9ab0" }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg border"
                          style={{ color: "#1a2e4a", borderColor: "#dce2ec" }}
                        >
                          Download
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-xs font-semibold font-sans px-3 py-1.5 rounded-lg"
                            style={{ color: "#c0392b", backgroundColor: "#fef2f2" }}
                          >
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
