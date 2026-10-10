const http = require('http');

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

    const frameHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js"></script>
        <style>html, body, #map { width: 100vw; height: 100vh; margin: 0; padding: 0; }</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const m = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [80.648, 16.5062],
            zoom: 13
          });
          m.on('load', () => console.log('DATA_URI_IFRAME_MAP_LOADED'));
          m.on('error', (e) => console.log('DATA_URI_IFRAME_MAP_ERROR', e));
        </script>
      </body>
      </html>
    `;

    const hostHtml = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0">
        <iframe id="testFrame" src="data:text/html;charset=utf-8,${encodeURIComponent(frameHtml)}" style="width:100vw; height:100vh; border:none"></iframe>
      </body>
      </html>
    `;
    await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(hostHtml) });
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]:', data.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
    }
    if (data.method === 'Network.requestWillBeSent') {
      const url = data.params.request.url;
      if (url.includes('.pbf') || url.includes('styles/liberty') || url.includes('planet')) {
        pbfRequests.push(url);
      }
    }
  };

  await new Promise(r => setTimeout(r, 6000));
  console.log('PBF/Tiles in data URI iframe test:', pbfRequests.length);
  pbfRequests.forEach(u => console.log(' ->', u));

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
