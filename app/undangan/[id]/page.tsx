"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, MessageSquare, QrCode, Heart, Clock } from "lucide-react";
import QRCode from "react-qr-code";

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
const IMG_COVER =
  "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=60&w=1200&fm=webp&fit=crop";
const IMG_HERO =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=60&w=1200&fm=webp&fit=crop";

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------
const CheckCircle2 = ({ size, className, strokeWidth }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const UserIcon = ({ size, className }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------
function useCountdown(targetDateStr: string) {
  const [timeLeft, setTimeLeft] = useState({
    hari: 0, jam: 0, menit: 0, detik: 0,
  });

  useEffect(() => {
    if (!targetDateStr) return;
    const calc = () => {
      const diff = new Date(targetDateStr).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hari: 0, jam: 0, menit: 0, detik: 0 });
        return;
      }
      setTimeLeft({
        hari: Math.floor(diff / 86400000),
        jam: Math.floor((diff % 86400000) / 3600000),
        menit: Math.floor((diff % 3600000) / 60000),
        detik: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  return timeLeft;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function formatTanggal(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

function formatWaktu(timeStr: string): string {
  return timeStr ? `${timeStr} WIB` : "";
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------
function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      <div className="w-12 h-px bg-[#8b7e6a]/40" />
      <Heart size={10} className="text-[#8b7e6a]/60" fill="#8b7e6a" />
      <div className="w-12 h-px bg-[#8b7e6a]/40" />
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-[#4a4238] text-white rounded-2xl px-4 py-3 min-w-[64px]">
      <span className="text-2xl font-bold font-sans tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest mt-1 font-sans opacity-80">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function UndanganTamu({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const guestId = resolvedParams.id;

  const [guestData, setGuestData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [kehadiran, setKehadiran] = useState("hadir");
  const [ucapan, setUcapan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const countdown = useCountdown(settings?.tanggal_acara || "");

  useEffect(() => {
    const img = new Image();
    img.src = IMG_HERO;
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      const { data: dataTamu } = await supabase
        .from("rsvp").select("*").eq("id", guestId).single();
      if (dataTamu) {
        setGuestData(dataTamu);
        if (dataTamu.kehadiran !== null) setIsSubmitted(true);
      }
      const { data: dataSettings } = await supabase
        .from("wedding_settings").select("*").eq("id", 1).single();
      if (dataSettings) setSettings(dataSettings);
      setIsLoading(false);
    };
    fetchAllData();
  }, [guestId]);

  const handleSubmitRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase
      .from("rsvp")
      .update({ kehadiran: kehadiran === "hadir", ucapan })
      .eq("id", guestId);
    if (!error) setIsSubmitted(true);
    setIsSubmitting(false);
  };

  // ---- Loading ----
  if (isLoading) return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-serif">
      <div className="text-center">
        <div className="w-10 h-10 border border-[#8b7e6a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#8b7e6a] tracking-[0.2em] text-xs uppercase">Menyiapkan Undangan...</p>
      </div>
    </div>
  );

  // ---- Not found ----
  if (!guestData || !settings) return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6 text-center font-serif">
      <p className="text-slate-400 italic">Maaf, link undangan tidak valid atau acara telah berakhir.</p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Derived values — panggilan untuk cover/hero/penutup, lengkap untuk biodata
  // ---------------------------------------------------------------------------
  const panggilanPria = settings.panggilan_pria || settings.mempelai_pria || "";
  const panggilanWanita = settings.panggilan_wanita || settings.mempelai_wanita || "";
  const namaLengkapPria = settings.nama_lengkap_pria || settings.mempelai_pria || "";
  const namaLengkapWanita = settings.nama_lengkap_wanita || settings.mempelai_wanita || "";

  const sapaan = guestData.jenis_kelamin === "Laki-laki" ? "Bapak/Saudara" : "Ibu/Saudari";
  const tanggalFormatted = formatTanggal(settings.tanggal_acara);
  const waktuFormatted = formatWaktu(settings.waktu_acara);
  const linkMapBuka = settings.link_map
    ? settings.link_map.replace("/maps/embed", "/maps")
    : null;

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7 },
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#4a4238] font-serif overflow-x-hidden selection:bg-[#8b7e6a] selection:text-white">

      {/* ====== COVER — pakai PANGGILAN ====== */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-6 bg-cover bg-center will-change-transform"
            style={{ backgroundImage: `url('${IMG_COVER}')` }}
          >
            <div className="absolute inset-0 bg-black/55" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 text-white"
            >
              <p className="uppercase tracking-[0.4em] text-xs mb-6 font-sans opacity-80">
                The Wedding Of
              </p>
              {/* PANGGILAN di cover */}
              <div className="flex flex-col items-center mb-8 leading-none">
                <span className="text-4xl md:text-6xl font-light italic">{panggilanPria}</span>
                <span className="text-2xl md:text-3xl font-serif my-2 text-white/60">&amp;</span>
                <span className="text-4xl md:text-6xl font-light italic">{panggilanWanita}</span>
              </div>
              <div className="w-10 h-px bg-white/40 mx-auto mb-8" />
              <div className="mb-10">
                <p className="text-sm opacity-70 mb-1.5 font-sans tracking-wide">Yth. {sapaan}</p>
                <p className="text-2xl font-bold">{guestData.nama_tamu}</p>
              </div>
              <button
                onClick={() => setIsOpen(true)}
                className="bg-white/10 backdrop-blur-sm border border-white/40 text-white px-8 py-3 rounded-full text-xs font-bold font-sans uppercase tracking-widest hover:bg-white hover:text-[#4a4238] transition-all"
              >
                Buka Undangan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== HERO — pakai PANGGILAN ====== */}
      <section
        className="relative h-screen flex flex-col items-center justify-center text-center p-6 bg-cover bg-center"
        style={{ backgroundImage: `url('${IMG_HERO}')` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          transition={{ duration: 1.5 }} className="relative z-10 text-white"
        >
          <Heart className="mx-auto mb-6 text-white/50" size={28} />
          <p className="uppercase tracking-[0.3em] mb-4 text-xs font-sans">The Wedding Of</p>
          {/* PANGGILAN di hero */}
          <div className="flex flex-col items-center mb-6 leading-none">
            <span className="text-5xl md:text-8xl font-light">{panggilanPria}</span>
            <span className="text-3xl md:text-5xl my-2 text-white/40">&amp;</span>
            <span className="text-5xl md:text-8xl font-light">{panggilanWanita}</span>
          </div>
          <div className="w-10 h-px bg-white/40 mx-auto mb-6" />
          <p className="text-lg md:text-xl tracking-widest font-sans uppercase opacity-80">
            {tanggalFormatted}
          </p>
        </motion.div>
      </section>

      {/* ====== SALAM PEMBUKA ====== */}
      <section className="py-24 px-6 bg-[#faf9f6]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-[#8b7e6a] mb-6">
              Bismillahirrahmanirrahim
            </p>
            <OrnamentDivider />
            <p className="text-base md:text-lg text-[#4a4238]/80 leading-relaxed mt-8 mb-6 font-sans">
              Assalamu&apos;alaikum Warahmatullahi Wabarakatuh
            </p>
            <p className="text-sm md:text-base text-[#4a4238]/70 leading-loose font-sans max-w-xl mx-auto">
              Dengan memohon Rahmat dan Ridho Allah SWT, kami bermaksud mengundang{" "}
              <span className="font-semibold text-[#4a4238]">
                {sapaan} {guestData.nama_tamu}
              </span>{" "}
              untuk hadir dan memberikan doa restu pada acara resepsi pernikahan kami.
            </p>
            <OrnamentDivider />
          </motion.div>
        </div>
      </section>

      {/* ====== BIODATA MEMPELAI — pakai NAMA LENGKAP ====== */}
      <section className="py-16 px-6 bg-white border-y border-[#e5dfd3]">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Heart className="mx-auto mb-4 text-[#8b7e6a]" size={22} />
            <h2 className="text-3xl font-light italic mb-2">Mempelai</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Yang akan melangsungkan pernikahan
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Mempelai Pria */}
            <motion.div {...fadeUp}
              className="flex flex-col items-center text-center p-8 rounded-3xl border border-[#e5dfd3] bg-[#faf9f6]"
            >
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#8b7e6a] flex items-center justify-center mb-5 bg-[#f0ebe0]">
                <UserIcon size={40} className="text-[#8b7e6a]/50" />
              </div>
              <p className="text-[9px] font-sans uppercase tracking-[0.3em] text-[#8b7e6a] mb-1">
                Mempelai Pria
              </p>
              {/* NAMA LENGKAP di biodata */}
              <h3 className="text-2xl font-light italic text-[#4a4238] mb-1">
                {namaLengkapPria}
              </h3>
              <OrnamentDivider />
              {(settings.ayah_pria || settings.ibu_pria) && (
                <p className="text-xs font-sans text-slate-500 mt-3 leading-relaxed">
                  Putra dari{" "}
                  {settings.ayah_pria && (
                    <span className="text-[#4a4238] font-medium">{settings.ayah_pria}</span>
                  )}
                  {settings.ayah_pria && settings.ibu_pria && " & "}
                  {settings.ibu_pria && (
                    <span className="text-[#4a4238] font-medium">{settings.ibu_pria}</span>
                  )}
                </p>
              )}
            </motion.div>

            {/* Mempelai Wanita */}
            <motion.div {...fadeUp}
              className="flex flex-col items-center text-center p-8 rounded-3xl border border-[#e5dfd3] bg-[#faf9f6]"
            >
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#8b7e6a] flex items-center justify-center mb-5 bg-[#f0ebe0]">
                <UserIcon size={40} className="text-[#8b7e6a]/50" />
              </div>
              <p className="text-[9px] font-sans uppercase tracking-[0.3em] text-[#8b7e6a] mb-1">
                Mempelai Wanita
              </p>
              {/* NAMA LENGKAP di biodata */}
              <h3 className="text-2xl font-light italic text-[#4a4238] mb-1">
                {namaLengkapWanita}
              </h3>
              <OrnamentDivider />
              {(settings.ayah_wanita || settings.ibu_wanita) && (
                <p className="text-xs font-sans text-slate-500 mt-3 leading-relaxed">
                  Putri dari{" "}
                  {settings.ayah_wanita && (
                    <span className="text-[#4a4238] font-medium">{settings.ayah_wanita}</span>
                  )}
                  {settings.ayah_wanita && settings.ibu_wanita && " & "}
                  {settings.ibu_wanita && (
                    <span className="text-[#4a4238] font-medium">{settings.ibu_wanita}</span>
                  )}
                </p>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ====== DIGITAL PASS ====== */}
      <section className="py-24 px-6 bg-[#faf9f6]">
        <div className="max-w-md mx-auto">
          <motion.div {...fadeUp}
            className="p-8 border-2 border-dashed border-[#8b7e6a] rounded-[2rem] relative bg-white"
          >
            {guestData.jenis_tamu !== "Reguler" && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4a4238] text-white px-6 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg">
                {guestData.jenis_tamu} Guest
              </div>
            )}
            <div className="text-center mb-8">
              <QrCode className="mx-auto mb-4 text-[#8b7e6a]" size={28} strokeWidth={1.5} />
              <h3 className="text-2xl font-light mb-2">Digital Pass</h3>
              <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest leading-relaxed">
                Gunakan kode ini untuk akses masuk dan<br />pencatatan daftar hadir otomatis
              </p>
            </div>
            <div className="flex justify-center mb-10 p-4 border border-[#e5dfd3] rounded-3xl">
              <QRCode value={guestId} size={180} fgColor="#4a4238" bgColor="transparent" />
            </div>
            <div className="text-center pt-6 border-t border-slate-200">
              <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest mb-2">
                Tamu Undangan
              </p>
              <h4 className="text-xl font-bold tracking-tight text-slate-800">{guestData.nama_tamu}</h4>
              {guestData.alamat && (
                <p className="text-xs font-sans text-slate-500 mt-2 italic flex items-center justify-center gap-1">
                  <MapPin size={10} /> {guestData.alamat}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== INFO ACARA + COUNTDOWN ====== */}
      <section className="max-w-5xl mx-auto py-24 px-6">
        <motion.div {...fadeUp} className="text-center mb-16">
          <Heart className="mx-auto mb-4 text-[#8b7e6a]" size={22} />
          <h2 className="text-3xl font-light mb-2 italic">Save The Date</h2>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Kami mengundang Anda hadir pada
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">

          {/* Waktu + Countdown */}
          <motion.div {...fadeUp}
            className="bg-white p-10 rounded-3xl text-center border border-[#e5dfd3] flex flex-col justify-center gap-6"
          >
            <div>
              <Clock className="mx-auto mb-4 text-[#8b7e6a]" size={26} strokeWidth={1.5} />
              <h4 className="text-xl font-bold mb-4 uppercase tracking-widest">Waktu Acara</h4>
              <p className="font-bold text-[#4a4238] text-base font-sans">{tanggalFormatted}</p>
              <p className="text-sm text-slate-500 font-sans mt-1">{waktuFormatted} — Selesai</p>
            </div>
            <div>
              <p className="text-[10px] font-sans uppercase tracking-widest text-[#8b7e6a] mb-4">
                Menghitung Hari
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <CountdownBox value={countdown.hari} label="Hari" />
                <span className="text-[#8b7e6a] text-xl font-light">:</span>
                <CountdownBox value={countdown.jam} label="Jam" />
                <span className="text-[#8b7e6a] text-xl font-light">:</span>
                <CountdownBox value={countdown.menit} label="Menit" />
                <span className="text-[#8b7e6a] text-xl font-light">:</span>
                <CountdownBox value={countdown.detik} label="Detik" />
              </div>
            </div>
          </motion.div>

          {/* Lokasi + Maps */}
          <motion.div {...fadeUp}
            className="bg-white rounded-3xl text-center border border-[#e5dfd3] overflow-hidden"
          >
            {settings.link_map ? (
              <div className="w-full h-52">
                <iframe src={settings.link_map} width="100%" height="100%"
                  style={{ border: 0 }} allowFullScreen loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade" title="Lokasi Acara" />
              </div>
            ) : (
              <div className="w-full h-52 bg-[#f0ebe0] flex flex-col items-center justify-center gap-2 text-[#8b7e6a]">
                <MapPin size={28} strokeWidth={1.2} />
                <p className="text-[11px] font-sans tracking-wide opacity-60">Lokasi belum diatur</p>
              </div>
            )}
            <div className="p-8">
              <MapPin className="mx-auto mb-4 text-[#8b7e6a]" size={26} strokeWidth={1.5} />
              <h4 className="text-xl font-bold mb-3 uppercase tracking-widest">Lokasi Acara</h4>
              <p className="font-bold text-slate-800 text-base mb-6 font-sans">{settings.lokasi_acara}</p>
              {linkMapBuka && (
                <a href={linkMapBuka} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-[#8b7e6a] text-[#8b7e6a] px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#8b7e6a] hover:text-white transition-all font-sans"
                >
                  <MapPin size={12} /> Buka di Google Maps
                </a>
              )}
            </div>
          </motion.div>

        </div>
      </section>

      {/* ====== TURUT MENGUNDANG ====== */}
      <section className="py-20 px-6 bg-white border-y border-[#e5dfd3]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <Heart className="mx-auto mb-4 text-[#8b7e6a]" size={22} />
            <h2 className="text-3xl font-light italic mb-2">Turut Mengundang</h2>
            <OrnamentDivider />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="bg-[#faf9f6] rounded-2xl p-6 border border-[#e5dfd3]">
                <p className="text-[10px] font-sans uppercase tracking-widest text-[#8b7e6a] mb-3">
                  Keluarga Mempelai Pria
                </p>
                <p className="text-sm font-sans text-[#4a4238] leading-relaxed">
                  {settings.turut_pria || (
                    settings.ayah_pria
                      ? `${settings.ayah_pria}${settings.ibu_pria ? ` & ${settings.ibu_pria}` : ""} Sekeluarga`
                      : <span className="text-slate-400 italic">Belum diisi</span>
                  )}
                </p>
              </div>
              <div className="bg-[#faf9f6] rounded-2xl p-6 border border-[#e5dfd3]">
                <p className="text-[10px] font-sans uppercase tracking-widest text-[#8b7e6a] mb-3">
                  Keluarga Mempelai Wanita
                </p>
                <p className="text-sm font-sans text-[#4a4238] leading-relaxed">
                  {settings.turut_wanita || (
                    settings.ayah_wanita
                      ? `${settings.ayah_wanita}${settings.ibu_wanita ? ` & ${settings.ibu_wanita}` : ""} Sekeluarga`
                      : <span className="text-slate-400 italic">Belum diisi</span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== RSVP & UCAPAN ====== */}
      <section className="bg-[#f4eee0] py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <MessageSquare className="mx-auto mb-4 text-[#8b7e6a]" size={26} strokeWidth={1.5} />
            <h2 className="text-3xl font-light mb-2 italic">Buku Tamu</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#8b7e6a]/70">
              Berikan Doa Restu &amp; Konfirmasi Anda
            </p>
          </motion.div>

          {isSubmitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[2rem] text-center border border-green-100"
            >
              <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} strokeWidth={1} />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Terima Kasih!</h3>
              <p className="text-sm font-sans text-slate-500">
                Konfirmasi kehadiran dan ucapan doa Anda telah kami terima.
              </p>
            </motion.div>
          ) : (
            <motion.form {...fadeUp} onSubmit={handleSubmitRSVP}
              className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-[#e5dfd3] space-y-6"
            >
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Konfirmasi Kehadiran
                </label>
                <select value={kehadiran} onChange={(e) => setKehadiran(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#8b7e6a]/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="hadir">Ya, Saya Akan Hadir</option>
                  <option value="tidak">Mohon Maaf, Berhalangan Hadir</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Ucapan &amp; Doa Restu
                </label>
                <textarea required rows={5} value={ucapan}
                  onChange={(e) => setUcapan(e.target.value)}
                  placeholder="Tuliskan ucapan untuk kedua mempelai..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#8b7e6a]/20 transition-all resize-none"
                />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-[#4a4238] text-white py-5 rounded-2xl font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all disabled:opacity-40"
              >
                {isSubmitting ? "Mengirim..." : "Kirim Konfirmasi"}
              </button>
            </motion.form>
          )}
        </div>
      </section>

      {/* ====== PENUTUP — pakai PANGGILAN ====== */}
      <section className="py-24 px-6 bg-[#faf9f6] border-t border-[#e5dfd3]">
        <div className="max-w-xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <Heart className="mx-auto mb-6 text-[#8b7e6a]" size={24} fill="#8b7e6a" fillOpacity={0.3} />
            <p className="text-sm font-sans text-[#4a4238]/70 leading-loose mb-6">
              Merupakan suatu kebahagiaan dan kehormatan bagi kami apabila{" "}
              <span className="font-semibold text-[#4a4238]">{sapaan} {guestData.nama_tamu}</span>{" "}
              berkenan hadir dan memberikan doa restu. Atas kehadiran dan doa restunya,
              kami mengucapkan terima kasih.
            </p>
            <OrnamentDivider />
            <p className="text-xs font-sans text-[#8b7e6a] mt-6 mb-2 italic">Kami yang berbahagia,</p>
            {/* PANGGILAN di penutup */}
            <p className="text-2xl font-light italic text-[#4a4238]">
              {panggilanPria} &amp; {panggilanWanita}
            </p>
            <p className="text-xs font-sans text-slate-400 mt-6 italic">
              Wassalamu&apos;alaikum Warahmatullahi Wabarakatuh
            </p>
          </motion.div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="py-10 bg-white text-center border-t border-[#e5dfd3]">
        <p className="text-[10px] text-slate-300 font-sans uppercase tracking-[0.3em]">
          Built with Love by Madesign
        </p>
      </footer>

    </div>
  );
}