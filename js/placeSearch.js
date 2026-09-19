/**
 * Looks up a typed place name (city, address, landmark) using OpenStreetMap's
 * free Nominatim geocoding API. No API key required.
 *
 * Nominatim's usage policy asks for light, on-demand use rather than
 * autocomplete-while-typing, so this is only called on form submit.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
(function (global) {
  'use strict';

  const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

  /**
   * @param {string} query
   * @returns {Promise<{ok: true, results: Array<{label: string, lat: number, lng: number}>} | {ok: false, message: string}>}
   */
  async function searchPlace(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { ok: false, message: 'Type a place name first.' };
    }

    const url = `${ENDPOINT}?format=jsonv2&limit=5&q=${encodeURIComponent(trimmed)}`;

    let response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
    } catch (err) {
      return { ok: false, message: 'Could not reach the place search service. Check your connection and try again.' };
    }

    if (!response.ok) {
      return { ok: false, message: 'The place search service did not respond. Try again in a moment.' };
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      return { ok: false, message: 'Got an unexpected response from the place search service.' };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, message: `No places found matching "${trimmed}". Try a more specific name.` };
    }

    const results = data.map((item) => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return { ok: true, results };
  }

  global.PlaceSearch = { searchPlace };
})(window);
