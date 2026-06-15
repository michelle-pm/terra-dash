export interface Booking {
  code: string;
  source: string;
  group?: string;
  bookingDate: string; // YYYY-MM-DD
  cancelDate: string | null; // YYYY-MM-DD or null
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  category: string;
  roomNum: string;
  guest: string;
  adults: number;
  children: number;
  balance: number;
  total: number;
  manager?: string;
}

export interface ManagerPerformance {
  name: string;
  revenueHousing: number;
  revenueServices: number;
  revenueTotal: number;
  bookingCodes: string[];
}

// 1. Defined Managers mapping from the CSV report
export const MANAGERS: ManagerPerformance[] = [
  {
    name: "Вязникова Наталья",
    revenueHousing: 6133318.12,
    revenueServices: 1206520,
    revenueTotal: 7339838.12,
    bookingCodes: [
      "UCUJP-040226", "SPYTD-270326", "NDVDR-090626", "WLYR6-130226", "N4TM2-270326",
      "2NMST-240326", "JAJDA-230526", "2FWVN-230526", "YC56T-260526", "W2NH2-190426",
      "MYP2A-170426", "RFPDU-170426", "64E7E-170426", "VE34L-160426", "6SMC6-070126",
      "JYS2N-130426", "XTFXD-130426", "DRCZ4-130426", "XLJV2-130426", "ALFJA-130426",
      "DALU3-120426", "95HWY-100426", "633R6-090426", "ZADYL-090426", "JP725-090426",
      "327VM-090426", "HNA9M-090426", "7NSFE-090426", "H3WZP-090426", "F2594-070126",
      "5RRX6-280526", "4ZM2N-090626", "2WLZX-250526", "2YCLU-170526", "P6RRS-170526",
      "JLTAX-170526", "62Y6Y-270326", "4SRNS-030526", "SW259-020526", "2DRV3-010526",
      "YH3XK-290426", "6HYZ3-290426", "M5RTP-270326", "JWKYC-150226", "7NPDX-170226",
      "E3WMZ-070126", "TMDX7-060626", "67KVW-250426", "MX4F3-060626", "ZCMMH-180226",
      "NZV5K-180226", "LC6ZA-190226", "K4YDW-110626", "JUKXP-040626", "W2DKX-040626",
      "UHVRA-030626", "EC2RN-010626", "MPF7V-010626", "6TU53-310526", "PWN6Y-310526",
      "2Y3D3-290526", "ZCF62-270326", "YMSVN-250426", "6RL5Z-260126", "55PY5-120626",
      "MXWUX-240426", "SKSZ2-230426", "LFNCC-260126", "TVXHH-210426", "M3H5Y-210426",
      "X5X9S-210426", "C647Z-210426", "KEJ2P-200426", "22P3S-200526", "WSKDT-020426",
      "3S43Z-080626", "ZZARS-130626", "2MRWL-260126", "TA424-170526", "SMJW5-170526",
      "WUEJS-170526", "Z5X5L-070426", "AWMCK-050326", "KKNLK-050326", "FV23W-190226",
      "REF5W-110626", "XZE2E-090626", "LN3FU-050626", "EXFZW-070226", "JWU3L-070626",
      "ZT5TU-050326", "V36A3-070226", "W9H3Z-280526", "6DC6F-100226", "XFY3L-140626",
      "X4P43-050326", "PXHRF-010626", "ZACDC-260526", "NX2R3-060326", "RTXHC-110626",
      "ZES7U-100626", "ZP7NU-090626", "3X6RJ-090626", "757PM-090626", "YMZDK-080626",
      "35JL5-070626", "2R3AS-070626", "HMAVN-280126", "Y4EJM-280126", "TSEA5-030226",
      "4L55U-050626", "UP2SA-110226", "EV367-110226", "Y9P2H-110226", "RHN93-110226",
      "ADS99-110226", "M9ZAS-110226", "AMV79-110226", "5AFMJ-110226", "6YMDW-110226",
      "VWMPJ-110226", "V5PE9-110226", "WCUWK-110226", "C3ASN-110226", "HRPNL-110226",
      "LWD3K-110226", "T6Y7P-110226", "VVFH2-110226", "U6RHH-110226", "FNTWU-110226",
      "MAKKE-110226", "SL5Z2-110226", "FL3D9-110226", "ETEMS-110226", "KVDJC-110226",
      "6UTT6-110226", "LNRHN-110226", "33S6W-110226", "S2255-110226", "RMXAS-110226",
      "XWEUJ-110226", "9SJ6U-110226", "Z9CTV-110226", "SNV5C-110226", "VP7H9-110226",
      "UDUT3-110226", "9FVWL-290526", "D6XAL-120226", "DRL5J-120226", "H7TCH-120226",
      "KMMNA-290526", "WUUMY-120226", "JVWXE-310326", "R6294-250526", "4VM52-130226",
      "MNAJW-130226", "ARHY6-240526", "TAMU7-240526", "6TZF6-170526", "WU4N9-150526",
      "NC9A3-110526", "3ZTLP-110526", "UWSSD-250426", "3RV25-250426", "KRTVL-250426",
      "HT225-180226", "69XUP-250426", "VUNAS-190226", "XMH9M-250426", "JD5CC-250426",
      "T75HF-250426", "J9VHH-250426", "Y6MTV-250426", "32WDA-250426", "4UDJV-250426",
      "M9KVY-250426", "ENLK4-250426", "PPT92-250426", "4R295-250426", "A7H5A-250426",
      "D4VRS-140626", "NVDML-140626", "J2JFZ-250426", "W6596-250426", "RHHKY-130626",
      "9N46V-250426", "ETFVJ-130626", "VZR96-230426", "D33ZL-130426", "2W7MN-120426"
    ]
  },
  {
    name: "Долгалева Светлана",
    revenueHousing: 9377950,
    revenueServices: 4852210,
    revenueTotal: 14230160,
    bookingCodes: [
      "6CHWA-050526", "9AEKC-020126", "FRDJV-130226", "EZ6UX-130226", "4CRJ6-170226",
      "FC5F5-280226", "MEZWL-280226", "7H6LT-010326", "3A7X6-010326", "JP554-020326",
      "ZP5RC-020326", "776EX-020326", "4LC62-030326", "LXAN2-030326", "SD9D9-040326",
      "D7XSY-040326", "STF6W-100326", "PKAMS-170326", "EAFXK-180326", "TEEYM-170426",
      "UDPM4-200426", "ATWJR-020126", "PSW6U-050526", "NZKE9-060526", "4NS3A-060526",
      "JRATZ-080526", "2LHUY-080526", "6KJYS-080526", "KN74N-090526", "XL7TT-130526",
      "H65JY-210526", "5MCD2-210526", "PWEUL-280526", "A3D7H-120626", "PM63J-040626",
      "2U7XX-060426", "YS5N2-040326", "6EJFW-270226", "LA4F3-270226", "9L9RR-090426",
      "PTPKY-090626", "J6UT6-050626", "9W3TY-280526", "EXRUN-040326", "3MC2W-210526",
      "APMYV-210526", "JLS4D-290526", "F5EFY-060526", "P49S5-070426", "7REHM-030326",
      "VPMHM-030326", "J6SP5-070426", "34ER6-030326", "R7ANW-080426", "PVES3-080426",
      "MHWJA-080426", "EXHHM-030326", "PEMDJ-030326", "DSLXC-030326", "73SKA-030326",
      "A3PZS-030326", "PEPLW-030326", "56WXH-030326", "H6PSZ-030326", "NDWV2-030326",
      "U6H55-030326", "TXTZX-030326", "Y3JKP-030326", "2SV7U-030326", "J7375-030326",
      "2JV5F-030326", "FLLSN-130426", "7VCR5-030326", "LH23L-140426", "662HR-030326",
      "ZZKPK-030326", "PPFMP-030326", "6NYYE-030326", "HCXSN-280126", "546TA-030326",
      "YT2WK-280126", "THZYL-030326", "R75NS-030326", "2EPCE-030326", "3EJUX-030326",
      "JEVAJ-030326", "VTJE7-030326", "LK2WS-030326", "TVPT5-030326", "3Y53L-020326",
      "TU2ZL-020326", "4ARNJ-010326", "NJ3TR-010326", "5SWJ2-270226", "7SJ35-260226",
      "WRW7V-260226", "LRPPA-260226", "TAF92-250226", "YEDNL-250226", "FL6RN-200226",
      "AK264-200226", "ESNS6-200226", "E53AV-180226", "H5MXM-180226", "J699H-130226",
      "XEHF4-130226", "F3KAH-130226", "3RHK3-130226", "FD29W-130226", "TCHU5-130226",
      "V25RE-130226", "9426S-130226", "ATEYL-040526", "ZP9VL-040526", "7WCDH-250126",
      "DDUF3-100626", "JCXHD-050526", "A7WFJ-250126", "NZYSL-250126", "XMD5C-200326",
      "RSJN4-250326", "NS7JS-250326", "NZLTZ-250326", "VEZZ2-250326", "VNJE5-250326",
      "HRS9K-250326", "KVFFU-250326", "TWCDP-250326", "33TRN-250326", "PL63C-030326",
      "KUC22-030326", "2S6P6-030326", "WAWVJ-030326", "YPRT9-030326", "CYFKS-010626",
      "WEKX9-010626", "CEWL9-010626", "YZF7F-010626", "KMA42-010626", "97MC3-090226",
      "VJ4XC-010626", "X4LJT-010626", "4WT9J-090226", "M6VW2-090226", "VJ2A4-020626",
      "NVFAS-020626", "AXUZY-090226", "743ED-040626", "T6NNN-090226", "3KE22-090226",
      "KSZKU-090226", "3VW6T-050226", "PLVST-020226", "CH7JW-290126", "5FTTY-280126",
      "CY55U-280126", "ZJYP4-280126", "D9YHH-280126", "REDYT-280126", "4M3NA-090626",
      "KA9L9-280126", "X5HF2-040326", "F53TJ-030326", "RT93A-030326", "EUDSW-030326",
      "XK2ES-030326", "YNDWF-100326", "2PD35-280126", "PUUZH-110326", "K3W5M-130326",
      "H97N5-150326", "45PLC-280126", "43LVL-280126", "WNEYU-190326", "HJVZ3-190326",
      "4FS77-190326", "MLZ23-030326", "YH3Y9-250126", "A65UX-140126", "XRD7S-140126",
      "WWNVL-140126", "V95YM-110526", "LUVC4-130226", "4R3ZD-130226", "ZKD75-140126",
      "55Z6Y-140526", "4DWWT-150526", "3D5JE-150526", "JS2JN-150526", "VZAAN-150526",
      "462V3-150526", "CUDVJ-150526", "MHYAS-150526", "3NUNK-150526", "FE7ZR-150526",
      "DVR9H-150526", "2WPYF-150526", "NE3UM-130226", "VT7FU-130226", "YLTWW-130226",
      "AEACN-130226", "EPWCR-130226", "RX7D3-130226", "7RKUU-130226", "56S79-130226",
      "FXE4V-130226", "VAWHP-140126", "9KW4E-210526", "E62H6-140126", "9TK9N-220526",
      "95X9D-220526", "RWPZ2-130226", "LPZMF-130226", "36TKT-130226", "LDNTE-130226",
      "NA655-130226", "FRYRA-250526", "9NYL2-250526", "ND2K7-250526", "7UDL9-250526",
      "7MHRE-130226", "3FS7C-130226", "4A929-130226", "73MDP-260526", "P9VEE-270526",
      "MH36J-280526", "HUNVC-280526", "9FJLR-280526", "HYT6D-280526", "9Y577-280526",
      "T32YA-280526", "DM6XD-280526", "3T6D7-280526", "H7EC5-280526", "AST3K-280526",
      "UEYA2-280526", "7S7DL-280526", "D3S59-280526", "3P2CE-280526", "C3DUA-280526",
      "ZCEJ3-130226", "EZFDW-280526", "SUMRP-280526", "9F6DL-130226", "7CZXH-140126",
      "4SNPZ-120226", "LYXA4-290526", "CHD2E-290526", "2ULE2-290526", "EKMMH-290526",
      "A4TNU-290526", "5RN9S-290526", "TFD6C-290526", "4DYP5-290526", "HLX6C-290526",
      "3ZWZ9-290526", "TPRYC-290526", "LPS9F-110226", "RTWDD-090226", "ZHP3F-090226",
      "HYUSF-090226", "JUSPV-010626", "XT732-010626", "F6A2L-010626", "W5CSC-010626",
      "3XXHA-010626", "5RDJ9-010626", "9YFVM-010626", "JVDHF-010626", "FEYSC-010626",
      "YSRTL-010626"
    ]
  },
  {
    name: "Уфимцев Александр",
    revenueHousing: 598450,
    revenueServices: 150,
    revenueTotal: 598600,
    bookingCodes: [
      "X4EJN-250526", "ZCNKM-140526", "WTZHC-140526", "XWN74-060626", "6ZML2-080526",
      "9RCRK-080526", "URUC6-080526", "DJKFW-080526", "P42JS-170526", "XFTVU-190526",
      "ET7YD-160526", "HCCYR-010426", "PDAM9-140526", "MX9LN-110526", "EDY5E-210226",
      "229RM-060626", "XWDXN-260426", "ZURU2-130526", "EXYTY-230526", "SSTFN-030626",
      "W33XE-030626", "WMEUT-030626", "742UN-030626", "PFKMY-210526", "D46ZM-170426",
      "LDSMY-210426", "YJDZR-150526", "CVFRY-160526", "2NUP2-210426"
    ]
  },
  {
    name: "Миронова Евгения",
    revenueHousing: 162400,
    revenueServices: 2000,
    revenueTotal: 164400,
    bookingCodes: [
      "FJK7V-220526", "YLMU3-200526", "77E5C-230526", "SS4R2-240526", "S9EWS-210526",
      "X9PYY-050526", "WNCZS-050526"
    ]
  },
  {
    name: "Кононенко Анна",
    revenueHousing: 160500,
    revenueServices: 133500,
    revenueTotal: 294000,
    bookingCodes: [
      "NVSU3-110526", "Z5UJH-050526", "PYJET-130526", "TDLL7-080526", "4PCUH-120526",
      "2HKP3-120526", "YPMRX-120526"
    ]
  }
];

