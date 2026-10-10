const http = require('http');
const fs = require('fs');

async function verify() {
  console.log('[VERIFY] Launching live verification against http://localhost:8081/maps ...');
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

  const pbfRequests = [];
  const errors = [];
  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Console.enable');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
    if (data.method === 'Network.requestWillBeSent') {
      const url = data.params.request.url;
      if (url.includes('.pbf') || url.includes('/tiles') || url.includes('styles/liberty') || url.includes('planet')) {
        pbfRequests.push(url);
      }
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      if (data.params.type === 'error' || text.includes('MapLibre') || text.includes('Error')) {
        errors.push(text);
      }
    }
  };

  // Wait 8 seconds for React / Metro bundle load and map initialization
  await new Promise(r => setTimeout(r, 8000));

  const mapState = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe) return { error: 'No iframe found' };
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      if (!m) return { error: 'No map instance found' };

      return {
        center: m.getCenter(),
        zoom: m.getZoom(),
        loaded: m.loaded(),
        styleLoaded: m.isStyleLoaded(),
        canvas: {
          width: m.getCanvas().width,
          height: m.getCanvas().height,
          style: m.getCanvas().style.cssText
        }
      };
    })()`,
    returnByValue: true
  });

  console.log('[VERIFY] Live Map State:', JSON.stringify(mapState.result?.value, null, 2));
  console.log('[VERIFY] Network Requests for Map/Tiles:', pbfRequests.length);
  pbfRequests.forEach(url => console.log(' ->', url));

  // Capture screenshot of full page
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/live_maps_verified.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('[VERIFY] Screenshot saved to', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

verify().catch(e => {
  console.error('[VERIFY ERROR]:', e);
  process.exit(1);
});
