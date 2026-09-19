(function () {
  'use strict';

  // ---- DOM references ----
  const statusText = document.getElementById('statusText');
  const retryLocationBtn = document.getElementById('retryLocationBtn');
  const dial = document.getElementById('dial');
  const needle = document.getElementById('needle');
  const enableCompassBtn = document.getElementById('enableCompassBtn');
  const bearingValue = document.getElementById('bearingValue');
  const distanceValue = document.getElementById('distanceValue');
  const manualToggle = document.getElementById('manualToggle');
  const manualPanel = document.getElementById('manualPanel');
  const placeSearchForm = document.getElementById('placeSearchForm');
  const placeSearchInput = document.getElementById('placeSearchInput');
  const placeSearchError = document.getElementById('placeSearchError');
  const placeSearchResults = document.getElementById('placeSearchResults');
  const ticksGroup = document.getElementById('ticks');
  const cardinalsGroup = document.getElementById('cardinals');
  const pointerMarker = document.getElementById('pointerMarker');
  const prayersSection = document.getElementById('prayers');
  const prayersDate = document.getElementById('prayersDate');
  const prayersError = document.getElementById('prayersError');
  const prayersGrid = document.getElementById('prayersGrid');
  const prayerTimeEls = {
    fajr: prayersGrid.querySelector('[data-prayer="fajr"]'),
    sunrise: prayersGrid.querySelector('[data-prayer="sunrise"]'),
    dhuhr: prayersGrid.querySelector('[data-prayer="dhuhr"]'),
    asr: prayersGrid.querySelector('[data-prayer="asr"]'),
    maghrib: prayersGrid.querySelector('[data-prayer="maghrib"]'),
    isha: prayersGrid.querySelector('[data-prayer="isha"]'),
  };

  // ---- State ----
  let qiblaBearing = null; // degrees from true north, or null until known
  let deviceHeading = 0; // degrees from true north that the top of the phone points at

  // ---- Dial ticks ----
  function drawTicks() {
    const center = 160;
    const outerR = 150;
    for (let deg = 0; deg < 360; deg += 15) {
      const isMajor = deg % 90 === 0;
      const innerR = isMajor ? 128 : 136;
      const rad = (deg * Math.PI) / 180;
      const x1 = center + innerR * Math.sin(rad);
      const y1 = center - innerR * Math.cos(rad);
      const x2 = center + outerR * Math.sin(rad);
      const y2 = center - outerR * Math.cos(rad);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toFixed(2));
      line.setAttribute('y1', y1.toFixed(2));
      line.setAttribute('x2', x2.toFixed(2));
      line.setAttribute('y2', y2.toFixed(2));
      line.setAttribute('class', isMajor ? 'tick-major' : 'tick-minor');
      ticksGroup.appendChild(line);
    }
  }

  // ---- Rendering ----
  const ALIGNMENT_EPSILON_DEG = 1; // sensor readings jitter, so treat within 1° as "exact"
  let isAligned = false;

  function updateNeedle() {
    if (qiblaBearing === null) return;
    const rotation = (qiblaBearing - deviceHeading + 360) % 360;
    needle.setAttribute('transform', `rotate(${rotation.toFixed(1)} 160 160)`);
    updateAlignment(rotation);
  }

  function updateAlignment(rotation) {
    // Only meaningful once the live device compass is actually tracking —
    // before that, "rotation" is just the static bearing from true north,
    // not a real measurement of which way the phone is pointing.
    const angularDistance = Math.min(rotation, 360 - rotation);
    const aligned = compassStarted && angularDistance <= ALIGNMENT_EPSILON_DEG;

    if (aligned === isAligned) return;
    isAligned = aligned;
    pointerMarker.classList.toggle('is-aligned', aligned);
    needle.classList.toggle('is-aligned', aligned);
  }

  function renderQibla(lat, lng, locationLabel, fullLocationLabel) {
    qiblaBearing = window.Qibla.bearingToKaaba(lat, lng);
    const distanceKm = window.Qibla.distanceToKaabaKm(lat, lng);

    bearingValue.textContent = `${Math.round(qiblaBearing)}°`;
    distanceValue.textContent = `${Math.round(distanceKm).toLocaleString()} km`;

    statusText.textContent = locationLabel;
    statusText.title = fullLocationLabel || '';
    retryLocationBtn.hidden = true;

    // The needle's rest position (0° rotation) happens to line up with
    // where "N" is drawn — that's just how the SVG is built, not because
    // Qibla is actually north. Once a real bearing is known, swap the
    // static N/E/S/W labels for a plain alignment marker so it's clear
    // this is "point your phone here," not a geographic direction.
    cardinalsGroup.setAttribute('hidden', '');
    pointerMarker.removeAttribute('hidden');

    updateNeedle();
    maybeShowEnableCompassButton();
    renderPrayerTimes(lat, lng);
  }

  function renderLocationError(message) {
    statusText.textContent = message;
    retryLocationBtn.hidden = false;
  }

  // ---- Prayer times ----
  async function renderPrayerTimes(lat, lng) {
    prayersSection.hidden = false;
    prayersError.hidden = true;
    prayersGrid.hidden = false;
    prayersDate.textContent = 'Loading prayer times… · ';

    const result = await window.PrayerTimes.getPrayerTimes(lat, lng);

    if (!result.ok) {
      prayersDate.textContent = '';
      prayersGrid.hidden = true;
      prayersError.textContent = result.message;
      prayersError.hidden = false;
      return;
    }

    prayersDate.textContent = result.stale
      ? `${result.dateLabel} (cached) · `
      : `${result.dateLabel} · `;

    Object.keys(prayerTimeEls).forEach((key) => {
      prayerTimeEls[key].textContent = result.timings[key];
    });
  }

  // ---- Compass permission / watching ----
  let compassStarted = false;

  function maybeShowEnableCompassButton() {
    if (compassStarted) return;
    if (window.Compass.needsExplicitPermission()) {
      enableCompassBtn.hidden = false;
    } else {
      startCompass();
    }
  }

  function startCompass() {
    if (compassStarted) return;
    window.Compass.startWatching(
      (heading) => {
        deviceHeading = heading;
        updateNeedle();
      },
      (message) => {
        // Compass unsupported: the needle still shows the correct bearing
        // from true north, it just won't rotate with the device.
        console.warn(message);
      }
    );
    compassStarted = true;
    enableCompassBtn.hidden = true;
  }

  enableCompassBtn.addEventListener('click', () => {
    window.Compass.requestPermission().then((result) => {
      if (result === 'granted') {
        startCompass();
      } else {
        enableCompassBtn.textContent = 'Compass access denied — check settings';
      }
    });
  });

  // ---- Geolocation flow ----
  function findLocation() {
    statusText.textContent = 'Finding your location…';
    retryLocationBtn.hidden = true;

    window.AppGeolocation.getCurrentLocation(
      (coords) => {
        renderQibla(coords.lat, coords.lng, 'Using your current location');
      },
      (message) => {
        renderLocationError(message);
      }
    );
  }

  retryLocationBtn.addEventListener('click', findLocation);

  // ---- Manual place search ----
  manualToggle.addEventListener('click', () => {
    const isHidden = manualPanel.hidden;
    manualPanel.hidden = !isHidden;
    manualToggle.setAttribute('aria-expanded', String(isHidden));
    manualToggle.textContent = isHidden ? 'Hide place search' : 'Search for a place instead';
  });

  function clearPlaceResults() {
    placeSearchResults.innerHTML = '';
    placeSearchResults.hidden = true;
  }

  function showPlaceResults(results) {
    clearPlaceResults();
    results.forEach((place) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'manual-result-item';
      btn.textContent = place.label;
      btn.addEventListener('click', () => {
        clearPlaceResults();
        placeSearchInput.value = '';
        renderQibla(place.lat, place.lng, `Using ${place.shortLabel}`, place.label);
      });
      li.appendChild(btn);
      placeSearchResults.appendChild(li);
    });
    placeSearchResults.hidden = false;
  }

  placeSearchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    placeSearchError.hidden = true;
    clearPlaceResults();

    const submitBtn = placeSearchForm.querySelector('.manual-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Searching…';

    const result = await window.PlaceSearch.searchPlace(placeSearchInput.value);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Search';

    if (!result.ok) {
      placeSearchError.textContent = result.message;
      placeSearchError.hidden = false;
      return;
    }

    if (result.results.length === 1) {
      const place = result.results[0];
      renderQibla(place.lat, place.lng, `Using ${place.shortLabel}`, place.label);
    } else {
      showPlaceResults(result.results);
    }
  });

  // ---- Init ----
  drawTicks();
  findLocation();
})();
