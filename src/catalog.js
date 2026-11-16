import {FileDown, Images, Combine, ScanText, Eraser, FileText, FileImage, Scissors, RotateCw, Stamp, Archive, Scaling, Presentation, ArrowLeftRight} from 'lucide-react';
export const categories=['Semua alat','PDF','Gambar','Konversi','Lainnya'];
export const tools=[
{id:'compress-pdf',name:'Kompres PDF',desc:'Ukuran lebih kecil, lebih mudah dibagikan.',category:'PDF',icon:FileDown,color:'coral',popular:true,accept:'.pdf',note:'PDF dirender ulang menjadi gambar. Teks tidak dapat dipilih, tautan dan formulir hilang. Simpan file asli.'},
{id:'compress-image',name:'Kompres gambar',desc:'Ringankan JPG, PNG, dan WebP milikmu.',category:'Gambar',icon:Images,color:'blue',popular:true,accept:'.jpg,.jpeg,.png,.webp',multi:true},
{id:'merge',name:'Gabungkan PDF',desc:'Satukan beberapa PDF sesuai urutanmu.',category:'PDF',icon:Combine,color:'coral',popular:true,accept:'.pdf',multi:true},
{id:'remove-bg',name:'Hapus background',desc:'Buat latar transparan dalam satu langkah.',category:'Gambar',icon:Eraser,color:'purple',popular:true,accept:'.jpg,.jpeg,.png,.webp',note:'Model AI diunduh saat pertama digunakan (puluhan MB). Proses berjalan di perangkat; hasil dapat bervariasi.'},
{id:'office',name:'Word / PPT ke PDF',desc:'Ubah dokumen menjadi PDF siap dibagikan.',category:'Konversi',icon:FileText,color:'blue',popular:true,accept:'.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt',server:true,note:'Memerlukan server Gotenberg dan kunci akses pemilik. File dikirim hanya saat kamu menekan proses. Maksimal 4 MB.'},
{id:'ocr',name:'OCR PDF ke Word',desc:'Ubah scan menjadi teks yang bisa diedit.',category:'Konversi',icon:ScanText,color:'purple',popular:true,accept:'.pdf',note:'OCR Indonesia + Inggris. Hasil Word berupa teks, bukan salinan tata letak asli. Maksimal 30 halaman.'},
{id:'pdf-word',name:'PDF ke Word',desc:'Ambil teks PDF ke dokumen Word baru.',category:'Konversi',icon:ArrowLeftRight,color:'blue',accept:'.pdf',note:'Untuk PDF dengan teks digital. Tata letak kompleks tidak dipertahankan. Gunakan OCR untuk hasil scan.'},
{id:'image-pdf',name:'Gambar ke PDF',desc:'Rangkai foto menjadi satu dokumen PDF.',category:'Konversi',icon:FileImage,color:'green',accept:'.jpg,.jpeg,.png,.webp',multi:true},
{id:'pdf-image',name:'PDF ke JPG',desc:'Simpan setiap halaman sebagai gambar.',category:'Konversi',icon:FileImage,color:'green',accept:'.pdf'},
{id:'split',name:'Pisah / ekstrak PDF',desc:'Ambil halaman yang kamu perlukan saja.',category:'PDF',icon:Scissors,color:'coral',accept:'.pdf'},
{id:'rotate',name:'Putar PDF',desc:'Perbaiki orientasi halaman dokumenmu.',category:'PDF',icon:RotateCw,color:'coral',accept:'.pdf'},
{id:'watermark',name:'Watermark PDF',desc:'Tambahkan penanda pada setiap halaman.',category:'PDF',icon:Stamp,color:'purple',accept:'.pdf'},
{id:'image-convert',name:'Konversi gambar',desc:'Pilih format JPG, PNG, atau WebP.',category:'Gambar',icon:ArrowLeftRight,color:'blue',accept:'.jpg,.jpeg,.png,.webp',multi:true},
{id:'resize',name:'Ubah ukuran gambar',desc:'Atur lebar foto, jaga proporsinya.',category:'Gambar',icon:Scaling,color:'green',accept:'.jpg,.jpeg,.png,.webp',multi:true},
{id:'compress-office',name:'Kompres Word / PPT',desc:'Optimalkan foto dalam DOCX dan PPTX.',category:'Lainnya',icon:Presentation,color:'blue',accept:'.docx,.pptx',note:'Foto JPEG di dokumen dikompres ulang. Dokumen tanpa foto mungkin tidak mengecil. DOC/PPT lama: gunakan Buat ZIP.'},
{id:'zip',name:'Buat ZIP',desc:'Kemas file apa pun dalam satu arsip.',category:'Lainnya',icon:Archive,color:'gold',accept:'*',multi:true,note:'ZIP menerima semua tipe file, termasuk DOC dan PPT. File yang sudah terkompres mungkin tidak mengecil.'}
];
