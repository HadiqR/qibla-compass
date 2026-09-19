# Qibla Compass

A free, static web app that shows the Qibla direction from wherever you are. Uses your browser's location (or a place search) and a live compass to point toward the Kaaba — no paid APIs, no backend, no build step.

## Features

- Detects your location via the browser's GPS, or search for a place by name (free OpenStreetMap Nominatim geocoding — no API key).
- Calculates the Qibla bearing and distance to the Kaaba using spherical trigonometry — no external service needed.
- Live compass needle driven by the device's magnetometer (`DeviceOrientationEvent`), including the iOS permission prompt.
- Works on mobile and desktop browsers, deployable as a static site.

## A note on accuracy

Because the search fallback resolves to city/place-level coordinates rather than an exact pin, the resulting bearing can be off by a small fraction of a degree at Mecca's distance — well within the tolerance most scholars describe for anyone who cannot see the Kaaba directly, who are only required to face its general direction rather than an exact point (see e.g. [IslamQA on slight Qibla deviation](https://islamqa.info/en/answers/42574)). GPS narrows this further, but isn't required for the direction to be valid.

## Requirements

- A modern mobile or desktop browser.
- HTTPS for GPS and compass access (localhost is exempt for local dev).

## Setup

```bash
git clone https://github.com/<your-username>/qibla-compass.git
cd qibla-compass
npx serve .
# or: python3 -m http.server 8000
```

## Deployment

Static site, no build step — connect the repo to **Netlify** or **Vercel** with no build command and the project root as the publish directory. Both serve over HTTPS automatically.

## License

MIT — see [LICENSE](LICENSE).
