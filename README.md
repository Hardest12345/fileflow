# HestFile

**Hest** berasal dari “Hardest”; **File** mewakili file yang dikelola.

Website React berbahasa Indonesia untuk pekerjaan file sehari-hari. Desain mandiri, terinspirasi cakupan alat 11zon. Kode siap diimpor ke workspace dan Vercel; tidak membutuhkan Supabase atau database.

## Mulai di komputer sendiri

Prasyarat: Node.js 22 LTS atau lebih baru, npm, browser modern (Chrome/Edge/Firefox terbaru). Node 24 juga didukung.

1. Ekstrak ZIP dan buka folder `hestfile` di VS Code / workspace.
2. Jalankan:

```bash
npm ci
npm run dev
```

3. Buka URL localhost yang tercetak di terminal.

`npm run dev` menjalankan frontend. Endpoint `/api/office` hanya tersedia di Vercel atau dengan `npx vercel dev` setelah konfigurasi environment. Alat lokal tidak memerlukan endpoint tersebut.

```bash
npm test
npm run build
npm run preview
```

Build mengeluarkan `dist/` dan menghasilkan arsip kode sumber untuk tautan footer. Jangan membuka `index.html` lewat `file://`; gunakan server Vite.

## Deploy ke Vercel

1. Upload kode ke repository Git milikmu (jangan commit `.env`, `node_modules`, atau `dist`).
2. Vercel → Add New Project → Import repository.
3. Framework **Vite**, Build **npm run build**, Output **dist**, Node **22.x** atau **24.x**.
4. Deploy. Semua alat lokal sudah dapat dipakai tanpa environment variable.
5. Jika membutuhkan Word/PPT/Excel ke PDF, konfigurasi server berikut lalu redeploy.

Alternatif melalui CLI: dari direktori proyek jalankan `npx vercel`, lalu `npx vercel --prod`. Deployment belum dilakukan dalam paket ini.

## Word / PPT / Excel ke PDF: server Gotenberg

LibreOffice tidak cocok dijalankan sebagai binary besar dalam Vercel Function. Paket ini menyertakan proxy `/api/office.js` menuju Gotenberg 8 yang kamu host di layanan container / VPS. Gotenberg memproses file sementara; kode HestFile tidak menulis file ke disk atau database.

Contoh di VPS dengan Docker, di belakang reverse proxy HTTPS:

```bash
docker run -d --name hestfile-gotenberg --restart unless-stopped \
  -p 127.0.0.1:3000:3000 gotenberg/gotenberg:8 \
  gotenberg --api-timeout=45s --libreoffice-disable-routes=false \
  --chromium-disable-routes=true
```

Pasang reverse proxy (Caddy/nginx) dengan HTTPS dan Basic Authentication di depan port localhost tersebut. Jangan mengekspos port Gotenberg langsung ke internet. Atur autentikasi menggunakan username/password yang sama dengan environment di Vercel. Pastikan konversi LibreOffice bisa mengakses font yang dokumenmu gunakan; font yang tidak tersedia dapat berubah.

Isi Vercel → Settings → Environment Variables (atau `.env.local` untuk `vercel dev`):

```dotenv
GOTENBERG_URL=https://office.domainmu.com
GOTENBERG_USERNAME=hestfile
GOTENBERG_PASSWORD=kata-sandi-reverse-proxy-yang-kuat
OFFICE_ACCESS_KEY=kunci-acak-panjang-yang-berbeda
```

Jangan menggunakan awalan `VITE_` untuk rahasia. API memerlukan HTTPS upstream, membatasi tipe/ukuran unggahan, memeriksa kunci akses, dan memakai timeout. Masukkan `OFFICE_ACCESS_KEY` pada dialog alat Office; kunci tidak disimpan di localStorage. Ini kunci bersama untuk pemakaian pribadi, bukan sistem akun multiuser. Tambahkan autentikasi pengguna dan pembatasan request melalui penyedia hosting jika nanti situs digunakan secara luas.

File Office melewati infrastruktur Vercel dan Gotenberg. Retensi infrastruktur/log/backup mengikuti konfigurasi penyedia; jangan mengaktifkan pencatatan isi request. Aplikasi mengirim `Cache-Control: no-store`. Batas 4 MB dipilih agar multipart tetap di bawah batas body Vercel Functions. Hosting container Gotenberg dapat menimbulkan biaya terpisah.

