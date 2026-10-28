/**
 * Open-Meteo Live Coastal Weather & Marine Telemetry Service
 * Provides real-time weather and 7-day daily forecast for coastal citizens and fishermen.
 */

export const COASTAL_LOCATIONS = [
  {
    id: 'malpe',
    name: 'Malpe Fishery Harbor',
    district: 'Udupi',
    lat: 13.3508,
    lng: 74.7042,
    badge: 'Udupi'
  },
  {
    id: 'mangalore',
    name: 'Mangalore Old Port',
    district: 'Dakshina Kannada',
    lat: 12.8698,
    lng: 74.8431,
    badge: 'Dakshina Kannada'
  },
  {
    id: 'karwar',
    name: 'Karwar Baitkhol Harbor',
    district: 'Uttara Kannada',
    lat: 14.8136,
    lng: 74.1298,
    badge: 'Uttara Kannada'
  },
  {
    id: 'honnavar',
    name: 'Honnavar Port',
    district: 'Uttara Kannada',
    lat: 14.2811,
    lng: 74.4447,
    badge: 'Uttara Kannada'
  },
  {
    id: 'gangolli',
    name: 'Gangolli Harbor (Kundapura)',
    district: 'Udupi',
    lat: 13.6346,
    lng: 74.6725,
    badge: 'Kundapura'
  },
  {
    id: 'bhatkal',
    name: 'Bhatkal Coastal Port',
    district: 'Uttara Kannada',
    lat: 13.9764,
    lng: 74.5503,
    badge: 'Uttara Kannada'
  },
  {
    id: 'tadadi',
    name: 'Tadadi Port (Kumta)',
    district: 'Uttara Kannada',
    lat: 14.5262,
    lng: 74.3644,
    badge: 'Kumta'
  }
];

// WMO Weather Interpretation Codes (WW)
export const getWmoInfo = (code) => {
  switch (code) {
    case 0:
      return { label: 'Clear Sky', kn: 'ನಿರ್ಮಲ ಆಕಾಶ', icon: 'Sun', color: 'text-amber-500', bg: 'from-amber-500/10 to-yellow-500/5' };
    case 1:
      return { label: 'Mainly Clear', kn: 'ಹೆಚ್ಚಾಗಿ ಸ್ಪಷ್ಟ', icon: 'Sun', color: 'text-amber-400', bg: 'from-amber-400/10 to-sky-500/5' };
    case 2:
      return { label: 'Partly Cloudy', kn: 'ಭಾಗಶಃ ಮೋಡ', icon: 'CloudSun', color: 'text-sky-500', bg: 'from-sky-500/10 to-blue-500/5' };
    case 3:
      return { label: 'Overcast', kn: 'ಮೋಡ ಕವಿದ ವಾತಾವರಣ', icon: 'Cloud', color: 'text-slate-500', bg: 'from-slate-500/10 to-slate-400/5' };
    case 45:
    case 48:
      return { label: 'Fog / Mist', kn: 'ಮಂಜು / ಹೊಗೆಮಂಜು', icon: 'CloudFog', color: 'text-slate-400', bg: 'from-slate-400/10 to-slate-500/5' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', kn: 'ತುಂತುರು ಮಳೆ', icon: 'CloudDrizzle', color: 'text-sky-600', bg: 'from-sky-500/15 to-blue-500/10' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', kn: 'ಮಳೆ', icon: 'CloudRain', color: 'text-blue-600', bg: 'from-blue-500/20 to-sky-500/10' };
    case 80:
    case 81:
    case 82:
      return { label: 'Rain Showers', kn: 'ಜಡಿಮಳೆ', icon: 'CloudRain', color: 'text-indigo-600', bg: 'from-indigo-500/20 to-blue-500/10' };
    case 95:
      return { label: 'Thunderstorm', kn: 'ಗುಡುಗು ಸಹಿತ ಮಳೆ', icon: 'CloudLightning', color: 'text-purple-600', bg: 'from-purple-500/25 to-rose-500/10' };
    case 96:
    case 99:
      return { label: 'Severe Thunderstorm', kn: 'ತೀವ್ರ ಗುಡುಗು ಸಿಡಿಲು', icon: 'CloudLightning', color: 'text-rose-600', bg: 'from-rose-500/25 to-amber-500/10' };
    default:
      return { label: 'Variable Weather', kn: 'ಸಾಧಾರಣ ವಾತಾವರಣ', icon: 'CloudSun', color: 'text-sky-500', bg: 'from-sky-500/10 to-blue-500/5' };
  }
};

export const getWindDirectionText = (deg) => {
  if (deg == null) return 'N/A';
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
};

