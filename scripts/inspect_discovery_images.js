const http = require('http');
const fs = require('fs');

async function test() {
  console.log('[DISCOVERY-AUDIT] Inspecting http://localhost:8081/discovery ...');
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:8081/discovery', { method: 'PUT' });
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
  const imageRequests = [];
  const consoleErrors = [];

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Console.enable');

    // Grant & emulate geolocation in Bengaluru (12.9352, 77.6245)
    try {
      await send('Emulation.setGeolocationOverride', {
        latitude: 12.9352,
        longitude: 77.6245,
        accuracy: 10
      });
    } catch (e) {}
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
      if (url.match(/\.(png|jpg|jpeg|webp|svg)/i) || url.includes('image') || data.params.type === 'Image') {
        imageRequests.push({ url, type: data.params.type });
      }
    }
    if (data.method === 'Network.responseReceived') {
      if (data.params.response.status >= 400) {
        failedNet.push({ status: data.params.response.status, url: data.params.response.url });
        console.warn('[HTTP ERR ' + data.params.response.status + ']:', data.params.response.url);
      }
    }
    if (data.method === 'Network.loadingFailed') {
      failedNet.push({ error: data.params.errorText, reqId: data.params.requestId });
      console.warn('[NET FAIL]:', data.params.errorText);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      if (data.params.type === 'error' || text.includes('Error') || text.includes('image')) {
        consoleErrors.push(text);
      }
    }
  };

  await new Promise(r => setTimeout(r, 8000));

  // Extract all cards and image elements
  const pageState = await send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = Array.from(document.querySelectorAll('img')).map(img => {
        const computed = window.getComputedStyle(img);
        return {
          src: img.src,
          alt: img.alt,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          width: img.width,
          height: img.height,
          computedBg: computed.backgroundColor,
          parentElement: {
            tagName: img.parentElement?.tagName,
            className: img.parentElement?.className,
            bg: window.getComputedStyle(img.parentElement).backgroundColor,
            w: img.parentElement?.clientWidth,
            h: img.parentElement?.clientHeight
          }
        };
      });

      // Find all place cards / elements with text
      const placeTexts = Array.from(document.querySelectorAll('[style*=\"font-weight\"], [style*=\"fontWeight\"], h1, h2, h3, h4'))
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length > 2 && t.length < 50);

      return {
        url: window.location.href,
        imgsCount: imgs.length,
        imgs: imgs.slice(0, 15),
        placeTextsSample: placeTexts.slice(0, 20),
        bodySnippet: document.body.innerText.slice(0, 600)
      };
    })()`,
    returnByValue: true
  });

  console.log('\n=== DISCOVERY PAGE STATE ===');
  console.log(JSON.stringify(pageState.result?.value, null, 2));

  console.log('\n=== IMAGE NETWORK REQUESTS ===', imageRequests.length);
  imageRequests.slice(0, 10).forEach(r => console.log(' ->', r.url));

  console.log('\n=== FAILED REQUESTS ===', failedNet);
  console.log('\n=== CONSOLE ERRORS ===', consoleErrors);

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/discovery_page_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved discovery screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test().catch(e => {
  console.error('[ERR]:', e);
  process.exit(1);
});
