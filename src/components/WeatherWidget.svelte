<script lang="ts">
  import { ZONE_COORDINATES } from "../lib/zoneCoordinates";
  import {
    Cloud,
    CloudDrizzle,
    CloudFog,
    CloudLightning,
    CloudMoon,
    CloudRain,
    CloudSun,
    Moon,
    Sun,
    Wind,
    Droplets,
    Umbrella,
    WifiOff,
  } from "lucide-svelte";
  import { appSettings } from "../state/settings.svelte";
  import { untrack, tick } from "svelte";
  import { cn } from "../lib/utils";
  import { JAKIM_ZONES } from "../lib/zones";
  import FullWeatherModal from "./FullWeatherModal.svelte";
  import { StorageManager } from "../lib/StorageManager";
  import { analytics } from "../lib/analytics";

  let { selectedZone, userCoords = null, currentLocationName = null } = $props<{
    selectedZone: string;
    userCoords?: {lat: number, lng: number} | null;
    currentLocationName?: string | null;
  }>();

  let isModalOpen = $state(false);
  let isRefreshing = $state(false);
  let isOnline = $state(typeof navigator !== "undefined" ? navigator.onLine : true);

  let weather = $state<any>(null);
  let isLoading = $state(true);
  let lastProvider = $state<string | null>(null);

  let visualStyle = $derived(appSettings.settings.visualStyle);
  let settings = $derived(appSettings.settings);
  let t = $derived((key: any, params?: any) => appSettings.t(key, params));

  $effect(() => {
    const handleOnline = () => isOnline = true;
    const handleOffline = () => isOnline = false;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  $effect(() => {
    // Check initial cached
    const parsed = StorageManager.getCachedWeather(selectedZone);
    if (parsed && typeof parsed.temperature === "number") {
      weather = parsed;
    } else {
      weather = null;
    }
  });

  let intervalId: any;

  $effect(() => {
    if (!selectedZone) return;

    const provider = settings.weatherProvider || 'best_match';
    const coords = userCoords ? [userCoords.lat, userCoords.lng] : (ZONE_COORDINATES[selectedZone] || [3.13, 101.68]);
    const [lat, lng] = coords;

    const force = untrack(() => {
      const isForce = lastProvider !== null && lastProvider !== provider;
      lastProvider = provider;
      return isForce;
    });

    let isMounted = true;

    const fetchWeather = async (force = false) => {
      if (!force) {
        const cached = StorageManager.getCachedWeather(selectedZone);
        if (cached && cached.lastUpdated && Date.now() - cached.lastUpdated < 15 * 60 * 1000) {
          weather = cached;
          isLoading = false;
          return;
        }
      }

      isLoading = true;
      if (force) isRefreshing = true;
      
      try {
        let provider = settings.weatherProvider || 'best_match';
        
        const fetchWithProvider = async (p: string) => {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,surface_pressure,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FSingapore&models=${p}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Failed to fetch weather");
          const data = await res.json();
          if (!data.current || typeof data.current.temperature_2m !== 'number' || typeof data.current.weather_code !== 'number') {
            throw new Error("Invalid weather data from provider");
          }
          return data;
        };

        let weatherData;
        try {
          weatherData = await fetchWithProvider(provider);
        } catch (e) {
          if (provider !== 'best_match') {
            console.warn(`Provider ${provider} failed, falling back to best_match`);
            weatherData = await fetchWithProvider('best_match');
          } else {
            throw e;
          }
        }

        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi&timezone=Asia%2FSingapore`;
        let aqiData = null;
        try {
          const aqiRes = await fetch(aqiUrl);
          if (aqiRes.ok) aqiData = await aqiRes.json();
        } catch (e: any) {
          analytics.logError(e, { context: "weather_aqi_fetch" });
        }

        if (isMounted && weatherData.current) {
          const newData = {
            temperature: Math.round(weatherData.current.temperature_2m),
            apparentTemperature: Math.round(weatherData.current.apparent_temperature),
            weatherCode: weatherData.current.weather_code,
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            isDay: weatherData.current.is_day === 1,
            uvIndex: weatherData.current.uv_index,
            surfacePressure: weatherData.current.surface_pressure,
            minTemp: weatherData.daily?.temperature_2m_min?.[0] ? Math.round(weatherData.daily.temperature_2m_min[0]) : undefined,
            maxTemp: weatherData.daily?.temperature_2m_max?.[0] ? Math.round(weatherData.daily.temperature_2m_max[0]) : undefined,
            precipitationProb: weatherData.daily?.precipitation_probability_max?.[0],
            aqi: aqiData?.current?.us_aqi ? Math.round(aqiData.current.us_aqi) : undefined,
            lastUpdated: Date.now(),
            hourly: weatherData.hourly,
            daily: weatherData.daily,
          };
          
          weather = newData;
          StorageManager.setCachedWeather(selectedZone, newData);
        }
      } catch (err: any) {
        analytics.logError(err, { context: "weather_fetch", zone: selectedZone });
      } finally {
        if (isMounted) {
          isLoading = false;
          isRefreshing = false;
        }
      }
    };

    (window as any).refreshWeatherFn = () => { fetchWeather(true); };

    fetchWeather(force);
    intervalId = setInterval(() => fetchWeather(), 30 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      (window as any).refreshWeatherFn = undefined;
    };
  });

  const handleRefresh = () => {
    if ((window as any).refreshWeatherFn) (window as any).refreshWeatherFn();
  };

  let locationName = $derived.by(() => {
    if (currentLocationName) return currentLocationName;
    for (const state of JAKIM_ZONES) {
      const zone = state.zones.find(z => z.v === selectedZone);
      if (zone) {
        return zone.l.split(',')[0];
      }
    }
    return selectedZone;
  });

  const getWeatherDetails = (code: number, isDay: boolean, _t: any) => {
    switch (code) {
      case 0: return { label: isDay ? _t("weatherSunny") : _t("weatherClear"), Icon: isDay ? Sun : Moon };
      case 1: case 2: case 3: return { label: _t("weatherCloudy"), Icon: isDay ? CloudSun : CloudMoon };
      case 45: case 48: return { label: _t("weatherFoggy"), Icon: CloudFog };
      case 51: case 53: case 55: case 56: case 57: return { label: _t("weatherDrizzle"), Icon: CloudDrizzle };
      case 61: case 63: case 65: case 66: case 67: case 80: case 81: case 82: return { label: _t("weatherRain"), Icon: CloudRain };
      case 71: case 73: case 75: case 77: case 85: case 86: return { label: _t("weatherSnow"), Icon: Cloud }; 
      case 95: case 96: case 99: return { label: _t("weatherThunderstorm"), Icon: CloudLightning };
      default: return { label: _t("weatherUnknown"), Icon: Cloud };
    }
  };

  let details = $derived(weather ? getWeatherDetails(weather.weatherCode, weather.isDay, t) : null);
  let IconComponent = $derived(details?.Icon);
  let label = $derived(details?.label);

  const widgetBgClass = $derived.by(() => {
    if (!weather) return "bg-[var(--md-sys-color-surface-container)]";
    if (weather.weatherCode >= 61 && weather.weatherCode <= 67) {
      return weather.isDay 
        ? "bg-gradient-to-br from-blue-300/30 to-[var(--md-sys-color-surface-container)]"
        : "bg-gradient-to-br from-indigo-900/30 to-[var(--md-sys-color-surface-container)]";
    }
    if (weather.weatherCode === 0) {
      return weather.isDay
        ? "bg-gradient-to-br from-amber-200/30 to-[var(--md-sys-color-surface-container)]"
        : "bg-gradient-to-br from-indigo-900/30 to-[var(--md-sys-color-surface-container)]";
    }
    return "bg-[var(--md-sys-color-surface-container)]";
  });
</script>

{#if !isOnline}
  <div
    class={cn(
      "flex w-full items-center justify-between bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] rounded-[var(--md-sys-shape-corner-extra-large)] p-3 sm:p-4 lg:p-3 xl:p-4 relative overflow-hidden shrink-0 cursor-default border border-[var(--md-sys-color-error)]/25 transition-transform hover:-translate-y-0.5 active:scale-95",
      visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[3px_3px_0px_0px_var(--md-sys-color-on-surface)]",
      visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[8px] border border-[var(--glass-border)]",
      visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
    )}
  >
    <md-ripple></md-ripple>
    <div class="flex items-center gap-3 sm:gap-4 z-10 w-full pr-2 lg:pr-3 relative">
      <div
        class="w-10 h-10 sm:w-12 sm:h-12 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-[var(--md-sys-shape-corner-large)] flex items-center justify-center shrink-0 bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] transition-transform hover:rotate-12 hover:scale-110"
      >
        <WifiOff class={cn(
          "w-5 h-5 sm:w-6 sm:h-6",
          visualStyle === 'retro' && "stroke-[3]",
          (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
          !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.5]"
        )} />
      </div>

      <div class="flex flex-col flex-1 min-w-0">
        <span class="font-black text-sm sm:text-base lg:text-lg leading-tight text-[var(--md-sys-color-on-error-container)] truncate">
          {t("noInternetConnection")}
        </span>
        <span class="text-[10px] sm:text-[11px] uppercase font-black tracking-widest mt-1 opacity-80 text-[var(--md-sys-color-on-error-container)]/80">
          {t("offlineModeActive")}
        </span>
      </div>
    </div>
  </div>
{:else if weather}
  <button
    onclick={() => {
      if (document.startViewTransition) {
        document.startViewTransition(async () => {
          isModalOpen = true;
          await tick();
        });
      } else {
        isModalOpen = true;
      }
    }}
    style:view-transition-name={!isModalOpen ? 'weather-transition' : 'none'}
    class={cn(
      "flex w-full items-center justify-between text-[var(--md-sys-color-on-surface)] rounded-[var(--md-sys-shape-corner-extra-large)] p-3 sm:p-4 lg:p-3 xl:p-4 relative overflow-hidden shrink-0 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
      widgetBgClass,
      visualStyle === 'retro' && "border-2 border-[var(--md-sys-color-on-surface)] shadow-[3px_3px_0px_0px_var(--md-sys-color-on-surface)]",
      visualStyle === 'glass' && "bg-[var(--glass-bg)] backdrop-blur-[8px] border border-[var(--glass-border)]",
      visualStyle === 'soft' && "shadow-[var(--soft-shadow-light)] border-0"
    )}
  >
    <md-ripple></md-ripple>
    <md-elevation level="1"></md-elevation>
    <div class="flex items-center gap-3 sm:gap-4 z-10 w-full pr-2 lg:pr-3 relative">
      <div
        class="w-10 h-10 sm:w-12 sm:h-12 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-[var(--md-sys-shape-corner-large)] flex items-center justify-center shrink-0 bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] transition-all hover:rotate-12 hover:scale-110 hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)]"
      >
        {#if IconComponent}
          <IconComponent class={cn(
            "w-5 h-5 sm:w-6 sm:h-6",
            visualStyle === 'retro' && "stroke-[3]",
            (visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[1.5]",
            !(visualStyle === 'retro' || visualStyle === 'glass' || visualStyle === 'soft') && "stroke-[2.5]"
          )} />
        {/if}
      </div>

      <div class="flex flex-col flex-1 min-w-0">
        <div class="flex items-center justify-between w-full">
          <span class="font-black text-sm sm:text-base lg:text-lg leading-tight text-[var(--md-sys-color-on-surface)] truncate">
            {label}
          </span>
          <div class="flex items-baseline gap-1.5 ml-2 shrink-0">
            <span class="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--md-sys-color-tertiary)] tracking-tight tabular-nums">
              {weather.temperature}°
            </span>
            {#if weather.minTemp !== undefined && weather.maxTemp !== undefined}
              <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--md-sys-color-tertiary)]/80 hidden sm:inline">
                {weather.minTemp}° – {weather.maxTemp}°
              </span>
            {/if}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 opacity-80">
          <div
            class="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
            title={t("humidity")}
          >
            <Droplets class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--md-sys-color-tertiary)] shrink-0 stroke-[3]" />
            <span class="text-[10px] sm:text-[11px] uppercase font-black tracking-widest">
              {weather.humidity}%{" "}
              <span class="hidden sm:inline">
                {t("humidityShort")}
              </span>
            </span>
          </div>
          {#if weather.precipitationProb !== undefined}
            <div
              class="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
              title={t("rainProb")}
            >
              <Umbrella class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--md-sys-color-tertiary)] shrink-0 stroke-[3]" />
              <span class="text-[10px] sm:text-[11px] uppercase font-black tracking-widest">
                {weather.precipitationProb}%{" "}
                <span class="hidden sm:inline">
                  {t("rainShort")}
                </span>
              </span>
            </div>
          {/if}
          <div
            class="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
            title={t("windSpeed")}
          >
            <Wind class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--md-sys-color-tertiary)] shrink-0 stroke-[3]" />
            <span class="text-[10px] sm:text-[11px] uppercase font-black tracking-widest">
              {weather.windSpeed}
              {t("kmh")}{" "}
              <span class="hidden sm:inline">
                {t("windShort")}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </button>

  <FullWeatherModal
    isOpen={isModalOpen}
    onClose={() => {
      if (document.startViewTransition) {
        document.startViewTransition(async () => {
          isModalOpen = false;
          await tick();
        });
      } else {
        isModalOpen = false;
      }
    }}
    {weather}
    {locationName}
    onRefresh={handleRefresh}
    {isRefreshing}
  />
{/if}
