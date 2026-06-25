// ============================================================
// RBN BOARDING SYSTEM — API CLIENT
// Semua fetch ke backend PHP. Token JWT dilampirkan sebagai
// Authorization: Bearer <token>.
//
// Token disimpan di:
//  - localStorage 'rbn_token'  -> dipakai client untuk header Bearer
//  - cookie httpOnly 'rbn_auth_token' (via /api/set-cookie) -> dipakai middleware
// ============================================================

import type {
  ApiResponse,
  DashboardStats,
  HasilTes,
  Invitation,
  InvitationVerify,
  Karyawan,
  KaryawanDetailResponse,
  Kontrak,
  KontrakDetailResponse,
  KontrakPreviewResponse,
  KontrakTemplate,
  LoginResponse,
  SoalPublicResponse,
  TesPengaturan,
  TesSoal,
  User,
} from '@/types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'rbn_token';
const USER_KEY = 'rbn_user';

export class ApiError extends Error {
  status: number;
  errors?: string[];
  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// ── Token & session helpers ─────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

/** Simpan sesi: localStorage + cookie httpOnly (via Next route). */
export async function saveSession(token: string, user: User): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  await fetch('/api/set-cookie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

/** Hapus sesi: localStorage + cookie. */
export async function clearSession(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  await fetch('/api/logout', { method: 'POST' });
}

// ── Core request ────────────────────────────────────────
interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  auth?: boolean; // lampirkan Bearer (default true)
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, auth = true } = opts;

  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi.', 0);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    if (!res.ok) throw new ApiError(`Error ${res.status}`, res.status);
  }

  if (!res.ok || (json && json.success === false)) {
    const msg = json?.message || `Permintaan gagal (${res.status}).`;
    // 401 di sisi admin -> bersihkan sesi
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    throw new ApiError(msg, res.status, json?.errors);
  }

  return (json?.data ?? (null as unknown)) as T;
}

// ── AUTH ────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login.php', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

// ── ONBOARDING ──────────────────────────────────────────
export function listInvitations(): Promise<Invitation[]> {
  return request<Invitation[]>('/api/onboarding/index.php');
}

export function createInvitation(payload: {
  cabang: string;
  posisi: string;
  catatan?: string;
  expires_in_days: number;
}): Promise<Invitation> {
  return request<Invitation>('/api/onboarding/index.php', { method: 'POST', body: payload });
}

export function deleteInvitation(id: number): Promise<null> {
  return request<null>(`/api/onboarding/index.php?id=${id}&_method=DELETE`, {
    method: 'POST',
    body: { _method: 'DELETE', id },
  });
}

export function verifyInvitation(token: string): Promise<InvitationVerify> {
  return request<InvitationVerify>(`/api/onboarding/verify.php?token=${encodeURIComponent(token)}`, {
    auth: false,
  });
}

export function submitOnboarding(form: FormData): Promise<{ karyawan_id: number }> {
  return request<{ karyawan_id: number }>('/api/onboarding/submit.php', {
    method: 'POST',
    body: form,
    isFormData: true,
    auth: false,
  });
}

// ── TES ─────────────────────────────────────────────────
export function getSoalPublic(token: string, karyawanId: number): Promise<SoalPublicResponse> {
  return request<SoalPublicResponse>(
    `/api/tes/soal.php?token=${encodeURIComponent(token)}&karyawan_id=${karyawanId}`,
    { auth: false },
  );
}

export function getSoalAdmin(): Promise<TesSoal[]> {
  return request<TesSoal[]>('/api/tes/soal.php');
}

export function createSoal(payload: Partial<TesSoal>): Promise<{ id: number }> {
  return request<{ id: number }>('/api/tes/soal.php', { method: 'POST', body: payload });
}

export function updateSoal(id: number, payload: Partial<TesSoal>): Promise<null> {
  return request<null>(`/api/tes/soal.php?id=${id}`, { method: 'PUT', body: payload });
}

export function reorderSoal(reorder: { id: number; urutan: number }[]): Promise<null> {
  // id query hanya placeholder; backend memproses array reorder
  return request<null>('/api/tes/soal.php?id=0', { method: 'PUT', body: { reorder } });
}

export function deleteSoal(id: number): Promise<null> {
  return request<null>(`/api/tes/soal.php?id=${id}&_method=DELETE`, {
    method: 'POST',
    body: { _method: 'DELETE', id },
  });
}

// REVISI 4 — upload gambar lampiran soal (multipart). Mengembalikan path + url.
export function uploadSoalGambar(file: File): Promise<{ path: string; url: string }> {
  const fd = new FormData();
  fd.append('gambar', file);
  return request<{ path: string; url: string }>('/api/tes/upload-gambar.php', {
    method: 'POST',
    body: fd,
    isFormData: true,
  });
}

export function getPengaturan(): Promise<TesPengaturan> {
  return request<TesPengaturan>('/api/tes/pengaturan.php');
}

export function updatePengaturan(payload: TesPengaturan): Promise<TesPengaturan> {
  return request<TesPengaturan>('/api/tes/pengaturan.php', { method: 'PUT', body: payload });
}

