# Arah desain Pagar

Dibaca sebagai meja kerja bendahara UMKM, dial E/R/M 1/2/1. Invoice adalah benda utama; status penerima dan keputusan pemilik menjadi pusat tampilan. Landing merupakan draf fungsional untuk dirombak bersama pemilik nanti, sesuai brief.

Token terpusat di `web/app/globals.css`: hijau pagar `#173f32` menandai aksi, kertas `#f5f1e6` mengacu invoice, tinta `#172b24`, merah `#a32626` khusus penolakan. Krem merupakan identitas yang diminta brief. Avenir Next dengan fallback humanist Trebuchet MS memberi angka dan nama vendor yang mudah dibaca; Georgia hanya judul editorial, monospace hanya alamat dan hash.

Halaman dalam memakai daftar invoice dengan rincian alamat utuh, status berbentuk teks, dan tindakan yang menyebut objek. Tidak ada angka pemasaran, testimoni, logo baru, ornamen tiga dimensi, atau animasi dekoratif. Lompatan fungsional: satu invoice dapat ditelusuri dari ekstraksi ke penolakan kontrak dan baris CSV dengan referensi yang sama.

Lebar minimal 360 px, tabel memakai pembungkus scroll internal, alamat wrap, fokus keyboard terlihat, reduced motion dihormati. State kosong, memuat, galat, dan luring tersedia. Batas verifikasi: tidak menjalankan browser sesuai instruksi tugas; ukuran dan interaksi visual perlu pemeriksaan manual berikutnya. Kontras token diperiksa lewat `tools/check-contrast.mjs`.
