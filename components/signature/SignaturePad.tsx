"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { SIGNATURE_FONTS } from "@/components/signature/fonts";
import type { SignatureValue } from "@/components/signature/types";

interface Props {
  defaultName?: string;
  initialValue?: SignatureValue | null;
  onSave: (value: SignatureValue) => void;
  onCancel?: () => void;
  saving?: boolean;
}

export default function SignaturePad({ defaultName, initialValue, onSave, onCancel, saving }: Props) {
  const [tab, setTab] = useState<"type" | "draw">(initialValue?.kind === "drawn" ? "draw" : "type");
  const [typedName, setTypedName] = useState(
    initialValue?.kind === "typed" ? initialValue.value : (defaultName ?? "")
  );
  const [fontId, setFontId] = useState(initialValue?.font_id ?? SIGNATURE_FONTS[0].id);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D2B33";
  }, [tab]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastPointRef.current;
    const point = pointFromEvent(e);
    if (ctx && last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setHasDrawn(true);
    }
    lastPointRef.current = point;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSave() {
    if (tab === "type") {
      const name = typedName.trim();
      if (!name) return;
      onSave({ kind: "typed", value: name, font_id: fontId });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSave({ kind: "drawn", value: canvas.toDataURL("image/png") });
  }

  const canSave = tab === "type" ? typedName.trim().length > 0 : hasDrawn;

  return (
    <div className="bg-paper border border-line2 rounded-xl overflow-hidden">
      <div className="flex border-b border-line2">
        <button
          type="button"
          onClick={() => setTab("type")}
          className={`flex-1 px-4 py-2.5 text-[13px] font-medium transition-colors ${
            tab === "type" ? "text-ink bg-white border-b-2 border-gold" : "text-muted hover:text-ink"
          }`}
        >
          Type
        </button>
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={`flex-1 px-4 py-2.5 text-[13px] font-medium transition-colors ${
            tab === "draw" ? "text-ink bg-white border-b-2 border-gold" : "text-muted hover:text-ink"
          }`}
        >
          Draw
        </button>
      </div>

      {tab === "type" ? (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] text-muted mb-1.5">Your name</label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full name"
              className="w-full border border-line2 rounded-lg px-3 py-2 text-[14px] text-ink bg-white focus:outline-none focus:border-gold"
            />
          </div>

          {typedName.trim() && (
            <div className="bg-white border border-line rounded-lg py-6 flex items-center justify-center">
              <p
                className="text-[32px] leading-none text-ink"
                style={{ fontFamily: SIGNATURE_FONTS.find((f) => f.id === fontId)?.fontFamily }}
              >
                {typedName}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {SIGNATURE_FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setFontId(font.id)}
                className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                  fontId === font.id ? "border-gold bg-gold/10" : "border-line2 hover:border-line"
                }`}
              >
                <span className="text-[20px] text-ink block" style={{ fontFamily: font.fontFamily }}>
                  {typedName.trim() || "Your name"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-muted">Draw your signature below with your mouse or finger.</p>
          <div className="relative bg-white border border-line rounded-lg" style={{ height: 180 }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-full touch-none cursor-crosshair rounded-lg"
            />
            {!hasDrawn && (
              <p className="absolute inset-0 flex items-center justify-center text-[13px] text-muted pointer-events-none">
                Sign here
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line2 bg-slateWash/40">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] text-muted hover:text-ink px-3 py-2"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="bg-navy text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save signature"}
        </button>
      </div>
    </div>
  );
}
