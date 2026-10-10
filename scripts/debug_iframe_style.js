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
    await send('Console.enable');
  };

  const iframeErrors = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe) return 'no iframe';
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      if (!m) return 'no map';

      return {
        styleLoaded: m.isStyleLoaded(),
        loaded: m.loaded(),
        style: m.getStyle() ? {
          name: m.getStyle().name,
          sources: Object.keys(m.getStyle().sources || {}),
          layersLength: (m.getStyle().layers || []).length
        } : 'null',
        styleUrl: win.initialStyle || 'unknown',
        containerRect: m.getContainer().getBoundingClientRect(),
        canvasRect: m.getCanvas().getBoundingClientRect(),
        painterGL: !!m.painter?.gl,
        glContextLost: m.painter?.gl?.isContextLost ? m.painter.gl.isContextLost() : 'no isContextLost',
        transform: {
          width: m.transform.width,
          height: m.transform.height,
          zoom: m.transform.zoom,
          center: m.transform.center
        }
      };
    })()`,
    returnByValue: true
  });

  console.log('Iframe debug:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
