const http = require('http');

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

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      const win = iframe.contentWindow;
      
      const create = (opts) => {
        const d = win.document.createElement('div');
        d.style.width = '756px';
        d.style.height = '469px';
        win.document.body.appendChild(d);
        const m = new win.maplibregl.Map({
          container: d,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [80.648, 16.5062],
          zoom: 14,
          ...opts
        });
        return { center: m.getCenter(), zoom: m.getZoom() };
      };

      return {
        withMaxBounds: create({ maxBounds: [[-180, -85], [180, 85]] }),
        withoutMaxBounds: create({}),
        boundsArray: create({ maxBounds: [-180, -85, 180, 85] }),
      };
    })()`,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
