/**
 * Reads the device's magnetometer via DeviceOrientationEvent and reports a
 * normalized compass heading (0-360, clockwise from true north), smoothing
 * over the differences between iOS Safari and other browsers.
 */
(function (global) {
  'use strict';

  let activeHandler = null;
  let activeEventName = null;

  function isOrientationSupported() {
    return typeof DeviceOrientationEvent !== 'undefined';
  }

  /**
   * iOS 13+ requires an explicit user gesture before granting motion/orientation
   * access. Other browsers grant it without an extra prompt.
   */
  function needsExplicitPermission() {
    return (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    );
  }

  /**
   * @returns {Promise<'granted' | 'denied' | 'unsupported'>}
   */
  function requestPermission() {
    if (!isOrientationSupported()) {
      return Promise.resolve('unsupported');
    }
    if (!needsExplicitPermission()) {
      return Promise.resolve('granted');
    }
    return DeviceOrientationEvent.requestPermission()
      .then((result) => (result === 'granted' ? 'granted' : 'denied'))
      .catch(() => 'denied');
  }

  function headingFromEvent(event) {
    // iOS Safari exposes a ready-made compass heading.
    if (typeof event.webkitCompassHeading === 'number' && !isNaN(event.webkitCompassHeading)) {
      return event.webkitCompassHeading;
    }
    // Other browsers: alpha is the rotation around the z-axis. For an
    // absolute reading (referenced to true/magnetic north), heading is
    // the complement of alpha.
    if (typeof event.alpha === 'number' && !isNaN(event.alpha)) {
      return (360 - event.alpha) % 360;
    }
    return null;
  }

  /**
   * @param {(heading: number) => void} onHeading
   * @param {(message: string) => void} onError
   */
  function startWatching(onHeading, onError) {
    if (!isOrientationSupported()) {
      onError('This browser does not support a compass.');
      return;
    }

    const handler = (event) => {
      const heading = headingFromEvent(event);
      if (heading !== null) {
        onHeading(heading);
      }
    };

    // Prefer the absolute event where available (Chrome on Android); it's
    // referenced to true/magnetic north rather than the device's start
    // orientation.
    const eventName =
      'ondeviceorientationabsolute' in window
        ? 'deviceorientationabsolute'
        : 'deviceorientation';

    window.addEventListener(eventName, handler);
    activeHandler = handler;
    activeEventName = eventName;
  }

  function stopWatching() {
    if (activeHandler && activeEventName) {
      window.removeEventListener(activeEventName, activeHandler);
    }
    activeHandler = null;
    activeEventName = null;
  }

  global.Compass = {
    isOrientationSupported,
    needsExplicitPermission,
    requestPermission,
    startWatching,
    stopWatching,
  };
})(window);
