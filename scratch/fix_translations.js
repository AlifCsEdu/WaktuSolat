import fs from 'fs';

const content = fs.readFileSync('src/translations.ts', 'utf-8');

// Extract the object text
const objectMatch = content.match(/export const translations = (\{[\s\S]*?\n\});\n/);
if (!objectMatch) {
  console.log("Could not find translations object.");
  process.exit(1);
}

const objText = objectMatch[1];
let translations;
// Need to parse it. It's a JS object.
try {
  translations = new Function(`return ${objText}`)();
} catch (e) {
  console.log("Parse error", e);
  process.exit(1);
}

const ms = translations.ms;
const en = translations.en;

// 1. For keys in MS that are not in EN, copy them to EN (as they are English currently)
const msKeys = Object.keys(ms);
for (const k of msKeys) {
  if (!en.hasOwnProperty(k)) {
    en[k] = ms[k];
  }
}

// 2. Add MS translations for the keys that were in English
const msFixes = {
  weatherFeelsLike: "Terasa Seperti: ",
  weatherUpdated: "Dikemas kini",
  weatherMinsAgo: "minit lalu",
  weather24Hour: "Ramalan 24 Jam",
  weatherAQI: "Kualiti Udara (AQI)",
  weatherUnhealthy: "Tidak Sihat",
  weatherModerateSensitive: "Sederhana (Sensitif)",
  weatherModerate: "Sederhana",
  weatherGood: "Baik",
  weatherUVIndex: "Indeks UV",
  weatherHigh: "Tinggi",
  weatherLow: "Rendah",
  weatherSunrise: "Matahari Terbit",
  weatherSunset: "Matahari Terbenam",
  weatherPressure: "Tekanan",
  weather7Day: "Ramalan 7 Hari",
  weatherToday: "Hari Ini",
  weatherProvider: "Penyedia Cuaca / Model",
  weatherProviderDesc: "Pilih model cuaca percuma yang paling tepat untuk lokasi anda.",
  weatherAuto: "Auto (Paling Tepat)",
  weatherAutoDesc: "Memilih model terbaik secara automatik",
  weatherECMWF: "ECMWF",
  weatherECMWFDesc: "Model Eropah (Paling Tepat)",
  weatherGFS: "GFS",
  weatherGFSDesc: "Model AS (NOAA)",
  weatherJMA: "JMA",
  weatherJMADesc: "Agensi Meteorologi Jepun",
  locationUpdated: "Lokasi Dikemas Kini",
  locationNewDetected: "Lokasi Baru Dikesan",
  locationAutoUpdatedDesc: "Zon telah dikemas kini secara automatik ke {zoneName} ({locationName}).",
  locationPromptDesc: "Anda kini berada di {locationName} ({zoneName}). Tukar zon?",
  ignore: "Abaikan",
  changeZone: "Tukar Zon",
  enableAllSunnah: "Aktifkan Semua Sunat",
  muteAllSunnah: "Senyapkan Semua Sunat",
  quickActionSunnah: "Tindakan Pantas Sunat",
  quickActionSunnahDesc: "Aktifkan atau senyapkan semua penggera sunat sekaligus.",
  tvModeCenterWidgetLabel: "Widget Lajur Tengah TV",
  widgetNone: "Tiada (Susun Atur 2 Lajur)",
  widgetReminders: "Peringatan Kaya (Susun Atur 3 Lajur)",
  widgetSlideshow: "Tayangan Slaid Poster (Susun Atur 3 Lajur)",
  widgetCamera: "Suapan Kamera Penceramah (Susun Atur 3 Lajur)",
  tvModeSlideshowUrlsLabel: "URL Imej Tayangan Slaid (Satu setiap baris)",
  tvModeSlideshowIntervalLabel: "Selang Tayangan Slaid (saat)",
  cameraSelectLabel: "Pilih Peranti Kamera",
  cameraAccessBtn: "Beri Akses Kamera",
  cameraNoPermission: "Kebenaran kamera diperlukan untuk memaparkan siaran.",
  cameraNotSelected: "Tiada kamera dipilih.",
  reminderEditorTitle: "Pengurus Peringatan TV",
  addReminderBtn: "Tambah Peringatan Baru",
  reminderTypeHadith: "Hadis",
  reminderTypeQuran: "Al-Quran",
  reminderTypeWarning: "Amaran",
  reminderTypeInfo: "Maklumat",
  reminderTypeDonation: "Sumbangan / QR",
  reminderTextLabel: "Kandungan Teks",
  reminderTitleLabel: "Tajuk / Rujukan (Pilihan)",
  reminderImageUrlLabel: "URL Imej / Kod QR (Pilihan)",
  deleteReminder: "Padam",
  mobileWarningTitle: "Skrin Terlalu Kecil",
  mobileWarningDesc: "Mod TV Masjid direka untuk paparan TV landskap yang besar. Memaparkannya pada peranti mudah alih menyukarkan untuk keluar.",
  exitTvMode: "Keluar Mod TV",
  backToDashboard: "Kembali ke Papan Pemuka",
  deleteLogo: "Padam Logo",
  tvModeLayoutLabel: "Gaya Susun Atur TV",
  tvModeLayoutSplit: "Lajur Menegak (Pisah)",
  tvModeLayoutBottom: "Jadual Mendatar (Bawah)",
  logoShapeLabel: "Bentuk Sempadan Logo",
  logoShapeOriginal: "Asal",
  logoShapeCircle: "Bulat",
  logoShapeSquare: "Segi Empat",
  logoShapeRounded: "Penjuru Melengkung",
  logoSizeLabel: "Saiz Logo",
  logoPaddingLabel: "Ruang Dalaman",
  logoBgModeLabel: "Warna Latar Belakang Logo",
  logoBgTransparent: "Lutsinar",
  logoBgWhite: "Putih",
  logoBgThemeContainer: "Bekas Tema",
  logoBgThemePrimary: "Utama Tema",
  logoBlendModeLabel: "Buang Latar Belakang / Campuran",
  logoBlendMultiply: "Buang Latar Belakang Putih",
  logoBlendScreen: "Buang Latar Belakang Gelap",
  logoAlignmentLabel: "Penjajaran Logo Pengepala",
  logoAlignLeft: "Kiri Nama",
  logoAlignRight: "Kanan Nama",
  logoAlignTop: "Atas Nama (Bertindih)",
  reminderDurationLabel: "Tempoh Paparan (saat)",
  reminderEnabledLabel: "Aktif",
  moveUp: "Gerak Atas",
  moveDown: "Gerak Bawah",
  tvClockScaleLabel: "Saiz Bahagian Jam",
  tvClockScaleDesc: "Laraskan saiz paparan jam pada skrin TV.",
  tvScheduleScaleLabel: "Saiz Bahagian Jadual",
  tvScheduleScaleDesc: "Laraskan saiz senarai jadual solat pada skrin TV.",
  tvShowWeatherLabel: "Papar Widget Cuaca",
  tvShowWeatherDesc: "Papar keadaan cuaca semasa pada skrin TV.",
  tvShowCountdownLabel: "Papar Panel Kira Detik",
  tvShowCountdownDesc: "Papar kira detik ke waktu solat seterusnya.",
  tvShowDateBarLabel: "Papar Paparan Tarikh",
  tvShowDateBarDesc: "Papar tarikh Masihi dan Hijrah pada skrin TV.",
  tvClockColonBlinkLabel: "Kelipan Titik Bertindih Jam",
  tvClockColonBlinkDesc: "Tambah animasi kelipan pada titik bertindih jam digital (:).",
  sectionBasicSetup: "Persediaan Asas",
  sectionLayoutDisplay: "Susun Atur & Paparan",
  sectionLogoBranding: "Logo & Penjenamaan",
  sectionCenterWidget: "Widget Tengah",
  sectionRemindersManager: "Pengurus Peringatan",
  duplicateReminder: "Pendua",
  bulkToggleAll: "Togol Semua",
  remindersCount: "{count} peringatan",
  remindersActiveCount: "{active} aktif",
  collapseAll: "Tutup Semua",
  expandAll: "Buka Semua",
  noRemindersTitle: "Tiada Peringatan",
  noRemindersDesc: "Tambah peringatan tersuai untuk dipaparkan pada skrin TV masjid.",
  tvModeHideSecondsLabel: "Sembunyikan Saat Jam",
  tvModeHideSecondsDesc: "Kecualikan saat pada jam digital TV masjid untuk paparan yang lebih tenang.",
  tvModeTickerSpeedLabel: "Kelajuan Teks Berjalan",
  tvModeTickerSpeedDesc: "Laraskan kelajuan pergerakan teks pengumuman berjalan.",
  tvModeTickerSizeLabel: "Saiz Teks Berjalan",
  tvModeTickerSizeDesc: "Ubah saiz teks pengumuman berjalan.",
  tickerSpeedSlow: "Perlahan",
  tickerSpeedMedium: "Sederhana",
  tickerSpeedFast: "Pantas",
  hudIqamahPaused: "Iqamah Dijeda",
  hudIqamahResumed: "Iqamah Diteruskan",
  hudIqamahAdd: "+1 Minit",
  hudIqamahSub: "-1 Minit",
  wakeUpPrompt: "Tekan sebarang kekunci atau klik untuk bangun"
};

