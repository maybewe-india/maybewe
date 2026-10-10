const http = require('http');
const fs = require('fs');

async function testPlaceImages() {
  console.log('[PLACES-TEST] Starting place image collision audit...');
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

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Run place search evaluation directly in the app context
  const placesEval = await send('Runtime.evaluate', {
    expression: `(async () => {
      // 1. Test Gateway of India
      const { searchPlaces, getCategoryPhoto } = await import('./frontend/lib/places.js');
      
      const gatewayPhoto = getCategoryPhoto('attractions', 'Gateway of India');
      const indiaGatePhoto = getCategoryPhoto('attractions', 'India Gate');
      const charminarPhoto = getCategoryPhoto('attractions', 'Charminar');
      const unphotographedAttraction = getCategoryPhoto('attractions', 'Unknown Small Monument');

      // 2. Perform live search for Gateway of India & India Gate
      const gatewayResults = await searchPlaces({ query: 'Gateway of India', limit: 2 });
      const indiaGateResults = await searchPlaces({ query: 'India Gate', limit: 2 });

      return {
        gatewayPhoto,
        indiaGatePhoto,
        charminarPhoto,
        unphotographedAttraction,
        photosDiffer: gatewayPhoto !== indiaGatePhoto,
        gatewaySearchResult: gatewayResults.map(p => ({ name: p.name, image_url: p.image_url })),
        indiaGateSearchResult: indiaGateResults.map(p => ({ name: p.name, image_url: p.image_url })),
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('\n=== PLACE IMAGE BINDING EVALUATION ===');
  console.log(JSON.stringify(placesEval.result?.value, null, 2));

  // Now let's trigger search in the UI for "Gateway of India"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input');
      if (input) {
        // Set value and trigger search
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'Gateway of India');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // Press Enter
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 3000));

  // Extract all rendered img elements
  const imgElements = await send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        rendered: img.naturalWidth > 0
      }));
      return imgs;
    })()`,
    returnByValue: true
  });

  console.log('\n=== RENDERED DOM IMG ELEMENTS ===');
  console.log(JSON.stringify(imgElements.result?.value, null, 2));

  // Take screenshot of search result
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/search_gateway_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved search screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

testPlaceImages().catch(e => {
  console.error('[PLACES ERROR]:', e);
  process.exit(1);
});
