"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Sub-components — di luar fungsi utama agar tidak re-mount tiap render
// ---------------------------------------------------------------------------
const inputClass =
  "w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-slate-400 normal-case">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionLabel({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        {children}
      </p>
      {description && (
        <p className="text-[11px] text-slate-400 mt-1 normal-case leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}

// Sub-card untuk grup field mempelai
function MempelaiCard({
  label,
  color,
  children,
}: {
  label: string;
  color: "blue" | "rose";
  children: React.ReactNode;
}) {
  const dot = color === "blue" ? "bg-blue-400" : "bg-rose-400";
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maps parser helpers
// ---------------------------------------------------------------------------
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function parseGoogleMapsInput(raw: string): string {
  if (!raw.trim()) return "";
  const trimmed = raw.trim();
  if (/<iframe/i.test(trimmed)) {
    const srcMatch = trimmed.match(/src=["']([^"']*(?:(?!["'])[^])*)["']/i);
    if (srcMatch) return decodeHtmlEntities(srcMatch[1]);
    const fallbackMatch = trimmed.match(/src=["']([\s\S]+?)["']/i);
    if (fallbackMatch) return decodeHtmlEntities(fallbackMatch[1]);
  }
  if (trimmed.startsWith("http")) return decodeHtmlEntities(trimmed);
  return decodeHtmlEntities(trimmed);
}

function isValidMapsUrl(url: string): boolean {
  return (
    url.startsWith("http") &&
    (url.includes("google.com/maps") ||
      url.includes("goo.gl/maps") ||
      url.includes("maps.app.goo.gl"))
  );
}


// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminOwnerPage() {
  const [settings, setSettings] = useState({
    // Nama & panggilan
    nama_lengkap_pria: "",
    panggilan_pria: "",
    nama_lengkap_wanita: "",
    panggilan_wanita: "",
    // Kolom lama (tetap dipakai sebagai fallback)
    mempelai_pria: "",
    mempelai_wanita: "",
    // Orang tua
    ayah_pria: "",
    ibu_pria: "",
    ayah_wanita: "",
    ibu_wanita: "",
    // Turut mengundang
    turut_pria: "",
    turut_wanita: "",
    // Jadwal & tempat
    tanggal_acara: "",
    waktu_acara: "",
    lokasi_acara: "",
    link_map: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "";
    message: string;
  }>({ type: "", message: "" });

  const [rawMapInput, setRawMapInput] = useState("");
  const [mapInputType, setMapInputType] = useState<"iframe" | "url" | "invalid" | "">("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("wedding_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (data) {
        setSettings({
          nama_lengkap_pria: data.nama_lengkap_pria || "",
          panggilan_pria: data.panggilan_pria || "",
          nama_lengkap_wanita: data.nama_lengkap_wanita || "",
          panggilan_wanita: data.panggilan_wanita || "",
          mempelai_pria: data.mempelai_pria || "",
          mempelai_wanita: data.mempelai_wanita || "",
          ayah_pria: data.ayah_pria || "",
          ibu_pria: data.ibu_pria || "",
          ayah_wanita: data.ayah_wanita || "",
          ibu_wanita: data.ibu_wanita || "",
          turut_pria: data.turut_pria || "",
          turut_wanita: data.turut_wanita || "",
          tanggal_acara: data.tanggal_acara?.includes("-") ? data.tanggal_acara : "",
          waktu_acara: data.waktu_acara?.includes(":")
            ? data.waktu_acara.substring(0, 5)
            : "",
          lokasi_acara: data.lokasi_acara || "",
          link_map: data.link_map || "",
        });
        if (data.link_map) {
          setRawMapInput(data.link_map);
          setMapInputType("url");
        }
      }
      if (error) {
        setStatus({ type: "error", message: "Gagal terhubung ke database." });
      }
    };
    fetchSettings();
  }, []);

  // Helper onChange
  const set = (key: keyof typeof settings) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setSettings((prev) => ({ ...prev, [key]: e.target.value }));

  // Sync panggilan → mempelai_pria / mempelai_wanita otomatis
  // (kolom lama tetap diisi agar backward-compatible)
  const handlePanggilanPria = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSettings((prev) => ({
      ...prev,
      panggilan_pria: val,
      mempelai_pria: val, // sync ke kolom lama
    }));
  };

  const handlePanggilanWanita = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSettings((prev) => ({
      ...prev,
      panggilan_wanita: val,
      mempelai_wanita: val, // sync ke kolom lama
    }));
  };

  const handleMapInputChange = (value: string) => {
    setRawMapInput(value);
    if (!value.trim()) {
      setMapInputType("");
      setSettings((prev) => ({ ...prev, link_map: "" }));
      return;
    }
    const parsed = parseGoogleMapsInput(value);
    if (/<iframe/i.test(value)) setMapInputType("iframe");
    else if (isValidMapsUrl(parsed)) setMapInputType("url");
    else setMapInputType("invalid");
    setSettings((prev) => ({ ...prev, link_map: parsed }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: "", message: "" });

    const { error } = await supabase.from("wedding_settings").upsert({
      id: 1,
      ...settings,
    });

    setStatus(
      error
        ? { type: "error", message: error.message }
        : { type: "success", message: "Perubahan berhasil disimpan" }
    );
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8 font-sans">

      {/* Topbar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-slate-500 tracking-wide">Madesign</span>
        </div>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full">
          Admin
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* Header */}
        <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
          <h1 className="text-base font-medium text-slate-900">Konfigurasi acara</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Perubahan akan langsung diterapkan ke halaman undangan klien
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className="px-5 sm:px-8 py-6 flex flex-col gap-5">

            {/* ======== IDENTITAS MEMPELAI ======== */}
            <SectionLabel
              description="Nama lengkap tampil di detail biodata. Nama panggilan tampil di cover, hero, dan penutup."
            >
              Identitas mempelai
            </SectionLabel>

            {/* Mempelai Pria */}
            <MempelaiCard label="Mempelai pria" color="blue">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama lengkap">
                  <input
                    type="text"
                    value={settings.nama_lengkap_pria}
                    onChange={set("nama_lengkap_pria")}
                    className={inputClass}
                    placeholder="Contoh: Moch. Irsyadul Ibad"
                    required
                  />
                </Field>
                <Field label="Nama panggilan">
                  <input
                    type="text"
                    value={settings.panggilan_pria}
                    onChange={handlePanggilanPria}
                    className={inputClass}
                    placeholder="Contoh: Irsya"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama ayah" hint="opsional">
                  <input type="text" value={settings.ayah_pria}
                    onChange={set("ayah_pria")} className={inputClass}
                    placeholder="Contoh: Bapak Isbah Tamimi" />
                </Field>
                <Field label="Nama ibu" hint="opsional">
                  <input type="text" value={settings.ibu_pria}
                    onChange={set("ibu_pria")} className={inputClass}
                    placeholder="Contoh: Ibu Khotijah" />
                </Field>
              </div>
            </MempelaiCard>

            {/* Mempelai Wanita */}
            <MempelaiCard label="Mempelai wanita" color="rose">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama lengkap">
                  <input
                    type="text"
                    value={settings.nama_lengkap_wanita}
                    onChange={set("nama_lengkap_wanita")}
                    className={inputClass}
                    placeholder="Contoh: Salsa Bila Zata Salwa"
                    required
                  />
                </Field>
                <Field label="Nama panggilan">
                  <input
                    type="text"
                    value={settings.panggilan_wanita}
                    onChange={handlePanggilanWanita}
                    className={inputClass}
                    placeholder="Contoh: Salsa"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama ayah" hint="opsional">
                  <input type="text" value={settings.ayah_wanita}
                    onChange={set("ayah_wanita")} className={inputClass}
                    placeholder="Contoh: Bapak Lulus Prihandoyo" />
                </Field>
                <Field label="Nama ibu" hint="opsional">
                  <input type="text" value={settings.ibu_wanita}
                    onChange={set("ibu_wanita")} className={inputClass}
                    placeholder="Contoh: Ibu Sri Hindayati" />
                </Field>
              </div>
            </MempelaiCard>

            <Divider />

            {/* ======== TURUT MENGUNDANG ======== */}
            <SectionLabel
              description="Teks bebas yang ditampilkan di section Turut Mengundang."
            >
              Turut mengundang
            </SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Keluarga pria" hint="opsional">
                <textarea rows={2} value={settings.turut_pria}
                  onChange={set("turut_pria")}
                  className={`${inputClass} resize-none`}
                  placeholder="Contoh: Bapak Isbah Tamimi & Ibu Khotijah Sekeluarga" />
              </Field>
              <Field label="Keluarga wanita" hint="opsional">
                <textarea rows={2} value={settings.turut_wanita}
                  onChange={set("turut_wanita")}
                  className={`${inputClass} resize-none`}
                  placeholder="Contoh: Bapak Lulus Prihandoyo & Ibu Sri Hindayati Sekeluarga" />
              </Field>
            </div>

            <Divider />

            {/* ======== JADWAL & TEMPAT ======== */}
            <SectionLabel>Jadwal &amp; tempat</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tanggal acara">
                <input type="date" value={settings.tanggal_acara}
                  onChange={set("tanggal_acara")}
                  className={`${inputClass} cursor-pointer`} required />
              </Field>
              <Field label="Waktu acara">
                <input type="time" value={settings.waktu_acara}
                  onChange={set("waktu_acara")}
                  className={`${inputClass} cursor-pointer`} required />
              </Field>
            </div>

            <Field label="Nama gedung / lokasi">
              <input type="text" value={settings.lokasi_acara}
                onChange={set("lokasi_acara")} className={inputClass}
                placeholder="Contoh: Gedung Serbaguna Al-Falahiyah" required />
            </Field>

            <Divider />

            {/* ======== TAUTAN MAPS ======== */}
            <SectionLabel>Tautan</SectionLabel>

            <Field label="Link / Embed Google Maps">
              <textarea rows={3} value={rawMapInput}
                onChange={(e) => handleMapInputChange(e.target.value)}
                className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
                placeholder={`Paste salah satu format:\n• URL: https://maps.google.com/...\n• Embed: <iframe src="https://..." ...>`}
              />

              {rawMapInput.trim() !== "" && (
                <div className="mt-1.5">
                  {mapInputType === "iframe" && isValidMapsUrl(settings.link_map) ? (
                    <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-emerald-700">
                          Link berhasil diekstrak dari kode embed
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5 break-all font-mono">
                          {settings.link_map}
                        </p>
                      </div>
                    </div>
                  ) : mapInputType === "url" ? (
                    <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <p className="text-[11px] text-blue-700 font-medium">
                        URL terdeteksi dan siap disimpan
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <p className="text-[11px] text-amber-700">
                        Format tidak dikenali. Gunakan URL atau kode embed dari Google Maps.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Field>

          </div>

          {/* Footer */}
          <div className="px-5 sm:px-8 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {status.message ? (
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  status.type === "error" ? "bg-red-400" : "bg-emerald-400"
                }`} />
                <span className={
                  status.type === "error" ? "text-red-600" : "text-emerald-600"
                }>
                  {status.message}
                </span>
              </div>
            ) : (
              <div />
            )}

            <button type="submit" disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 9.5v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-3M8 2.5v7M5.5 7l2.5 2.5 2.5-2.5" />
              </svg>
              {isLoading ? "Menyimpan..." : "Simpan perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}