for (const [k, v] of Object.entries(msFixes)) {
  ms[k] = v;
}

// 3. For keys in EN that are not in MS, add them to MS translated
const msAddsFromEn = {
  jumaat: "Jumaat",
  autoModeDetecting: "Mencari isyarat GPS...",
  autoModeTracking: "Mengecam lokasi...",
  appearance: "Penampilan",
  theme: "Tema",
  system: "Sistem",
  light: "Cerah",
  dark: "Gelap",
  accentColor: "Warna Aksen",
  colorGreen: "Zamrud",
  colorBlue: "Lautan",
  colorPurple: "Amethyst",
  colorRose: "Mawar",
  colorAmber: "Ambar",
  compactMode: "Mod Padat",
  jumaatDesc: "Gantikan Zohor dengan Jumaat pada hari Jumaat.",
  about: "Mengenai",
  aboutDesc: "Waktu Solat Expressive ialah projek sumber terbuka untuk memaparkan waktu solat dengan indah. Data diperolehi dari e-Solat JAKIM.",
  version: "Versi",
  developer: "Pembangun"
};

for (const [k, v] of Object.entries(msAddsFromEn)) {
  if (!ms.hasOwnProperty(k)) {
    ms[k] = v;
  }
}

// Serialize
let newContent = 'export const translations = {\n';

newContent += '  ms: {\n';
for (const [k, v] of Object.entries(ms)) {
  newContent += `    ${k}: ${JSON.stringify(v)},\n`;
}
newContent += '  },\n';

newContent += '  en: {\n';
for (const [k, v] of Object.entries(en)) {
  newContent += `    ${k}: ${JSON.stringify(v)},\n`;
}
newContent += '  }\n};\n\n';
newContent += 'export type LangKey = keyof typeof translations.ms;\n';

fs.writeFileSync('src/translations.ts', newContent, 'utf-8');
console.log("Successfully updated translations.ts");
