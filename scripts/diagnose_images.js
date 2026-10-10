const http = require('http');
const fs = require('fs');

async function test() {
  console.log('[IMG-DIAG] Connecting to browser on 9222...');
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:8081/maps', { method: 'PUT' });
  const target = await newTargetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const failedNet = [];
  const allImgRequests = [];

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Console.enable');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
      return;
    }
    if (data.method === 'Network.requestWillBeSent') {
      const url = data.params.request.url;
      if (url.match(/\.(png|jpg|jpeg|webp|svg)/i) || url.includes('unsplash') || url.includes('image') || data.params.type === 'Image') {
        allImgRequests.push(url);
      }
    }
    if (data.method === 'Network.loadingFailed') {
      failedNet.push({ error: data.params.errorText, reqId: data.params.requestId });
      console.warn('[IMG NET FAIL]:', data.params.errorText);
    }
    if (data.method === 'Network.responseReceived') {
      if (data.params.response.status >= 400) {
        failedNet.push({ status: data.params.response.status, url: data.params.response.url });
        console.warn('[HTTP FAIL]:', data.params.response.status, data.params.response.url);
      }
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      if (text.includes('image') || text.includes('Image') || text.includes('places') || text.includes('Error')) {
        console.log('[PAGE CONSOLE]:', text);
      }
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Emulate GPS in Bengaluru (Koramangala: 12.9352, 77.6245) or search Cafes in Bengaluru
  const evalRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { fetchNearbyPlaces, searchPlaces, getPlaces } = await import('./frontend/lib/places.js');
      
      // Test 1: Fetch Nearby Cafes in Bengaluru (Koramangala)
      const blrCafes = await fetchNearbyPlaces({ latitude: 12.9352, longitude: 77.6245, category: 'cafes', limit: 5 });
      
      // Test 2: Fetch Nearby Cafes in Hyderabad (Jubilee Hills)
      const hydCafes = await fetchNearbyPlaces({ latitude: 17.4319, longitude: 78.4073, category: 'cafes', limit: 5 });

      // Test 3: Search places in Delhi
      const delPlaces = await searchPlaces({ query: 'Hauz Khas Social Delhi', limit: 3 });

      // Test 4: Search places in Mumbai
      const mumPlaces = await searchPlaces({ query: 'Kyani Bakery Mumbai', limit: 3 });

      return {
        blrCafes: blrCafes.slice(0, 3).map(p => ({ name: p.name, category: p.category_id, image_url: p.image_url })),
        hydCafes: hydCafes.slice(0, 3).map(p => ({ name: p.name, category: p.category_id, image_url: p.image_url })),
        delPlaces: delPlaces.map(p => ({ name: p.name, image_url: p.image_url })),
        mumPlaces: mumPlaces.map(p => ({ name: p.name, image_url: p.image_url })),
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('\n=== REAL PLACE DATA EVALUATION ===');
  console.log(JSON.stringify(evalRes.result?.value, null, 2));

  // Select "Cafes" chip on UI
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chips = Array.from(document.querySelectorAll('div, span, p'));
      const cafesChip = chips.find(c => c.textContent.trim() === 'Cafes');
      if (cafesChip) cafesChip.click();
    })()`
  });

  await new Promise(r => setTimeout(r, 4000));

  // Inspect DOM img elements on the page
  const domImgs = await send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = Array.from(document.querySelectorAll('img')).map(img => {
        const computed = window.getComputedStyle(img);
        return {
          src: img.src?.slice(0, 100),
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          computedBg: computed.backgroundColor,
          computedDisplay: computed.display,
        };
      });

      // Check card wrappers or image placeholder containers
      const cards = Array.from(document.querySelectorAll('[data-testid=\"place-card\"], [class*=\"place\"], [class*=\"Place\"]')).slice(0, 5).map(c => {
        const s = window.getComputedStyle(c);
        return {
          tag: c.tagName,
          bg: s.backgroundColor,
          w: c.clientWidth,
          h: c.clientHeight
        };
      });

      return { imgs, cards };
    })()`,
    returnByValue: true
  });

  console.log('\n=== DOM IMGS & CARDS ===');
  console.log(JSON.stringify(domImgs.result?.value, null, 2));

  // Capture screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/diagnose_images_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test().catch(e => {
  console.error('[DIAG ERROR]:', e);
  process.exit(1);
});
