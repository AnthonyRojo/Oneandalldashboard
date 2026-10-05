"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { C } from "./utils";

const MAX_SIDE = 1440; // Instagram's largest feed width; plenty for a grid thumbnail
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Shrink big photos in the browser so uploads stay small (and under Vercel's body limit). */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file; // keep animation
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("encode"))), "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function CoverInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { accessToken, currentTeamId } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [broken, setBroken] = useState(false);

  const upload = async (file?: File | null) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) { setError("Use a JPG, PNG, WebP or GIF image"); return; }
    setError(""); setBusy(true);
    try {
      const blob = await shrink(file);
      const body = new FormData();
      body.append("file", blob, file.name.replace(/\.\w+$/, blob.type === "image/jpeg" ? ".jpg" : "$&"));
      const res = await fetch(`/api/teams/${currentTeamId}/uploads`, { method: "POST", body, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setBroken(false); onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div>
      <span className="block text-[12px] font-medium mb-1.5" style={{ color: C.sub }}>Cover image <span style={{ color: C.faint }}>(optional, shows in Grid view)</span></span>
      <div className="flex gap-3 items-stretch">
        {value && !broken ? (
          <div className="relative w-[84px] flex-shrink-0 rounded-lg overflow-hidden border" style={{ aspectRatio: "3 / 4", borderColor: C.line }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Cover preview" className="w-full h-full object-cover" onError={() => setBroken(true)} />
            <button type="button" onClick={() => onChange("")} aria-label="Remove cover" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white inline-flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>
        ) : null}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || !currentTeamId}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}
          onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); upload(f); } }}
          className="flex-1 min-h-[84px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[12.5px] px-3 text-center disabled:opacity-60"
          style={{ borderColor: over ? C.accent : C.line, background: over ? "#FFF7E0" : "#FCFBF8", color: C.sub }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
          <span className="font-medium" style={{ color: C.ink }}>{busy ? "Uploading…" : value ? "Replace image" : "Upload an image"}</span>
          {!busy && <span className="text-[11px]" style={{ color: C.faint }}>Click, drop a file here, or paste</span>}
        </button>
        <input ref={fileRef} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {broken && value && <p className="text-[11.5px] mt-1.5" style={{ color: "#B91C1C" }}>That link doesn&apos;t load as an image. Upload the file instead, or use a direct image link.</p>}
      {error && <p className="text-[11.5px] mt-1.5" style={{ color: "#B91C1C" }}>{error}</p>}
      <details className="mt-1.5">
        <summary className="text-[11.5px] cursor-pointer" style={{ color: C.faint }}>Or paste an image link</summary>
        <input type="url" value={value} onChange={(e) => { setBroken(false); onChange(e.target.value); }} placeholder="https://… direct link to a .jpg or .png"
          className="mt-1.5 w-full px-3 py-2 border rounded-xl text-[13px] outline-none focus:border-amber-400 bg-white" style={{ borderColor: C.line }} />
      </details>
    </div>
  );
}
