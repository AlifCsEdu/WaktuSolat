import { JAKIM_ZONES } from "./zones";

export const ALIASES: Record<string, string> = {
  ampang: "SGR01",
  kajang: "SGR01",
  bangi: "SGR01",
  semenyih: "SGR01",
  "hulu langat": "SGR01",
  cheras: "WLY01",
  "kelana jaya": "SGR01",
  puchong: "SGR01",
  subang: "SGR01",
  "subang jaya": "SGR01",
  "petaling jaya": "SGR01",
  pj: "SGR01",
  damansara: "SGR01",
  "bandar utama": "SGR01",
  cyberjaya: "SGR01",
  sepang: "SGR01",
  dengkil: "SGR01",
  klia: "SGR01",
  "salak tinggi": "SGR01",
  banting: "SGR03",
  jenjarom: "SGR03",
  "teluk panglima garang": "SGR03",
  "shah alam": "SGR01",
  gombak: "SGR01",
  "batu caves": "SGR01",
  selayang: "SGR01",
  rawang: "SGR01",
  "kuala kubu bharu": "SGR01",
  "hulu selangor": "SGR01",
  "sungai buloh": "SGR01",
  serendah: "SGR01",
  "batang kali": "SGR01",
  klang: "SGR03",
  "port klang": "SGR03",
  kapar: "SGR03",
  meru: "SGR03",
  "kuala langat": "SGR03",
  "pulau carey": "SGR03",
  morib: "SGR03",
  jugra: "SGR03",
  "kuala selangor": "SGR02",
  "tanjong karang": "SGR02",
  "sabak bernam": "SGR02",
  sekinchan: "SGR02",
  "sungai besar": "SGR02",
  ijok: "SGR02",
  jeram: "SGR02",
  "bestari jaya": "SGR02",
  "kuala lumpur": "WLY01",
  putrajaya: "WLY01",
  labuan: "WLY02",
  kepong: "WLY01",
  "wangsa maju": "WLY01",
  setapak: "WLY01",
  sentul: "WLY01",
  "bukit jalil": "WLY01",
  "bandar tun razak": "WLY01",
  titiwangsa: "WLY01",
  bangsar: "WLY01",
  "mont kiara": "WLY01",
  "sri petaling": "WLY01",
  "sungai besi": "WLY01",
  "johor bahru": "JHR02",
  jb: "JHR02",
  "pasir gudang": "JHR02",
  skudai: "JHR02",
  masai: "JHR02",
  "gelang patah": "JHR02",
  kulai: "JHR02",
  senai: "JHR02",
  "kota tinggi": "JHR02",
  mersing: "JHR02",
  "ulu tiram": "JHR02",
  plentong: "JHR02",
  kempas: "JHR02",
  tampoi: "JHR02",
  "layang-layang": "JHR03",
  sedili: "JHR02",
  pengerang: "JHR02",
  desaru: "JHR02",
  "batu pahat": "JHR04",
  "yong peng": "JHR04",
  muar: "JHR04",
  pagoh: "JHR04",
  segamat: "JHR04",
  tangkak: "JHR04",
  labis: "JHR04",
  "parit sulong": "JHR04",
  "ayer hitam": "JHR04",
  "sri gading": "JHR04",
  "parit raja": "JHR04",
  "bukit gambir": "JHR04",
  bekok: "JHR04",
  chaah: "JHR04",
  "buloh kasap": "JHR04",
  kluang: "JHR03",
  "simpang renggam": "JHR03",
  pontian: "JHR03",
  "pekan nenas": "JHR03",
  benut: "JHR03",
  kukup: "JHR03",
  mengkibol: "JHR03",
  paloh: "JHR03",
  kahang: "JHR03",
  "pulau aur": "JHR01",
  "pulau pemanggil": "JHR01",
  melaka: "MLK01",
  "ayer keroh": "MLK01",
  jasin: "MLK01",
  "alor gajah": "MLK01",
  "masjid tanah": "MLK01",
  "sg udang": "MLK01",
  "batu berendam": "MLK01",
  merlimau: "MLK01",
  "pulau sebang": "MLK01",
  machap: "MLK01",
  "kuala sungai baru": "MLK01",
  klebang: "MLK01",
  bemban: "MLK01",
  seremban: "NGS03",
  "port dickson": "NGS03",
  pd: "NGS03",
  senawang: "NGS03",
  nilai: "NGS03",
  mantin: "NGS03",
  rantau: "NGS03",
  lukut: "NGS03",
  chuah: "NGS03",
  "bandar sri sendayan": "NGS03",
  lenggeng: "NGS03",
  "kuala pilah": "NGS02",
  rembau: "NGS02",
  jelebu: "NGS02",
  "kuala klawang": "NGS02",
  johol: "NGS02",
  juasseh: "NGS02",
  "seri menanti": "NGS02",
  pedas: "NGS02",
  kota: "NGS02",
  pertang: "NGS02",
  "simpang durian": "NGS02",
  tampin: "NGS01",
  jempol: "NGS01",
  bahau: "NGS01",
  gemas: "NGS01",
  gemencheh: "NGS01",
  "bandar seri jempol": "NGS01",
  "batu kikir": "NGS01",
  "rompin negeri sembilan": "NGS01",
  "pasir mas": "KTN01",
  tumpat: "KTN01",
  "tanah merah": "KTN01",
  bachok: "KTN01",
  "pasir puteh": "KTN01",
  machang: "KTN01",
  "kuala krai": "KTN01",
  ketereh: "KTN01",
  "pengkalan chepa": "KTN01",
  "kubang kerian": "KTN01",
  "wakaf bharu": "KTN01",
  "rantau panjang": "KTN01",
  salor: "KTN01",
  pendek: "KTN01",
  peringat: "KTN01",
  jelawat: "KTN01",
  "awang besut": "KTN01",
  "kok lanas": "KTN01",
  melor: "KTN01",
  kadok: "KTN01",
  "bukit panau": "KTN01",
  kusial: "KTN01",
  jedok: "KTN01",
  dabung: "KTN01",
  "manek urai": "KTN01",
  kemahang: "KTN01",
  jerek: "KTN01",
  "gua musang": "KTN02",
  jeli: "KTN02",
  bertam: "KTN02",
  galas: "KTN02",
  loji: "KTN02",
  "batu melintang": "KTN02",
  "kuala balah": "KTN02",
  "kuala terengganu": "TRG01",
  "kuala nerus": "TRG01",
  marang: "TRG01",
  "batu rakit": "TRG01",
  "bukit payong": "TRG01",
  manir: "TRG01",
  "gong badak": "TRG01",
  "wakaf tapai": "TRG01",
  "kuala ibai": "TRG01",
  chedang: "TRG01",
  merchang: "TRG01",
  kemaman: "TRG04",
  cukai: "TRG04",
  dungun: "TRG04",
  kerteh: "TRG04",
  paka: "TRG04",
  kijal: "TRG04",
  kemasik: "TRG04",
  cheneh: "TRG04",
  "ketengah jaya": "TRG04",
  binjai: "TRG04",
  "kuala abang": "TRG04",
  besut: "TRG02",
  jerteh: "TRG02",
  setiu: "TRG02",
  "kampung raja": "TRG02",
  "kuala besut": "TRG02",
  jabi: "TRG02",
  permaisuri: "TRG02",
  chalok: "TRG02",
  "sungai tong": "TRG02",
  penarik: "TRG02",
  "hulu terengganu": "TRG03",
  "kuala berang": "TRG03",
  ajit: "TRG03",
  tersat: "TRG03",
  "kuala telemong": "TRG03",
  jenagor: "TRG03",
  "sungai telemong": "TRG03",
  kuantan: "PHG02",
  pekan: "PHG02",
  "rompin pahang": "PHG02",
  "muadzam shah": "PHG02",
  "indera mahkota": "PHG02",
  gambang: "PHG02",
  beserah: "PHG02",
  balok: "PHG02",
  "sungai lembing": "PHG02",
  nenasi: "PHG02",
  chuping: "PHG02",
  "kuala rompin": "PHG02",
  endau: "PHG02",
  temerloh: "PHG03",
  mentakab: "PHG03",
  maran: "PHG03",
  bera: "PHG03",
  jengka: "PHG03",
  jerantut: "PHG03",
  lancang: "PHG03",
  "kuala krau": "PHG03",
  chenor: "PHG03",
  "bandar tun razak pahang": "PHG03",
  triang: "PHG03",
  kemayan: "PHG03",
  mengkarak: "PHG03",
  "bandar bera": "PHG03",
  "taman negara": "PHG03",
  "kuala tahan": "PHG03",
  bentong: "PHG04",
  raub: "PHG04",
  lipis: "PHG04",
  "kuala lipis": "PHG04",
  karak: "PHG04",
  benta: "PHG04",
  dong: "PHG04",
  tras: "PHG04",
  "padang tengku": "PHG04",
  merapoh: "PHG04",
  "batu talam": "PHG04",
  "bukit tinggi": "PHG05",
  "janda baik": "PHG05",
  "genting sempah": "PHG05",
  "cameron highlands": "PHG06",
  "tanah rata": "PHG06",
  brinchang: "PHG06",
  "genting highlands": "PHG06",
  ringlet: "PHG06",
  "kampung raja pahang": "PHG06",
  "fraser's hill": "PHG06",
  "bukit fraser": "PHG06",
  "pulau tioman": "PHG01",
  kuching: "SWK08",
  bau: "SWK08",
  lundu: "SWK08",
  sematan: "SWK08",
  padawan: "SWK08",
  "batu kawa": "SWK08",
  "matang sarawak": "SWK08",
  santubong: "SWK08",
  bako: "SWK08",
  siniawan: "SWK08",
  miri: "SWK02",
  marudi: "SWK02",
  bekenu: "SWK02",
  niah: "SWK02",
  sibuti: "SWK02",
  lutong: "SWK02",
  pujut: "SWK02",
  bakam: "SWK02",
  "long lama": "SWK02",
  beluru: "SWK02",
  sibu: "SWK04",
  kanowit: "SWK04",
  mukah: "SWK04",
  dalat: "SWK04",
  kapit: "SWK04",
  song: "SWK04",
  igan: "SWK04",
  oya: "SWK04",
  balingian: "SWK04",
  selangau: "SWK04",
  belaga: "SWK04",
  "sungai merah": "SWK04",
  bintulu: "SWK03",
  tatau: "SWK03",
  "belaga swk03": "SWK03",
  suai: "SWK03",
  sebauh: "SWK03",
  pandan: "SWK03",
  kemena: "SWK03",
  kidurong: "SWK03",
  samarahan: "SWK07",
  serian: "SWK07",
  simunjan: "SWK07",
  asanajaya: "SWK07",
  sebuyau: "SWK07",
  meludam: "SWK07",
  siburan: "SWK07",
  tebedu: "SWK07",
  "balai ringin": "SWK07",
  "sri aman": "SWK06",
  "lubok antu": "SWK06",
  betong: "SWK06",
  saratok: "SWK06",
  spaoh: "SWK06",
  lingga: "SWK06",
  engkilili: "SWK06",
  pusa: "SWK06",
  roban: "SWK06",
  debak: "SWK06",
  kabong: "SWK06",
  maludam: "SWK06",
  sarikei: "SWK05",
  bintangor: "SWK05",
  julau: "SWK05",
  daro: "SWK05",
  matu: "SWK05",
  "tanjung manis": "SWK05",
  belawai: "SWK05",
  rajang: "SWK05",
  meradong: "SWK05",
  pakan: "SWK05",
  limbang: "SWK01",
  lawas: "SWK01",
  sundar: "SWK01",
  trusan: "SWK01",
  "nanga medamit": "SWK01",
  merapok: "SWK01",
  "kota kinabalu": "SBH07",
  penampang: "SBH07",
  putatan: "SBH07",
  papar: "SBH07",
  tuaran: "SBH07",
  "kota belud": "SBH07",
  ranau: "SBH07",
  inanam: "SBH07",
  menggatal: "SBH07",
  telipok: "SBH07",
  tamparuli: "SBH07",
  kinarit: "SBH07",
  bongawan: "SBH07",
  donggongon: "SBH07",
  kepayan: "SBH07",
  likas: "SBH07",
  tangkarason: "SBH07",
  sandakan: "SBH01",
  beluran: "SBH01",
  kinabatangan: "SBH01",
  "bukit garam": "SBH01",
  semawang: "SBH01",
  temanggong: "SBH01",
  sukau: "SBH01",
  "batu sapi": "SBH01",
  "gum gum": "SBH01",
  telupid: "SBH02",
  tongod: "SBH02",
  pinangah: "SBH02",
  terusan: "SBH02",
  kuamut: "SBH02",
  bohayan: "SBH02",
  halogilat: "SBH02",
  paitan: "SBH02",
  tawau: "SBH03",
  "lahad datu": "SBH03",
  semporna: "SBH03",
  kunak: "SBH03",
  kalabakan: "SBH04",
  tambisan: "SBH03",
  sahabat: "SBH03",
  tungku: "SBH03",
  silabukan: "SBH03",
  balung: "SBH04",
  merotai: "SBH04",
  keningau: "SBH08",
  tambunan: "SBH08",
  nabawan: "SBH08",
  pensiangan: "SBH08",
  bingkor: "SBH08",
  tambaig: "SBH08",
  sokid: "SBH08",
  sook: "SBH08",
  tulid: "SBH08",
  tenom: "SBH09",
  beaufort: "SBH09",
  "kuala penyu": "SBH09",
  sipitang: "SBH09",
  "long pasia": "SBH09",
  membakut: "SBH09",
  weston: "SBH09",
  sindumin: "SBH09",
  lumadan: "SBH09",
  kemabong: "SBH09",
  melalap: "SBH09",
  kudat: "SBH05",
  "kota marudu": "SBH05",
  pitas: "SBH05",
  "pulau banggi": "SBH05",
  matunggong: "SBH05",
  sikuati: "SBH05",
  tandek: "SBH05",
  langkon: "SBH05",
  "gunung kinabalu": "SBH06"
};

