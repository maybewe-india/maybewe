const http = require('http');
const fs = require('fs');

async function runAudit() {
  console.log('[AUDIT] Starting detailed runtime map audit...');
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:8081/maps', { method: 'PUT' });
  const target = await newTargetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const allRequests = [];
  const networkFailures = [];
  const consoleMessages = [];

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Console.enable');

    // Grant geolocation & set override to Gateway of India, Mumbai (18.9220, 72.8347)
    try {
      await send('Emulation.setGeolocationOverride', {
        latitude: 18.9220,
        longitude: 72.8347,
        accuracy: 10
      });
      console.log('[AUDIT] Emulated Geolocation: Mumbai (18.9220, 72.8347)');
    } catch (e) {
      console.warn('[AUDIT] Geolocation override error:', e.message);
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }

    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      consoleMessages.push({ type: data.params.type, text });
      console.log(`[PAGE CONSOLE ${data.params.type}]:`, text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
      consoleMessages.push({ type: 'exception', text: desc });
      console.error('[PAGE EXCEPTION]:', desc);
    } else if (data.method === 'Network.requestWillBeSent') {
      allRequests.push({
        id: data.params.requestId,
        url: data.params.request.url,
        method: data.params.request.method,
        type: data.params.type
      });
    } else if (data.method === 'Network.responseReceived') {
      const res = data.params.response;
      if (res.status >= 400) {
        networkFailures.push({ url: res.url, status: res.status, statusText: res.statusText });
        console.warn(`[HTTP FAIL ${res.status}]:`, res.url);
      }
    } else if (data.method === 'Network.loadingFailed') {
      networkFailures.push({ requestId: data.params.requestId, error: data.params.errorText, url: data.params.type });
      console.warn(`[NET FAILED]:`, data.params.errorText);
    }
  };

  // Wait 10 seconds for initial render and map loading
  await new Promise(r => setTimeout(r, 10000));

  // Evaluate state of map inside iframe and host page
  const detailedEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      let iframeDetails = { found: false };
      if (iframe) {
        iframeDetails.found = true;
        iframeDetails.rect = iframe.getBoundingClientRect();
        try {
          const win = iframe.contentWindow;
          const doc = iframe.contentDocument || win.document;
          const mapEl = doc.getElementById('map');
          const canvas = doc.querySelector('canvas');
          const errorBanner = doc.getElementById('errorBanner');
          const loadingOverlay = doc.getElementById('loadingOverlay');
          
          iframeDetails.windowExists = !!win;
          iframeDetails.hasMapInstance = !!win.mapInstance;
          if (win.mapInstance) {
            iframeDetails.mapLoaded = win.mapInstance.loaded();
            iframeDetails.styleLoaded = win.mapInstance.isStyleLoaded();
            iframeDetails.center = win.mapInstance.getCenter();
            iframeDetails.zoom = win.mapInstance.getZoom();
          }
          iframeDetails.mapElRect = mapEl ? mapEl.getBoundingClientRect() : null;
          iframeDetails.canvasRect = canvas ? canvas.getBoundingClientRect() : null;
          if (canvas) {
            iframeDetails.canvasAttrs = {
              width: canvas.width,
              height: canvas.height,
              style: canvas.style.cssText
            };
          }
          iframeDetails.errorBannerDisplay = errorBanner ? errorBanner.style.display : null;
          iframeDetails.errorBannerText = errorBanner ? errorBanner.innerText : null;
          iframeDetails.loadingOverlayClasses = loadingOverlay ? loadingOverlay.className : null;
        } catch (e) {
          iframeDetails.evalError = e.message;
        }
      }

      // Check Place cards
      const placeCards = Array.from(document.querySelectorAll('[data-testid="place-card"], [accessibilitylabel*="place"], [aria-label*="place"]')).map(el => el.innerText);
      const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        rect: img.getBoundingClientRect()
      }));

      // Search and list all texts on page
      const bodyText = document.body.innerText;

      return {
        iframeDetails,
        placeCardsCount: placeCards.length,
        allImages,
        bodyTextSnippet: bodyText.slice(0, 500)
      };
    })()`,
    returnByValue: true
  });

  console.log('\n=== DETAILED EVALUATION ===');
  console.log(JSON.stringify(detailedEval.result?.value, null, 2));

  console.log('\n=== NETWORK REQUESTS SAMPLE (Map & Tiles) ===');
  const tileReqs = allRequests.filter(r => r.url.includes('tile') || r.url.includes('style') || r.url.includes('openfreemap') || r.url.includes('openstreetmap') || r.url.includes('esri') || r.url.includes('pbf'));
  console.log('Tile / Map related requests count:', tileReqs.length);
  tileReqs.slice(0, 15).forEach(r => console.log(' ->', r.method, r.url));

  console.log('\n=== FAILED NETWORK REQUESTS ===');
  console.log(networkFailures);

  // Take screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/detailed_map_audit.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('[AUDIT] Screenshot saved to', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

runAudit().catch(err => {
  console.error('[AUDIT ERROR]:', err);
  process.exit(1);
});
