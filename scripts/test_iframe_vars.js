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
      if (!iframe) return 'no iframe';
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      return {
        USER_LAT: win.USER_LAT,
        USER_LNG: win.USER_LNG,
        initialStyle: win.initialStyle,
        mapCenter: m ? m.getCenter() : null,
        mapZoom: m ? m.getZoom() : null,
        mapPitch: m ? m.getPitch() : null,
        mapBearing: m ? m.getBearing() : null,
        mapCanvas: m ? !!m.getCanvas() : false,
        mapLoaded: m ? m.loaded() : false,
        styleLoaded: m ? m.isStyleLoaded() : false,
        sources: m && m.getStyle() ? Object.keys(m.getStyle().sources || {}) : null,
        layersCount: m && m.getStyle() ? (m.getStyle().layers || []).length : 0,
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
