# Ukur — Dashboard ASQ & SUS

Dashboard statis untuk mencatat dan membaca hasil **System Usability Scale (SUS)** dan **After-Scenario Questionnaire (ASQ)**. Antarmuka menggunakan bahasa Indonesia dan pertanyaan standar ditampilkan dalam bahasa Inggris.

## Menjalankan secara lokal

Butuh Node.js 18 atau lebih baru. Tidak ada dependensi yang perlu diunduh.

```bash
npm run dev
```

Buka `http://localhost:4173`. Jalankan `npm test` untuk memeriksa fungsi perhitungan.

## Fitur

- Tambah responden dan kelompok/segmen.
- Isi SUS (10 jawaban, skala 1–5) dan ASQ (3 jawaban, skala 1–7) untuk tiap skenario.
- Ringkasan skor, distribusi SUS, rata-rata ASQ per skenario, dan tabel penilaian.
- Pencarian, filter instrumen, hapus penilaian, ekspor CSV, serta cadangan/impor JSON.
- Data contoh opsional untuk mencoba tampilan. Hapus data contoh sebelum mencatat hasil riset.

## Perhitungan

SUS: item ganjil `jawaban - 1`, item genap `5 - jawaban`; jumlah kontribusi dikali `2,5`. Hasil 0–100 adalah indeks, bukan persentase. Seluruh sepuluh item wajib diisi.

ASQ: rata-rata dari item numerik yang dijawab. N/A dan item kosong tidak dihitung. Skala asli memakai `1 = sangat setuju/paling puas` sampai `7 = sangat tidak setuju/paling tidak puas`, sehingga **skor lebih rendah lebih baik**.

Sumber: [Brooke, SUS (1996)](https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf) dan [Lewis, ASQ (1991)](https://www.researchgate.net/publication/230786769_Psychometric_evaluation_of_an_after-scenario_questionnaire_for_computer_usability_studies_The_ASQ).

## Penyimpanan dan deployment

Data berada di `localStorage` browser dan tidak tersinkron antar perangkat. Ekspor cadangan JSON secara berkala; impor JSON untuk memindahkan data. CSV memudahkan analisis lanjutan.

Proyek ini berupa HTML/CSS/JavaScript statis. Untuk Vercel, impor repositori GitHub ini sebagai proyek dengan preset **Other**, tanpa build command, dan direktori output `.` (akar proyek).
