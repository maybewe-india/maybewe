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
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  };

  const attachedSessions = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
    if (data.method === 'Target.attachedToTarget') {
      console.log('[ATTACHED TO TARGET]:', data.params.targetInfo.type, data.params.targetInfo.url);
      attachedSessions.push(data.params);
    }
    if (data.params?.message) {
      console.log('[TARGET MSG]:', data.params.message);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Query all targets on browser
  const allTargetsRes = await fetch('http://localhost:9222/json');
  const allTargets = await allTargetsRes.json();
  console.log('All Targets in Chrome:', allTargets.map(t => ({ type: t.type, title: t.title, url: t.url })));

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
