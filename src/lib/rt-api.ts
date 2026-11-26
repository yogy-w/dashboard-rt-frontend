export type Warga = {
  nik: string;
  nama: string;
};

export type PiutangItem = {
  tipe: 'IURAN' | 'SANTUNAN' | 'ACARA' | string;
  masterId: string;
  namaItem: string;
  tanggal: string | null;
  periodeBulan: string;
  periodeTahun: number;
  nominal: number;
  keterangan?: string;
  penerimaNik?: string;
  penerimaNama?: string;
};

async function rtFetch(
  path: string,
  options?: RequestInit
) {
  const response = await fetch(`/api/rt${path}`, {
    ...options,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request RT gagal');
  }

  return data;
}

export async function getWarga() {
  return rtFetch('?action=warga') as Promise<{
    success: boolean;
    rows: Warga[];
  }>;
}

export async function getPiutang(
  nik: string,
  tanggal: string
) {
  return rtFetch(
    `?action=piutang&nik=${encodeURIComponent(nik)}&tanggal=${encodeURIComponent(tanggal)}`
  ) as Promise<{
    success: boolean;
    nik: string;
    nama: string;
    rows: PiutangItem[];
  }>;
}


export type TunggakanDetail = {
  namaItem: string;
  tanggal: string | null;
  periodeBulan: string;
  periodeTahun: number;
  nominal: number;
  keterangan?: string;
  penerimaNama?: string;
};

export type TunggakanGroup = {
  total: number;
  detail: TunggakanDetail[];
};

export type TunggakanWarga = {
  nik: string;
  nama: string;
  iuran: TunggakanGroup;
  santunan: TunggakanGroup;
  other: TunggakanGroup;
  total: number;
};

export async function getTunggakan(tanggal: string) {
  return rtFetch(
    `?action=tunggakan&tanggal=${encodeURIComponent(tanggal)}`
  ) as Promise<{
    success: boolean;
    jumlahWarga: number;
    totalTunggakan: number;
    rows: TunggakanWarga[];
  }>;
}


export async function refreshTunggakan() {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refresh_tunggakan' }),
  }) as Promise<{
    success: boolean;
    jumlahWarga?: number;
    jumlahDetail?: number;
    totalTunggakan?: number;
    updatedAt?: string;
  }>;
}


export type WargaAktifPenerima = {
  nik: string;
  nama: string;
};

export async function getWargaAktifPenerima() {
  return rtFetch('?action=warga_aktif_penerima') as Promise<{
    success: boolean;
    rows: WargaAktifPenerima[];
  }>;
}

export async function getMaster() {
  return rtFetch('?action=master');
}

export type PemasukanRow = {
  id: string;
  tanggal: string | null;
  periodeBulan: string;
  periodeTahun: number;
  tipe: string;
  masterId: string;
  nik: string;
  nama: string;
  keterangan: string;
  nominal: number;
};

export async function getPemasukan() {
  return rtFetch('?action=pemasukan') as Promise<{
    success: boolean;
    rows: PemasukanRow[];
  }>;
}

export async function simpanPemasukan(payload: {
  action: 'simpan_pemasukan';
  nik: string;
  items: Array<{
    masterId: string;
    tanggal: string;
    periodeBulan: string;
    periodeTahun: number;
    keterangan?: string;
  }>;
}) {
  return rtFetch('', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}


export async function simpanJimpitan(payload: {
  masterId: string;
  tanggal: string;
  keterangan?: string;
  nominal: number;
}) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'simpan_jimpitan', ...payload }),
  });
}


export type KategoriPengeluaran = {
  id: string;
  nama: string;
  status: boolean;
};

export type PengeluaranRow = {
  rowNumber?: number;
  bulan: string;
  tanggal: string | null;
  kategori: string;
  keterangan: string;
  nominal: number;
};

export async function getKategoriPengeluaran() {
  return rtFetch('?action=kategori_pengeluaran') as Promise<{
    success: boolean;
    rows: KategoriPengeluaran[];
  }>;
}

export async function tambahKategoriPengeluaran(nama: string) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'tambah_kategori_pengeluaran', nama }),
  });
}

export async function ubahStatusKategoriPengeluaran(id: string, status: boolean) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ubah_status_kategori_pengeluaran', id, status }),
  });
}

export async function getPengeluaran() {
  return rtFetch('?action=pengeluaran') as Promise<{
    success: boolean;
    rows: PengeluaranRow[];
  }>;
}

export async function simpanPengeluaran(payload: {
  tanggal: string;
  kategori: string;
  keterangan: string;
  nominal: number;
}) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'simpan_pengeluaran', ...payload }),
  });
}


export async function simpanDonasi(payload: { tanggal: string; namaDonatur: string; nominal: number; keterangan?: string }) {
  return rtFetch('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'simpan_donasi', ...payload }) });
}

export type MasterPemasukanRow = {
  id: string;
  tipe: 'IURAN' | 'JIMPITAN' | 'SANTUNAN' | 'ACARA' | string;
  namaItem: string;
  nikPenerima: string;
  namaPenerima: string;
  kodeRef: string;
  tanggal: string | null;
  nominal: number;
  status: boolean;
  keterangan: string;
};

export async function tambahMasterPemasukan(payload: {
  tipe: string;
  namaItem: string;
  nikPenerima?: string;
  namaPenerima?: string;
  kodeRef?: string;
  tanggal: string;
  nominal: number;
  keterangan?: string;
}) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'tambah_master', ...payload }),
  }) as Promise<{ success: boolean; message?: string; row?: MasterPemasukanRow }>;
}

export async function ubahStatusMasterPemasukan(id: string, status: boolean) {
  return rtFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ubah_status_master', id, status }),
  }) as Promise<{ success: boolean; message?: string }>;
}


// Checklist Iuran: data dihitung server-side dari APP_WARGA_STATUS dan APP_PEMASUKAN.
export type ChecklistIuranCell = { status: 'PAID' | 'MIGRATED' | 'UNPAID' | 'NOT_DUE' };
export type ChecklistIuranRow = { nik: string; nama: string; bulan: ChecklistIuranCell[] };

export async function getChecklistIuran(tahun: number) {
  return rtFetch(`?action=checklist_iuran&tahun=${encodeURIComponent(String(tahun))}`) as Promise<{
    success: boolean;
    tahun: number;
    rows: ChecklistIuranRow[];
  }>;
}


export type ReportCell = { status: 'PAID' | 'MIGRATED' | 'UNPAID' | 'NOT_DUE' | 'RECEIVER' };
export type ReportMatrixRow = { nik: string; nama: string; cells: ReportCell[] };
export type ReportColumn = { id: string; label: string; subtitle?: string };
export type ReportMatrixResult = { tahun: number; columns: ReportColumn[]; rows: ReportMatrixRow[] };

export async function getReportDansos(tahun: number) {
  return rtFetch(`?action=report_dansos&tahun=${tahun}`) as Promise<ReportMatrixResult & { success: boolean }>;
}
export async function getReportSantunan(tahun: number) {
  return rtFetch(`?action=report_santunan&tahun=${tahun}`) as Promise<ReportMatrixResult & { success: boolean }>;
}
