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

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'https://tiles.openfreemap.org' });
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
  };

  await new Promise(r => setTimeout(r, 4000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const div = document.createElement('div');
      div.style.width = '756px';
      div.style.height = '469px';
      document.body.appendChild(div);

      // Test with maxBounds
      const m1 = new maplibregl.Map({
        container: div,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [80.648, 16.5062],
        zoom: 14,
        maxBounds: [[-180, -85], [180, 85]]
      });

      // Test div with 0 width/height
      const zeroDiv = document.createElement('div');
      document.body.appendChild(zeroDiv);
      const m2 = new maplibregl.Map({
        container: zeroDiv,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [80.648, 16.5062],
        zoom: 14,
        maxBounds: [[-180, -85], [180, 85]]
      });

      return {
        m1Center: m1.getCenter(),
        m1Zoom: m1.getZoom(),
        m2Center: m2.getCenter(),
        m2Zoom: m2.getZoom(),
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
