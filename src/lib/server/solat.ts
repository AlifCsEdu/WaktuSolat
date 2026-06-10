import * as adhan from 'adhan';
import { ZONE_COORDINATES } from '../zoneCoordinates';

export function calculateLocalFallback(zone: string, year: number, month: number): any[] {
  const coords = ZONE_COORDINATES[zone];
  if (!coords) return [];
  const [lat, lng] = coords;
  
  const coordinates = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.Singapore();
  params.fajrAngle = 18; // JAKIM 2019 standard
  params.ishaAngle = 18;
  
  // Note: Date month is 0-indexed, so month is month - 1.
  // Passing 0 as day gets the last day of the previous month, so new Date(year, month, 0).getDate() gets number of days in the month.
  const numDays = new Date(year, month, 0).getDate();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const prayerTimesList: any[] = [];
  
  for (let day = 1; day <= numDays; day++) {
    const date = new Date(year, month - 1, day);
    const pTimes = new adhan.PrayerTimes(coordinates, date, params);
    
    const formattedDate = `${String(day).padStart(2, "0")}-${monthsNames[month - 1]}-${year}`;
    const dayName = daysOfWeek[date.getDay()];
    
    const formatTime = (time: Date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(time);
      const h = parts.find(p => p.type === "hour")?.value || "00";
      const m = parts.find(p => p.type === "minute")?.value || "00";
      const s = parts.find(p => p.type === "second")?.value || "00";
      return `${h}:${m}:${s}`;
    };
    
    const fajrTime = formatTime(pTimes.fajr);
    const syurukTime = formatTime(pTimes.sunrise);
    const dhuhrTime = formatTime(pTimes.dhuhr);
    const asrTime = formatTime(pTimes.asr);
    const maghribTime = formatTime(pTimes.maghrib);
    const ishaTime = formatTime(pTimes.isha);
    
    // Imsak is 10 minutes before Fajr
    const [fH, fM] = fajrTime.split(":").map(Number);
    let totalMins = fH * 60 + fM - 10;
    if (totalMins < 0) totalMins += 24 * 60;
    const iH = Math.floor(totalMins / 60).toString().padStart(2, "0");
    const iM = (totalMins % 60).toString().padStart(2, "0");
    const imsakTime = `${iH}:${iM}:00`;
    
    prayerTimesList.push({
      hijri: "",
      date: formattedDate,
      day: dayName,
      imsak: imsakTime,
      fajr: fajrTime,
      syuruk: syurukTime,
      dhuhr: dhuhrTime,
      asr: asrTime,
      maghrib: maghribTime,
      isha: ishaTime
    });
  }
  
  return prayerTimesList;
}
