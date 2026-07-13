"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  FolderOpen,
  FolderArchive,
  File as FileIcon,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  Plus,
  Shield,
} from "lucide-react";

type Role = "admin" | "owner" | "employee";

interface Folder {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Doc {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  folder_id: string | null;
  profiles?: { full_name?: string } | null;
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

function fileTypeIcon(mime: string | null) {
  if (mime === "application/pdf") return { Icon: FileIcon, bg: "bg-danger-bg", text: "text-danger-text" };
  if (mime?.includes("word")) return { Icon: FileIcon, bg: "bg-info-bg", text: "text-info-text" };
  if (mime?.startsWith("image/")) return { Icon: ImageIcon, bg: "bg-success-bg", text: "text-success-text" };
  return { Icon: FileIcon, bg: "bg-paper2", text: "text-muted" };
}

export default function DocumentsBrowser({ role }: { role: Role }) {
  const canManage = role === "admin" || role === "owner";
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  async function load() {
    setLoading(true);
    const [fRes, dRes] = await Promise.all([
      fetch("/api/documents/folders"),
      fetch("/api/documents"),
    ]);
    const [fData, dData] = await Promise.all([fRes.json(), dRes.json()]);
    setFolders(Array.isArray(fData) ? fData : []);
    setDocs(Array.isArray(dData) ? dData : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    docs.forEach((d) => { if (d.folder_id) m.set(d.folder_id, (m.get(d.folder_id) ?? 0) + 1); });
    return m;
  }, [docs]);

  const visibleDocs = useMemo(() => {
    let list = docs;
    if (selectedFolder) list = list.filter((d) => d.folder_id === selectedFolder);
    if (search.trim()) list = list.filter((d) => d.file_name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [docs, selectedFolder, search]);

  const recentDocs = useMemo(() => {
    return [...docs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [docs]);

  function relativeTime(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
    return formatDate(iso);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/documents/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName, description: "" }),
    });
    if (res.ok) {
      const f = await res.json();
      setFolders((p) => [...p, f]);
      setNewFolderName("");
      setShowNewFolder(false);
    }
  }

  async function handleDownload(doc: Doc) {
    const res = await fetch(`/api/documents/${doc.id}`);
    const data = await res.json();
    if (res.ok && data.url) {
      const a = document.createElement("a");
      a.href = data.url; a.download = data.file_name ?? doc.file_name; a.target = "_blank"; a.click();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((p) => p.filter((d) => d.id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search */}
      <div className="flex items-center gap-3 border-b-[1.5px] border-ink pb-2 max-w-md">
        <Search className="w-4 h-4 text-muted flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents, licenses, care plans…"
          className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink3"
        />
      </div>

      {/* Folders grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedFolder(null)}
          className={`bg-paper border rounded-xl p-4 text-left transition ${selectedFolder === null ? "border-gold bg-gold/5" : "border-line2 hover:border-gold"}`}
        >
          <FolderOpen className="w-5 h-5 text-gold mb-2" />
          <p className="text-[13px] font-medium text-ink">All files</p>
          <p className="text-[12px] text-muted">{docs.length} files</p>
        </button>
        <Link
          href={`/${role}/licenses`}
          className="bg-paper border border-line2 rounded-xl p-4 text-left transition hover:border-gold"
        >
          <Shield className="w-5 h-5 text-gold mb-2" />
          <p className="text-[13px] font-medium text-ink">Licenses &amp; Certs</p>
          <p className="text-[12px] text-muted">Track expiring credentials</p>
        </Link>
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFolder(f.id)}
            className={`bg-paper border rounded-xl p-4 text-left transition ${selectedFolder === f.id ? "border-gold bg-gold/5" : "border-line2 hover:border-gold"}`}
          >
            <FolderOpen className="w-5 h-5 text-gold mb-2" />
            <p className="text-[13px] font-medium text-ink truncate">{f.name}</p>
            <p className="text-[12px] text-muted">{folderCounts.get(f.id) ?? 0} files</p>
            <p className="text-[11px] text-ink3">{formatDate(f.created_at)}</p>
          </button>
        ))}
        {canManage && (
          showNewFolder ? (
            <div className="border-2 border-dashed border-line2 rounded-xl p-4 flex flex-col gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                placeholder="Folder name"
                className="bg-paper border border-line2 rounded px-2 py-1 text-[12px] outline-none"
              />
              <div className="flex gap-2">
                <button onClick={createFolder} className="text-[12px] bg-navy text-white px-3 py-1 rounded">Create</button>
                <button onClick={() => setShowNewFolder(false)} className="text-[12px] text-muted px-2 py-1">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewFolder(true)} className="border-2 border-dashed border-line2 rounded-xl p-4 flex items-center gap-2 text-muted text-[13px]">
              <Plus className="w-4 h-4" /> New folder
            </button>
          )
        )}
      </div>

      {/* Recent */}
      {!loading && recentDocs.length > 0 && !selectedFolder && !search.trim() && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-1">Recent</p>
          {recentDocs.map((doc) => {
            const cfg = fileTypeIcon(doc.mime_type);
            const Icon = cfg.Icon;
            return (
              <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-line text-[12.5px]">
                <Icon className="w-3.5 h-3.5 text-sage flex-shrink-0" />
                <span className="text-ink font-medium truncate flex-1 min-w-0">{doc.file_name}</span>
                <span className="text-muted flex-shrink-0">
                  {[doc.profiles?.full_name, relativeTime(doc.created_at)].filter(Boolean).join(" · ")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Care plan archive */}
      <Link href={`/${role}/documents/care-plans`} className="block bg-warning-bg border border-warning-border rounded-xl p-4 flex items-center gap-3">
        <FolderArchive className="w-5 h-5 text-warning-text" />
        <div>
          <p className="text-[13px] font-medium text-warning-text">Care Plan Archive</p>
          <p className="text-[12px] text-warning-text/80">View all submitted care plans →</p>
        </div>
      </Link>

      {/* File list */}
      <div className="bg-paper border border-line2 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="text-[13px] font-medium text-ink">Files</p>
          {canManage && (
            <Link href={`/${role}/documents/upload`} className="bg-gold text-navy text-[12px] px-3 py-1.5 rounded-lg font-medium">Upload files →</Link>
          )}
        </div>
        {loading ? (
          <p className="text-[13px] text-muted p-4">Loading…</p>
        ) : visibleDocs.length === 0 ? (
          <p className="text-[13px] text-muted p-6 text-center">No files here yet.</p>
        ) : (
          visibleDocs.map((doc) => {
            const cfg = fileTypeIcon(doc.mime_type);
            const Icon = cfg.Icon;
            return (
              <div key={doc.id} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3 border-b border-line items-center last:border-b-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-ink font-medium truncate">{doc.file_name}</p>
                  <p className="text-[12px] text-muted truncate">
                    {[formatSize(doc.file_size), doc.profiles?.full_name, formatDate(doc.created_at)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/view?d=${doc.id}`} className="p-1.5 text-muted hover:text-ink" title="View"><Eye className="w-4 h-4" /></Link>
                  <button onClick={() => handleDownload(doc)} className="p-1.5 text-muted hover:text-ink" title="Download"><Download className="w-4 h-4" /></button>
                  {canManage && (
                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-muted hover:text-danger-text" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
