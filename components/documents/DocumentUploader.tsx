"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Sparkles, Check } from "lucide-react";

type Role = "admin" | "owner";

interface Folder {
  id: string;
  name: string;
}

type QueueStatus = "pending" | "suggested" | "confirmed" | "uploading" | "done" | "error";

interface QueueItem {
  file: File;
  status: QueueStatus;
  suggestedFolderId: string | null;
  suggestedFolderName: string;
  reason: string;
  chosenFolderId: string | null;
  showPicker: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploader({ role }: { role: Role }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents/folders").then((r) => r.json()).then((d) => setFolders(Array.isArray(d) ? d : []));
  }, []);

  async function suggestFolder(item: QueueItem, index: number) {
    try {
      const res = await fetch("/api/ai/suggest-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: item.file.name,
          availableFolders: folders.map((f) => ({ id: f.id, name: f.name })),
        }),
      });
      const d = await res.json();
      setQueue((prev) => prev.map((q, i) => i === index ? {
        ...q,
        status: "suggested",
        suggestedFolderId: res.ok ? d.folder_id : null,
        suggestedFolderName: res.ok ? d.folder_name : "Unorganized",
        reason: res.ok ? d.reason : "Could not analyze — choose a folder manually.",
        chosenFolderId: res.ok ? d.folder_id : null,
      } : q));
    } catch {
      setQueue((prev) => prev.map((q, i) => i === index ? {
        ...q, status: "suggested", suggestedFolderName: "Unorganized", reason: "Could not analyze — choose a folder manually.",
      } : q));
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const items: QueueItem[] = Array.from(files).map((file) => ({
      file,
      status: "pending",
      suggestedFolderId: null,
      suggestedFolderName: "",
      reason: "",
      chosenFolderId: null,
      showPicker: false,
    }));
    setQueue((prev) => {
      const start = prev.length;
      const next = [...prev, ...items];
      // Kick off AI suggestion for each new item.
      items.forEach((item, i) => suggestFolder(item, start + i));
      return next;
    });
  }

  function confirmItem(index: number) {
    setQueue((prev) => prev.map((q, i) => i === index ? { ...q, status: "confirmed", showPicker: false } : q));
  }

  function chooseFolder(index: number, folderId: string | null, folderName: string) {
    setQueue((prev) => prev.map((q, i) => i === index ? {
      ...q, chosenFolderId: folderId, suggestedFolderName: folderName, status: "confirmed", showPicker: false,
    } : q));
  }

  async function uploadAll() {
    setUploading(true);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") continue;
      setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: "uploading" } : q));
      const fd = new FormData();
      fd.append("file", item.file);
      if (item.chosenFolderId) fd.append("folder_id", item.chosenFolderId);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, status: res.ok ? "done" : "error" } : q));
    }
    setUploading(false);
  }

  const allConfirmed = queue.length > 0 && queue.every((q) => q.status === "confirmed" || q.status === "done");

  return (
    <div className="max-w-3xl space-y-5">
      {/* Drop zone */}
      <div
        className="bg-paper border-2 border-dashed border-slate/30 rounded-2xl p-12 text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <UploadCloud className="w-10 h-10 text-slate mx-auto mb-3" />
        <p className="text-[15px] font-medium text-ink">Drag and drop files here</p>
        <p className="text-[13px] text-muted mt-1">Sola AI will suggest the right folder</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="mt-4 bg-slate text-white px-4 py-2 rounded-lg text-[13px] font-medium"
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          {queue.map((item, i) => (
            <div key={i} className="bg-paper border border-line2 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{item.file.name}</p>
                  <p className="text-[12px] text-muted">{formatSize(item.file.size)}</p>
                </div>
                {item.status === "pending" && <span className="w-4 h-4 border-2 border-slate/30 border-t-slate rounded-full animate-spin flex-shrink-0" />}
                {item.status === "done" && <Check className="w-5 h-5 text-success-text flex-shrink-0" />}
                {item.status === "uploading" && <span className="text-[12px] text-slate">Uploading…</span>}
                {item.status === "error" && <span className="text-[12px] text-danger-text">Failed</span>}
              </div>

              {(item.status === "suggested" || item.status === "confirmed") && (
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-slate mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-ink">Suggested: {item.suggestedFolderName || "Unorganized"}</p>
                      <p className="text-[12px] text-muted">{item.reason}</p>
                    </div>
                  </div>
                  {item.showPicker ? (
                    <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                      <button onClick={() => chooseFolder(i, null, "Unorganized")} className="text-[12px] whitespace-nowrap bg-paper2 border border-line2 rounded-full px-3 py-1">Unorganized</button>
                      {folders.map((f) => (
                        <button key={f.id} onClick={() => chooseFolder(i, f.id, f.name)} className="text-[12px] whitespace-nowrap bg-paper2 border border-line2 rounded-full px-3 py-1">{f.name}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      {item.status !== "confirmed" && (
                        <button onClick={() => confirmItem(i)} className="bg-navy text-white text-[12px] px-3 py-1.5 rounded-lg">Confirm</button>
                      )}
                      {item.status === "confirmed" && <span className="text-[12px] text-success-text flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Confirmed</span>}
                      <button onClick={() => setQueue((prev) => prev.map((q, idx) => idx === i ? { ...q, showPicker: true } : q))} className="text-[12px] text-slate px-2 py-1.5">Change</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={uploadAll}
            disabled={!allConfirmed || uploading}
            className="bg-gold text-navy font-medium px-6 py-2.5 rounded-lg text-[13px] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload all"}
          </button>
        </div>
      )}
    </div>
  );
}