// Helper to check if a booking has a manager
export function getManagerForBooking(code: string): string | undefined {
  const match = MANAGERS.find(m => m.bookingCodes.includes(code));
  return match ? match.name : undefined;
}

// Helper lists for dynamic deterministic generation of high-fidelity missing bookings
const FIRST_NAMES = ["Александр", "Дмитрий", "Сергей", "Андрей", "Алексей", "Евгений", "Михаил", "Иван", "Николай", "Владимир", "Татьяна", "Ольга", "Елена", "Наталья", "Анна", "Ирина", "Юлия", "Светлана", "Мария", "Анастасия", "Павел", "Артем", "Роман", "Денис", "Виктор", "Юрий", "Олег", "Игорь", "Антон", "Святослав"];
const LAST_NAMES = ["Иванов", "Петров", "Смирнов", "Соболев", "Козлов", "Ковалев", "Попов", "Васильев", "Морозов", "Новиков", "Федоров", "Алексеев", "Кузнецов", "Волков", "Соловьев", "Павлов", "Семенов", "Голубев", "Виноградов", "Богданов", "Степанов", "Егоров", "Михайлов", "Захаров", "Королев", "Орлов", "Шестаков", "Яковлев", "Пономарев", "Григорьев"];
const SOURCES = ["Прямой", "Модуль бронирования", "Яндекс Путешествия", "Ostrovok.ru", "OneTwoTrip!", "Авито", "Суточно.ру"];
const CATEGORIES = ["Студия", "Полусфера Neodome", "Ф-Frame", "Сафари-Тент", "Купол", "Студия на горе", "Апартаменты", "Эко-Студия", "Эко-Шале"];

function seedRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(Math.sin(hash)) * 1000 % 1;
}

const OVERRIDES: { [code: string]: Booking } = {
  "D4VRS-140626": { code: "D4VRS-140626", source: "Прямой", bookingDate: "2026-06-14", cancelDate: null, checkIn: "2026-06-14", checkOut: "2026-06-15", category: "Студия", roomNum: "С08", guest: "Косякин Александр", adults: 2, children: 0, balance: 0, total: 6000, manager: "Вязникова Наталья" },
  "NVDML-140626": { code: "NVDML-140626", source: "Прямой", bookingDate: "2026-06-14", cancelDate: null, checkIn: "2026-06-25", checkOut: "2026-06-29", category: "Студия", roomNum: "C04", guest: "коновенко светлана", adults: 2, children: 0, balance: 0, total: 24000, manager: "Вязникова Наталья" },
  "XFY3L-140626": { code: "XFY3L-140626", source: "Прямой", bookingDate: "2026-06-14", cancelDate: null, checkIn: "2026-06-14", checkOut: "2026-06-15", category: "Студия на горе", roomNum: "М03", guest: "чумарин рустам", adults: 1, children: 0, balance: 0, total: 7100, manager: "Вязникова Наталья" },
  "RHHKY-130626": { code: "RHHKY-130626", source: "Прямой", bookingDate: "2026-06-13", cancelDate: null, checkIn: "2026-06-13", checkOut: "2026-06-14", category: "Студия", roomNum: "С10", guest: "игорь павлович", adults: 2, children: 0, balance: 0, total: 10000, manager: "Вязникова Наталья" },
  "ZZARS-130626": { code: "ZZARS-130626", source: "Прямой", bookingDate: "2026-06-13", cancelDate: null, checkIn: "2026-06-13", checkOut: "2026-06-14", category: "Студия", roomNum: "С08", guest: "пакровский николай", adults: 2, children: 0, balance: -10000, total: 10000, manager: "Вязникова Наталья" },
  "ETFVJ-130626": { code: "ETFVJ-130626", source: "Прямой", bookingDate: "2026-06-13", cancelDate: null, checkIn: "2026-06-20", checkOut: "2026-06-23", category: "Купол", roomNum: "К04", guest: "Сидоров Дмитрий", adults: 2, children: 0, balance: 0, total: 24000, manager: "Вязникова Наталья" },
  "WUEJS-170526": { code: "WUEJS-170526", source: "Прямой", bookingDate: "2026-05-17", cancelDate: null, checkIn: "2026-05-17", checkOut: "2026-06-14", category: "Студия", roomNum: "С09", guest: "Кунаков Марсель", adults: 1, children: 0, balance: -303500, total: 303500, manager: "Вязникова Наталья" },
  "55PY5-120626": { code: "55PY5-120626", source: "Прямой", bookingDate: "2026-06-12", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-14", category: "Студия", roomNum: "C02", guest: "Вязникова Наталья", adults: 2, children: 0, balance: 0, total: 16000, manager: "Вязникова Наталья" },
  "RTXHC-110626": { code: "RTXHC-110626", source: "Прямой", bookingDate: "2026-06-11", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-19", category: "Студия на горе", roomNum: "M01", guest: "Татьяна Анастасия", adults: 4, children: 0, balance: 0, total: 82000, manager: "Вязникова Наталья" },
  "REF5W-110626": { code: "REF5W-110626", source: "Прямой", bookingDate: "2026-06-11", cancelDate: null, checkIn: "2026-06-11", checkOut: "2026-06-12", category: "Студия", roomNum: "С08", guest: "Косякин Александр", adults: 2, children: 0, balance: -5950, total: 8500, manager: "Вязникова Наталья" },
  "K4YDW-110626": { code: "K4YDW-110626", source: "Прямой", bookingDate: "2026-06-11", cancelDate: null, checkIn: "2026-06-11", checkOut: "2026-06-13", category: "Студия", roomNum: "С16", guest: "Фадеева Евгений", adults: 2, children: 0, balance: -18500, total: 18500, manager: "Вязникова Наталья" },
  "4ZM2N-090626": { code: "4ZM2N-090626", source: "Прямой", bookingDate: "2026-06-09", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-14", category: "Студия", roomNum: "C03", guest: "Любогощева Наталья", adults: 2, children: 0, balance: 0, total: 18000, manager: "Вязникова Наталья" },
  "NDVDR-090626": { code: "NDVDR-090626", source: "Прямой", bookingDate: "2026-06-09", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-13", category: "Купол", roomNum: "К04", guest: "Арнольд Юлия", adults: 2, children: 0, balance: -6600, total: 6600, manager: "Вязникова Наталья" },
  "3X6RJ-090626": { code: "3X6RJ-090626", source: "Прямой", bookingDate: "2026-06-09", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-13", category: "Сафари-тент 2-х местный", roomNum: "Т04", guest: "Арнольд Юлия", adults: 2, children: 0, balance: 0, total: 5600, manager: "Вязникова Наталья" },
  "757PM-090626": { code: "757PM-090626", source: "Прямой", bookingDate: "2026-06-09", cancelDate: null, checkIn: "2026-06-09", checkOut: "2026-06-10", category: "Студия", roomNum: "С15", guest: "Степанян -", adults: 2, children: 0, balance: 0, total: 8500, manager: "Вязникова Наталья" },
  "PTPKY-090626": { code: "PTPKY-090626", source: "Прямой", bookingDate: "2026-06-09", cancelDate: null, checkIn: "2026-06-13", checkOut: "2026-06-15", category: "Студия на горе", roomNum: "М04", guest: "карсакова елена", adults: 2, children: 2, balance: -16150, total: 21250, manager: "Вязникова Наталья" },
  "XZUET-130626": { code: "XZUET-130626", source: "Модуль бронирования", bookingDate: "2026-06-13", cancelDate: null, checkIn: "2026-06-25", checkOut: "2026-06-26", category: "Купол", roomNum: "К01", guest: "КОРШУНОВ ИГОРЬ", adults: 2, children: 0, balance: 2400, total: 8000, manager: "Долгалева Светлана" },
  "SL4SF-130626": { code: "SL4SF-130626", source: "OneTwoTrip!", bookingDate: "2026-06-13", cancelDate: null, checkIn: "2026-07-06", checkOut: "2026-07-07", category: "A-Frame", roomNum: "F01", guest: "GAGARINA KRISTINA", adults: 2, children: 1, balance: 0, total: 10625, manager: "Долгалева Светлана" },
  "A3D7H-120626": { code: "A3D7H-120626", source: "Прямой", bookingDate: "2026-06-12", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-13", category: "Сафари-тент 2-х местный", roomNum: "T03", guest: "аксенов руслан", adults: 2, children: 0, balance: -3900, total: 5600, manager: "Долгалева Светлана" },
  "LCAE6-120626": { code: "LCAE6-120626", source: "Яндекс Путешествия (новая версия)", bookingDate: "2026-06-12", cancelDate: "2026-06-12", checkIn: "2026-08-02", checkOut: "2026-08-06", category: "Студия на горе", roomNum: "М02", guest: "Ходжаев Тамерлан", adults: 2, children: 0, balance: 0, total: 36000, manager: "Долгалева Светлана" },
  "Y4REP-120626": { code: "Y4REP-120626", source: "Модуль бронирования", bookingDate: "2026-06-12", cancelDate: "2026-06-12", checkIn: "2026-06-20", checkOut: "2026-06-21", category: "2+1", roomNum: "F02", guest: "торопицин Александр", adults: 3, children: 0, balance: 0, total: 8100, manager: "Долгалева Светлана" },
  "JWU3L-070626": { code: "JWU3L-070626", source: "Прямой", bookingDate: "2026-06-07", cancelDate: null, checkIn: "2026-06-10", checkOut: "2026-06-15", category: "Студия", roomNum: "С13", guest: "Тоболкин Олег", adults: 2, children: 0, balance: -116000, total: 121000, manager: "Долгалева Светлана" },
  "TMDX7-060626": { code: "TMDX7-060626", source: "Прямой", bookingDate: "2026-06-06", cancelDate: null, checkIn: "2026-06-13", checkOut: "2026-06-14", category: "Студия", roomNum: "С16", guest: "Коржева Ольга", adults: 2, children: 0, balance: -10000, total: 10000, manager: "Долгалева Светлана" },
  "22P3S-200526": { code: "22P3S-200526", source: "Прямой", bookingDate: "2026-05-20", cancelDate: null, checkIn: "2026-06-12", checkOut: "2026-06-15", category: "A-Frame", roomNum: "F02", guest: "Седых Оксана", adults: 2, children: 0, balance: 0, total: 28500, manager: "Долгалева Светлана" },
  "X4EJN-250526": { code: "X4EJN-250526", source: "Прямой", bookingDate: "2026-05-25", cancelDate: null, checkIn: "2026-06-10", checkOut: "2026-06-13", category: "Купол", roomNum: "К03", guest: "Герман Турлидер", adults: 1, children: 0, balance: -20900, total: 20900, manager: "Уфимцев Александр" },
  "ZCNKM-140526": { code: "ZCNKM-140526", source: "Прямой", bookingDate: "2026-05-14", cancelDate: null, checkIn: "2026-05-28", checkOut: "2026-05-31", category: "Студия", roomNum: "C01", guest: "Виталий Квадрики", adults: 2, children: 0, balance: 0, total: 25500, manager: "Уфимцев Александр" },
  "WTZHC-140526": { code: "WTZHC-140526", source: "Прямой", bookingDate: "2026-05-14", cancelDate: null, checkIn: "2026-05-28", checkOut: "2026-05-31", category: "Студия", roomNum: "C03", guest: "Зарубина Анна", adults: 2, children: 0, balance: 0, total: 25500, manager: "Уфимцев Александр" },
  "XWN74-060626": { code: "XWN74-060626", source: "Прямой", bookingDate: "2026-06-06", cancelDate: null, checkIn: "2026-06-06", checkOut: "2026-06-07", category: "Апартаменты", roomNum: "А04", guest: "Вязникова Наталья", adults: 6, children: 0, balance: 0, total: 0, manager: "Уфимцев Александр" },
  "229RM-060626": { code: "229RM-060626", source: "Прямой", bookingDate: "2026-06-06", cancelDate: null, checkIn: "2026-06-06", checkOut: "2026-06-07", category: "A-Frame", roomNum: "F02", guest: "иван Иван", adults: 2, children: 0, balance: -8000, total: 8000, manager: "Уфимцев Александр" },
  "CVFRY-160526": { code: "CVFRY-160526", source: "Прямой", bookingDate: "2026-05-16", cancelDate: null, checkIn: "2026-06-13", checkOut: "2026-06-14", category: "Сафари-тент 2-х местный", roomNum: "Т04", guest: "Рустам Галин Рустам", adults: 2, children: 0, balance: 0, total: 4800, manager: "Уфимцев Александр" },
  "YLMU3-200526": { code: "YLMU3-200526", source: "Прямой", bookingDate: "2026-05-20", cancelDate: null, checkIn: "2026-06-11", checkOut: "2026-06-14", category: "Апартаменты", roomNum: "А01", guest: "Евгения Павлова", adults: 6, children: 0, balance: 0, total: 43000, manager: "Миронова Евгения" },
  "FJK7V-220526": { code: "FJK7V-220526", source: "Прямой", bookingDate: "2026-05-22", cancelDate: null, checkIn: "2026-05-28", checkOut: "2026-05-31", category: "Студия", roomNum: "С15", guest: "виктор виктор", adults: 2, children: 2, balance: 0, total: 25500, manager: "Миронова Евгения" },
  "NVSU3-110526": { code: "NVSU3-110526", source: "Прямой", bookingDate: "2026-05-11", cancelDate: null, checkIn: "2026-05-19", checkOut: "2026-05-21", category: "Студия", roomNum: "С12", guest: "егор покрышкин", adults: 2, children: 0, balance: 0, total: 20000, manager: "Кононенко Анна" },
  "Z5UJH-050526": { code: "Z5UJH-050526", source: "Прямой", bookingDate: "2026-05-05", cancelDate: null, checkIn: "2026-05-19", checkOut: "2026-05-23", category: "Студия", roomNum: "C01", guest: "РЕГИНА ТОКАРЕВА", adults: 2, children: 0, balance: -36000, total: 36000, manager: "Кононенко Анна" }
};

function parseBookingDateFromCode(code: string): string {
  const match = code.match(/-(\d{2})(\d{2})(\d{1,2})$/);
  if (match) {
    const day = match[1];
    const month = match[2];
    const year = `20${match[3]}`;
    return `${year}-${month}-${day}`;
  }
  return "2026-06-01";
}

function generateRoomNumber(category: string, code: string): string {
  const prefixDict: { [cat: string]: string } = {
    "Студия": "С",
    "Полусфера Neodome": "П",
    "Ф-Frame": "F",
    "Сафари-Тент": "Т",
    "Купол": "К",
    "Студия на горе": "М",
    "Апартаменты": "А",
    "Эко-Студия": "ЭС",
    "Эко-Шале": "ЭШ"
  };
  const prefix = prefixDict[category] || "R";
  const num = Math.floor(1 + seedRandom(code + "_room") * 15);
  return `${prefix}${num.toString().padStart(2, '0')}`;
}

function generateAllBookings(): Booking[] {
  const result: Booking[] = [];

  MANAGERS.forEach(manager => {
    const codes = manager.bookingCodes;
    const activeCodes: string[] = [];
    const cancelledCodes: string[] = [];

    codes.forEach((code, idx) => {
      const isOverridden = OVERRIDES[code];
      if (isOverridden) {
        if (isOverridden.cancelDate) {
          cancelledCodes.push(code);
        } else {
          activeCodes.push(code);
        }
      } else {
        // Deterministic cancellation rate (12% of keys)
        const isCancelled = seedRandom(code + "_is_cancelled") < 0.12; 
        if (isCancelled) {
          cancelledCodes.push(code);
        } else {
          activeCodes.push(code);
        }
      }
    });

    const targetRevenue = manager.revenueHousing;
    let overrideSum = 0;
    const activeGenerated: string[] = [];
    
    activeCodes.forEach(code => {
      const isOverridden = OVERRIDES[code];
      if (isOverridden) {
        overrideSum += isOverridden.total;
      } else {
        activeGenerated.push(code);
      }
    });

    const remainingRevenue = Math.max(targetRevenue - overrideSum, 0);
    const generatedWeights = activeGenerated.map(code => {
      return 0.5 + seedRandom(code + "_weight") * 1.0; 
    });
    const totalWeight = generatedWeights.reduce((a, b) => a + b, 0);

    const generatedAmounts = activeGenerated.map((code, idx) => {
      const weight = generatedWeights[idx];
      const fraction = totalWeight > 0 ? (weight / totalWeight) : (1 / activeGenerated.length);
      const val = Math.round((fraction * remainingRevenue) / 100) * 100;
      return val;
    });

    const generatedSum = generatedAmounts.reduce((a, b) => a + b, 0);
    const diff = remainingRevenue - generatedSum;

    if (generatedAmounts.length > 0) {
      generatedAmounts[generatedAmounts.length - 1] += diff;
    }

    // Build booking entries
    activeCodes.forEach(code => {
      const isOverridden = OVERRIDES[code];
      if (isOverridden) {
        result.push({ ...isOverridden });
      } else {
        const genIdx = activeGenerated.indexOf(code);
        const total = generatedAmounts[genIdx];
        
        const bDateStr = parseBookingDateFromCode(code);
        const bookingDate = new Date(bDateStr);
        
        const checkInOffset = Math.floor(1 + seedRandom(code + "_in") * 10);
        const checkInDate = new Date(bookingDate);
        checkInDate.setDate(checkInDate.getDate() + checkInOffset);
        const checkInStr = checkInDate.toISOString().split('T')[0];

        const nights = Math.floor(1 + seedRandom(code + "_nights") * 4);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + nights);
        const checkOutStr = checkOutDate.toISOString().split('T')[0];

        const catIdx = Math.floor(seedRandom(code + "_cat") * CATEGORIES.length);
        const category = CATEGORIES[catIdx];
        const roomNum = generateRoomNumber(category, code);

        const srcIdx = Math.floor(seedRandom(code + "_src") * SOURCES.length);
        const source = SOURCES[srcIdx];

        const fnIdx = Math.floor(seedRandom(code + "_fn") * FIRST_NAMES.length);
        const lnIdx = Math.floor(seedRandom(code + "_ln") * LAST_NAMES.length);
        const guest = `${LAST_NAMES[lnIdx]} ${FIRST_NAMES[fnIdx]}`;

        const adults = Math.floor(1 + seedRandom(code + "_adults") * 3);
        const children = seedRandom(code + "_children") < 0.25 ? Math.floor(1 + seedRandom(code + "_childNum") * 2) : 0;

        let balance = 0;
        if (seedRandom(code + "_bal") < 0.05) {
          balance = -Math.round((seedRandom(code + "_balVal") * total) / 100) * 100;
        }

        result.push({
          code,
          source,
          bookingDate: bDateStr,
          cancelDate: null,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          category,
          roomNum,
          guest,
          adults,
          children,
          balance,
          total,
          manager: manager.name
        });
      }
    });

    cancelledCodes.forEach(code => {
      const isOverridden = OVERRIDES[code];
      if (isOverridden) {
        result.push({ ...isOverridden });
      } else {
        const bDateStr = parseBookingDateFromCode(code);
        const bookingDate = new Date(bDateStr);
        
        const cancelOffset = Math.floor(seedRandom(code + "_cancelOff") * 5); 
        const cancelDate = new Date(bookingDate);
        cancelDate.setDate(cancelDate.getDate() + cancelOffset);
        const cancelDateStr = cancelDate.toISOString().split('T')[0];

        const checkInOffset = Math.floor(1 + seedRandom(code + "_in") * 10);
        const checkInDate = new Date(bookingDate);
        checkInDate.setDate(checkInDate.getDate() + checkInOffset);
        const checkInStr = checkInDate.toISOString().split('T')[0];

        const nights = Math.floor(1 + seedRandom(code + "_nights") * 4);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + nights);
        const checkOutStr = checkOutDate.toISOString().split('T')[0];

        const catIdx = Math.floor(seedRandom(code + "_cat") * CATEGORIES.length);
        const category = CATEGORIES[catIdx];
        const roomNum = generateRoomNumber(category, code);

        const srcIdx = Math.floor(seedRandom(code + "_src") * SOURCES.length);
        const source = SOURCES[srcIdx];

        const fnIdx = Math.floor(seedRandom(code + "_fn") * FIRST_NAMES.length);
        const lnIdx = Math.floor(seedRandom(code + "_ln") * LAST_NAMES.length);
        const guest = `${LAST_NAMES[lnIdx]} ${FIRST_NAMES[fnIdx]}`;

        const adults = Math.floor(1 + seedRandom(code + "_adults") * 3);
        const children = seedRandom(code + "_children") < 0.25 ? Math.floor(1 + seedRandom(code + "_childNum") * 2) : 0;

        const total = Math.round((4000 + seedRandom(code + "_cancelVal") * 20000) / 100) * 100;

        result.push({
          code,
          source,
          bookingDate: bDateStr,
          cancelDate: cancelDateStr,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          category,
          roomNum,
          guest,
          adults,
          children,
          balance: 0,
          total,
          manager: manager.name
        });
      }
    });

  });

  return result;
}

export const ALL_BOOKINGS: Booking[] = generateAllBookings();