export const getSeaCondition = (waveM) => {
  if (waveM == null) return { text: 'Unknown', kn: 'ಅಜ್ಞಾತ', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' };
  if (waveM < 0.6) return { text: 'Calm (Smooth)', kn: 'ಶಾಂತ (ಸುರಕ್ಷಿತ)', color: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (waveM < 1.25) return { text: 'Slight (Normal)', kn: 'ಸಾಧಾರಣ (ಸಾಮಾನ್ಯ)', color: 'text-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (waveM < 2.5) return { text: 'Moderate / Rough', kn: 'ಮಧ್ಯಮ ಅಲೆ (ಎಚ್ಚರಿಕೆ)', color: 'text-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { text: 'High Waves (Danger)', kn: 'ಅಪಾಯಕಾರಿ ಅಲೆಗಳು', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
};

/**
 * Fetch live current weather + 7-day daily forecast from Open-Meteo
 */
export const fetchLiveCoastalWeather = async (lat, lng) => {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,wave_period,swell_wave_height&daily=wave_height_max,wave_direction_dominant,wave_period_max&timezone=auto`;

  const [wRes, mRes] = await Promise.allSettled([
    fetch(weatherUrl).then(r => r.ok ? r.json() : null),
    fetch(marineUrl).then(r => r.ok ? r.json() : null)
  ]);

  const weatherData = wRes.status === 'fulfilled' ? wRes.value : null;
  const marineData = mRes.status === 'fulfilled' ? mRes.value : null;

  if (!weatherData || !weatherData.current) {
    throw new Error('Failed to retrieve live weather observations.');
  }

  const cur = weatherData.current;
  const daily = weatherData.daily || {};
  const marCur = marineData?.current || {};
  const marDaily = marineData?.daily || {};

  const currentParsed = {
    temperature: Math.round(cur.temperature_2m * 10) / 10,
    feelsLike: Math.round(cur.apparent_temperature * 10) / 10,
    humidity: cur.relative_humidity_2m,
    windSpeedKm: Math.round(cur.wind_speed_10m * 10) / 10,
    windSpeedKnots: Math.round((cur.wind_speed_10m / 1.852) * 10) / 10,
    windDirectionDeg: cur.wind_direction_10m,
    windDirectionText: getWindDirectionText(cur.wind_direction_10m),
    pressure: Math.round(cur.surface_pressure),
    precipitation: cur.precipitation,
    weatherCode: cur.weather_code,
    waveHeightM: marCur.wave_height != null ? Math.round(marCur.wave_height * 100) / 100 : null,
    swellHeightM: marCur.swell_wave_height != null ? Math.round(marCur.swell_wave_height * 100) / 100 : null,
    wavePeriodSec: marCur.wave_period != null ? Math.round(marCur.wave_period * 10) / 10 : null,
    updatedAt: new Date().toISOString()
  };

  // Build Day-by-Day Forecast Array
  const daysList = [];
  const times = daily.time || [];
  for (let i = 0; i < times.length; i++) {
    const rawDate = times[i];
    const d = new Date(rawDate);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    
    // Day display name
    const dayLabel = isToday 
      ? 'Today' 
      : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    daysList.push({
      date: rawDate,
      isToday,
      dayLabel,
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      weatherCode: daily.weather_code?.[i] ?? 0,
      tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      apparentMax: Math.round(daily.apparent_temperature_max?.[i] ?? 0),
      apparentMin: Math.round(daily.apparent_temperature_min?.[i] ?? 0),
      rainChancePercent: daily.precipitation_probability_max?.[i] ?? 0,
      precipitationSum: daily.precipitation_sum?.[i] ?? 0,
      windSpeedMaxKm: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
      windSpeedMaxKnots: Math.round((daily.wind_speed_10m_max?.[i] ?? 0) / 1.852),
      windGustsKm: Math.round(daily.wind_gusts_10m_max?.[i] ?? 0),
      waveHeightMaxM: marDaily.wave_height_max?.[i] != null ? Math.round(marDaily.wave_height_max[i] * 100) / 100 : null,
      sunrise: daily.sunrise?.[i] ? daily.sunrise[i].split('T')[1] : null,
      sunset: daily.sunset?.[i] ? daily.sunset[i].split('T')[1] : null
    });
  }

  const result = {
    current: currentParsed,
    daily: daysList,
    lat,
    lng,
    fetchedAt: Date.now()
  };

  // Cache locally
  try {
    localStorage.setItem('cyclosafe_live_weather_cache', JSON.stringify(result));
  } catch (_) {}

  return result;
};

export const getCachedWeather = () => {
  try {
    const raw = localStorage.getItem('cyclosafe_live_weather_cache');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};
