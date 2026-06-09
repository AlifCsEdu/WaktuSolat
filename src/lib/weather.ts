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
} from "lucide-svelte";

export interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
}

export interface DailyForecast {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
  precipitation_probability_max: number[];
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
  uvIndex?: number;
  surfacePressure?: number;
  minTemp?: number;
  maxTemp?: number;
  precipitationProb?: number;
  aqi?: number;
  lastUpdated: number;
  hourly?: HourlyForecast;
  daily?: DailyForecast;
}

export const getWeatherDetails = (code: number, isDay: boolean, t: any) => {
  switch (code) {
    case 0:
      return {
        label: isDay ? t("weatherSunny" as any) : t("weatherClear" as any),
        Icon: isDay ? Sun : Moon,
      };
    case 1:
    case 2:
    case 3:
      return {
        label: t("weatherCloudy" as any),
        Icon: isDay ? CloudSun : CloudMoon,
      };
    case 45:
    case 48:
      return { label: t("weatherFoggy" as any), Icon: CloudFog };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: t("weatherDrizzle" as any), Icon: CloudDrizzle };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { label: t("weatherRain" as any), Icon: CloudRain };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { label: t("weatherSnow" as any), Icon: Cloud }; 
    case 95:
    case 96:
    case 99:
      return { label: t("weatherThunderstorm" as any), Icon: CloudLightning };
    default:
      return { label: t("weatherUnknown" as any), Icon: Cloud };
  }
};
