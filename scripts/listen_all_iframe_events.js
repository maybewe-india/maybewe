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
    await send('Page.navigate', { url: 'http://localhost:8081/maps' });
  };

  const logs = [];
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
      console.log(`[CONSOLE ${data.params.type}]:`, text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('[UNCAUGHT EXCEPTION]:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Hook iframe window error handlers and map events
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe) return 'no iframe';
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      
      const caught = [];
      win.addEventListener('error', e => caught.push({ type: 'window.error', msg: e.message }));
      win.addEventListener('unhandledrejection', e => caught.push({ type: 'unhandledrejection', reason: e.reason?.message || String(e.reason) }));
      
      if (m) {
        m.on('error', e => caught.push({ type: 'map.error', error: e.error?.message || String(e.error) }));
        m.on('data', e => {
          if (e.dataType === 'source' || e.dataType === 'tile') {
            caught.push({ type: 'map.data', dataType: e.dataType, isSourceLoaded: e.isSourceLoaded });
          }
        });
      }

      // Check current worker count or state
      return {
        caughtBefore: caught,
        mapLoaded: m ? m.loaded() : false,
        styleLoaded: m ? m.isStyleLoaded() : false,
      };
    })()`,
    returnByValue: true
  });

  console.log('Result before wait:', JSON.stringify(res.result?.value, null, 2));

  await new Promise(r => setTimeout(r, 4000));

  const after = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      const win = iframe.contentWindow;
      const m = win.mapInstance;
      return {
        mapLoaded: m ? m.loaded() : false,
        styleLoaded: m ? m.isStyleLoaded() : false,
        areTilesLoading: m ? m.areTilesLoaded() : false,
      };
    })()`,
    returnByValue: true
  });

  console.log('Result after wait:', JSON.stringify(after.result?.value, null, 2));

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
