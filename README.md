# Tableau Decoupled AI Chatbot Extension (Vercel Ready) 💬🔗🚀

Solusi **Tableau Dashboard Decoupled Chatbot Extension** modern dan modular yang menempatkan **Chatbot Widget (Po'tata)** di luar Tableau (pada halaman website utama Anda), sementara visual dashboard Tableau bertindak sebagai pengirim data (*headless data synchronizer*) menggunakan komunikasi browser aman (`postMessage`).

---

## 🌟 Fitur Utama

- **Decoupled Architecture**: Chatbot dipasang langsung pada kode website utama Anda (misal sidebar portal BI), memberikan fleksibilitas desain tanpa terkurung di dalam layout Tableau.
- **Headless Data Sync Extension**: Extension (`.trex`) berjalan di dalam Tableau, mendeteksi filter/data secara real-time, dan mem-broadcast datanya keluar ke website utama via `postMessage`.
- **Automatic Context Switching**: Ketika user berpindah halaman web dari **Dashboard A (Penumpang)** ke **Dashboard B (Retail)**, chatbot di website induk mendeteksi pergantian tersebut, mereset percakapan, dan secara instan menyesuaikan konteksnya ke data baru!
- **Local Sandbox & Simulation Mode**: Disertai halaman portal demo ([`parent-demo.html`](public/parent-demo.html)) untuk menguji coba perpindahan dashboard secara riil (iframe) maupun simulasi data secara lokal/offline.
- **Vercel Serverless Ready**: Backend serverless `/api/chat.js` yang menangani percakapan dengan Google Gemini atau OpenAI secara aman tanpa mengekspos API Key ke sisi client.

---

## 📁 Struktur Direktori

```
tableau-ai-embed-chat/
├── api/
│   └── chat.js                 # Vercel Serverless API Handler (Gemini / OpenAI Proxy)
├── public/
│   ├── ui.html                 # Tampilan Status Sync di dalam Tableau Dashboard
│   ├── parent-demo.html        # Mockup Website Induk Anda (Dashboard & Chatbot Sidebar)
│   ├── css/
│   │   ├── style.css           # Styling Status Sync Iframe
│   │   └── parent-style.css    # Styling Chatbot Po'tata pada Website Induk
│   └── js/
│       ├── app.js              # Logika Extension (mengirim data lewat postMessage)
│       ├── parent.js           # Logika Portal Induk (menerima data & handle chat)
│       └── tableau.extensions.1.latest.js  # Tableau SDK
├── manifest/
│   └── tableau-ai-sync.trex    # File Manifest XML untuk didaftarkan ke Tableau
├── test/
│   └── test-chat.js            # Script pengujian API offline
├── .env.example                # Template konfigurasi environment variables
├── package.json                # Konfigurasi dependensi Node.js
├── vercel.json                 # Konfigurasi CORS & routing Vercel
├── server.js                   # Server lokal http untuk pengujian
└── README.md                   # Dokumentasi panduan (File ini)
```

---

## 🚀 Langkah Deploy ke Vercel

### Langkah 1: Push Project ke Git Repository
Upload folder `tableau-ai-embed-chat` ini ke repository Git baru Anda.

### Langkah 2: Import Project di Vercel
1. Buka [vercel.com](https://vercel.com) dan buat project baru dari repository Anda.
2. Tambahkan Environment Variables di **Settings** > **Environment Variables**:
   * `AI_PROVIDER`: `gemini` *(atau `openai`)*
   * `AI_API_KEY`: *(Google AI Studio / OpenAI API Key Anda)*
   * `AI_MODEL`: `gemini-3.5-flash-lite` *(Opsional)*
3. Klik **Deploy** dan ambil domain HTTPS-nya (misal: `https://tableau-ai-sync.vercel.app`).

### Langkah 3: Sesuaikan File Manifest (.trex)
Buka file `manifest/tableau-ai-sync.trex` dengan text editor, lalu ganti URL target dengan domain Vercel Anda:
```xml
<source-location>
  <url>https://tableau-ai-sync.vercel.app/ui.html</url>
</source-location>
```
*Simpan file tersebut.*

---

## 📊 Langkah Import & Embed di Portal Anda

### Langkah 1: Pasang Extension di Dashboard Tableau Anda
1. Buka dashboard Tableau Desktop Anda.
2. Seret objek **Extension** ke area pojok yang kecil/tersembunyi (karena extension ini hanya menampilkan status sinkronisasi kecil saja).
3. Pilih file `manifest/tableau-ai-sync.trex` dan berikan izin data.
4. Publish dashboard tersebut ke Tableau Server/Cloud Anda.

### Langkah 2: Hubungkan Iframe ke Chatbot Website Anda
Di website utama Anda, pasang event listener berikut untuk menangkap data dari iframe Tableau:
```javascript
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TABLEAU_DATA_SYNC') {
    // Simpan data ini untuk dikirimkan bersama chat message Anda ke API
    const syncedData = event.data; 
    console.log("Data tersinkronisasi dari Tableau:", syncedData);
  }
});
```

---

## 🛠️ Pengujian Lokal (Development)

1. Masuk ke folder project:
   ```bash
   cd tableau-ai-embed-chat
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env` dan isi `AI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
4. Jalankan API test offline:
   ```bash
   npm run test-chat
   ```
5. Jalankan server lokal:
   ```bash
   npm run dev
   ```
   Buka **[http://localhost:3000/](http://localhost:3000/)** di browser Anda untuk melihat langsung portal simulasi dengan navigasi Dashboard A/B dan Chatbot yang langsung berganti konteks!
