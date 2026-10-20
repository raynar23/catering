# PRD - Sistem Pengelolaan Data Catering Karyawan

## Tujuan
Website internal PT Terminal Petikemas Surabaya untuk General Affairs (GA) mengelola kebutuhan catering karyawan per tanggal, shift, bagian, dan vendor: input, revisi jumlah, verifikasi, rekapitulasi, dan laporan. Dipakai untuk client dan dapat diakses publik (deploy Vercel).

## Sumber Acuan (letakkan di `agent/referensi/`)
- `RANCANGAN_FITUR_WEBSITE_PENGELOLAAN_DATA_CATERING_KARYAWAN.pdf`: sumber alur dan aturan bisnis.
- `mockup-9-halaman.jpeg`: sumber tata letak dan kolom tabel sembilan halaman.
- Jika PDF dan mockup berbeda: PDF menang untuk alur/aturan, mockup menang untuk tata letak. Angka pada mockup dan PDF adalah data simulasi, bukan data operasional.

## Istilah
- **Periode**: satu slot tanggal + shift.
- **Pesanan catering**: data catering untuk satu periode, berisi 1 vendor dan satu baris per bagian (jumlah karyawan dan jumlah porsi).
- **Data berlaku**: pesanan berstatus `final` atau `revisi` (angka yang sudah disetujui). Rekapitulasi, laporan, dan KPI hanya memakai data berlaku.

## Pengguna (3 role)
| Role | Contoh akun demo | Tugas |
|---|---|---|
| Admin GA (`admin_ga`) | admin.ga | Kelola data master (bagian, vendor, shift, periode) dan pengguna; boleh input dan ajukan revisi; melihat semua |
| PIC Unit (`pic_unit`) | pic.unit | Input data catering dan ajukan revisi |
| Supervisor GA (`supervisor_ga`) | supervisor.ga | Memverifikasi (setujui/tolak) input dan revisi |

Tidak ada pendaftaran mandiri. Akun dibuat Admin GA lewat menu Manajemen User atau lewat seed.

## Alur Utama
1. Admin GA menyiapkan master: 5 bagian, 5 vendor, shift, lalu periode.
2. Admin GA atau PIC Unit membuka Input Data Catering: pilih tanggal, shift, vendor, isi jumlah karyawan dan jumlah porsi per bagian, lalu **Simpan Draft** atau **Ajukan**.
3. Pesanan berstatus **Diajukan** muncul di Supervisor GA (tanpa refresh). Supervisor memilih **Setujui** (status Final) atau **Tolak** dengan catatan (kembali ke Draft).
4. Jika data Final perlu diubah, pengguna mengajukan **revisi** per bagian: jumlah karyawan/porsi baru dan alasan wajib. Pesanan berstatus **Revisi** dan revisi berstatus **Menunggu Verifikasi**.
5. Supervisor menyetujui atau menolak revisi. Setuju: angka terbaru berlaku. Tolak: angka lama tetap berlaku. Pesanan kembali **Final**.
6. Rekapitulasi dan Laporan memakai data berlaku. Riwayat perubahan tidak pernah dihapus.

## Aturan Bisnis (dari PDF, jangan diubah agent)
- Input catering: tanggal, shift, bagian, vendor, jumlah karyawan, jumlah porsi.
- Bagian awal: CC Operator, RTG Operator, Mekanik CC, Mekanik RTG, Area Gudang CFS.
- Vendor awal V001 sampai V005, semua aktif.
- Revisi wajib menyimpan: jumlah awal, penambahan/pengurangan, jumlah terbaru, waktu perubahan, alasan, dan pelaku. Contoh: 20 porsi + 3 = 23 porsi, status Menunggu Verifikasi.
- Setelah disetujui, rekapitulasi memakai jumlah terbaru; riwayat sebelumnya tetap tersimpan.
- Revisi yang masih Menunggu Verifikasi belum mengubah angka rekap.
- Pengaju tidak boleh memverifikasi pengajuannya sendiri.
- Rekap per tanggal, shift, bagian, vendor. Laporan harian, mingguan, bulanan, ekspor Excel dan PDF.

