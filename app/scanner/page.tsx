"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  QrCode,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Clock,
  RefreshCw,
  Scan,
  Users,
  Star,
  Shield,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type TamuData = {
  id: string;
  nama_tamu: string;
  kehadiran: boolean | null;
  ucapan: string | null;
  jenis_tamu: string;
  jenis_kelamin: string;
  alamat: string | null;
  waktu_hadir: string | null;
};

type ScanStatus = "idle" | "loading" | "success" | "already" | "not_found" | "error";

const JENIS_TAMU_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; arah: string }> = {
  VIP: {
    label: "VIP",
    color: "#92400e",
    bg: "#fef3c7",
    icon: Star,
    arah: "Silakan menuju area VIP — meja paling depan",
  },
  VVIP: {
    label: "VVIP",
    color: "#1e1b4b",
    bg: "#ede9fe",
    icon: Shield,
    arah: "Silakan menuju area VVIP — meja kehormatan",
  },
  Reguler: {
    label: "Reguler",
    color: "#1e3a5f",
    bg: "#dbeafe",
    icon: Users,
    arah: "Silakan menuju area umum",
  },
};

function getJenisConfig(jenis: string) {
  return JENIS_TAMU_CONFIG[jenis] ?? {
    label: jenis,
    color: "#1e3a5f",
    bg: "#dbeafe",
    icon: Users,
    arah: "Silakan menuju area yang tersedia",
  };
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [tamuData, setTamuData] = useState<TamuData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [totalHadir, setTotalHadir] = useState(0);
  const cooldownRef = useRef(false);

  useEffect(() => {
    fetchTotalHadir();
  }, []);

  useEffect(() => {
    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isScanning]);

  const fetchTotalHadir = async () => {
    const { count } = await supabase
      .from("rsvp")
      .select("*", { count: "exact", head: true })
      .not("waktu_hadir", "is", null);
    setTotalHadir(count ?? 0);
  };

  const startScanner = async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      if (!videoRef.current) return;

      await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result && !cooldownRef.current) {
          handleScan(result.getText());
        }
      });
    } catch {
      setScanStatus("error");
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    readerRef.current = null;
  };

  const handleScan = async (scannedId: string) => {
    if (cooldownRef.current || scannedId === lastScannedId) return;
    cooldownRef.current = true;
    setLastScannedId(scannedId);
    setScanStatus("loading");

    try {
      const { data, error } = await supabase
        .from("rsvp")
        .select("*")
        .eq("id", scannedId)
        .single();

      if (error || !data) {
        setScanStatus("not_found");
        setTimeout(() => {
          setScanStatus("idle");
          cooldownRef.current = false;
        }, 3000);
        return;
      }

      if (data.waktu_hadir) {
        setTamuData(data);
        setScanStatus("already");
        setTimeout(() => {
          setScanStatus("idle");
          setTamuData(null);
          cooldownRef.current = false;
        }, 5000);
        return;
      }

      const waktu = new Date().toISOString();
      await supabase
        .from("rsvp")
        .update({ waktu_hadir: waktu })
        .eq("id", scannedId);

      setTamuData({ ...data, waktu_hadir: waktu });
      setScanStatus("success");
      fetchTotalHadir();

      setTimeout(() => {
        setScanStatus("idle");
        setTamuData(null);
        cooldownRef.current = false;
      }, 6000);
    } catch {
      setScanStatus("error");
      setTimeout(() => {
        setScanStatus("idle");
        cooldownRef.current = false;
      }, 3000);
    }
  };

  const formatWaktu = (iso: string) => {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#8b7e6a] flex items-center justify-center">
            <Scan size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Resepsionis</p>
            <h1 className="text-sm font-bold tracking-wide">Scanner Tamu</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <Users size={14} className="text-[#8b7e6a]" />
          <span className="text-xs text-white/60">Hadir:</span>
          <span className="text-sm font-bold text-[#8b7e6a]">{totalHadir}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Viewfinder / Kamera */}
        <div className="relative rounded-3xl overflow-hidden bg-[#1a1a1a] border border-white/10 aspect-square">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: isScanning ? "block" : "none" }}
          />

          {/* Overlay saat tidak scanning */}
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                <QrCode size={36} className="text-white/20" />
              </div>
              <p className="text-white/30 text-sm">Kamera belum aktif</p>
            </div>
          )}

          {/* Scanning frame overlay */}
          {isScanning && scanStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[#8b7e6a] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-[#8b7e6a] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-[#8b7e6a] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[#8b7e6a] rounded-br-lg" />
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-[#8b7e6a]/60"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="absolute bottom-6 text-white/50 text-xs tracking-widest uppercase">
                Arahkan QR Code ke kamera
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {scanStatus === "loading" && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#8b7e6a] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Tombol Mulai/Stop */}
        <button
          onClick={() => {
            setIsScanning((v) => !v);
            setScanStatus("idle");
            setTamuData(null);
            cooldownRef.current = false;
          }}
          className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all ${
            isScanning
              ? "bg-white/10 border border-white/20 text-white/60 hover:bg-white/15"
              : "bg-[#8b7e6a] text-white hover:bg-[#7a6e5c]"
          }`}
        >
          {isScanning ? "Hentikan Scanner" : "Mulai Scanner"}
        </button>

        {/* Result Card */}
        <AnimatePresence mode="wait">
          {tamuData && scanStatus === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl overflow-hidden border border-green-500/30 bg-[#1a1a1a]"
            >
              {/* Status bar */}
              <div className="bg-green-500/20 border-b border-green-500/20 px-6 py-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                  Tamu Terverifikasi
                </span>
              </div>

              <div className="p-6 space-y-5">
                {/* Nama & jenis kelamin */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#8b7e6a]/20 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-[#8b7e6a]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
                      {tamuData.jenis_kelamin === "Laki-laki" ? "Bapak/Saudara" : "Ibu/Saudari"}
                    </p>
                    <h2 className="text-xl font-bold leading-tight">{tamuData.nama_tamu}</h2>
                    {tamuData.alamat && (
                      <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {tamuData.alamat}
                      </p>
                    )}
                  </div>
                </div>

                {/* Kategori tamu */}
                {(() => {
                  const cfg = getJenisConfig(tamuData.jenis_tamu);
                  const Icon = cfg.icon;
                  return (
                    <div
                      className="rounded-2xl px-5 py-4 flex items-center gap-3"
                      style={{ backgroundColor: cfg.bg + "22", border: `1px solid ${cfg.color}33` }}
                    >
                      <Icon size={20} style={{ color: cfg.color }} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: cfg.color + "99" }}>
                          Kategori Tamu
                        </p>
                        <p className="font-bold text-sm" style={{ color: cfg.color }}>
                          {cfg.label}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Arahan */}
                {(() => {
                  const cfg = getJenisConfig(tamuData.jenis_tamu);
                  return (
                    <div className="bg-white/5 rounded-2xl px-5 py-4">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
                        Arahan Resepsionis
                      </p>
                      <p className="text-sm text-white/80">{cfg.arah}</p>
                    </div>
                  );
                })()}

                {/* Waktu hadir */}
                <div className="flex items-center gap-2 text-white/30">
                  <Clock size={12} />
                  <p className="text-xs">
                    Hadir pukul {tamuData.waktu_hadir ? formatWaktu(tamuData.waktu_hadir) : "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {tamuData && scanStatus === "already" && (
            <motion.div
              key="already"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl overflow-hidden border border-amber-500/30 bg-[#1a1a1a]"
            >
              <div className="bg-amber-500/20 border-b border-amber-500/20 px-6 py-3 flex items-center gap-2">
                <RefreshCw size={16} className="text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                  Tamu Sudah Tercatat
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">
                      {tamuData.jenis_kelamin === "Laki-laki" ? "Bapak/Saudara" : "Ibu/Saudari"}
                    </p>
                    <h2 className="text-xl font-bold">{tamuData.nama_tamu}</h2>
                  </div>
                </div>
                <div className="bg-amber-500/10 rounded-2xl px-5 py-4">
                  <p className="text-xs text-amber-400/70 mb-1">Sudah hadir sejak</p>
                  <p className="text-sm font-bold text-amber-400">
                    {tamuData.waktu_hadir ? formatWaktu(tamuData.waktu_hadir) : "-"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {scanStatus === "not_found" && (
            <motion.div
              key="not_found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl overflow-hidden border border-red-500/30 bg-[#1a1a1a]"
            >
              <div className="bg-red-500/20 border-b border-red-500/20 px-6 py-3 flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest">
                  QR Code Tidak Valid
                </span>
              </div>
              <div className="p-6">
                <p className="text-sm text-white/50">
                  Tamu tidak ditemukan dalam daftar undangan. Pastikan QR Code berasal dari undangan yang valid.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}