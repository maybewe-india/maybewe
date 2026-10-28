// ============================================================================
// MAYBEWE MAPLIBRE HTML BUNDLE GENERATOR (frontend/components/maps/mapHtmlBuilder.js)
// Zero Mapbox / Zero Google Keys
// Self-contained HTML payload rendering MapLibre GL JS vector & raster tiles.
// Executed inside react-native-webview on Android/iOS and inside iframe on Web.
// ============================================================================

export function buildMapLibreHtml({
  userCoords = null,
  places = [],
  selectedPlaceId = null,
  initialZoom = 13,
  mode = "street", // "street" | "dark" | "satellite"
  styleUrl = "https://tiles.openfreemap.org/styles/liberty",
  routeGeoJson = null,
}) {
  // Use authoritative user coords if available, otherwise default to neutral India overview center
  const initialLat = typeof userCoords?.latitude === "number" ? userCoords.latitude : 20.5937;
  const initialLng = typeof userCoords?.longitude === "number" ? userCoords.longitude : 78.9629;
  const hasUserLocation = Boolean(
    userCoords &&
    typeof userCoords.latitude === "number" &&
    typeof userCoords.longitude === "number"
  );

  const placesJson = JSON.stringify(
    (places || []).map((p) => ({
      place_id: p.place_id || p.id,
      name: p.name || "Spot",
      category: p.category || "Place",
      category_id: p.category_id || "default",
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating,
      address: p.address,
    }))
  );

  const initialRouteJson = routeGeoJson ? JSON.stringify(routeGeoJson) : "null";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <!-- CSP disabled --><meta data-disabled-csp="true" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com; worker-src blob: 'self'; child-src blob: 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; connect-src * blob: data:; img-src * data: blob: https:;" />
  <title>MaybeWe Map</title>

  <!-- MapLibre GL JS v4.7.1 -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js"></script>
  <script>
    // Robust Worker Handling: Standard MapLibre bundles worker inline.
    // Avoid crashing cross-origin importScripts inside iframe srcDoc / WebView.
  </script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      min-height: 100%;
      position: relative;
      overflow: hidden;
      background-color: #FAF8F5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* MapLibre Theme Overrides */
    .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { margin: 8px 12px; }
    .maplibregl-ctrl-attrib {
      background-color: rgba(250, 248, 245, 0.92) !important;
      color: #6E685F !important;
      font-size: 10px !important;
      border-radius: 6px;
      padding: 3px 8px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .maplibregl-ctrl-attrib a { color: #C8B27A !important; text-decoration: none; font-weight: 600; }
    .maplibregl-ctrl-attrib a:hover { text-decoration: underline; }

    /* User GPS Beacon */
    .user-beacon-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .user-beacon-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(200, 178, 122, 0.32);
      animation: beacon-pulse 2s infinite ease-out;
    }
    .user-beacon-ring {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(200, 178, 122, 0.22);
      border: 1.5px solid rgba(200, 178, 122, 0.7);
    }
    .user-beacon-core {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #C8B27A;
      box-shadow: 0 0 12px rgba(200, 178, 122, 0.9), 0 0 0 2px #FFFFFF;
    }
    @keyframes beacon-pulse {
      0% { transform: scale(0.35); opacity: 0.95; }
      70% { transform: scale(1.15); opacity: 0.0; }
      100% { transform: scale(1.25); opacity: 0; }
    }

    /* POI Markers */
    .poi-pin-container {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      user-select: none;
      -webkit-user-select: none;
    }
    .poi-pin-container:hover {
      transform: translateY(-4px) scale(1.05);
      z-index: 40 !important;
    }
    .poi-pin-container.selected {
      transform: translateY(-6px) scale(1.15);
      z-index: 50 !important;
    }
    .poi-pin-bubble {
      background: rgba(23, 24, 23, 0.92);
      border: 1px solid rgba(200, 178, 122, 0.5);
      border-radius: 12px;
      padding: 4px 10px;
      color: #FAF8F3;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      margin-bottom: 4px;
      letter-spacing: 0.2px;
      display: flex;
      align-items: center;
      gap: 5px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .poi-pin-container.selected .poi-pin-bubble {
      background: #C8B27A;
      color: #171817;
      border-color: #FAF8F3;
      box-shadow: 0 6px 20px rgba(200, 178, 122, 0.5);
    }
    .poi-pin-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #C8B27A;
      border: 2px solid #171817;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .poi-pin-container.selected .poi-pin-dot {
      background: #FAF8F3;
      border-color: #C8B27A;
      transform: scale(1.25);
    }

    /* Embedded Minimal Map Controls */
    .controls-overlay {
      position: absolute;
      right: 14px;
      bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10;
    }
    .ctrl-btn {
      width: 42px;
      height: 42px;
      border-radius: 21px;
      background: rgba(23, 24, 23, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #FAF8F3;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      transition: all 0.15s ease;
    }
    .ctrl-btn:active { transform: scale(0.92); background: #333633; }
    .ctrl-btn svg {
      width: 19px;
      height: 19px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Map Loading Spinner Overlay */
    .loading-overlay {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18, 19, 18, 0.9);
      border: 1px solid rgba(200, 178, 122, 0.35);
      border-radius: 20px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 45;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -8px);
    }
    .spinner-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #C8B27A;
      animation: spinner-pulse 1s infinite alternate;
    }
    @keyframes spinner-pulse {
      0% { opacity: 0.3; transform: scale(0.8); }
      100% { opacity: 1.0; transform: scale(1.2); }
    }
    .loading-text {
      color: #FAF8F3;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* Map Error Banner */
    .error-banner {
      position: absolute;
      top: 70px;
      left: 16px;
      right: 16px;
      background: rgba(23, 24, 23, 0.95);
      border: 1px solid rgba(200, 76, 76, 0.6);
      border-radius: 12px;
      padding: 12px 16px;
      color: #FAF8F3;
      z-index: 50;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      display: none;
    }
    .error-banner-title { font-weight: 700; font-size: 13px; color: #E57373; margin-bottom: 4px; }
    .error-banner-desc { font-size: 11px; color: #A6A8A6; line-height: 1.4; margin-bottom: 8px; }
    .error-retry-btn {
      background: #C8B27A;
      border: none;
      border-radius: 6px;
      color: #121312;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <div id="loadingOverlay" class="loading-overlay">
    <div class="spinner-dot"></div>
    <span class="loading-text" id="loadingText">Streaming cartography...</span>
  </div>

  <div id="errorBanner" class="error-banner">
    <div class="error-banner-title" id="errTitle">Map Tiles Unavailable</div>
    <div class="error-banner-desc" id="errDesc">Unable to connect to tile server. Please check connection.</div>
    <button class="error-retry-btn" onclick="retryMapLoad()">Retry Connection</button>
  </div>

  <div class="controls-overlay">
    <button class="ctrl-btn" id="recenterBtn" title="Recenter GPS">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path><circle cx="12" cy="12" r="8"></circle></svg>
    </button>
    <button class="ctrl-btn" id="zoomInBtn" title="Zoom in">
      <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    </button>
    <button class="ctrl-btn" id="zoomOutBtn" title="Zoom out">
      <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    </button>
  </div>

  <script>
    const HAS_USER_LOCATION = ${hasUserLocation};
    const USER_LAT = ${initialLat};
    const USER_LNG = ${initialLng};
    let currentMode = '${mode || "street"}';
    let places = ${placesJson};
    let selectedPlaceId = '${selectedPlaceId || ""}';
    let initialRoute = ${initialRouteJson};

    window.mapInstance = null;
    let userMarker = null;
    const poiMarkers = new Map();
    let hasLoadedFirstTile = false;
    let pendingFlyTo = null;

    // Satellite Raster Style definition
    window.SATELLITE_STYLE_DEF = {
      version: 8,
      sources: {
        'satellite-imagery': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: 'Tiles &copy; Esri World Imagery'
        }
      },
      layers: [
        {
          id: 'satellite-base',
          type: 'raster',
          source: 'satellite-imagery',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const OPEN_FREE_MAP_DARK = 'https://tiles.openfreemap.org/styles/dark';
    const OPEN_FREE_MAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
    const OPEN_FREE_MAP_POSITRON = 'https://tiles.openfreemap.org/styles/positron';
    const OPEN_FREE_MAP_BRIGHT = 'https://tiles.openfreemap.org/styles/bright';
    const INITIAL_STYLE_URL = '${styleUrl || "https://tiles.openfreemap.org/styles/positron"}';

    window.OSM_RASTER_STYLE = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a>'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    function updateCanvasFilter(m) {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      if (m === 'dark') {
        canvas.style.filter = 'invert(92%) hue-rotate(180deg) brightness(85%) contrast(120%)';
      } else {
        canvas.style.filter = 'none';
      }
    }

    function resolveStyleForMode(m) {
      if (m === 'satellite') {
        return window.SATELLITE_STYLE_DEF;
      }
      if (m === 'dark') {
        return OPEN_FREE_MAP_DARK;
      }
      return INITIAL_STYLE_URL || OPEN_FREE_MAP_POSITRON;
    }

    function notifyNative(payload) {
      const msg = JSON.stringify(payload);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      } else if (typeof window.onMapMessage === 'function') {
        window.onMapMessage(payload);
      }
    }

    function hideLoadingSpinner() {
      const el = document.getElementById('loadingOverlay');
      if (el) el.classList.add('hidden');
    }

    function showErrorBanner(msg) {
      const el = document.getElementById('errorBanner');
      if (el) {
        if (msg) document.getElementById('errDesc').textContent = msg;
        el.style.display = 'block';
      }
      hideLoadingSpinner();
    }

    function retryMapLoad() {
      document.getElementById('errorBanner').style.display = 'none';
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.classList.remove('hidden');
      if (window.mapInstance) {
        window.mapInstance.setStyle(resolveStyleForMode(currentMode));
      } else {
        startMapWhenReady();
      }
    }

    function initMap() {
      try {
        const containerEl = document.getElementById('map');
        if (!containerEl) {
          console.error('Map container element not found');
          return;
        }

        // Web Worker Offloading: Use MapLibre built-in bundled worker
        // Avoids cross-origin importScripts SecurityError in sandbox/iframe environments

        const initialStyle = resolveStyleForMode(currentMode);

        const m = new maplibregl.Map({
          container: containerEl,
          style: initialStyle,
          center: [USER_LNG, USER_LAT],
          zoom: ${initialZoom},
          attributionControl: false,
          trackResize: true,
          minZoom: 3,
          maxZoom: 18,
          // maxBounds removed to prevent MapLibre antimeridian camera clamping
        });
        window.mapInstance = m;

        // OpenStreetMap & OpenFreeMap attribution
        m.addControl(new maplibregl.AttributionControl({
          compact: true,
          customAttribution: currentMode === 'satellite'
            ? '&copy; Esri World Imagery | MapLibre'
            : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>'
        }), 'bottom-right');

        // WebGL diagnostics & load events
        m.on('load', () => {
          m.resize();
          updateCanvasFilter(currentMode);
          renderUserLocation();
          renderPoiMarkers();
          if (initialRoute) {
            renderRoute(initialRoute);
          }
          if (pendingFlyTo) {
            m.flyTo(pendingFlyTo);
            pendingFlyTo = null;
          }
          notifyNative({ type: 'MAP_LOADED', mode: currentMode });
          setTimeout(() => { if (window.mapInstance) window.mapInstance.resize(); }, 50);
          setTimeout(() => { if (window.mapInstance) window.mapInstance.resize(); }, 200);
        });

        m.on('style.load', () => {
          try {
            if (m.getLayer('background')) {
              m.setPaintProperty('background', 'background-color', currentMode === 'dark' ? '#171817' : '#FAF8F5');
            }
          } catch (e) {}
          updateCanvasFilter(currentMode);
          notifyNative({ type: 'STYLE_LOADED', mode: currentMode });
          renderUserLocation();
          renderPoiMarkers();
          if (initialRoute) {
            renderRoute(initialRoute);
          }
          m.resize();
        });

        m.on('data', (e) => {
          if (e.dataType === 'tile' && !hasLoadedFirstTile) {
            hasLoadedFirstTile = true;
            hideLoadingSpinner();
            notifyNative({ type: 'FIRST_TILE_LOADED' });
          }
        });

        m.on('error', (e) => {
          console.warn('MapLibre runtime error:', e);
          notifyNative({ type: 'MAP_ERROR', error: e?.error?.message || 'Tile or source error' });
          if (!hasLoadedFirstTile && currentMode === 'street' && initialStyle !== window.OSM_RASTER_STYLE) {
            console.warn('Failing over to OSM raster tiles fallback...');
            try {
              m.setStyle(window.OSM_RASTER_STYLE);
            } catch (err) {}
          }
        });

        m.on('webglcontextlost', () => {
          showErrorBanner('WebGL context was lost. Please click retry.');
          notifyNative({ type: 'WEBGL_ERROR' });
        });

        // Camera movement tracking for Search this area
        m.on('moveend', () => {
          if (!window.mapInstance) return;
          const center = window.mapInstance.getCenter();
          notifyNative({
            type: 'MAP_MOVED',
            latitude: center.lat,
            longitude: center.lng,
            zoom: window.mapInstance.getZoom()
          });
        });

        // Setup container ResizeObserver to fix any blank canvas issue
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(() => {
            const map = window.mapInstance; if (map) map.resize();
          });
          ro.observe(containerEl);
          if (document.body) ro.observe(document.body);
        }

        window.addEventListener('resize', () => {
          const map = window.mapInstance; if (map) map.resize();
        });

        // Periodic resize safety checks
        setTimeout(() => window.mapInstance && window.mapInstance.resize(), 100);
        setTimeout(() => window.mapInstance && window.mapInstance.resize(), 400);
        setTimeout(() => {
          const map = window.mapInstance; if (map) map.resize();
          hideLoadingSpinner();
        }, 1200);

      } catch (err) {
        console.error('MapLibre GL initialization error:', err);
        showErrorBanner(err?.message || 'Failed to initialize WebGL map.');
        notifyNative({ type: 'INIT_ERROR', error: err?.message });
      }
    }

    function renderUserLocation() {
      if (!window.mapInstance || !HAS_USER_LOCATION) return;

      if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-beacon-wrapper';
        el.innerHTML = '<div class="user-beacon-pulse"></div><div class="user-beacon-ring"></div><div class="user-beacon-core"></div>';

        userMarker = new maplibregl.Marker({ element: el })
          .setLngLat([USER_LNG, USER_LAT])
          .addTo(window.mapInstance);
      } else {
        userMarker.setLngLat([USER_LNG, USER_LAT]);
      }
    }

    function renderPoiMarkers() {
      if (!window.mapInstance) return;

      // Clean existing markers
      poiMarkers.forEach((marker) => marker.remove());
      poiMarkers.clear();

      places.forEach((p) => {
        if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return;

        const isSelected = selectedPlaceId && selectedPlaceId === p.place_id;

        const el = document.createElement('div');
        el.className = 'poi-pin-container' + (isSelected ? ' selected' : '');
        el.dataset.placeId = p.place_id;
        el.innerHTML = '<div class="poi-pin-bubble"><span>' + escapeHtml(p.name) + '</span></div><div class="poi-pin-dot"></div>';

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selectMarker(p.place_id);
          notifyNative({ type: 'SELECT_PLACE', placeId: p.place_id });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([p.longitude, p.latitude])
          .addTo(window.mapInstance);

        poiMarkers.set(p.place_id, marker);
      });
    }

    function selectMarker(placeId) {
      selectedPlaceId = placeId;
      poiMarkers.forEach((marker, id) => {
        const el = marker.getElement();
        if (id === placeId) {
          el.classList.add('selected');
          const lngLat = marker.getLngLat();
          window.mapInstance.easeTo({ center: lngLat, duration: 600 });
        } else {
          el.classList.remove('selected');
        }
      });
    }

    function fitAllPlaces() {
      if (!window.mapInstance || places.length === 0) return;
      const bounds = new maplibregl.LngLatBounds();
      let valid = 0;
      places.forEach((p) => {
        if (typeof p.latitude === "number" && typeof p.longitude === "number") {
          bounds.extend([p.longitude, p.latitude]);
          valid++;
        }
      });
      if (valid > 0) {
        window.mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
      }
    }

    function renderRoute(geoJson) {
      if (!window.mapInstance || !geoJson) return;

      const sourceId = 'maybewe-route';
      const casingLayerId = 'maybewe-route-casing';
      const lineLayerId = 'maybewe-route-line';
      const isEstimate = Boolean(geoJson.properties && geoJson.properties.isEstimate);

      clearRoute();

      window.mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: geoJson,
      });

      if (!isEstimate) {
        window.mapInstance.addLayer({
          id: casingLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0F100F',
            'line-width': 6,
            'line-opacity': 0.85,
          },
        });

        window.mapInstance.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#C8B27A',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        });
      } else {
        window.mapInstance.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#C8B27A',
            'line-width': 2.5,
            'line-opacity': 0.75,
            'line-dasharray': [3, 2],
          },
        });
      }

      const coords = geoJson?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        window.mapInstance.fitBounds(bounds, { padding: 48, duration: 800 });
      }
    }

    function clearRoute() {
      if (!window.mapInstance) return;
      if (window.mapInstance.getLayer('maybewe-route-line')) window.mapInstance.removeLayer('maybewe-route-line');
      if (window.mapInstance.getLayer('maybewe-route-casing')) window.mapInstance.removeLayer('maybewe-route-casing');
      if (window.mapInstance.getSource('maybewe-route')) window.mapInstance.removeSource('maybewe-route');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    // Button event listeners
    document.getElementById('recenterBtn').addEventListener('click', () => {
      const map = window.mapInstance;
      if (map && HAS_USER_LOCATION) {
        map.flyTo({ center: [USER_LNG, USER_LAT], zoom: 15, speed: 1.4 });
        notifyNative({ type: 'RECENTER_GPS' });
      } else {
        notifyNative({ type: 'REQUEST_GPS' });
      }
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
      const map = window.mapInstance;
      if (map) map.zoomIn();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      const map = window.mapInstance;
      if (map) map.zoomOut();
    });

    // Parent communication listener (dispatched on both window and document on Android WebViews)
    let lastProcessedEvent = null;
    let lastProcessedRaw = null;
    let lastProcessedTime = 0;

    function handleIncomingMessage(event) {
      if (!event || event === lastProcessedEvent) return;
      lastProcessedEvent = event;
      if (event.stopImmediatePropagation) {
        try { event.stopImmediatePropagation(); } catch (e) {}
      }

      const raw = event.data;
      const now = Date.now();
      // Deduplicate identical message strings delivered via dual dispatch within 50ms
      if (typeof raw === 'string' && raw === lastProcessedRaw && (now - lastProcessedTime) < 50) {
        return;
      }
      lastProcessedRaw = typeof raw === 'string' ? raw : null;
      lastProcessedTime = now;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.type) return;

        if (data.type === 'UPDATE_PLACES') {
          places = data.places || [];
          renderPoiMarkers();
          if (data.fitBounds) {
            fitAllPlaces();
          }
        } else if (data.type === 'SELECT_PLACE') {
          selectMarker(data.placeId);
        } else if (data.type === 'FLY_TO') {
          if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            const flyOpts = {
              center: [data.longitude, data.latitude],
              zoom: data.zoom || 15,
              speed: 1.2
            };
            if (window.mapInstance) {
              window.mapInstance.flyTo(flyOpts);
            } else {
              pendingFlyTo = flyOpts;
            }
          }
        } else if (data.type === 'SET_MAP_MODE') {
          if (data.mode && data.mode !== currentMode) {
            const prevMode = currentMode; currentMode = data.mode; updateCanvasFilter(currentMode); const newStyle = resolveStyleForMode(currentMode);
            if (window.mapInstance) {
              window.mapInstance.setStyle(newStyle);
            }
          }
        } else if (data.type === 'FIT_ALL') {
          fitAllPlaces();
        } else if (data.type === 'SET_ROUTE') {
          renderRoute(data.route);
        } else if (data.type === 'CLEAR_ROUTE') {
          clearRoute();
        } else if (data.type === 'RECENTER_GPS') {
          if (window.mapInstance && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            window.mapInstance.flyTo({ center: [data.longitude, data.latitude], zoom: 15, speed: 1.4 });
          }
        } else if (data.type === 'RESIZE') {
          const map = window.mapInstance; if (map) map.resize();
        }
      } catch (err) {
        // ignore non-json messages
      }
    }
    window.addEventListener('message', handleIncomingMessage);
    document.addEventListener('message', handleIncomingMessage);

    // Wait for CDN script to finish loading before starting MapLibre
    function startMapWhenReady() {
      if (typeof maplibregl !== 'undefined') {
        initMap();
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (typeof maplibregl !== 'undefined') {
            clearInterval(interval);
            initMap();
          } else if (attempts > 120) {
            clearInterval(interval);
            showErrorBanner('MapLibre GL library failed to load from CDN.');
          }
        }, 50);
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      startMapWhenReady();
    } else {
      window.addEventListener('DOMContentLoaded', startMapWhenReady);
    }
  </script>
</body>
</html>`;
}

export default buildMapLibreHtml;
