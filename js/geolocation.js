/**
 * Wraps the browser Geolocation API with friendlier error messages and a
 * single place to tune options.
 */
(function (global) {
  'use strict';

  function isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * @param {(coords: {lat: number, lng: number}) => void} onSuccess
   * @param {(message: string) => void} onError
   */
  function getCurrentLocation(onSuccess, onError) {
    if (!isSupported()) {
      onError('Your browser does not support location detection. Enter a Plus Code instead.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            onError('Location access was denied. Turn it on in your browser settings, or enter a Plus Code instead.');
            break;
          case error.POSITION_UNAVAILABLE:
            onError('Your location is not available right now. Try again, or enter a Plus Code instead.');
            break;
          case error.TIMEOUT:
            onError('Finding your location took too long. Try again, or enter a Plus Code instead.');
            break;
          default:
            onError('Something went wrong finding your location. Enter a Plus Code instead.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }

  global.AppGeolocation = {
    isSupported,
    getCurrentLocation,
  };
})(window);
