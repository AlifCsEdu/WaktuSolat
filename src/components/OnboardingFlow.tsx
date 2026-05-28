import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  MapPin, 
  Bell, 
  Volume2, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Compass, 
  Play, 
  Pause,
  Map,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { StorageManager } from "../lib/StorageManager";
import { JAKIM_ZONES } from "../lib/zones";
import { sanitizeInput } from "../lib/security";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/icon/icon.js";
import "@material/web/switch/switch.js";
import "@material/web/textfield/filled-text-field.js";

interface OnboardingFlowProps {
  onComplete: (zone: string) => void;
  language: "ms" | "en";
}

export function OnboardingFlow({ onComplete, language }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedZone, setSelectedZone] = useState("SGR01");
  const [locationMode, setLocationMode] = useState<"manual" | "auto">("manual");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  
  // Audio state
  const [selectedSound, setSelectedSound] = useState<string>("chime");
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const isMalay = language === "ms";

  // Translate helpers
  const tOnboarding = {
    welcomeTitle: isMalay ? "Selamat Pulang ke AlurWaktu" : "Welcome Home to AlurWaktu",
    welcomeDesc: isMalay 
      ? "AlurWaktu ialah aplikasi waktu solat premium dengan reka bentuk Material 3 Expressive, visual fizik dinamik, dan sokongan luar talian sepenuhnya." 
      : "AlurWaktu is a premium prayer times utility featuring Material 3 Expressive, physical animations, and full offline caching support.",
    startBtn: isMalay ? "Mula Konfigurasi" : "Start Setup",
    
    locTitle: isMalay ? "Pilih Zon Waktu Solat" : "Select Prayer Times Zone",
    locDesc: isMalay 
      ? "Sila pilih zon anda secara manual atau benarkan pengesanan kedudukan GPS automatik." 
      : "Please select your zone manually or allow automatic GPS location tracking.",
    gpsBtn: isMalay ? "Kesan Lokasi GPS" : "Detect GPS Location",
    gpsLoading: isMalay ? "Mengesan kedudukan..." : "Detecting location...",
    gpsSuccessText: isMalay ? "Kawasan berjaya dikesan!" : "Location successfully matched!",
    searchPlace: isMalay ? "Cari daerah / kawasan..." : "Search district or zone...",
    manualLabel: isMalay ? "Pilihan Zon Manual" : "Manual Zone Selection",

    notifTitle: isMalay ? "Sentiasa Tepat Waktu" : "Stay On Schedule",
    notifDesc: isMalay 
      ? "Dapatkan pemberitahuan visual serta audio makluman Azan sejurus masuk waktu solat. Anda boleh menetapkan peringatan awal untuk setiap waktu." 
      : "Receive elegant notifications and beautiful audio Azan reminders as soon as prayer times enter. Customize pre-alerts per prayer.",
    notifBtn: isMalay ? "Benarkan Notifikasi" : "Enable Notifications",
    notifGranted: isMalay ? "Notifikasi Dibenarkan ✓" : "Notifications Granted ✓",
    notifSkip: isMalay ? "Langkau buat masa sekarang" : "Skip for now",

    soundTitle: isMalay ? "Tema Bunyi Alunan" : "Acoustic Audio Theme",
    soundDesc: isMalay 
      ? "Pilih makluman kegemaran anda untuk alunan azan atau peringatan awal." 
      : "Choose your favorite acoustic tone for adhan entry or pre-alerts.",
    finishBtn: isMalay ? "Selesai & Masuk Aplikasi" : "Finish & Enter App",
    backBtn: isMalay ? "Kembali" : "Back",
    nextBtn: isMalay ? "Seterusnya" : "Next"
  };

  const stepsCount = 4;

  const handleNext = () => {
    if (currentStep < stepsCount - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Save settings to StorageManager and complete onboarding
      StorageManager.setHasCompletedOnboarding(true);
      
      // Update global context settings in main app via onComplete callback
      onComplete(selectedZone);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Play simulated sound tones to show premium quality
  const playPreviewSound = (soundType: string) => {
    try {
      if (isPlayingSound) {
        setIsPlayingSound(null);
        return;
      }
      
      const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtx) setAudioCtx(ctx);

      setIsPlayingSound(soundType);
      const startTime = ctx.currentTime;

      const playTone = (freq: number, type: OscillatorType, delay: number, dur: number, vol = 0.15) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime + delay);
        
        gain.gain.setValueAtTime(0, startTime + delay);
        gain.gain.linearRampToValueAtTime(vol, startTime + delay + Math.min(0.05, dur * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.00001, startTime + delay + dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime + delay);
        osc.stop(startTime + delay + dur);
      };

      if (soundType === 'beep') {
        playTone(880, 'sine', 0, 0.4, 0.1);
        playTone(880, 'sine', 0.5, 0.4, 0.1);
      } else if (soundType === 'chime') {
        playTone(523.25, 'sine', 0, 1.0, 0.12);
        playTone(659.25, 'sine', 0.15, 1.0, 0.12);
        playTone(783.99, 'sine', 0.3, 1.5, 0.12);
      } else if (soundType === 'soft-chime') {
        playTone(440, 'triangle', 0, 1.2, 0.08);
        playTone(329.63, 'triangle', 0.4, 1.5, 0.08);
      } else if (soundType === 'ambient-gong') {
        playTone(110.00, 'triangle', 0, 2.5, 0.25);
        playTone(220.00, 'sine', 0.05, 2.0, 0.12);
      }

      setTimeout(() => {
        setIsPlayingSound(null);
      }, 2500);

    } catch (e) {
      console.warn("Audio Context playback not allowed in browser until interaction:", e);
      setIsPlayingSound(null);
    }
  };

  const handleRequestNotification = async () => {
    if (typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      // Update local storage preference as well
      const savedPrefs = StorageManager.getItem('prayer_notifications_v2');
      let parsed = savedPrefs ? JSON.parse(savedPrefs) : {};
      
      // Enable Fajr, Dhuhr, Asr, Maghrib, Isha by default
      const defaultNotificationKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      defaultNotificationKeys.forEach(k => {
        if (!parsed[k]) {
          parsed[k] = { enabled: true, sound: selectedSound, preAlert: 0, offset: 0, iqamahOffset: 10 };
        } else {
          parsed[k].enabled = true;
        }
      });
      StorageManager.setItem('prayer_notifications_v2', JSON.stringify(parsed));
    }
  };

  const handleGPSDetect = () => {
    if ("geolocation" in navigator) {
      setGpsLoading(true);
      setGpsError(null);
      setGpsSuccess(false);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Query local API reverse geocode
            const res = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`);
            if (!res.ok) throw new Error("Gagal mengesan zon");
            const data = await res.json();
            if (data && data.zone) {
              setSelectedZone(data.zone);
              setLocationMode("auto");
              setGpsSuccess(true);
            } else {
              throw new Error("Kawasan tidak disokong");
            }
          } catch (err: any) {
            setGpsError(isMalay ? "Gagal memadankan koordinat ke zon Malaysia." : "Failed to map coordinates to Malaysia zone.");
          } finally {
            setGpsLoading(false);
          }
        },
        (err) => {
          setGpsLoading(false);
          setGpsError(isMalay ? "Akses GPS tidak dibenarkan atau gagal." : "GPS access denied or failed.");
        },
        { timeout: 8000 }
      );
    } else {
      setGpsError(isMalay ? "Pelayar anda tidak menyokong GPS." : "Browser does not support GPS.");
    }
  };

  // Filter list of zones for manual setup
  const filteredZonesList = JAKIM_ZONES.map((state) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return state;
    const matched = state.zones.filter(z => 
      z.l.toLowerCase().includes(query) || z.v.toLowerCase().includes(query)
    );
    return { ...state, zones: matched };
  }).filter(state => state.zones.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 font-sans text-slate-100 selection:bg-teal-500/30 overflow-hidden">
      {/* Decorative premium floating shapes for wow impact */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-teal-500/12 blur-[100px]" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[400px] sm:w-[550px] h-[400px] sm:h-[550px] rounded-full bg-emerald-500/10 blur-[120px]" 
        />
        <div className="absolute top-[40%] left-[35%] w-[300px] h-[300px] rounded-full bg-rose-500/5 blur-[80px]" />
      </div>

      {/* Main Premium Card Wrapper */}
      <div className="relative z-10 w-full max-w-xl min-h-[500px] sm:min-h-[550px] p-6 sm:p-8 rounded-[36px] bg-slate-900/60 border border-slate-800/40 backdrop-blur-3xl shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Step dots header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-teal-400 stroke-[2] animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-450">
              {isMalay ? "PENGATURAN AWAL" : "WELCOME SETUP"}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[...Array(stepsCount)].map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentStep ? "w-6 bg-teal-400" : "w-1.5 bg-slate-800"
                )}
              />
            ))}
          </div>
        </div>

        {/* Carousel slide contents */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-2">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                {/* Premium crescent geometry simulation spinner */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-teal-400/40"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-b-2 border-l-2 border-emerald-400/40"
                  />
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-[20px] bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-lg">
                    <Compass className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse stroke-[1.5]" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                    {tOnboarding.welcomeTitle}
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                    {tOnboarding.welcomeDesc}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNext}
                  className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-teal-500/15 cursor-pointer mt-4"
                >
                  {tOnboarding.startBtn}
                  <ArrowRight size={16} className="stroke-[2.5]" />
                </motion.button>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-location"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col space-y-4 h-full max-h-[350px] sm:max-h-[390px] min-h-0"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-black tracking-tight text-white mb-1.5 flex items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-teal-400" />
                    {tOnboarding.locTitle}
                  </h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {tOnboarding.locDesc}
                  </p>
                </div>

                {/* GPS trigger */}
                <div className="flex flex-col gap-2 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleGPSDetect}
                    disabled={gpsLoading}
                    className="w-full py-3.5 rounded-2xl bg-slate-800 text-teal-350 border border-slate-700 hover:bg-slate-750 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md"
                  >
                    <Compass size={16} className={cn("text-teal-400 stroke-[2]", gpsLoading && "animate-spin")} />
                    {gpsLoading ? tOnboarding.gpsLoading : tOnboarding.gpsBtn}
                  </motion.button>

                  {gpsSuccess && (
                    <div className="text-center text-xs font-bold text-emerald-400 animate-pulse">
                      {tOnboarding.gpsSuccessText} ({selectedZone})
                    </div>
                  )}

                  {gpsError && (
                    <div className="text-center text-[10px] font-bold text-rose-400">
                      {gpsError}
                    </div>
                  )}
                </div>

                {/* Search Manual list inside onboarding card scrollbox */}
                <div className="flex-1 flex flex-col min-h-0 border border-slate-800/60 rounded-2xl bg-slate-950/40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/35">
                    <input 
                      type="text" 
                      placeholder={tOnboarding.searchPlace}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-xs text-slate-200 placeholder-slate-500 font-bold"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-1 divide-y divide-slate-900 scrollbar-thin">
                    {filteredZonesList.map(state => (
                      <div key={state.state} className="py-1">
                        <div className="px-3 py-0.5 text-[8px] font-black uppercase tracking-wider text-teal-400/80 bg-slate-900/40">
                          {state.state}
                        </div>
                        {state.zones.map(z => (
                          <button
                            key={z.v}
                            onClick={() => {
                              setSelectedZone(z.v);
                              setLocationMode("manual");
                              setGpsSuccess(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-slate-800/40 cursor-pointer rounded-lg mt-0.5",
                              z.v === selectedZone && "bg-teal-500/10 text-teal-300 font-bold"
                            )}
                          >
                            <span className="truncate">{z.l}</span>
                            <span className="font-mono text-[9px] text-slate-500">{z.v}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-18 h-18 rounded-[20px] bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-md">
                  <Bell className="w-9 h-9 stroke-[1.5]" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {tOnboarding.notifTitle}
                  </h2>
                  <p className="text-sm text-slate-450 leading-relaxed max-w-sm">
                    {tOnboarding.notifDesc}
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full shrink-0 max-w-xs mt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestNotification}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-lg",
                      notificationPermission === 'granted'
                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-450"
                        : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/10"
                    )}
                  >
                    {notificationPermission === 'granted' ? tOnboarding.notifGranted : tOnboarding.notifBtn}
                  </motion.button>

                  <button
                    onClick={handleNext}
                    className="text-xs text-slate-500 hover:text-slate-400 font-bold py-1.5 transition-colors cursor-pointer"
                  >
                    {tOnboarding.notifSkip}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-sounds"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col space-y-4"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-black tracking-tight text-white mb-1.5 flex items-center justify-center gap-2">
                    <Volume2 className="w-6 h-6 text-teal-400" />
                    {tOnboarding.soundTitle}
                  </h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {tOnboarding.soundDesc}
                  </p>
                </div>

                {/* Sounds grid selector */}
                <div className="grid grid-cols-1 gap-2.5 max-w-sm mx-auto w-full py-2">
                  {[
                    { id: 'chime', name: isMalay ? "Alunan Loceng Chime" : "Acoustic Chime", desc: isMalay ? "Melodi tonal spot premium lembut." : "Soft harmonic spot chime." },
                    { id: 'soft-chime', name: isMalay ? "Genta Lembut (Soft)" : "Soft Bell Triangle", desc: isMalay ? "Alunan gelombang segitiga hening." : "Quiet ambient acoustic reflection." },
                    { id: 'ambient-gong', name: isMalay ? "Gong Sufi Kuno" : "Mystical Sufi Gong", desc: isMalay ? "Resonansi gelombang dalam meditasi." : "Deep resonant contemplative gong." },
                    { id: 'beep', name: isMalay ? "Isyarat Beep Digital" : "Standard Digital Beep", desc: isMalay ? "Makluman standard dwi-frekuensi." : "Dual-frequency retro buzzer alert." }
                  ].map((snd) => (
                    <div 
                      key={snd.id}
                      onClick={() => setSelectedSound(snd.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                        selectedSound === snd.id 
                          ? "bg-teal-500/10 border-teal-400 text-teal-200" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300"
                      )}
                    >
                      <div className="flex flex-col text-left min-w-0 pr-4">
                        <span className="text-xs font-bold leading-tight truncate">{snd.name}</span>
                        <span className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">{snd.desc}</span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playPreviewSound(snd.id);
                        }}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all hover:scale-105 active:scale-95 cursor-pointer",
                          isPlayingSound === snd.id 
                            ? "bg-amber-500/10 border-amber-400 text-amber-300" 
                            : "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-400"
                        )}
                      >
                        {isPlayingSound === snd.id ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Buttons */}
        {currentStep > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800/60 shrink-0">
            <button
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} />
              {tOnboarding.backBtn}
            </button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {currentStep === stepsCount - 1 ? (
                <>
                  {tOnboarding.finishBtn}
                  <Check size={14} className="stroke-[2.5]" />
                </>
              ) : (
                <>
                  {tOnboarding.nextBtn}
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