## Alat yang disertakan

| Alat | Cara kerja / batas |
| --- | --- |
| Kompres PDF | Render halaman sebagai JPEG, kemas PDF baru. Teks pilihan, vektor, tautan, metadata, form, dan aksesibilitas tidak dipertahankan. Maks. 150 halaman. File asli dikembalikan jika hasil lebih besar. |
| Kompres gambar | Canvas JPEG/WebP dengan kualitas pilihan; PNG encode ulang tanpa kehilangan kualitas. Tidak menjamin ukuran lebih kecil. |
| Gabung PDF | PDF-lib, urutan file dapat diubah; minimal 2 file. |
| Hapus background | IMG.LY isnet FP32 (Detail tinggi) / FP16 (Seimbang) di browser. Patch alpha mencegah nilai prediksi negatif berubah menjadi bercak pekat. Pembersihan bercak kecil / subjek terbesar, pratinjau latar transparan-putih-gelap; maks. 24 megapiksel. Model besar memerlukan internet dan memori memadai. |
| Word/PPT/Excel ke PDF | Gotenberg via API Vercel; perlu konfigurasi; maksimal 4 MB. |
| OCR PDF ke Word | Tesseract Indonesia + Inggris pada setiap halaman; keluaran DOCX berisi teks per halaman, bukan tata letak asli; maks. 30 halaman. |
| PDF ke Word | Ekstrak teks digital via PDF.js ke DOCX; gunakan OCR untuk scan. Maks. 150 halaman. |
| Gambar ke PDF | JPG/PNG/WebP menjadi halaman A4; latar transparan menjadi putih. |
| PDF ke JPG | Render setiap halaman ke gambar di arsip ZIP; maks. 150 halaman. |
| Pisah/ekstrak PDF | Pilih rentang, misalnya `3,1-2`; kosong = semua. |
| Putar PDF | Semua halaman diputar 90/180/270 derajat. |
| Watermark PDF | Teks Latin pada semua halaman. |
| Konversi gambar | JPG, PNG, WebP; input JPG/PNG/WebP. |
| Ubah ukuran gambar | Lebar 1–10000 px, tinggi proporsional; maks. hasil 40 megapiksel. |
| Kompres Word/PPT | JPEG internal DOCX/PPTX dikompres ulang; gambar PNG/diagram/teks tidak direduksi. Bukan untuk DOC/PPT lama. Arsip diperiksa maksimal ekspansi 150 MB. |
| Buat ZIP | Semua tipe file termasuk DOC/PPT/PDF, maksimal 30 file. Tidak mengubah format asli. File sudah terkompres bisa hampir tidak berkurang. |

Total file lokal maksimal 100 MB. File gambar maksimal 40 megapiksel. Batas tersebut bukan jaminan keberhasilan pada perangkat dengan memori terbatas. PDF terkunci/enkripsi harus dibuka terlebih dahulu. Selalu simpan file asli dan periksa hasil konversi.

Kompresi universal tanpa kehilangan informasi tidak mungkin menjamin setiap file menjadi lebih kecil. Khusus dokumen lama, ZIP menjadi pilihan arsip; konversi DOC ke PDF berbeda dari kompresi DOC.

## Penyimpanan dan privasi

- File lokal diproses dalam memori browser, tidak dikirim ke backend.
- OCR mengunduh worker/WASM/data bahasa Tesseract. Hapus background mengunduh model IMG.LY. Penyedia aset menerima request jaringan untuk aset, bukan isi file.
- Model dapat dicache browser. File pengguna dan hasil tidak disimpan di localStorage/IndexedDB oleh kode aplikasi.
- URL hasil dicabut ketika hasil diganti, dibersihkan, atau dialog ditutup. File yang sudah diunduh ke perangkat tetap ada sesuai pilihan pengguna.
- Tidak ada analytics, Supabase, login, atau database. Font Google dimuat dari jaringan.
- Supabase belum diperlukan. Jika nanti ditambah unggahan besar, gunakan bucket privat, signed URL singkat, dan job penghapusan objek yang benar-benar berjalan; TTL URL saja tidak menghapus file.

## Struktur

