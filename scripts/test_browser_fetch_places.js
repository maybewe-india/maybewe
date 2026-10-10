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

  const logs = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      logs.push(text);
      console.log('[BROWSER CONSOLE]:', text);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        console.log('Testing in-browser fetchNearbyPlaces...');
        const { fetchNearbyPlaces } = await import('./frontend/lib/places.js');
        const start = Date.now();
        const results = await fetchNearbyPlaces({ latitude: 16.5062, longitude: 80.6480, category: 'all', limit: 10 });
        const elapsed = Date.now() - start;
        return { count: results.length, elapsed, first: results[0] };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Browser fetch result:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