/**
 * Extract the state/subdivision name from the geocode API response.
 */
export function extractStateName(data: any): string {
  if (data?.bdc?.principalSubdivision) return data.bdc.principalSubdivision;
  if (data?.bdc?.city) return data.bdc.city;
  if (data?.osm?.address?.state) return data.osm.address.state;
  if (data?.osm?.address?.city) return data.osm.address.city;
  return "";
}

/**
 * Extract localized locality name.
 */
export function extractLocalityName(data: any): string {
  if (data?.bdc?.locality) return data.bdc.locality;
  if (data?.bdc?.city) return data.bdc.city;
  if (data?.osm?.address?.city) return data.osm.address.city;
  if (data?.osm?.address?.town) return data.osm.address.town;
  if (data?.osm?.address?.suburb) return data.osm.address.suburb;
  if (data?.bdc?.principalSubdivision) return data.bdc.principalSubdivision;
  if (data?.osm?.address?.state) return data.osm.address.state;
  return "Kawasan Semasa";
}

/**
 * Map state names to JAKIM zone code defaults.
 */
export function mapStateToZone(stateName: string): string {
  if (!stateName) return "";
  const s = stateName.toLowerCase();
  if (s.includes("johor")) return "JHR02";
  if (s.includes("kedah")) return "KDH01";
  if (s.includes("kelantan")) return "KTN01";
  if (s.includes("melaka") || s.includes("malacca")) return "MLK01";
  if (s.includes("negeri sembilan")) return "NGS02";
  if (s.includes("pahang")) return "PHG02";
  if (s.includes("perak")) return "PRK02";
  if (s.includes("perlis")) return "PLS01";
  if (s.includes("pulau pinang") || s.includes("penang")) return "PNG01";
  if (s.includes("sabah")) return "SBH07";
  if (s.includes("sarawak")) return "SWK08";
  if (s.includes("selangor")) return "SGR01";
  if (s.includes("terengganu")) return "TRG01";
  if (s.includes("kuala lumpur") || s.includes("putrajaya") || s.includes("federal territory")) return "WLY01";
  if (s.includes("labuan")) return "WLY02";
  return "";
}

