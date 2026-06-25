// ============================================================
// RBN BOARDING SYSTEM — TypeScript Types
// ============================================================

export type Cabang = 'Nusa Kambangan' | 'Soputan' | 'Pamogan';
export const CABANG_LIST: Cabang[] = ['Nusa Kambangan', 'Soputan', 'Pamogan'];

export type JenisKelamin = 'Laki-Laki' | 'Perempuan';
export type StatusKaryawan = 'aktif' | 'nonaktif' | 'resigned';
export type StatusInvitation = 'pending' | 'submitted' | 'approved' | 'rejected';
export type StatusKontrak = 'aktif' | 'berakhir' | 'diperbarui' | 'dibatalkan';
export type PilihanJawaban = 'a' | 'b' | 'c' | 'd';
export type StatusPendidikan =
  | 'Sedang menempuh pendidikan'
  | 'Sudah selesai menempuh pendidikan';

// Bentuk respons standar backend
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface User {
  id: number;
  nama: string;
  role: 'superadmin' | 'admin';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Invitation {
  id: number;
  token: string;
  cabang: Cabang;
  posisi: string;
  catatan: string | null;
  status: StatusInvitation;
  expires_at: string;
  created_by: number | null;
  created_at: string;
  test_slug?: string | null; // REVISI 6 — link tes pendek
  // Join dari karyawan (jika sudah submit)
  karyawan_id?: number | null;
  nama_lengkap?: string | null;
  no_whatsapp?: string | null;
  lulus_tes?: number | null;
  skor_tes?: string | null;
}

export interface InvitationVerify {
  valid: boolean;
  reason: string | null;
  invitation: {
    cabang: Cabang;
    posisi: string;
    catatan: string | null;
    status: StatusInvitation;
    expires_at: string;
  };
}

export interface Karyawan {
  id: number;
  invitation_id: number | null;
  nama_lengkap: string;
  nama_panggilan: string | null;
  jenis_kelamin: JenisKelamin;
  tanggal_lahir: string;
  provinsi_lahir: string | null;
  alamat_tinggal: string;
  no_whatsapp: string;
  no_ktp: string | null;
  foto_ktp_path: string | null;
  foto_diri_path: string | null;
  foto_ktp_url?: string | null;
  foto_diri_url?: string | null;
  status_pendidikan: StatusPendidikan | null;
  nama_sekolah: string | null;
  cabang: Cabang;
  posisi: string | null;
  tanggal_bergabung: string | null;
  skor_tes: string;
  lulus_tes: number;
  total_percobaan_tes: number;
  status: StatusKaryawan;
  invitation_status?: StatusInvitation | null;
  data_tambahan?: DataTambahan[]; // jawaban field kustom
  created_at: string;
  updated_at: string;
}

// ── FORM BUILDER ONBOARDING ─────────────────────────────
export type FieldTipe =
  | 'text'
  | 'textarea'
  | 'number'
  | 'tel'
  | 'date'
  | 'select'
  | 'radio'
  | 'file';

export interface FieldCondition {
  field: string; // field_key acuan
  op: '=' | '!=';
  value: string;
}

export interface FormField {
  id: number;
  field_key: string;
  label: string;
  tipe: FieldTipe;
  opsi: string[]; // untuk select/radio
  placeholder: string | null;
  bantuan: string | null;
  wajib: number; // 0/1
  aktif: number; // 0/1
  is_builtin: number; // 0/1 — tidak bisa dihapus
  is_locked: number; // 0/1 — field inti: selalu wajib & aktif
  kolom_db: string | null;
  urutan: number;
  show_if: FieldCondition | null;
  wajib_if: FieldCondition | null;
}

/** Jawaban field kustom (snapshot di karyawan.data_tambahan) */
export interface DataTambahan {
  key: string;
  label: string;
  tipe: FieldTipe;
  value: string;
  url?: string; // untuk tipe file
}

export interface TesSoal {
  id: number;
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  question_image?: string | null; // REVISI 4 — path gambar (relatif)
  question_image_url?: string | null; // URL penuh gambar
  jawaban_benar?: PilihanJawaban; // hanya untuk admin
  poin: number;
  urutan: number;
  aktif: number;
  created_at?: string;
}

export interface KontrakTemplate {
  id: number;
  original_name: string;
  uploaded_at: string;
}

export interface TesPengaturan {
  passing_grade: number;
  waktu_pengerjaan_menit: number;
  max_percobaan: number;
}

export interface SoalPublicResponse {
  soal: TesSoal[];
  pengaturan: TesPengaturan;
  sisa_percobaan: number | null;
}

export interface DetailJawaban {
  soal_id: number;
  pertanyaan: string;
  jawaban_user: PilihanJawaban | null;
  jawaban_benar: PilihanJawaban;
  benar: boolean;
  poin: number;
}

export interface HasilTes {
  hasil_id?: number;
  id?: number;
  karyawan_id?: number;
  lulus: boolean | number;
  skor_persen: number;
  total_benar: number;
  total_soal: number;
  total_poin?: number;
  maks_poin?: number;
  passing_grade: number;
  sisa_percobaan?: number | null;
  detail_jawaban?: DetailJawaban[];
  jawaban_json?: DetailJawaban[];
  dikerjakan_at?: string;
  nama_lengkap?: string;
  cabang?: Cabang;
}

export interface Kontrak {
  id: number;
  karyawan_id: number;
  nomor_kontrak: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  posisi: string;
  cabang: Cabang;
  gaji_pokok: string | null;
  status: StatusKontrak;
  kontrak_sebelumnya_id: number | null;
  catatan: string | null;
  created_by: number | null;
  created_at: string;
  // Join
  nama_lengkap?: string;
  nama_panggilan?: string | null;
  no_whatsapp?: string;
  sisa_hari?: number;
}

export interface KontrakDetailResponse {
  kontrak: Kontrak;
  chain_sebelum: Kontrak[];
  penerus: Kontrak[];
}

export interface KontrakPreviewResponse {
  text: string;
  using_template: boolean;
  template_name: string | null;
  warning: string | null;
  placeholders: Record<string, string>;
}

export interface KaryawanDetailResponse {
  karyawan: Karyawan;
  tes: HasilTes[];
  kontrak: Kontrak[];
}

export interface DashboardStats {
  total_karyawan_aktif: number;
  submission_pending: number;
  total_kontrak_aktif: number;
}
