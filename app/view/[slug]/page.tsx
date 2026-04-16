"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface DocInfo {
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  url: string;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentViewPage() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("d");

  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!docId) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/documents/${docId}/view`)
      .then((r) => { if (!r.ok) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((d) => { if (d) setDoc(d); setLoading(false); });
  }, [docId]);

  function handleDownload() {
    if (!doc) return;
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.file_name;
    a.target = "_blank";
    a.click();
  }

  const isPdf = doc?.mime_type === "application/pdf";
  const isImage = doc?.mime_type?.startsWith("image/");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f7f9fc", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#122038", padding: "0 24px", height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "15px", color: "#ffffff", letterSpacing: "0.5px" }}>
            BETHEL-DIVINE
          </span>
          <span style={{ width: "1px", height: "18px", backgroundColor: "rgba(255,255,255,0.15)" }} />
          {doc && (
            <span style={{ color: "#8e9ab0", fontSize: "13px", fontFamily: "system-ui, sans-serif" }}>
              {doc.file_name}
              {doc.file_size && <span style={{ marginLeft: "8px", fontSize: "11px" }}>· {formatSize(doc.file_size)}</span>}
            </span>
          )}
        </div>
        {doc && (
          <button onClick={handleDownload} style={{
            display: "flex", alignItems: "center", gap: "6px",
            backgroundColor: "#1a2e4a", color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
            padding: "6px 14px", fontSize: "13px", fontFamily: "system-ui, sans-serif",
            fontWeight: 600, cursor: "pointer",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <svg style={{ animation: "spin 1s linear infinite" }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2AADAD" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p style={{ marginTop: "12px", color: "#8e9ab0", fontSize: "13px", fontFamily: "system-ui, sans-serif" }}>Loading document…</p>
            </div>
          </div>
        )}

        {notFound && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#1a2e4a", marginBottom: "8px" }}>
                Document Not Found
              </p>
              <p style={{ color: "#8e9ab0", fontSize: "14px", fontFamily: "system-ui, sans-serif" }}>
                This link may have expired or the document no longer exists.
              </p>
            </div>
          </div>
        )}

        {doc && isPdf && (
          <iframe src={doc.url} style={{ flex: 1, border: "none", width: "100%", height: "100%" }} title={doc.file_name} />
        )}

        {doc && isImage && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", backgroundColor: "#f0f2f5" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={doc.url} alt={doc.file_name}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }} />
          </div>
        )}

        {doc && !isPdf && !isImage && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>📘</div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#1a2e4a", marginBottom: "8px" }}>{doc.file_name}</p>
              <p style={{ color: "#8e9ab0", fontSize: "14px", fontFamily: "system-ui, sans-serif", marginBottom: "24px" }}>
                This file type can&apos;t be previewed in the browser.
              </p>
              <button onClick={handleDownload} style={{
                backgroundColor: "#1a2e4a", color: "#ffffff", border: "none", borderRadius: "8px",
                padding: "10px 24px", fontSize: "14px", fontFamily: "system-ui, sans-serif", fontWeight: 600, cursor: "pointer",
              }}>Download File</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Footer */}
      <div style={{
        padding: "10px 24px", borderTop: "1px solid #dce2ec", backgroundColor: "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <p style={{ color: "#8e9ab0", fontSize: "11px", fontFamily: "system-ui, sans-serif" }}>
          Bethel Divine Healthcare Services, LLC · License R4205 · This link expires in 24 hours
        </p>
      </div>
    </div>
  );
}
