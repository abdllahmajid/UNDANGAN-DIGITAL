"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, MessageSquare, QrCode, Heart, Clock } from "lucide-react";
import QRCode from "react-qr-code";

const IMG_COVER =
  "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=60&w=1200&fm=webp&fit=crop";
const IMG_HERO =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=60&w=1200&fm=webp&fit=crop";

const CheckCircle2 = ({ size, className, strokeWidth }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth || 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

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

  useEffect(() => {
    const img = new Image();
    img.src = IMG_HERO;
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      const { data: dataTamu } = await supabase
        .from("rsvp")
        .select("*")
        .eq("id", guestId)
        .single();

      if (dataTamu) {
        setGuestData(dataTamu);
        if (dataTamu.kehadiran !== null) setIsSubmitted(true);
      }

      const { data: dataSettings } = await supabase
        .from("wedding_settings")
        .select("*")
        .eq("id", 1)
        .single();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-serif">
        <div className="text-center">
          <div className="w-10 h-10 border border-[#8b7e6a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8b7e6a] tracking-[0.2em] text-xs uppercase">
            Menyiapkan Undangan...
          </p>
        </div>
      </div>
    );
  }

  if (!guestData || !settings) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6 text-center font-serif">
        <p className="text-slate-400 italic">
          Maaf, link undangan tidak valid atau acara telah berakhir.
        </p>
      </div>
    );
  }

  const sapaan =
    guestData.jenis_kelamin === "Laki-laki" ? "Bapak/Saudara" : "Ibu/Saudari";

  const linkMapBuka = settings.link_map
    ? settings.link_map.replace("/maps/embed", "/maps")
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#4a4238] font-serif overflow-x-hidden selection:bg-[#8b7e6a] selection:text-white">

      {/* COVER */}
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
              <div className="flex flex-col items-center mb-8 leading-none">
                <span className="text-4xl md:text-6xl font-light italic">
                  {settings.mempelai_pria}
                </span>
                <span className="text-2xl md:text-3xl font-serif my-2 text-white/60">
                  &amp;
                </span>
                <span className="text-4xl md:text-6xl font-light italic">
                  {settings.mempelai_wanita}
                </span>
              </div>
              <div className="w-10 h-px bg-white/40 mx-auto mb-8" />
              <div className="mb-10">
                <p className="text-sm opacity-70 mb-1.5 font-sans tracking-wide">
                  Yth. {sapaan}
                </p>
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

      {/* HERO */}
      <section
        className="relative h-screen flex flex-col items-center justify-center text-center p-6 bg-cover bg-center"
        style={{ backgroundImage: `url('${IMG_HERO}')` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="relative z-10 text-white"
        >
          <Heart className="mx-auto mb-6 text-white/50" size={28} />
          <p className="uppercase tracking-[0.3em] mb-4 text-xs font-sans">
            The Wedding Of
          </p>
          <div className="flex flex-col items-center mb-6 leading-none">
            <span className="text-5xl md:text-8xl font-light">
              {settings.mempelai_pria}
            </span>
            <span className="text-3xl md:text-5xl my-2 text-white/40">
              &amp;
            </span>
            <span className="text-5xl md:text-8xl font-light">
              {settings.mempelai_wanita}
            </span>
          </div>
          <div className="w-10 h-px bg-white/40 mx-auto mb-6" />
          <p className="text-lg md:text-xl tracking-widest font-sans uppercase opacity-80">
            {settings.tanggal_acara}
          </p>
        </motion.div>
      </section>

      {/* DIGITAL PASS */}
      <section className="py-24 px-6 bg-white border-b border-[#e5dfd3]">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 border-2 border-dashed border-[#8b7e6a] rounded-[2rem] relative bg-[#faf9f6]"
          >
            {guestData.jenis_tamu !== "Reguler" && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4a4238] text-white px-6 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg">
                {guestData.jenis_tamu} Guest
              </div>
            )}
            <div className="text-center mb-8">
              <QrCode
                className="mx-auto mb-4 text-[#8b7e6a]"
                size={28}
                strokeWidth={1.5}
              />
              <h3 className="text-2xl font-light mb-2">Digital Pass</h3>
              <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest leading-relaxed">
                Gunakan kode ini untuk akses masuk dan
                <br />
                pencatatan daftar hadir otomatis
              </p>
            </div>
            <div className="flex justify-center mb-10 p-4 border border-[#e5dfd3] rounded-3xl">
              <QRCode
                value={guestId}
                size={180}
                fgColor="#4a4238"
                bgColor="transparent"
              />
            </div>
            <div className="text-center pt-6 border-t border-slate-200">
              <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest mb-2">
                Tamu Undangan
              </p>
              <h4 className="text-xl font-bold tracking-tight text-slate-800">
                {guestData.nama_tamu}
              </h4>
              {guestData.alamat && (
                <p className="text-xs font-sans text-slate-500 mt-2 italic flex items-center justify-center gap-1">
                  <MapPin size={10} /> {guestData.alamat}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* INFO ACARA */}
      <section className="max-w-5xl mx-auto py-32 px-6">
        <div className="text-center mb-16">
          <Heart className="mx-auto mb-4 text-[#8b7e6a]" size={22} />
          <h2 className="text-3xl font-light mb-2 italic">Save The Date</h2>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Kami mengundang Anda hadir pada
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">

          {/* Waktu Acara */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-12 rounded-3xl text-center border border-[#e5dfd3] transition-all flex flex-col justify-center"
          >
            <Clock
              className="mx-auto mb-6 text-[#8b7e6a]"
              size={26}
              strokeWidth={1.5}
            />
            <h4 className="text-xl font-bold mb-4 uppercase tracking-widest">
              Waktu Acara
            </h4>
            <div className="space-y-1 font-sans text-sm text-slate-600">
              <p className="font-bold text-slate-800 text-base mb-2">
                {settings.tanggal_acara}
              </p>
              <p>{settings.waktu_acara}</p>
            </div>
          </motion.div>

          {/* Lokasi Acara */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl text-center border border-[#e5dfd3] transition-all overflow-hidden"
          >
            {settings.link_map ? (
              <div className="w-full h-52">
                <iframe
                  src={settings.link_map}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi Acara"
                />
              </div>
            ) : (
              <div className="w-full h-52 bg-[#f0ebe0] flex flex-col items-center justify-center gap-2 text-[#8b7e6a]">
                <MapPin size={28} strokeWidth={1.2} />
                <p className="text-[11px] font-sans tracking-wide opacity-60">
                  Lokasi belum diatur
                </p>
              </div>
            )}
            <div className="p-8">
              <MapPin
                className="mx-auto mb-4 text-[#8b7e6a]"
                size={26}
                strokeWidth={1.5}
              />
              <h4 className="text-xl font-bold mb-3 uppercase tracking-widest">
                Lokasi Acara
              </h4>
              <p className="font-bold text-slate-800 text-base mb-6 font-sans">
                {settings.lokasi_acara}
              </p>
              {linkMapBuka && (
                <a
                  href={linkMapBuka}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-[#8b7e6a] text-[#8b7e6a] px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#8b7e6a] hover:text-white transition-all font-sans"
                >
                  <MapPin size={12} />
                  Buka di Google Maps
                </a>
              )}
            </div>
          </motion.div>

        </div>
      </section>

      {/* RSVP & UCAPAN */}
      <section className="bg-[#f4eee0] py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <MessageSquare
              className="mx-auto mb-4 text-[#8b7e6a]"
              size={26}
              strokeWidth={1.5}
            />
            <h2 className="text-3xl font-light mb-2 italic">Buku Tamu</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#8b7e6a]/70">
              Berikan Doa Restu &amp; Konfirmasi Anda
            </p>
          </div>

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[2rem] text-center border border-green-100"
            >
              <CheckCircle2
                className="mx-auto mb-4 text-green-500"
                size={48}
                strokeWidth={1}
              />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Terima Kasih!
              </h3>
              <p className="text-sm font-sans text-slate-500">
                Konfirmasi kehadiran dan ucapan doa Anda telah kami terima.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmitRSVP}
              className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-[#e5dfd3] space-y-6"
            >
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Konfirmasi Kehadiran
                </label>
                <select
                  value={kehadiran}
                  onChange={(e) => setKehadiran(e.target.value)}
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
                <textarea
                  required
                  rows={5}
                  value={ucapan}
                  onChange={(e) => setUcapan(e.target.value)}
                  placeholder="Tuliskan ucapan untuk kedua mempelai..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#8b7e6a]/20 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4a4238] text-white py-5 rounded-2xl font-bold font-sans uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all disabled:opacity-40"
              >
                {isSubmitting ? "Mengirim..." : "Kirim Konfirmasi"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-white text-center">
        <p className="text-[10px] text-slate-300 font-sans uppercase tracking-[0.3em]">
          Built with Love by Langitan.co
        </p>
      </footer>

    </div>
  );
}