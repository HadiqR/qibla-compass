/**
 * Qibla direction math.
 *
 * Everything here is plain spherical trigonometry — no external service
 * is needed to find the direction or distance to the Kaaba.
 */
(function (global) {
  'use strict';

  // Coordinates of the Kaaba, Masjid al-Haram, Mecca.
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  const EARTH_RADIUS_KM = 6371.0088;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  /**
   * Initial great-circle bearing (degrees, 0-360, clockwise from true north)
   * from (lat, lng) to the Kaaba.
   */
  function bearingToKaaba(lat, lng) {
    const phi1 = toRad(lat);
    const phi2 = toRad(KAABA_LAT);
    const deltaLambda = toRad(KAABA_LNG - lng);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return (toDeg(theta) + 360) % 360;
  }

  /**
   * Great-circle distance (km) from (lat, lng) to the Kaaba, via the
   * haversine formula.
   */
  function distanceToKaabaKm(lat, lng) {
    const phi1 = toRad(lat);
    const phi2 = toRad(KAABA_LAT);
    const deltaPhi = toRad(KAABA_LAT - lat);
    const deltaLambda = toRad(KAABA_LNG - lng);

    const a =
      Math.sin(deltaPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  global.Qibla = {
    KAABA_LAT,
    KAABA_LNG,
    bearingToKaaba,
    distanceToKaabaKm,
  };
})(window);