/**
 * Call the back-end proxy geocoding API route.
 */
export async function fetchReverseGeocode(lat: number, lng: number): Promise<any> {
  const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
  if (!res.ok) {
    throw new Error(`Geocoding reverse lookup failed for coords: ${lat}, ${lng}`);
  }
  return res.json();
}

export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(
      /\b(mukim|daerah|bandar|kampung|pekan|taman|parlimen|dun|kg|kg\.|kpg|kpg\.)\b/g,
      ""
    )
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function traverseStrings(obj: any): string[] {
  const strings: string[] = [];
  if (typeof obj === "string") {
    strings.push(obj.toLowerCase());
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => strings.push(...traverseStrings(item)));
  } else if (typeof obj === "object" && obj !== null) {
    Object.values(obj).forEach((item) => strings.push(...traverseStrings(item)));
  }
  return strings;
}

/**
 * Perform a prioritized match of zone and reason based on raw API data.
 */
export function matchZoneFromGeocode(data: any): { zone: string; reasonKey: "locality" | "alias" | "state" | "default"; detailVal: string } {
  // Combine prioritized locality extractions
  const prioritizedStrings: string[] = [];
  if (data.osm?.address) {
    const a = data.osm.address;
    if (a.village) prioritizedStrings.push(a.village);
    if (a.suburb) prioritizedStrings.push(a.suburb);
    if (a.city_district) prioritizedStrings.push(a.city_district);
    if (a.town) prioritizedStrings.push(a.town);
    if (a.city) prioritizedStrings.push(a.city);
    if (a.county) prioritizedStrings.push(a.county);
    if (a.state_district) prioritizedStrings.push(a.state_district);
  }
  if (data.bdc) {
    if (data.bdc.locality) prioritizedStrings.push(data.bdc.locality);
    if (data.bdc.city) prioritizedStrings.push(data.bdc.city);
  }

  const cleanedPriorities = prioritizedStrings.map(cleanText).filter((s) => s.length > 2);
  const allStringsRaw = traverseStrings(data);
  const combinedStrings = [
    ...new Set([
      ...cleanedPriorities,
      ...allStringsRaw.filter((s) => s.length > 2).map(cleanText),
    ]),
  ];

  // 1. Alias match
  for (const str of combinedStrings) {
    if (ALIASES[str]) {
      const displayName = str
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        zone: ALIASES[str],
        reasonKey: "alias",
        detailVal: displayName,
      };
    }
  }

  // 2. Exact Zone Name Match & Substring Match
  const matches: {
    zone: string;
    priority: number;
    display: string;
  }[] = [];

  for (const state of JAKIM_ZONES) {
    for (const z of state.zones) {
      const parts = z.l
        .toLowerCase()
        .split(/[,()\/]/)
        .map((p) => cleanText(p))
        .filter(Boolean);
      for (const part of parts) {
        for (const str of combinedStrings) {
          if (str === part) {
            const isPrioritized = cleanedPriorities.includes(str);
            matches.push({
              zone: z.v,
              priority: isPrioritized ? 4 : 3,
              display: part,
            });
          } else if (
            (str.includes(` ${part} `) ||
              str.startsWith(`${part} `) ||
              str.endsWith(` ${part}`)) &&
            part.length > 3
          ) {
            matches.push({ zone: z.v, priority: 2, display: part });
          } else if (
            (str.includes(part) || part.includes(str)) &&
            str.length > 4 &&
            part.length > 4
          ) {
            matches.push({ zone: z.v, priority: 1, display: part });
          }
        }
      }
    }
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.priority - a.priority);
    const displayName = matches[0].display
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      zone: matches[0].zone,
      reasonKey: "locality",
      detailVal: displayName,
    };
  }

  // 3. Fallback to state
  const stateName = extractStateName(data);
  if (stateName) {
    const foundZone = mapStateToZone(stateName);
    if (foundZone) {
      const displayState = stateName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        zone: foundZone,
        reasonKey: "state",
        detailVal: displayState,
      };
    }
  }

  return {
    zone: "WLY01",
    reasonKey: "default",
    detailVal: "Kuala Lumpur",
  };
}
