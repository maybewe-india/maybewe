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
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      if (text.includes('[TRACE]') || text.includes('MapLibre') || text.includes('places')) {
        console.log('[LOG]:', text);
      }
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframe = document.querySelector('iframe');
      if (!iframe) return 'no iframe';
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument || win.document;
      
      // Check HTML source of script in iframe
      const scripts = Array.from(doc.querySelectorAll('script')).map(s => s.textContent);
      const mainScript = scripts.find(s => s.includes('const USER_LAT =')) || '';
      const userLatMatch = mainScript.match(/const USER_LAT = ([^;]+);/);
      const userLngMatch = mainScript.match(/const USER_LNG = ([^;]+);/);
      const placesMatch = mainScript.match(/let places = (\[.*?\]);/s);

      return {
        userLatStr: userLatMatch ? userLatMatch[1] : null,
        userLngStr: userLngMatch ? userLngMatch[1] : null,
        placesCount: win.places ? win.places.length : 'no win.places',
        placesSnippet: placesMatch ? placesMatch[1].slice(0, 200) : null,
      };
    })()`,
    returnByValue: true
  });

  console.log('Script values:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
