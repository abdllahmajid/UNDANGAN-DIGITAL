"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminOwnerPage() {
  const [settings, setSettings] = useState({
    mempelai_pria: "",
    mempelai_wanita: "",
    tanggal_acara: "",
    waktu_acara: "",
    lokasi_acara: "",
    link_map: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; message: string }>({
    type: "",
    message: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("wedding_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (data) {
        setSettings({
          ...data,
          tanggal_acara: data.tanggal_acara?.includes("-") ? data.tanggal_acara : "",
          waktu_acara: data.waktu_acara?.includes(":") ? data.waktu_acara.substring(0, 5) : "",
        });
      }
      if (error) {
        setStatus({ type: "error", message: "Gagal terhubung ke database." });
      }
    };
    fetchSettings();
  }, []);

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

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 tracking-wide uppercase">
        {label}
      </label>
      {children}
    </div>
  );

  const inputClass =
    "w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
      {children}
    </p>
  );

  const Divider = () => <hr className="border-slate-100" />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10 font-sans">
      {/* Topbar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-slate-500 tracking-wide">
            madesign
          </span>
        </div>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full">
          Admin
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100">
          <h1 className="text-base font-medium text-slate-900">Konfigurasi acara</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Perubahan akan langsung diterapkan ke halaman undangan klien
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="px-8 py-6 flex flex-col gap-6">
            <SectionLabel>Identitas mempelai</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mempelai pria">
                <input
                  type="text"
                  value={settings.mempelai_pria}
                  onChange={(e) => setSettings({ ...settings, mempelai_pria: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Rahmat"
                  required
                />
              </Field>
              <Field label="Mempelai wanita">
                <input
                  type="text"
                  value={settings.mempelai_wanita}
                  onChange={(e) => setSettings({ ...settings, mempelai_wanita: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Nina"
                  required
                />
              </Field>
            </div>

            <Divider />
            <SectionLabel>Jadwal & tempat</SectionLabel>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tanggal acara">
                <input
                  type="date"
                  value={settings.tanggal_acara}
                  onChange={(e) => setSettings({ ...settings, tanggal_acara: e.target.value })}
                  className={`${inputClass} cursor-pointer`}
                  required
                />
              </Field>
              <Field label="Waktu acara">
                <input
                  type="time"
                  value={settings.waktu_acara}
                  onChange={(e) => setSettings({ ...settings, waktu_acara: e.target.value })}
                  className={`${inputClass} cursor-pointer`}
                  required
                />
              </Field>
            </div>

            <Field label="Nama gedung / lokasi">
              <input
                type="text"
                value={settings.lokasi_acara}
                onChange={(e) => setSettings({ ...settings, lokasi_acara: e.target.value })}
                className={inputClass}
                placeholder="Contoh: Gedung Serbaguna Al-Falahiyah"
                required
              />
            </Field>

            <Divider />
            <SectionLabel>Tautan</SectionLabel>

            <Field label="Link Google Maps">
              <input
                type="url"
                value={settings.link_map}
                onChange={(e) => setSettings({ ...settings, link_map: e.target.value })}
                className={inputClass}
                placeholder="https://maps.google.com/..."
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
            {status.message ? (
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    status.type === "error" ? "bg-red-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={
                    status.type === "error" ? "text-red-600" : "text-emerald-600"
                  }
                >
                  {status.message}
                </span>
              </div>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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