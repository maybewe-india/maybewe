const http = require('http');
const fs = require('fs');

async function test() {
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
  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
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
      if (url.includes('.pbf') || url.includes('tiles') || url.includes('tile')) {
        pbfRequests.push(url);
      }
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // In the iframe, let's remove maxBounds and set center to [80.648, 16.5062], zoom 14!
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      if (!m) return 'no map';

      m.setMaxBounds(null);
      m.jumpTo({ center: [80.648, 16.5062], zoom: 14 });
      m.resize();

      return {
        centerAfter: m.getCenter(),
        zoomAfter: m.getZoom(),
      };
    })()`,
    returnByValue: true
  });

  console.log('Result after jumpTo:', JSON.stringify(res.result?.value, null, 2));

  // Wait 4 seconds for tiles to stream
  await new Promise(r => setTimeout(r, 4000));

  console.log('PBF/Tile requests made:', pbfRequests.length);
  pbfRequests.forEach(url => console.log(' ->', url));

  // Capture screenshot of page
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/test_tile_load_result.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
