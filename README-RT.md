# Dashboard RT - Integrasi Pemasukan

Project ini tetap satu project Next.js.

## Backend
- `/api/sheet` tetap untuk Apps Script lama (Kas + Jimpitan).
- `/api/rt` baru untuk Apps Script RT (Warga + APP_MASTER + APP_PEMASUKAN + APP_WARGA_STATUS).

Apps Script RT Web App:
https://script.google.com/macros/s/AKfycbzUo7SGyd3Jk6AFyOb0NbY9VO5LdVY_QmG_QSD0-JjLBTycrHgZgbALHyjiNMoiT6KU/exec

## Halaman
- `/kas`
- `/jimpitan`
- `/pemasukan`

## Input Pemasukan
1. Pilih warga.
2. Pilih tanggal pembayaran.
3. Sistem mengambil kewajiban yang masih belum dibayar dari Apps Script RT.
4. Pilih satu atau beberapa kewajiban.
5. Klik Simpan Pemasukan.
6. Apps Script membuat baris APP_PEMASUKAN secara otomatis.

## Jalankan
```bash
npm install
npm run dev
```
