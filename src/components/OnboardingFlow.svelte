<script lang="ts">
  import {
    Sparkles,
    MapPin,
    Bell,
    Volume2,
    Compass,
    Play,
    Square,
    ArrowRight,
    ArrowLeft,
    Check,
    Search,
    ShieldCheck
  } from "lucide-svelte";
  import { Button, IconButton, FilterChip, Switch, Slider, TextField } from "../lib/components/ui";
  import { audioSynthesizer, playSynthesizedSound } from "../lib/audio";
  import { fetchReverseGeocode, matchZoneFromGeocode, findNearestZone } from "../lib/geocoding";
  import { JAKIM_ZONES } from "../lib/zones";
  import { StorageManager } from "../lib/StorageManager";
  import { appSettings } from "../state/settings.svelte";
  import { sanitizeInput } from "../lib/security";
  import { fly, fade, scale } from "../lib/transitions";
  import { cn } from "../lib/utils";
  import type { PreAlertTime, NotificationSound } from "../types";

  let { onComplete, language = "ms" } = $props<{
    onComplete: (zone: string) => void;
    language?: "ms" | "en";
  }>();

  let currentStep = $state(0);
  const totalSteps = 4;

  let selectedZone = $state("SGR01");
  let selectedStateFilter = $state("ALL");
  let searchQuery = $state("");
  let gpsLoading = $state(false);
  let gpsError = $state<string | null>(null);
  let gpsSuccess = $state(false);

  let notificationPermission = $state<NotificationPermission>(
    typeof window !== "undefined" && typeof Notification !== "undefined"
      ? Notification.permission
      : "default"
  );
  let preAlertOffset = $state<PreAlertTime>(0);
  let soundEnabled = $state(true);

  let selectedSound = $state<string>("chime");
  let soundVolume = $state(80);
  let isPlayingSound = $state<string | null>(null);

  let isMalay = $derived(language === "ms");

  let t = $derived({
    stepLabel: isMalay ? "Langkah" : "Step",
    ofLabel: isMalay ? "daripada" : "of",

    welcomeBadge: isMalay ? "AlurWaktu • Waktu Solat Expressive" : "AlurWaktu • Expressive Prayer Times",
    welcomeTitle: isMalay ? "Selamat Datang ke AlurWaktu" : "Welcome to AlurWaktu",
    welcomeDesc: isMalay
      ? "Pengalaman waktu solat paling elegan, tepat dengan piawaian rasmi JAKIM, dan beroperasi sepenuhnya di luar talian."
      : "The most elegant Islamic prayer companion, strictly aligned with official JAKIM data, built for offline reliability.",
    features: [
      {
        icon: Compass,
        title: isMalay ? "Ketepatan JAKIM & GPS Pintar" : "JAKIM & Smart GPS",
        desc: isMalay ? "Sinkronisasi automatik zon solat pantas mengikut lokasi sebenar." : "Automatic prayer zone mapping based on accurate GPS location."
      },
      {
        icon: Bell,
        title: isMalay ? "Notifikasi & Nada Akustik" : "Notifications & Chimes",
        desc: isMalay ? "Peringatan azan indah melalui Web Audio API tanpa fail berat." : "Pure Web Audio synthesis for pleasant, lag-free adhan alerts."
      },
      {
        icon: ShieldCheck,
        title: isMalay ? "100% Berfungsi Luar Talian" : "100% Offline Capable",
        desc: isMalay ? "Jadual tahunan lengkap disimpan dalam peranti anda." : "Full annual prayer schedules cached directly on your device."
      }
    ],
    startBtn: isMalay ? "Mulakan Persediaan" : "Begin Setup",

    locTitle: isMalay ? "Pilih Kawasan Anda" : "Choose Your Location",
    locDesc: isMalay
      ? "Kesan zon solat JAKIM secara automatik melalui GPS atau pilih secara manual."
      : "Auto-detect your JAKIM zone via GPS or choose your state and district manually.",
    gpsBtn: isMalay ? "Kesan Lokasi Automatik (GPS)" : "Auto-Detect Location (GPS)",
    gpsLoadingText: isMalay ? "Mencari Koordinat..." : "Detecting Coordinates...",
    gpsSuccessText: isMalay ? "Lokasi Berjaya Dikesan:" : "Location Matched:",
    searchPlaceholder: isMalay ? "Cari daerah, bandar atau kod zon..." : "Search district, city or zone code...",
    allStates: isMalay ? "Semua Negeri" : "All States",
    selectedZoneLabel: isMalay ? "Zon Dipilih" : "Selected Zone",
    noResults: isMalay ? "Tiada zon ditemui untuk carian ini." : "No zones found matching your search.",

    notifTitle: isMalay ? "Makluman & Peringatan" : "Alerts & Notifications",
    notifDesc: isMalay
      ? "Kekal peka dengan jadual solat melalui notifikasi sistem dan amaran awal."
      : "Stay mindful of prayer times with gentle system notifications and pre-alerts.",
    permissionCardTitle: isMalay ? "Kebenaran Notifikasi Sistem" : "System Notification Permission",
    permissionGranted: isMalay ? "Kebenaran Diberikan" : "Access Granted",
    permissionDenied: isMalay ? "Kebenaran Disekat (Boleh diubah di tetapan)" : "Access Denied (Can be changed in browser settings)",
    permissionPrompt: isMalay ? "Beri kami izin untuk menghantar peringatan azan pada waktunya." : "Grant permission to receive timely reminders at prayer times.",
    grantBtn: isMalay ? "Beri Kebenaran Notifikasi" : "Grant Notification Access",
    preAlertLabel: isMalay ? "Peringatan Awal Sebelum Azan" : "Pre-Alert Before Adhan",
    preAlertOptions: [
      { value: 0, label: isMalay ? "Tepat Waktu (0 min)" : "Exact Time (0m)" },
      { value: 5, label: isMalay ? "5 Minit Awal" : "5m Before" },
      { value: 10, label: isMalay ? "10 Minit Awal" : "10m Before" },
      { value: 15, label: isMalay ? "15 Minit Awal" : "15m Before" }
    ],
    soundToggleLabel: isMalay ? "Bunyi Peringatan" : "Sound Alerts",
    soundToggleDesc: isMalay ? "Mainkan nada sintesis apabila masuk waktu solat" : "Play an acoustic tone when prayer time enters",

    soundTitle: isMalay ? "Tandatangan Audio" : "Audio Signature",
    soundDesc: isMalay
      ? "Pilih bunyi akustik yang paling menenangkan untuk peringatan azan anda."
      : "Pick your preferred acoustic soundscape for prayer alerts.",
    volumeLabel: isMalay ? "Kelantangan Nada" : "Alert Volume",
    finishBtn: isMalay ? "Lengkapkan & Mula Solat" : "Finish & Start Companion",

    backBtn: isMalay ? "Kembali" : "Back",
    nextBtn: isMalay ? "Seterusnya" : "Next"
  });

  const soundPresets = $derived([
    {
      id: "chime",
      title: isMalay ? "Alunan Loceng Chime" : "Acoustic Chime",
      desc: isMalay ? "Harmonik 4-nada C5-E5-G5-C6 dengan gema lembut" : "Quad-tone arpeggiated chord (C5-E5-G5-C6) with gentle decay",
      badge: isMalay ? "Pilihan Utama" : "Recommended"
    },
    {
      id: "soft-chime",
      title: isMalay ? "Genta Lembut" : "Soft Bell",
      desc: isMalay ? "Triad gelombang segitiga A4-E4-A4 yang menenangkan" : "Gentle triangle wave triad (A4-E4-A4)",
      badge: isMalay ? "Menenangkan" : "Calm"
    },
    {
      id: "ambient-gong",
      title: isMalay ? "Gong Sufi Kuno" : "Mystical Sufi Gong",
      desc: isMalay ? "Getaran fundamental A2 110Hz dengan sub-harmonik mendalam" : "Deep A2 110Hz fundamental with rich sub-harmonics",
      badge: isMalay ? "Khusyuk" : "Meditative"
    },
    {
      id: "beep",
      title: isMalay ? "Isyarat Digital" : "Digital Beep",
      desc: isMalay ? "Isyarat dwi-denyut moden 880Hz yang jelas dan ringkas" : "Crisp dual-pulse 880Hz digital prompt",
      badge: isMalay ? "Moden" : "Modern"
    }
  ]);

  const handleNext = () => {
    playSynthesizedSound('tick');
    if (currentStep < totalSteps - 1) {
      currentStep += 1;
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    playSynthesizedSound('tick');
    if (currentStep > 0) {
      currentStep -= 1;
    }
  };

  const handleGPSDetect = () => {
    playSynthesizedSound('tick');
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      gpsLoading = true;
      gpsError = null;
      gpsSuccess = false;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const data = await fetchReverseGeocode(latitude, longitude);
            const matched = matchZoneFromGeocode(data);
            if (matched && matched.zone) {
              selectedZone = matched.zone;
              gpsSuccess = true;
            } else {
              const nearest = findNearestZone(latitude, longitude);
              selectedZone = nearest;
              gpsSuccess = true;
            }
          } catch (fetchErr) {
            try {
              const nearest = findNearestZone(latitude, longitude);
              selectedZone = nearest;
              gpsSuccess = true;
            } catch (offlineErr) {
              gpsError = isMalay ? "Gagal memadankan koordinat lokasi." : "Failed to match GPS coordinates.";
            }
          } finally {
            gpsLoading = false;
          }
        },
        (geoErr) => {
          gpsLoading = false;
          if (geoErr.code === geoErr.PERMISSION_DENIED) {
            gpsError = isMalay ? "Akses GPS tidak dibenarkan." : "GPS access permission was denied.";
          } else {
            gpsError = isMalay ? "Gagal membaca lokasi peranti." : "Unable to retrieve device GPS coordinates.";
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      gpsError = isMalay ? "Pelayar anda tidak menyokong GPS." : "Browser does not support geolocation.";
    }
  };

  const handleRequestNotification = async () => {
    playSynthesizedSound('tick');
    if (typeof window !== "undefined" && typeof Notification !== "undefined") {
      try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
      } catch (err) {
        console.warn("Notification request failed:", err);
      }
    }
  };

  const playPreview = async (soundId: string) => {
    try {
      if (isPlayingSound === soundId) {
        audioSynthesizer.stop();
        isPlayingSound = null;
        return;
      }
      isPlayingSound = soundId;
      await audioSynthesizer.play(soundId, soundVolume);
      const timeoutMs = soundId === 'ambient-gong' ? 3800 : soundId === 'chime' ? 2600 : 1800;
      setTimeout(() => {
        if (isPlayingSound === soundId) {
          isPlayingSound = null;
        }
      }, timeoutMs);
    } catch (err) {
      console.warn("Sound preview error:", err);
      isPlayingSound = null;
    }
  };

  const handleComplete = () => {
    StorageManager.setHasCompletedOnboarding(true);
    StorageManager.setItem("waktu_solat_zone", selectedZone);

    const defaultKeys = ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];
    const notifPrefs: Record<string, any> = {};
    defaultKeys.forEach((k) => {
      notifPrefs[k] = {
        enabled: soundEnabled && k !== "imsak" && k !== "syuruk",
        sound: selectedSound as NotificationSound,
        preAlert: preAlertOffset,
        offset: 0,
        iqamahOffset: k === "maghrib" ? 5 : 10
      };
    });
    StorageManager.setItem("prayer_notifications_v2", JSON.stringify(notifPrefs));
    appSettings.updateSetting("soundVolume", soundVolume);

    audioSynthesizer.play(selectedSound, soundVolume).catch(() => {});
    onComplete(selectedZone);
  };

  let filteredStates = $derived(
    JAKIM_ZONES.map((stateGroup) => {
      if (selectedStateFilter !== "ALL" && stateGroup.state !== selectedStateFilter) {
        return null;
      }
      const query = searchQuery.toLowerCase().trim();
      if (!query) return stateGroup;

      const matchedZones = stateGroup.zones.filter(
        (z) => z.l.toLowerCase().includes(query) || z.v.toLowerCase().includes(query)
      );
      if (matchedZones.length === 0) return null;
      return { ...stateGroup, zones: matchedZones };
    }).filter((s): s is (typeof JAKIM_ZONES)[number] => s !== null)
  );

  let selectedZoneDetail = $derived.by(() => {
    for (const stateGroup of JAKIM_ZONES) {
      const found = stateGroup.zones.find((z) => z.v === selectedZone);
      if (found) return { state: stateGroup.state, ...found };
    }
    return { state: "Selangor", v: "SGR01", l: "Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam" };
  });
