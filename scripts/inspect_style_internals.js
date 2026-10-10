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
      if (!m) return 'no map';

      const s = m.style;
      if (!s) return 'no style';

      const sourceStates = {};
      for (const id in s.sourceCaches) {
        const sc = s.sourceCaches[id];
        sourceStates[id] = {
          loaded: sc.loaded(),
          used: sc.used,
          status: sc._source?.status,
        };
      }

      return {
        styleLoaded: s.loaded(),
        isStyleLoaded: m.isStyleLoaded(),
        spriteLoaded: s.sprite ? s.sprite.loaded() : 'no sprite',
        glyphManager: !!s.glyphManager,
        sourceCaches: sourceStates,
        loadingOverlayVisible: !win.document.getElementById('loadingOverlay')?.classList.contains('hidden'),
        errorBannerVisible: win.document.getElementById('errorBanner')?.style.display === 'block',
      };
    })()`,
    returnByValue: true
  });

  console.log('Style Internals:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