## Asumsi Sementara (belum dikonfirmasi client)
Implementasikan seperti tertulis, tetapi isolasikan agar mudah diubah. Jangan menambah perilaku di luar daftar ini.
| ID | Asumsi |
|---|---|
| A1 | Satu periode hanya punya satu vendor. |
| A2 | Input awal juga diverifikasi (mockup: Simpan Draft dan Ajukan). Bukan hanya revisi. |
| A3 | Penolakan input awal mengembalikan pesanan ke Draft dengan catatan. Penolakan revisi membuat angka lama tetap berlaku. |
| A4 | Jumlah porsi default sama dengan jumlah karyawan, tetapi dapat diedit; keduanya disimpan terpisah. |
| A5 | PIC Unit boleh input semua bagian. Semua role melihat semua data. |
| A6 | Tidak ada cut-off waktu. Revisi boleh kapan saja selama pesanan Final. |
| A7 | Jam shift adalah data master yang dapat diubah Admin GA. Seed memakai 06.00-14.00, 14.00-22.00, 22.00-06.00. Shift lintas tengah malam dihitung ke tanggal mulai shift. |
| A8 | Periode dibuat manual (tombol Tambah Periode). Tidak ada generate massal. |
| A9 | Notifikasi lonceng hanya di dalam aplikasi (jumlah item menunggu tindakan untuk role terkait), tanpa tabel notifikasi, tanpa email/WhatsApp. |
| A10 | Login memakai username. Secara internal username dipetakan ke email `username@tps.co.id` di Supabase Auth. |
| A11 | Kolom Status pada Periode Catering menampilkan status pesanan periode itu (Belum Input, Draft, Diajukan, Revisi, Final). |

## Halaman
1. **Login**: Username, Password (tampilkan/sembunyikan), tombol Masuk, banner error. Label mengikuti mockup client.
2. **Dashboard** (semua role): 7 KPI: Bagian, Vendor Catering, Total Karyawan Hari Ini, Total Kebutuhan Catering, Shift Aktif (jumlah shift master aktif), Data Belum Diverifikasi (pesanan Diajukan + revisi menunggu, dengan rincian), Data Sudah Final. Dua grafik: Jumlah Catering per Bagian (hari ini, bar) dan Distribusi Catering per Shift (hari ini, donut). Filter Periode Aktif (bulan) hanya memengaruhi dua KPI status verifikasi; KPI dan grafik lain untuk hari ini. Angka KPI dan grafik wajib konsisten.
3. **Data Bagian** (Admin GA): pencarian, Tambah Bagian, tabel (No, Nama Bagian, Keterangan, Status, Aksi ubah/hapus). Hapus hanya jika belum dipakai, selain itu nonaktifkan.
4. **Data Vendor Catering** (Admin GA): pencarian, Tambah Vendor, tabel (No, Kode, Nama Vendor, Kontak, Alamat, Status, Aksi).
5. **Periode Catering** (Admin GA): filter bulan, tahun, status; Tambah Periode (tanggal, shift, keterangan); tabel (No, Tanggal, Shift, Keterangan, Status, Aksi). Kelola master Shift (nama, jam mulai/selesai, keterangan, aktif) lewat dialog dari halaman ini.
6. **Input Data Catering** (Admin GA, PIC Unit): pilih Tanggal, Shift, Vendor; tabel per bagian (Jumlah Karyawan, Jumlah Catering, Keterangan) dengan baris Total; tombol Simpan Draft dan Ajukan. Pesanan Final bersifat read-only dengan tombol Ajukan Revisi per baris (dialog: jumlah baru, alasan). Jika periode belum dibuat tampilkan empty state yang jelas.
7. **Riwayat Update/Revisi** (`/verifikasi/[id]/riwayat`): ringkasan Tanggal, Shift, Vendor, Status; tabel (No, Tanggal dan jam, Oleh, Perubahan, Keterangan); tombol Kembali. Dapat dibuka dari Input dan Verifikasi.
8. **Verifikasi Data Catering** (Supervisor GA; Admin GA read-only): filter rentang tanggal, shift, vendor, status; tabel (No, Tanggal, Shift, Vendor, Total Catering, Status, Aksi: Verifikasi / Review / Detail). Detail memuat angka per bagian, revisi menunggu (awal, selisih, terbaru, alasan), tombol Setujui dan Tolak (catatan wajib saat menolak).
9. **Rekapitulasi** (semua role): filter periode, shift, vendor, bagian; tabel tanggal x shift dengan kolom per bagian dan Total; baris Total Per Periode; tombol Ekspor Excel dan Cetak PDF.
10. **Laporan** (semua role): pilih Harian, Mingguan, atau Bulanan beserta tanggal/minggu/bulan; pratinjau rekap + total per shift dan per vendor; Ekspor Excel dan PDF ber-kop surat PT Terminal Petikemas Surabaya.
11. **Manajemen User** (Admin GA): tabel (Nama, Username, Role, Status, Dibuat), Tambah User (nama, username, kata sandi awal, role), ubah role/status, reset kata sandi. Tidak boleh menonaktifkan akun sendiri.