export function kerjakanTes(payload: {
  karyawan_id: number;
  jawaban: { soal_id: number; jawaban: string }[];
}): Promise<HasilTes> {
  return request<HasilTes>('/api/tes/kerjakan.php', { method: 'POST', body: payload, auth: false });
}

export function getHasilTes(karyawanId?: number): Promise<HasilTes[]> {
  const q = karyawanId ? `?karyawan_id=${karyawanId}` : '';
  return request<HasilTes[]>(`/api/tes/hasil.php${q}`);
}

// ── KARYAWAN ────────────────────────────────────────────
export function listKaryawan(params: {
  cabang?: string;
  status?: string;
  status_tes?: string;
  search?: string;
} = {}): Promise<Karyawan[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const q = qs.toString();
  return request<Karyawan[]>(`/api/karyawan/index.php${q ? `?${q}` : ''}`);
}

export function getKaryawanDetail(id: number): Promise<KaryawanDetailResponse> {
  return request<KaryawanDetailResponse>(`/api/karyawan/detail.php?id=${id}`);
}

export function updateKaryawanStatus(id: number, status: string): Promise<null> {
  return request<null>(`/api/karyawan/index.php?id=${id}`, { method: 'PUT', body: { status } });
}

export function deleteKaryawan(id: number): Promise<null> {
  return request<null>(`/api/karyawan/index.php?id=${id}&_method=DELETE`, {
    method: 'POST',
    body: { _method: 'DELETE', id },
  });
}

export function approveKaryawan(payload: {
  karyawan_id: number;
  action: 'approved' | 'rejected';
  catatan?: string;
}): Promise<null> {
  return request<null>('/api/karyawan/approve.php', { method: 'POST', body: payload });
}

// ── KONTRAK ─────────────────────────────────────────────
export function listKontrak(params: {
  status?: string;
  cabang?: string;
  karyawan_id?: number;
} = {}): Promise<Kontrak[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, String(v));
  });
  const q = qs.toString();
  return request<Kontrak[]>(`/api/kontrak/index.php${q ? `?${q}` : ''}`);
}

export function createKontrak(payload: {
  karyawan_id: number;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  posisi: string;
  cabang: string;
  gaji_pokok?: number;
  catatan?: string;
}): Promise<Kontrak> {
  return request<Kontrak>('/api/kontrak/buat.php', { method: 'POST', body: payload });
}

export function getKontrakDetail(id: number): Promise<KontrakDetailResponse> {
  return request<KontrakDetailResponse>(`/api/kontrak/detail.php?id=${id}`);
}

export function getKontrakPreview(id: number): Promise<KontrakPreviewResponse> {
  return request<KontrakPreviewResponse>(`/api/kontrak/preview.php?kontrak_id=${id}`);
}

export function deleteKontrak(id: number): Promise<null> {
  return request<null>(`/api/kontrak/index.php?id=${id}&_method=DELETE`, {
    method: 'POST',
    body: { _method: 'DELETE', id },
  });
}

// REVISI 3 — template kontrak (.doc/.docx)
export function getKontrakTemplate(): Promise<KontrakTemplate | null> {
  return request<KontrakTemplate | null>('/api/kontrak/template.php');
}

export function uploadKontrakTemplate(file: File): Promise<{ id: number; original_name: string }> {
  const fd = new FormData();
  fd.append('template', file);
  return request<{ id: number; original_name: string }>('/api/kontrak/template.php', {
    method: 'POST',
    body: fd,
    isFormData: true,
  });
}

/** Unduh surat kontrak (.docx/.doc) hasil isi template. Memicu download di browser. */
export async function downloadKontrakDoc(kontrakId: number, nomorKontrak: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/kontrak/generate-doc.php?kontrak_id=${kontrakId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = 'Gagal membuat dokumen kontrak.';
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {
      /* respons biner */
    }
    throw new ApiError(msg, res.status);
  }
  const blob = await res.blob();
  const ext = blob.type.includes('wordprocessingml') ? 'docx' : 'doc';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kontrak_${nomorKontrak.replace(/[^A-Za-z0-9]+/g, '_')}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function perpanjangKontrak(payload: {
  kontrak_id: number;
  tanggal_mulai_baru: string;
  tanggal_berakhir_baru: string;
  gaji_pokok?: number;
  catatan?: string;
}): Promise<Kontrak> {
  return request<Kontrak>('/api/kontrak/perpanjang.php', { method: 'POST', body: payload });
}

export function getExpiringKontrak(hari = 30): Promise<Kontrak[]> {
  return request<Kontrak[]>(`/api/kontrak/expiring.php?hari=${hari}`);
}

// ── DASHBOARD (agregasi di client) ──────────────────────
export async function getDashboardStats(): Promise<DashboardStats> {
  const [karyawan, invitations, kontrak] = await Promise.all([
    listKaryawan({ status: 'aktif' }),
    listInvitations(),
    listKontrak({ status: 'aktif' }),
  ]);
  return {
    total_karyawan_aktif: karyawan.length,
    submission_pending: invitations.filter((i) => i.status === 'submitted').length,
    total_kontrak_aktif: kontrak.length,
  };
}
