/**
 * Fetches the day's prayer times for a location from the free Aladhan API
 * (https://aladhan.com/prayer-times-api) — no API key required.
 *
 * Calculation method: University of Islamic Sciences, Karachi (method 1),
 * matching the reference Scriptable widget this feature was based on
 * (https://github.com/HadiqR/azan-widget).
 *
 * If the request fails (offline, network error), falls back to the last
 * successfully fetched times for that location, cached in localStorage.
 */
(function (global) {
  'use strict';

  const METHOD = 1; // University of Islamic Sciences, Karachi
  const ENDPOINT = 'https://api.aladhan.com/v1/timings';
  const CACHE_PREFIX = 'qibla-compass:prayerTimes:';

  function cacheKey(lat, lng) {
    return `${CACHE_PREFIX}${lat.toFixed(2)},${lng.toFixed(2)}`;
  }

  function saveCache(lat, lng, raw) {
    try {
      localStorage.setItem(cacheKey(lat, lng), JSON.stringify(raw));
    } catch (err) {
      // Storage unavailable (private browsing, quota, etc.) — non-fatal.
    }
  }

  function loadCache(lat, lng) {
    try {
      const stored = localStorage.getItem(cacheKey(lat, lng));
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  }

  // Strips a trailing timezone label the API sometimes appends, e.g. "05:12 (EAT)".
  function stripZone(value) {
    return value.split(' ')[0];
  }

  // Builds "Friday, 1 December 2026" from the API's Gregorian date fields,
  // rather than using its plain "01 Dec 2026" `readable` string as-is.
  function formatDateLabel(gregorian) {
    const weekday = gregorian.weekday.en;
    const day = parseInt(gregorian.day, 10);
    const month = gregorian.month.en;
    const year = gregorian.year;
    return `${weekday}, ${day} ${month} ${year}`;
  }

  // "HH:MM" (24hr) -> 12-hour, no AM/PM, matching the reference widget.
  function formatTime12(value) {
    const [h, m] = value.split(':').map(Number);
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${String(m).padStart(2, '0')}`;
  }

  function formatAll(raw) {
    return {
      fajr: formatTime12(raw.fajr),
      sunrise: formatTime12(raw.sunrise),
      dhuhr: formatTime12(raw.dhuhr),
      asr: formatTime12(raw.asr),
      maghrib: formatTime12(raw.maghrib),
      isha: formatTime12(raw.isha),
    };
  }

  /**
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<
   *   | {ok: true, timings: {fajr,sunrise,dhuhr,asr,maghrib,isha: string}, dateReadable: string, stale: boolean}
   *   | {ok: false, message: string}
   * >}
   */
  async function getPrayerTimes(lat, lng) {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `${ENDPOINT}/${timestamp}?latitude=${lat}&longitude=${lng}&method=${METHOD}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Aladhan API responded with ${response.status}`);
      }
      const json = await response.json();
      const t = json.data.timings;

      const raw = {
        fajr: stripZone(t.Fajr),
        sunrise: stripZone(t.Sunrise),
        dhuhr: stripZone(t.Dhuhr),
        asr: stripZone(t.Asr),
        maghrib: stripZone(t.Maghrib),
        isha: stripZone(t.Isha),
        dateLabel: formatDateLabel(json.data.date.gregorian),
      };

      saveCache(lat, lng, raw);

      return { ok: true, timings: formatAll(raw), dateLabel: raw.dateLabel, stale: false };
    } catch (err) {
      const cached = loadCache(lat, lng);
      if (cached) {
        return { ok: true, timings: formatAll(cached), dateLabel: cached.dateLabel, stale: true };
      }
      return { ok: false, message: 'Could not load prayer times for this location.' };
    }
  }

  global.PrayerTimes = { getPrayerTimes, METHOD };
})(window);
