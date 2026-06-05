import adhan from "adhan";

const ZONE_COORDINATES: Record<string, [number, number]> = {
  "SGR01": [3.07, 101.51]
};

function calculateLocalPrayerTimes(zone: string, year: number, month: number): any[] {
  const coords = ZONE_COORDINATES[zone];
  if (!coords) return [];
  const [lat, lng] = coords;
  
  const coordinates = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.Singapore();
  params.fajrAngle = 18; // JAKIM standard after 2019
  params.ishaAngle = 18;
  
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

const times = calculateLocalPrayerTimes("SGR01", 2026, 6);
console.log("Calculated times count:", times.length);
console.log("Sample day 5:", times[4]);
