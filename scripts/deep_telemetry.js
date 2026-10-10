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
    await send('Network.enable');

    // Add script on new document to spy on everything
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__events = [];
        const origPostMessage = window.postMessage;
        window.addEventListener('message', (e) => {
          window.__events.push({ type: 'PARENT_RECV_MSG', data: e.data });
        });
      `
    });

    await send('Page.navigate', { url: 'http://localhost:8081/maps' });
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
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      console.log('[BROWSER CONSOLE]:', text);
    }
  };

  await new Promise(r => setTimeout(r, 7000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      const win = iframe?.contentWindow;
      const m = win?.mapInstance;
      
      return {
        parentEvents: window.__events,
        iframeMap: m ? {
          center: m.getCenter(),
          zoom: m.getZoom(),
          loaded: m.loaded(),
          styleLoaded: m.isStyleLoaded(),
        } : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Telemetry:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
