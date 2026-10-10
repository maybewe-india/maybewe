const http = require('http');
const fs = require('fs');

async function test() {
  const newTargetRes = await fetch('http://localhost:9222/json/new?about:blank', { method: 'PUT' });
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

    // Create a standalone HTML page with maplibre
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js"></script>
        <style>
          html, body, #map { width: 100vw; height: 100vh; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          window.m = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [80.648, 16.5062],
            zoom: 13
          });
          window.m.on('load', () => { console.log('MAP_LOADED_OK'); });
          window.m.on('error', (e) => { console.error('MAP_ERROR', e); });
        </script>
      </body>
      </html>
    `;
    await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
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
      console.log('[STANDALONE CONSOLE]:', data.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
    }
    if (data.method === 'Network.requestWillBeSent') {
      const url = data.params.request.url;
      if (url.includes('.pbf')) {
        pbfRequests.push(url);
      }
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  console.log('Total PBF tile requests:', pbfRequests.length);
  pbfRequests.slice(0, 10).forEach(u => console.log(' ->', u));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/standalone_map_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