</script>

<div
  class="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-3 sm:p-6 bg-background/95 backdrop-blur-xl text-on-surface overflow-hidden select-none"
>
  <!-- Decorative gradient blur shapes -->
  <div
    in:scale={{ start: 0.8, opacity: 0, duration: 500 }}
    class="absolute -top-[15%] -left-[10%] w-[50vh] sm:w-[65vh] h-[50vh] sm:h-[65vh] rounded-full bg-gradient-to-br from-primary/20 via-primary-container/30 to-transparent blur-3xl pointer-events-none"
  ></div>
  <div
    in:scale={{ start: 0.8, opacity: 0, duration: 500, delay: 100 }}
    class="absolute -bottom-[15%] -right-[10%] w-[50vh] sm:w-[65vh] h-[50vh] sm:h-[65vh] rounded-full bg-gradient-to-tl from-tertiary/20 via-secondary-container/25 to-transparent blur-3xl pointer-events-none"
  ></div>

  <!-- Main Wizard Surface Container -->
  <div
    in:fly={{ y: 60, duration: 450, opacity: 0 }}
    class="relative z-10 w-full max-w-xl min-h-[580px] sm:min-h-[640px] max-h-[92vh] p-5 sm:p-8 md:p-10 rounded-[32px] sm:rounded-[44px] bg-surface-container-high/90 border border-outline-variant/60 shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-hidden ring-1 ring-white/10"
  >
    <!-- Top Step Progress Bar & Badge -->
    <div class="flex items-center justify-between gap-4 pb-2">
      <div class="flex items-center gap-1.5 sm:gap-2">
        {#each Array(totalSteps) as _, idx}
          <div
            class={cn(
              "h-2 rounded-full transition-all duration-300 ease-out",
              idx === currentStep
                ? "w-8 sm:w-10 bg-primary"
                : idx < currentStep
                  ? "w-3 sm:w-4 bg-primary/60"
                  : "w-2 bg-outline-variant/50"
            )}
          ></div>
        {/each}
      </div>

      <span class="text-xs font-semibold tracking-wider uppercase text-on-surface-variant/80">
        {t.stepLabel} {currentStep + 1} {t.ofLabel} {totalSteps}
      </span>
    </div>

    <!-- Step Content Area with Fluid M3 Transitions -->
    <div class="flex-1 flex flex-col justify-center my-3 sm:my-4 overflow-hidden min-h-0">
      {#if currentStep === 0}
        <!-- ================= STEP 0: WELCOME ================= -->
        <div
          in:fly={{ y: 30, duration: 350, delay: 100 }}
          out:fly={{ y: -20, duration: 200, isExit: true }}
          class="flex flex-col items-start justify-center h-full space-y-6"
        >
          <div
            in:scale={{ delay: 150, duration: 400 }}
            class="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] sm:rounded-[32px] bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Compass class="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.75} />
          </div>

          <div in:fly={{ y: 15, delay: 200, duration: 350 }} class="space-y-2">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-container text-on-primary-container">
              {t.welcomeBadge}
            </span>
            <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              {t.welcomeTitle}
            </h1>
            <p class="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {t.welcomeDesc}
            </p>
          </div>

          <!-- Feature Highlights List -->
          <div in:fly={{ y: 15, delay: 250, duration: 350 }} class="w-full space-y-2.5 pt-1">
            {#each t.features as feat}
              <div class="flex items-start gap-3 p-3 rounded-2xl bg-surface/70 border border-outline-variant/40">
                <div class="p-2 rounded-xl bg-primary-container text-on-primary-container shrink-0 mt-0.5">
                  <feat.icon class="w-4 h-4" />
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-bold text-on-surface">{feat.title}</h4>
                  <p class="text-xs text-on-surface-variant leading-normal">{feat.desc}</p>
                </div>
              </div>
            {/each}
          </div>

          <div in:fly={{ y: 15, delay: 300, duration: 350 }} class="w-full pt-3">
            <Button
              variant="filled"
              size="lg"
              shape="pill"
              class="w-full h-14 sm:h-16 text-base sm:text-lg font-bold shadow-md shadow-primary/20"
              onclick={handleNext}
            >
              {#snippet leadingIcon()}
                <Sparkles class="w-5 h-5 mr-1" />
              {/snippet}
              {t.startBtn}
              {#snippet trailingIcon()}
                <ArrowRight class="w-5 h-5 ml-1" />
              {/snippet}
            </Button>
          </div>
        </div>

      {:else if currentStep === 1}
        <!-- ================= STEP 1: LOCATION ================= -->
        <div
          in:fly={{ y: 30, duration: 350, delay: 100 }}
          out:fly={{ y: -20, duration: 200, isExit: true }}
          class="flex flex-col h-full space-y-3.5 overflow-hidden"
        >
          <div>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {t.locTitle}
            </h2>
            <p class="text-xs sm:text-sm text-on-surface-variant">
              {t.locDesc}
            </p>
          </div>

          <!-- GPS Detection Button & Status -->
          <div class="space-y-2">
            <Button
              variant="tonal"
              size="md"
              shape="rounded"
              loading={gpsLoading}
              disabled={gpsLoading}
              class="w-full font-bold h-12"
              onclick={handleGPSDetect}
            >
              {#snippet leadingIcon()}
                <MapPin class="w-4 h-4 mr-1 text-primary" />
              {/snippet}
              {gpsLoading ? t.gpsLoadingText : t.gpsBtn}
            </Button>

            {#if gpsSuccess}
              <div
                in:fade={{ duration: 200 }}
                class="flex items-center justify-between p-2.5 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold"
              >
                <div class="flex items-center gap-1.5">
                  <Check class="w-4 h-4 text-primary" />
                  <span>{t.gpsSuccessText}</span>
                </div>
                <span class="font-mono bg-primary text-on-primary px-2 py-0.5 rounded-md">
                  {selectedZone} ({selectedZoneDetail.state})
                </span>
              </div>
            {/if}

            {#if gpsError}
              <div
                in:fade={{ duration: 200 }}
                class="p-2 rounded-xl bg-error-container text-on-error-container text-xs font-medium text-center"
              >
                {gpsError}
              </div>
            {/if}
          </div>

          <!-- Search & State Filters -->
          <div class="space-y-2">
            <TextField
              type="text"
              placeholder={t.searchPlaceholder}
              bind:value={searchQuery}
              clearable
              size="sm"
              shape="rounded"
              oninput={(e) => {
                const target = e.target as HTMLInputElement;
                searchQuery = sanitizeInput(target.value);
              }}
            >
              {#snippet leadingIcon()}
                <Search class="w-4 h-4 text-on-surface-variant" />
              {/snippet}
            </TextField>

            <!-- State Quick Filter Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <FilterChip
                label={t.allStates}
                selected={selectedStateFilter === "ALL"}
                onclick={() => {
                  playSynthesizedSound('tick');
                  selectedStateFilter = "ALL";
                }}
              />
              {#each JAKIM_ZONES as stateGroup}
                <FilterChip
                  label={stateGroup.state}
                  selected={selectedStateFilter === stateGroup.state}
                  onclick={() => {
                    playSynthesizedSound('tick');
                    selectedStateFilter = stateGroup.state;
                  }}
                />
              {/each}
            </div>
          </div>

          <!-- Scrollable JAKIM Zones List -->
          <div class="flex-1 overflow-y-auto p-1 space-y-3 rounded-2xl bg-surface/60 border border-outline-variant/40 min-h-[160px] scrollbar-none">
            {#if filteredStates.length === 0}
              <div class="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <Search class="w-8 h-8 opacity-40 mb-2" />
                <p class="text-xs">{t.noResults}</p>
              </div>
            {:else}
              {#each filteredStates as stateGroup (stateGroup.state)}
                <div class="space-y-1">
                  <div class="px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary sticky top-0 bg-surface-container-high/90 backdrop-blur-sm z-10 rounded-lg">
                    {stateGroup.state}
                  </div>
                  {#each stateGroup.zones as z (z.v)}
                    {@const isSelected = z.v === selectedZone}
                    <button
                      type="button"
                      onclick={() => {
                        playSynthesizedSound('tick');
                        selectedZone = z.v;
                        gpsSuccess = false;
                      }}
                      class={cn(
                        "w-full text-left p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-between gap-3 text-xs sm:text-sm active:scale-[0.98]",
                        isSelected
                          ? "bg-primary-container text-on-primary-container font-bold ring-1 ring-primary shadow-sm"
                          : "hover:bg-surface-container text-on-surface"
                      )}
                    >
                      <div class="flex items-center gap-2.5 truncate">
                        <div class={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                          isSelected ? "border-primary bg-primary text-on-primary" : "border-outline"
                        )}>
                          {#if isSelected}
                            <Check class="w-2.5 h-2.5" />
                          {/if}
                        </div>
                        <span class="truncate">{z.l}</span>
                      </div>
                      <span class="font-mono text-xs opacity-75 px-1.5 py-0.5 rounded bg-surface-container-highest shrink-0">
                        {z.v}
                      </span>
                    </button>
                  {/each}
                </div>
              {/each}
            {/if}
          </div>
        </div>

      {:else if currentStep === 2}
        <!-- ================= STEP 2: NOTIFICATIONS ================= -->
        <div
          in:fly={{ y: 30, duration: 350, delay: 100 }}
          out:fly={{ y: -20, duration: 200, isExit: true }}
          class="flex flex-col h-full space-y-4 justify-center"
        >
          <div>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {t.notifTitle}
            </h2>
            <p class="text-xs sm:text-sm text-on-surface-variant">
              {t.notifDesc}
            </p>
          </div>

          <!-- Browser Notification Permission Card -->
          <div class="p-4 rounded-2xl bg-surface/80 border border-outline-variant/50 space-y-3 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-tertiary-container text-on-tertiary-container">
                  <Bell class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="text-sm font-bold text-on-surface">{t.permissionCardTitle}</h4>
                  <p class="text-xs text-on-surface-variant">{t.permissionPrompt}</p>
                </div>
              </div>
            </div>

            <div class="pt-1">
              {#if notificationPermission === 'granted'}
                <div class="flex items-center gap-2 p-2.5 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold">
                  <Check class="w-4 h-4 text-primary" />
                  <span>{t.permissionGranted}</span>
                </div>
              {:else if notificationPermission === 'denied'}
                <div class="p-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
                  {t.permissionDenied}
                </div>
              {:else}
                <Button
                  variant="filled"
                  size="md"
                  shape="rounded"
                  class="w-full font-bold"
                  onclick={handleRequestNotification}
                >
                  {#snippet leadingIcon()}
                    <Bell class="w-4 h-4 mr-1" />
                  {/snippet}
                  {t.grantBtn}
                </Button>
              {/if}
            </div>
          </div>

          <!-- Pre-Alert Preference Options -->
          <div class="space-y-2 p-4 rounded-2xl bg-surface/80 border border-outline-variant/50">
            <span class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t.preAlertLabel}
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {#each t.preAlertOptions as opt}
                <FilterChip
                  label={opt.label}
                  selected={preAlertOffset === opt.value}
                  onclick={() => {
                    playSynthesizedSound('tick');
                    preAlertOffset = opt.value as PreAlertTime;
                  }}
                />
              {/each}
            </div>
          </div>

          <!-- Sound Alert Master Toggle -->
          <div class="p-4 rounded-2xl bg-surface/80 border border-outline-variant/50 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-sm font-bold text-on-surface">{t.soundToggleLabel}</span>
              <p class="text-xs text-on-surface-variant">{t.soundToggleDesc}</p>
            </div>
            <Switch
              bind:checked={soundEnabled}
              onchange={() => playSynthesizedSound('tick')}
            />
          </div>
        </div>

      {:else if currentStep === 3}
        <!-- ================= STEP 3: SOUND SIGNATURE ================= -->
        <div
          in:fly={{ y: 30, duration: 350, delay: 100 }}
          out:fly={{ y: -20, duration: 200, isExit: true }}
          class="flex flex-col h-full space-y-3.5 justify-center overflow-hidden"
        >
          <div>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {t.soundTitle}
            </h2>
            <p class="text-xs sm:text-sm text-on-surface-variant">
              {t.soundDesc}
            </p>
          </div>

          <!-- Interactive Sound Preset Selection Cards -->
          <div class="space-y-2 overflow-y-auto max-h-[300px] p-1 scrollbar-none">
            {#each soundPresets as snd (snd.id)}
              {@const isSelected = selectedSound === snd.id}
              {@const isPlaying = isPlayingSound === snd.id}
              <div
                tabindex="0"
                role="button"
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    playSynthesizedSound('tick');
                    selectedSound = snd.id;
                  }
                }}
                onclick={() => {
                  playSynthesizedSound('tick');
                  selectedSound = snd.id;
                }}
                class={cn(
                  "p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98]",
                  isSelected
                    ? "bg-primary-container/80 border-primary text-on-primary-container ring-1 ring-primary shadow-sm"
                    : "bg-surface/80 border-outline-variant/50 text-on-surface hover:bg-surface-container"
                )}
              >
                <div class="flex items-center gap-3 truncate">
                  <div class={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                    isSelected ? "border-primary bg-primary text-on-primary" : "border-outline"
                  )}>
                    {#if isSelected}
                      <Check class="w-3 h-3" />
                    {/if}
                  </div>
                  <div class="truncate">
                    <div class="flex items-center gap-2">
                      <span class="text-xs sm:text-sm font-bold truncate">{snd.title}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant">
                        {snd.badge}
                      </span>
                    </div>
                    <p class="text-[11px] text-on-surface-variant truncate mt-0.5">{snd.desc}</p>
                  </div>
                </div>

                <IconButton
                  variant={isPlaying ? "filled" : "tonal"}
                  size="sm"
                  ariaLabel="Preview sound"
                  onclick={(e) => {
                    e.stopPropagation();
                    playPreview(snd.id);
                  }}
                >
                  {#snippet children()}
                    {#if isPlaying}
                      <Square class="w-4 h-4 fill-current" />
                    {:else}
                      <Play class="w-4 h-4 fill-current" />
                    {/if}
                  {/snippet}
                </IconButton>
              </div>
            {/each}
          </div>

          <!-- Volume Preview Slider -->
          <div class="p-3.5 rounded-2xl bg-surface/80 border border-outline-variant/50 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-on-surface">
              <div class="flex items-center gap-1.5">
                <Volume2 class="w-4 h-4 text-primary" />
                <span>{t.volumeLabel}</span>
              </div>
              <span class="font-mono">{soundVolume}%</span>
            </div>
            <Slider
              bind:value={soundVolume}
              min={0}
              max={100}
              step={5}
              unit="%"
            />
          </div>
        </div>
      {/if}
    </div>

    <!-- Bottom Navigation Footer Buttons -->
    <div class="flex items-center justify-between gap-3 pt-3 border-t border-outline-variant/40">
      {#if currentStep > 0}
        <Button
          variant="outlined"
          size="md"
          shape="pill"
          onclick={handleBack}
        >
          {#snippet leadingIcon()}
            <ArrowLeft class="w-4 h-4 mr-1" />
          {/snippet}
          {t.backBtn}
        </Button>
      {:else}
        <div></div>
      {/if}

      {#if currentStep === 0}
        <div></div>
      {:else if currentStep === totalSteps - 1}
        <Button
          variant="filled"
          size="md"
          shape="pill"
          class="font-bold shadow-md shadow-primary/20"
          onclick={handleComplete}
        >
          {#snippet leadingIcon()}
            <Sparkles class="w-4 h-4 mr-1" />
          {/snippet}
          {t.finishBtn}
        </Button>
      {:else}
        <Button
          variant="filled"
          size="md"
          shape="pill"
          class="font-bold"
          onclick={handleNext}
        >
          {t.nextBtn}
          {#snippet trailingIcon()}
            <ArrowRight class="w-4 h-4 ml-1" />
          {/snippet}
        </Button>
      {/if}
    </div>
  </div>
</div>