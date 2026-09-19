/**
 * Decodes a Plus Code (Open Location Code) typed or pasted by the user into
 * a latitude/longitude, entirely client-side.
 */
(function (global) {
  'use strict';

  /**
   * @param {string} rawCode
   * @returns {{ok: true, lat: number, lng: number} | {ok: false, message: string}}
   */
  function decodePlusCode(rawCode) {
    if (!rawCode || !rawCode.trim()) {
      return { ok: false, message: 'Enter a Plus Code first.' };
    }

    const code = rawCode.trim().toUpperCase();

    if (typeof OpenLocationCode === 'undefined') {
      return { ok: false, message: 'The Plus Code decoder failed to load. Refresh and try again.' };
    }

    if (!OpenLocationCode.isFull(code)) {
      if (OpenLocationCode.isShort(code)) {
        return {
          ok: false,
          message: 'That looks like a short Plus Code (e.g. "8Q3M+QC Mecca"). Please paste the full code, which includes an area prefix like "7FG8Q3MM+QC".',
        };
      }
      return { ok: false, message: 'That doesn\'t look like a valid Plus Code. Double-check it and try again.' };
    }

    try {
      const area = OpenLocationCode.decode(code);
      return { ok: true, lat: area.latitudeCenter, lng: area.longitudeCenter };
    } catch (err) {
      return { ok: false, message: 'Could not read that Plus Code. Double-check it and try again.' };
    }
  }

  global.PlusCode = { decodePlusCode };
})(window);
