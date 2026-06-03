import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  MapPin, 
  Bell, 
  Volume2, 
  Compass, 
  Play, 
  Pause,
  ArrowRight,
  Check
} from "lucide-react";
import { cn } from "../lib/utils";
import { StorageManager } from "../lib/StorageManager";
import { JAKIM_ZONES } from "../lib/zones";
import { sanitizeInput } from "../lib/security";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/icon/icon.js";
import "@material/web/textfield/filled-text-field.js";
import "@material/web/ripple/ripple.js";

interface OnboardingFlowProps {
  onComplete: (zone: string) => void;
  language: "ms" | "en";
}

// Staggered variants for expressive animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    }
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export function OnboardingFlow({ onComplete, language }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedZone, setSelectedZone] = useState("SGR01");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  
  const [selectedSound, setSelectedSound] = useState<string>("chime");
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const isMalay = language === "ms";

  const tOnboarding = {
    welcomeTitle: isMalay ? "Selamat Pulang" : "Welcome Home",
    welcomeDesc: isMalay 
      ? "AlurWaktu direka khas untuk menjadi pengalaman waktu solat paling elegan dan premium yang pernah anda rasa." 
      : "AlurWaktu is crafted to be the most elegant and premium prayer times experience you've ever felt.",
    startBtn: isMalay ? "Terokai Sekarang" : "Begin Experience",
    
    locTitle: isMalay ? "Di manakah Anda?" : "Where Are You?",
    locDesc: isMalay 
      ? "Pilih kawasan anda untuk sinkronisasi waktu solat luar talian yang sangat pantas." 
      : "Select your zone for ultra-fast, offline-capable prayer time syncing.",
    gpsBtn: isMalay ? "Kesan Automatik" : "Auto-detect",
    gpsLoading: isMalay ? "Mencari..." : "Detecting...",
    gpsSuccessText: isMalay ? "Selesai Dikesan!" : "Matched!",
    searchPlace: isMalay ? "Cari zon / negeri..." : "Search zone or state...",

    notifTitle: isMalay ? "Makluman Agung" : "Elegant Alerts",
    notifDesc: isMalay 
      ? "Berikan kami keizinan untuk mengingatkan anda melalui notifikasi indah dan visual menawan apabila tiba waktu." 
      : "Grant us permission to gently remind you through beautiful notifications and visual cues when it's time.",
    notifBtn: isMalay ? "Beri Keizinan" : "Grant Access",
    notifGranted: isMalay ? "Keizinan Diberi" : "Access Granted",
    notifSkip: isMalay ? "Mungkin Nanti" : "Maybe Later",

    soundTitle: isMalay ? "Tandatangan Audio" : "Audio Signature",
    soundDesc: isMalay 
      ? "Sentuhan terakhir. Pilih bunyi akustik kegemaran anda untuk peringatan azan." 
      : "The final touch. Pick your favorite acoustic chime for adhan reminders.",
    finishBtn: isMalay ? "Lengkap & Mula" : "Finish & Start",
    backBtn: isMalay ? "Kembali" : "Back",
    nextBtn: isMalay ? "Seterusnya" : "Next"
  };

  const stepsCount = 4;

  const handleNext = () => {
    if (currentStep < stepsCount - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      StorageManager.setHasCompletedOnboarding(true);
      onComplete(selectedZone);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

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

      setTimeout(() => setIsPlayingSound(null), 2500);
    } catch (e) {
      console.warn("Audio Context playback failed:", e);
      setIsPlayingSound(null);
    }
  };

  const handleRequestNotification = async () => {
    if (typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      const savedPrefs = StorageManager.getItem('prayer_notifications_v2');
      let parsed = savedPrefs ? JSON.parse(savedPrefs) : {};
      
      const defaultKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      defaultKeys.forEach(k => {
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
            const res = await fetch(`/api/geocoding?lat=${latitude}&lon=${longitude}`);
            if (!res.ok) throw new Error("Gagal mengesan zon");
            const data = await res.json();
            if (data && data.zone) {
              setSelectedZone(data.zone);
              setGpsSuccess(true);
            } else {
              throw new Error("Kawasan tidak disokong");
            }
          } catch (err: any) {
            setGpsError(isMalay ? "Gagal memadankan koordinat." : "Failed to map coordinates.");
          } finally {
            setGpsLoading(false);
          }
        },
        () => {
          setGpsLoading(false);
          setGpsError(isMalay ? "Akses GPS tidak dibenarkan." : "GPS access denied.");
        },
        { timeout: 8000 }
      );
    } else {
      setGpsError(isMalay ? "Pelayar tidak menyokong GPS." : "No GPS support.");
    }
  };

  const filteredZonesList = JAKIM_ZONES.map((state) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return state;
    const matched = state.zones.filter(z => z.l.toLowerCase().includes(query) || z.v.toLowerCase().includes(query));
    return { ...state, zones: matched };
  }).filter(state => state.zones.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-[var(--sys-spacing-edge)] bg-[var(--md-sys-color-surface-container-lowest)] font-sans text-[var(--md-sys-color-on-surface)] overflow-hidden">
      
      {/* Heavy contrast solid shapes - Pure M3 Expressive Editorial */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="absolute -top-[20%] -left-[10%] w-[60vh] h-[60vh] rounded-full bg-[var(--md-sys-color-primary-container)] select-none pointer-events-none" 
      />
      
      {/* Main Massive Pill-Shaped Form Factor */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
        className="relative z-10 w-full max-w-lg min-h-[600px] h-full max-h-[85vh] p-8 sm:p-12 rounded-[48px] sm:rounded-[64px] bg-[var(--md-sys-color-surface-container-highest)] shadow-2xl flex flex-col justify-between overflow-hidden ring-1 ring-[var(--md-sys-color-outline-variant)]/40"
      >
        {/* Step Indicator Top Right */}
        <div className="absolute top-8 right-10 flex gap-2">
          {[...Array(stepsCount)].map((_, idx) => (
            <motion.div 
              key={idx} 
              animate={{ 
                width: idx === currentStep ? 32 : 8,
                backgroundColor: idx === currentStep 
                  ? "var(--md-sys-color-primary)" 
                  : "var(--md-sys-color-outline-variant)"
              }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Carousel slide contents */}
        <div className="flex-1 flex flex-col justify-center h-full w-full py-8 mt-4">
          <AnimatePresence mode="wait" custom={currentStep}>
            {/* --- STEP 1: WELCOME --- */}
            {currentStep === 0 && (
              <motion.div
                key="step-welcome"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-start justify-center h-full space-y-10"
              >
                <motion.div variants={itemVariants} className="w-28 h-28 rounded-[40px] bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-xl">
                  <Compass className="w-14 h-14" strokeWidth={1.5} />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-4 max-w-sm">
                  <h1 className="md3-display-large font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.05]">
                    {tOnboarding.welcomeTitle}
                  </h1>
                  <p className="md3-body-large text-[var(--md-sys-color-on-surface-variant)] font-medium leading-relaxed">
                    {tOnboarding.welcomeDesc}
                  </p>
                </motion.div>
                
                <motion.div variants={itemVariants} className="pt-6 w-full">
                  {/* @ts-ignore */}
                  <md-filled-button onClick={handleNext} style={{ '--md-filled-button-container-shape': '999px', width: '100%', height: '64px' }}>
                    <span className="text-lg font-bold">{tOnboarding.startBtn}</span>
                    <ArrowRight className="w-6 h-6 ml-4" />
                  </md-filled-button>
                </motion.div>
              </motion.div>
            )}

            {/* --- STEP 2: LOCATION --- */}
            {currentStep === 1 && (
              <motion.div
                key="step-location"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col h-full space-y-6 overflow-hidden"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <h2 className="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.1]">
                    {tOnboarding.locTitle}
                  </h2>
                  <p className="md3-body-medium text-[var(--md-sys-color-on-surface-variant)] font-medium">
                    {tOnboarding.locDesc}
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="w-full">
                  {/* @ts-ignore */}
                  <md-filled-tonal-button onClick={handleGPSDetect} disabled={gpsLoading} style={{ '--md-filled-tonal-button-container-shape': '24px', width: '100%', height: '56px' }}>
                    <MapPin className="w-5 h-5 mr-3" />
                    <span className="font-bold">{gpsLoading ? tOnboarding.gpsLoading : tOnboarding.gpsBtn}</span>
                  </md-filled-tonal-button>
                  {gpsSuccess && <div className="text-center text-sm mt-3 font-bold text-[var(--md-sys-color-primary)]">{tOnboarding.gpsSuccessText} <span className="underline">{selectedZone}</span></div>}
                  {gpsError && <div className="text-center text-sm mt-3 font-bold text-[var(--md-sys-color-error)]">{gpsError}</div>}
                </motion.div>

                <motion.div variants={itemVariants} className="flex-1 flex flex-col min-h-0 bg-[var(--md-sys-color-surface)] rounded-[32px] overflow-hidden shadow-sm border border-[var(--md-sys-color-outline-variant)]">
                  <div className="p-2 pb-0">
                    {/* @ts-ignore */}
                    <md-filled-text-field
                      type="text" 
                      placeholder={tOnboarding.searchPlace}
                      value={searchQuery}
                      onInput={(e: any) => setSearchQuery(sanitizeInput(e.target.value))}
                      style={{ 
                        width: '100%',
                        '--md-filled-text-field-container-shape': '24px',
                        '--md-filled-text-field-active-indicator-height': '0px',
                        '--md-filled-text-field-hover-active-indicator-height': '0px',
                        '--md-filled-text-field-focus-active-indicator-height': '0px',
                        '--md-sys-color-surface-variant': 'var(--md-sys-color-surface-container-low)'
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
                    {filteredZonesList.map(state => (
                      <div key={state.state} className="mb-4">
                        <div className="px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-primary)] opacity-80 sticky top-0 bg-[var(--md-sys-color-surface)] z-10">
                          {state.state}
                        </div>
                        {state.zones.map(z => (
                          <motion.button
                            whileHover={{ scale: 0.98 }}
                            whileTap={{ scale: 0.95 }}
                            key={z.v}
                            onClick={() => { setSelectedZone(z.v); setGpsSuccess(false); }}
                            className={cn(
                              "w-full text-left px-5 py-3 mb-1 rounded-[20px] transition-all relative overflow-hidden flex justify-between items-center",
                              z.v === selectedZone 
                                ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold shadow-sm"
                                : "hover:bg-[var(--md-sys-color-surface-container-highest)]"
                            )}
                          >
                            <span className="truncate pr-4">{z.l}</span>
                            <span className="font-mono text-xs opacity-60">{z.v}</span>
                          </motion.button>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* --- STEP 3: NOTIFICATIONS --- */}
            {currentStep === 2 && (
              <motion.div
                key="step-notifications"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-start justify-center h-full space-y-8"
              >
                <motion.div variants={itemVariants} className="w-24 h-24 rounded-[36px] bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] flex items-center justify-center">
                  <Bell className="w-10 h-10" strokeWidth={1.5} />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-4 max-w-sm">
                  <h2 className="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.05]">
                    {tOnboarding.notifTitle}
                  </h2>
                  <p className="md3-body-large text-[var(--md-sys-color-on-surface-variant)] font-medium leading-relaxed">
                    {tOnboarding.notifDesc}
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-4 w-full pt-6">
                  {/* @ts-ignore */}
                  <md-filled-button
                    onClick={handleRequestNotification}
                    style={{ 
                      '--md-filled-button-container-shape': '999px', 
                      height: '64px',
                      ...(notificationPermission === 'granted' ? { 
                        '--md-filled-button-container-color': 'var(--md-sys-color-primary)', 
                        '--md-filled-button-label-text-color': 'var(--md-sys-color-on-primary)' 
                      } : {})
                    }}
                  >
                    <span className="text-lg font-bold">{notificationPermission === 'granted' ? tOnboarding.notifGranted : tOnboarding.notifBtn}</span>
                    {notificationPermission === 'granted' && <Check className="w-6 h-6 ml-3" />}
                  </md-filled-button>
                  
                  {/* @ts-ignore */}
                  <md-outlined-button onClick={handleNext} style={{ '--md-outlined-button-container-shape': '999px', height: '64px' }}>
                    <span className="text-lg font-bold">{tOnboarding.notifSkip}</span>
                  </md-outlined-button>
                </motion.div>
              </motion.div>
            )}

            {/* --- STEP 4: SOUNDS --- */}
            {currentStep === 3 && (
              <motion.div
                key="step-sounds"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col h-full space-y-6"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <h2 className="md3-display-medium font-black tracking-tight text-[var(--md-sys-color-on-surface)] leading-[1.1]">
                    {tOnboarding.soundTitle}
                  </h2>
                  <p className="md3-body-medium text-[var(--md-sys-color-on-surface-variant)] font-medium">
                    {tOnboarding.soundDesc}
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 w-full py-4">
                  {[
                    { id: 'chime', name: isMalay ? "Alunan Loceng Chime" : "Acoustic Chime" },
                    { id: 'soft-chime', name: isMalay ? "Genta Lembut" : "Soft Bell" },
                    { id: 'ambient-gong', name: isMalay ? "Gong Sufi Kuno" : "Mystical Sufi Gong" },
                    { id: 'beep', name: isMalay ? "Isyarat Digital" : "Digital Beep" }
                  ].map((snd) => (
                    <motion.div 
                      key={snd.id}
                      whileHover={{ scale: 0.98 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSound(snd.id)}
                      className={cn(
                        "p-5 rounded-[28px] border-2 transition-all cursor-pointer flex items-center justify-between",
                        selectedSound === snd.id 
                          ? "bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]" 
                          : "bg-[var(--md-sys-color-surface)] border-transparent hover:border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)]"
                      )}
                    >
                      <span className="text-lg font-bold">{snd.name}</span>
                      
                      {/* @ts-ignore */}
                      <md-icon-button
                        onClick={(e: any) => { e.stopPropagation(); playPreviewSound(snd.id); }}
                        style={isPlayingSound === snd.id 
                          ? { '--md-icon-button-state-layer-color': 'var(--md-sys-color-on-primary-container)', '--md-icon-button-icon-color': 'var(--md-sys-color-on-primary-container)' }
                          : { '--md-icon-button-state-layer-color': 'var(--md-sys-color-primary)', '--md-icon-button-icon-color': 'var(--md-sys-color-primary)' }}
                      >
                        {isPlayingSound === snd.id ? <Pause size={24} /> : <Play size={24} />}
                      </md-icon-button>
                    </motion.div>
                  ))}
                </motion.div>
                
                <motion.div variants={itemVariants} className="mt-auto pt-8">
                  {/* @ts-ignore */}
                  <md-filled-button onClick={handleNext} style={{ '--md-filled-button-container-shape': '999px', width: '100%', height: '64px' }}>
                    <span className="text-xl font-bold">{tOnboarding.finishBtn}</span>
                    <Sparkles className="w-6 h-6 ml-3" />
                  </md-filled-button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Footer Navigation Buttons (Only visible on Step 1, 2) */}
        <AnimatePresence>
          {currentStep > 0 && currentStep < stepsCount - 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-6 left-6 right-6 flex items-center justify-between"
            >
              {/* @ts-ignore */}
              <md-outlined-button onClick={handleBack} style={{ '--md-outlined-button-container-shape': '999px', height: '48px' }}>
                <span className="font-bold">{tOnboarding.backBtn}</span>
              </md-outlined-button>
              
              {/* @ts-ignore */}
              <md-filled-button onClick={handleNext} style={{ '--md-filled-button-container-shape': '999px', height: '48px' }}>
                <span className="font-bold">{tOnboarding.nextBtn}</span>
              </md-filled-button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