## Hak Akses Menu
| Menu | Admin GA | PIC Unit | Supervisor GA |
|---|---|---|---|
| Dashboard | Ya | Ya | Ya |
| Data Bagian, Data Vendor, Periode Catering | Kelola | Tidak tampil | Tidak tampil |
| Input Data Catering | Input, revisi | Input, revisi | Tidak tampil |
| Verifikasi Data | Lihat | Tidak tampil | Setujui/Tolak |
| Rekapitulasi, Laporan | Ya | Ya | Ya |
| Manajemen User | Kelola | Tidak tampil | Tidak tampil |

## Di Luar Cakupan
Harga dan tagihan vendor, integrasi absensi/HR, notifikasi email/WhatsApp, registrasi mandiri, cut-off waktu, generate periode massal, multi-perusahaan, command palette, sidebar ciut.

## Data Demo (seed)
- 5 bagian dan 5 vendor (kode V001-V005; nama mengikuti mockup: Catering Sejahtera, Berkah Rasa, Dapoer Prima, Nusantara Catering, Sari Rasa Catering), 3 shift.
- Angka per bagian mengikuti tabel simulasi PDF. Shift 1: 20, 18, 12, 10, 20 (total 80). Shift 2: 18, 16, 10, 9, 12 (total 65). Shift 3: 15, 14, 8, 7, 6 (total 50). Urutan bagian: CC Operator, RTG Operator, Mekanik CC, Mekanik RTG, Area Gudang CFS. Jumlah porsi sama dengan karyawan.
- Hari ini (WIB): Shift 1 Final, Shift 2 Diajukan, Shift 3 Draft. Besok: tiga periode Belum Input.
- Tujuh hari ke belakang: data Final (variasi kecil) agar grafik dan rekap terisi.
- Satu revisi contoh pada CC Operator Shift 1 hari ini: 20 menjadi 23, alasan "Penambahan kebutuhan catering karena perubahan jumlah karyawan bertugas", status Menunggu Verifikasi.
- Tiga akun demo, kredensial hanya di `supabase/README.md`.

## Kriteria Sukses
- Demo end to end: Admin/PIC input dan ajukan, Supervisor melihatnya langsung, setujui, rekap terisi; ajukan revisi, setujui, rekap memakai angka terbaru, riwayat lengkap.
- Revisi menunggu tidak mengubah rekap; pengaju tidak bisa memverifikasi miliknya sendiri; riwayat tidak dapat diubah atau dihapus.
- Tampilan profesional, mengikuti struktur mockup, semua data tersimpan di database sungguhan.
