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

export async function getMaster() {
  return rtFetch('?action=master');
}

export async function getPemasukan() {
  return rtFetch('?action=pemasukan');
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
