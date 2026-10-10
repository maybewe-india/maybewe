const http = require('http');
const fs = require('fs');

async function test() {
  console.log('[BOTTOM-SHEET-TEST] Opening http://localhost:8081/maps ...');
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
  const imgRequests = [];
  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
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
      if (url.includes('unsplash') || url.includes('.jpg') || url.includes('.png') || data.params.type === 'Image') {
        imgRequests.push(url);
      }
    }
    if (data.method === 'Network.loadingFailed') {
      failedNet.push({ error: data.params.errorText, reqId: data.params.requestId });
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Click "Search this area" button to trigger place search around map center (16.5062, 80.648)
  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div, span, button'));
      const searchBtn = btns.find(b => b.textContent.trim() === 'Search this area');
      if (searchBtn) {
        searchBtn.click();
        return 'Clicked Search this area';
      }
      return 'Search this area button not found';
    })()`,
    returnByValue: true
  });
  console.log('Search this area click:', clickRes.result?.value);

  // Wait 4 seconds for places to load into state
  await new Promise(r => setTimeout(r, 4000));

  // Inspect place list elements and images
  const domResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const allDivs = Array.from(document.querySelectorAll('*'));
      const imgElements = Array.from(document.querySelectorAll('img')).map(img => {
        const cs = window.getComputedStyle(img);
        const parentCs = window.getComputedStyle(img.parentElement);
        return {
          src: img.src,
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          computedBg: cs.backgroundColor,
          parentBg: parentCs.backgroundColor,
          classes: img.className,
          rect: img.getBoundingClientRect()
        };
      });

      // Check text in bottom sheet
      const sheetTexts = Array.from(document.querySelectorAll('div'))
        .filter(d => d.textContent && d.textContent.includes('PRISA') || d.textContent.includes('Spots') || d.textContent.includes('Places in'))
        .map(d => d.innerText.slice(0, 100));

      return {
        imgCount: imgElements.length,
        imgElements,
        sheetTexts: sheetTexts.slice(0, 5)
      };
    })()`,
    returnByValue: true
  });

  console.log('\n=== BOTTOM SHEET DOM INSPECTION ===');
  console.log(JSON.stringify(domResult.result?.value, null, 2));

  // Take screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/bottom_sheet_places_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test().catch(e => {
  console.error('[ERR]:', e);
  process.exit(1);
});