```text
src/main.jsx          UI, dialog, validasi interaksi, unduhan
src/catalog.js        Daftar alat dan keterangan
src/processor.js      Pemrosesan PDF/gambar/OCR/ZIP
src/utils.js          Rentang halaman dan validasi file
src/background-removal.js  Normalisasi foto, segmentasi, komposisi PNG
src/background-mask.js     Pembersihan mask dan komposisi alpha
public/brand/              Logo SVG dan favicon HestFile
scripts/patch-imgly.mjs    Perbaikan saturasi alpha IMG.LY 1.7.0
src/style.css         Desain responsif
api/office.js         Proxy Office Vercel
scripts/package-source.mjs  Arsip source yang disajikan di footer
tests/core.test.js    Tes proses PDF, ZIP, validasi, dan API
vercel.json           Konfigurasi deploy
.env.example          Contoh environment tanpa rahasia
```

## Verifikasi paket ini

Build produksi dan tes otomatis dijalankan di Node 24. Tes meliputi gabung/ekstrak/putar/watermark PDF, ZIP dengan nama duplikat, validasi input, autentikasi, dan pembacaan multipart Office. UI browser, hasil OCR/AI, serta server Gotenberg sungguhan belum diverifikasi secara interaktif di lingkungan pembuatan ini. Setelah deploy, uji dengan dokumen contoh yang tidak sensitif sebelum dipakai untuk pekerjaan penting.

## Lisensi

AGPL-3.0-only karena integrasi IMG.LY background removal. Lihat `LICENSE` dan `THIRD_PARTY_NOTICES.md`. Build menyertakan tautan unduh kode sumber di footer. Pertahankan ketersediaan source yang sesuai saat menghosting versi AGPL beserta modifikasinya. Jika ingin distribusi tertutup, tinjau lisensi komersial IMG.LY atau ganti mesin hapus background.

## Peningkatan hapus background

Versi IMG.LY 1.7.0 dikunci karena menyertakan patch lokal di `scripts/patch-imgly.mjs`. Konversi mask aslinya menggunakan `Uint8Array`, sehingga nilai prediksi negatif atau di atas satu dapat membungkus ke rentang alpha yang salah. Patch menggantinya dengan `Uint8ClampedArray` pada modul ESM dan CJS. Patch dijalankan saat `npm ci`/`npm install` dan sebelum build; jika versi dependency berubah, script berhenti agar patch ditinjau. Tes mengeksekusi fungsi konversi dari dependency terpasang pada nilai negatif, di atas satu, dan NaN.

Detail tinggi memakai model isnet FP32 (sekitar 176 MB); mode Seimbang memakai FP16 (sekitar 88 MB). Angka tersebut perkiraan model, belum termasuk runtime WASM. Model dicache browser sesuai perilaku penyedia. Perangkat seluler dengan memori kecil disarankan memakai mode Seimbang. Tidak ada API berbayar baru dan tidak perlu `.env` untuk fitur ini.

Pembersihan bercak default menjaga beberapa subjek dan tepi transparan halus. Mode “Hanya subjek terbesar” menghapus komponen terpisah selain yang terbesar; jangan gunakan untuk banyak orang atau objek yang terpisah. Kedua mode tidak menjamin menghapus sisa latar yang menyatu dengan subjek. Pratinjau putih/gelap/checker hanya memengaruhi tampilan; unduhan tetap PNG transparan pada dimensi asli.

Logo orisinal tersedia di `public/brand/hestfile-icon.svg` dan `public/brand/hestfile-logo.svg`; ikon digunakan di header/footer dan favicon. Arsip source juga menyertakan aset publik ini.

Perbaikan diverifikasi dengan tes alpha, pembersihan komponen, komposisi transparansi, serta build produksi. Lingkungan ini tidak menyediakan browser QA; inferensi model pada dua foto yang dilampirkan belum dijalankan di sini. Coba ulang kedua foto setelah deployment terbaru aktif dan periksa rambut, jari, serta tepian pakaian dengan latar pratinjau berbeda.

## Deployment Vercel Hobby dan identitas commit

Untuk repository privat pada Vercel Hobby, author commit yang memicu deployment harus dikenali sebagai pemilik proyek Vercel. Hubungkan akun GitHub pemilik repository melalui pengaturan akun Vercel. Commit melalui GitHub menggunakan identitas akun terautentikasi; hindari identitas generik seperti `HestFile` untuk commit deployment. Perubahan author pada commit baru tidak mengubah author commit lama. Jika commit sudah menggunakan akun pemilik tetapi masih diblokir, periksa koneksi GitHub pada akun Vercel yang memiliki proyek.
