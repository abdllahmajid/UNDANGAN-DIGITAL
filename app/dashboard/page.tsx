"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import {
  Copy, Send, UserPlus, Download, RefreshCw, MapPin,
  Edit, Trash2, X, FileSpreadsheet, Info, MessageSquareText, Users,
} from "lucide-react";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// PDF styles
// ---------------------------------------------------------------------------
const pdfStyles = StyleSheet.create({
  page: { padding: 24, flexDirection: "column", alignItems: "center", backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  border: { position: "absolute", top: 10, left: 10, right: 10, bottom: 10, borderWidth: 1, borderColor: "#e5dfd3" },
  header: { alignItems: "center", marginBottom: 10, marginTop: 10, width: "100%" },
  weddingTitle: { fontSize: 10, color: "#8b7e6a", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" },
  coupleName: { fontSize: 20, color: "#4a4238", fontWeight: "bold", marginBottom: 15 },
  divider: { width: 40, height: 1, backgroundColor: "#8b7e6a", marginBottom: 15 },
  guestTitle: { fontSize: 9, color: "#666666", marginBottom: 4 },
  guestNamePdf: { fontSize: 16, fontWeight: "bold", color: "#4a4238", textTransform: "uppercase", textAlign: "center" },
  guestAddress: { fontSize: 9, color: "#666666", marginTop: 4, textAlign: "center" },
  vipBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#4a4238", color: "#ffffff", fontSize: 8, borderRadius: 4, fontWeight: "bold", letterSpacing: 1 },
  qrContainer: { marginVertical: 15, padding: 8, borderWidth: 1, borderColor: "#e5dfd3", borderRadius: 8 },
  qrImage: { width: 110, height: 110 },
  eventBox: { alignItems: "center", width: "100%", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e5dfd3" },
  eventText: { fontSize: 9, color: "#4a4238", marginBottom: 3 },
  eventBold: { fontSize: 9, fontWeight: "bold", color: "#4a4238", marginBottom: 3 },
  footerPdf: { position: "absolute", bottom: 20, fontSize: 7, color: "#aaaaaa", textAlign: "center", width: "100%" },
});

// ---------------------------------------------------------------------------
// PDF Card — menerima settings dari luar
// ---------------------------------------------------------------------------
const PdfCard = ({ guest, settings }: { guest: any; settings: any }) => (
  <Document>
    <Page size="A6" style={pdfStyles.page}>
      <View style={pdfStyles.border} />
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.weddingTitle}>The Wedding Of</Text>
        <Text style={pdfStyles.coupleName}>
          {settings
            ? `${settings.mempelai_pria} & ${settings.mempelai_wanita}`
            : ""}
        </Text>
        <View style={pdfStyles.divider} />
        <Text style={pdfStyles.guestTitle}>E-TICKET FOR</Text>
        <Text style={pdfStyles.guestNamePdf}>{guest.nama_tamu}</Text>
        {guest.alamat && (
          <Text style={pdfStyles.guestAddress}>{guest.alamat}</Text>
        )}
        {guest.jenis_tamu !== "Reguler" && (
          <Text style={pdfStyles.vipBadge}>{guest.jenis_tamu}</Text>
        )}
      </View>
      <View style={pdfStyles.qrContainer}>
        <Image
          style={pdfStyles.qrImage}
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${guest.id}`}
        />
      </View>
      <View style={pdfStyles.eventBox}>
        <Text style={pdfStyles.eventBold}>
          {settings ? settings.tanggal_acara : ""}
        </Text>
        <Text style={pdfStyles.eventText}>
          {settings ? settings.waktu_acara : ""}
        </Text>
        <Text style={pdfStyles.eventText}>
          {settings ? settings.lokasi_acara : ""}
        </Text>
      </View>
      <Text style={pdfStyles.footerPdf}>
        Scan QR Code ini pada saat kedatangan
      </Text>
    </Page>
  </Document>
);

// ---------------------------------------------------------------------------
// Helpers & shared styles
// ---------------------------------------------------------------------------
const inputCls =
  "w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

const Field = ({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
      {label}{optional && <span className="normal-case font-normal text-slate-400 ml-1">(opsional)</span>}
    </label>
    {children}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{children}</p>
);

const CardHead = ({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium text-slate-800">{title}</span>
    </div>
    {right}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filter, setFilter] = useState<"Semua" | "Hadir" | "Tidak" | "Belum">("Semua");
  const [formData, setFormData] = useState({ nama_tamu: "", jenis_tamu: "", jenis_kelamin: "", alamat: "" });
  const [editingGuest, setEditingGuest] = useState<any>(null);

  const defaultTemplate = `Assalamualaikum wr.wb.\n\nTanpa mengurangi rasa hormat, kami mengundang *[NAMA_TAMU]* untuk hadir di acara kami.\n\nLink undangan & tiket masuk:\n[LINK_UNDANGAN]\n\nTerima kasih.`;
  const [waTemplate, setWaTemplate] = useState(defaultTemplate);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // --- Data ---
  const fetchGuests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("rsvp")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) alert("Gagal memuat data: " + error.message);
    else if (data) setGuests(data);
    setIsLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("wedding_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (data) setSettings(data);
  };

  useEffect(() => {
    fetchGuests();
    fetchSettings();
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from("rsvp").insert([{
      nama_tamu: formData.nama_tamu,
      jenis_tamu: formData.jenis_tamu,
      jenis_kelamin: formData.jenis_kelamin,
      alamat: formData.alamat || null,
      kehadiran: null,
    }]);
    if (error) alert("Gagal menyimpan: " + error.message);
    else {
      setFormData({ nama_tamu: "", jenis_tamu: "", jenis_kelamin: "", alamat: "" });
      fetchGuests();
    }
    setIsLoading(false);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.from("rsvp").update({
      nama_tamu: editingGuest.nama_tamu,
      jenis_tamu: editingGuest.jenis_tamu,
      jenis_kelamin: editingGuest.jenis_kelamin,
      alamat: editingGuest.alamat || null,
    }).eq("id", editingGuest.id);
    if (error) alert("Gagal update: " + error.message);
    else { setEditingGuest(null); fetchGuests(); }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus tamu "${name}"?`)) return;
    setIsLoading(true);
    const { error } = await supabase.from("rsvp").delete().eq("id", id);
    if (!error) fetchGuests();
    setIsLoading(false);
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nama Lengkap", "Jenis Tamu (Reguler/VIP/VVIP)", "L/P", "Alamat"],
      ["Budi Santoso", "VIP", "L", "Jl. Sudirman No 10, Jakarta"],
      ["Siti Aminah", "Reguler", "P", "Perumahan Indah Blok B2"],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 5 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Tamu");
    XLSX.writeFile(wb, "Template_Bulk_Tamu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[];
        const insertData = rows.slice(1).map((row: any) => {
          const nama = row[0];
          if (!nama || typeof nama !== "string" || !nama.trim()) return null;
          return {
            nama_tamu: nama,
            jenis_tamu: row[1]?.toString().trim() || "Reguler",
            jenis_kelamin: row[2]?.toString().trim().toUpperCase() === "P" ? "Perempuan" : "Laki-laki",
            alamat: row[3]?.toString().trim() || null,
            kehadiran: null,
          };
        }).filter(Boolean);

        if (!insertData.length) return setErrorMsg("Data kosong atau format salah.");
        if (insertData.length > 50) return setErrorMsg("Maksimal 50 baris per upload.");

        const { error } = await supabase.from("rsvp").insert(insertData);
        error ? setErrorMsg("Gagal: " + error.message) : (setErrorMsg(""), fetchGuests());
      } catch {
        setErrorMsg("Gagal membaca file. Gunakan template yang disediakan.");
      }
      setIsLoading(false);
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleShareWA = (guest: any) => {
    const link = `${baseUrl}/undangan/${guest.id}`;
    const text = waTemplate
      .replace("[NAMA_TAMU]", guest.nama_tamu)
      .replace("[LINK_UNDANGAN]", link);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filteredGuests = guests.filter((g) => {
    if (filter === "Hadir") return g.kehadiran === true;
    if (filter === "Tidak") return g.kehadiran === false;
    if (filter === "Belum") return g.kehadiran === null;
    return true;
  });

  const stats = [
    { id: "Semua", label: "Total tamu", count: guests.length, dot: "bg-slate-400" },
    { id: "Hadir", label: "Hadir", count: guests.filter((g) => g.kehadiran === true).length, dot: "bg-emerald-500" },
    { id: "Tidak", label: "Tidak hadir", count: guests.filter((g) => g.kehadiran === false).length, dot: "bg-red-500" },
    { id: "Belum", label: "Belum RSVP", count: guests.filter((g) => g.kehadiran === null).length, dot: "bg-amber-400" },
  ];

  const ActionBtn = ({ onClick, title, className, children }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-colors ${className}`}
    >
      {children}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* Modal Edit */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <span className="text-sm font-medium text-slate-800">Edit data tamu</span>
              <button
                onClick={() => setEditingGuest(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-5 flex flex-col gap-4">
              <Field label="Nama lengkap">
                <input
                  type="text"
                  required
                  value={editingGuest.nama_tamu}
                  onChange={(e) => setEditingGuest({ ...editingGuest, nama_tamu: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jenis tamu">
                  <select
                    value={editingGuest.jenis_tamu}
                    onChange={(e) => setEditingGuest({ ...editingGuest, jenis_tamu: e.target.value })}
                    className={inputCls}
                  >
                    <option>Reguler</option>
                    <option>VIP</option>
                    <option>VVIP</option>
                  </select>
                </Field>
                <Field label="Kelamin">
                  <select
                    value={editingGuest.jenis_kelamin}
                    onChange={(e) => setEditingGuest({ ...editingGuest, jenis_kelamin: e.target.value })}
                    className={inputCls}
                  >
                    <option>Laki-laki</option>
                    <option>Perempuan</option>
                  </select>
                </Field>
              </div>
              <Field label="Alamat" optional>
                <textarea
                  rows={2}
                  value={editingGuest.alamat || ""}
                  onChange={(e) => setEditingGuest({ ...editingGuest, alamat: e.target.value })}
                  className={`${inputCls} resize-y`}
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="flex-1 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  Simpan perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="max-w-screen-xl mx-auto px-4 py-6 md:px-8 md:py-8">

        {/* Topbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-slate-500 tracking-wide">madesign</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500">Dashboard</span>
            <button
              onClick={fetchGuests}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id as any)}
              className={`text-left p-4 rounded-xl border bg-white transition-all ${filter === s.id ? "border-blue-500 ring-1 ring-blue-500/30" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{s.label}</span>
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              </div>
              <span className="text-2xl font-medium text-slate-900">{s.count}</span>
            </button>
          ))}
        </div>

        {/* Main layout */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* Sidebar */}
          <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-5">

            {/* Form tambah tamu */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
              <CardHead icon={<Users size={14} className="text-blue-500" />} title="Tambah tamu" />
              <form onSubmit={handleManualSubmit} className="p-4 flex flex-col gap-3">
                <Field label="Nama lengkap">
                  <input
                    type="text"
                    required
                    value={formData.nama_tamu}
                    onChange={(e) => setFormData({ ...formData, nama_tamu: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Jenis tamu">
                    <select
                      value={formData.jenis_tamu}
                      onChange={(e) => setFormData({ ...formData, jenis_tamu: e.target.value })}
                      className={inputCls}
                    >
                      <option value="" disabled hidden>Pilih</option>
                      <option>Reguler</option>
                      <option>VIP</option>
                      <option>VVIP</option>
                    </select>
                  </Field>
                  <Field label="Jenis Kelamin">
                    <select
                      value={formData.jenis_kelamin}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                      className={formData.jenis_kelamin === "" ? `${inputCls} text-slate-400` : inputCls}
                    >
                      <option value="" disabled hidden>Pilih</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </Field>
                </div>
                <Field label="Alamat" optional>
                  <textarea
                    rows={3}
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className={`${inputCls} resize-y`}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  <UserPlus size={14} />
                  Simpan tamu
                </button>
              </form>

              <div className="border-t border-slate-100 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <SectionLabel>Import Excel</SectionLabel>
                  <button
                    onClick={downloadExcelTemplate}
                    className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <FileSpreadsheet size={12} /> Unduh template
                  </button>
                </div>
                <label className="relative border border-dashed border-slate-200 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer block">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <p className="text-xs font-medium text-slate-500">Klik atau drop file .xlsx di sini</p>
                  <p className="text-[11px] text-slate-400 mt-1">Maks. 50 baris per upload</p>
                </label>
                {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              </div>
            </div>

            {/* Template WA */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-visible">
              <CardHead
                icon={<MessageSquareText size={14} className="text-emerald-500" />}
                title="Template WhatsApp"
                right={
                  <div className="group relative">
                    <Info size={14} className="text-slate-400 cursor-help" />
                    <div className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] rounded-lg z-50 leading-relaxed border border-slate-700">
                      Gunakan <code className="text-amber-300 bg-slate-700 px-1 rounded">[NAMA_TAMU]</code> dan <code className="text-amber-300 bg-slate-700 px-1 rounded">[LINK_UNDANGAN]</code> sebagai variabel.
                    </div>
                  </div>
                }
              />
              <div className="p-4">
                <textarea
                  rows={6}
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
                />
              </div>
            </div>
          </div>

          {/* Tabel tamu */}
          <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Data tamu ({filteredGuests.length})
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest pr-2">Aksi</span>
            </div>

            {filteredGuests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Users size={36} className="mb-3 opacity-20" />
                <p className="text-sm">Tidak ada data tamu.</p>
              </div>
            ) : (
              filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0"
                >
                  {/* Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${guest.kehadiran === true ? "bg-emerald-500" : guest.kehadiran === false ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate">{guest.nama_tamu}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                          {guest.jenis_kelamin === "Laki-laki" ? "L" : "P"}
                        </span>
                        {guest.jenis_tamu !== "Reguler" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-semibold">
                            {guest.jenis_tamu}
                          </span>
                        )}
                      </div>
                      {guest.alamat && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-xs">
                          <MapPin size={9} />
                          {guest.alamat}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Tombol download PDF — settings dioper sebagai prop */}
                    <PDFDownloadLink
                      document={<PdfCard guest={guest} settings={settings} />}
                      fileName={`Tiket-${guest.nama_tamu}.pdf`}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
                      title="Unduh tiket PDF"
                    >
                      {/* @ts-ignore */}
                      {({ loading }) =>
                        loading ? <span className="text-[10px]">...</span> : <Download size={14} />
                      }
                    </PDFDownloadLink>

                    <ActionBtn
                      onClick={() => navigator.clipboard.writeText(`${baseUrl}/undangan/${guest.id}`)}
                      title="Copy link"
                      className="text-blue-500"
                    >
                      <Copy size={14} />
                    </ActionBtn>

                    <ActionBtn
                      onClick={() => handleShareWA(guest)}
                      title="Kirim WhatsApp"
                      className="text-emerald-500"
                    >
                      <Send size={14} />
                    </ActionBtn>

                    <div className="w-px h-4 bg-slate-200 mx-1" />

                    <ActionBtn
                      onClick={() => setEditingGuest(guest)}
                      title="Edit"
                      className="text-slate-400 hover:text-amber-600"
                    >
                      <Edit size={14} />
                    </ActionBtn>

                    <ActionBtn
                      onClick={() => handleDelete(guest.id, guest.nama_tamu)}
                      title="Hapus"
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </ActionBtn>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}