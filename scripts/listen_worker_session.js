const http = require('http');

async function test() {
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:8081/maps', { method: 'PUT' });
  const target = await newTargetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  }

  let workerSessionId = null;

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
    if (data.method === 'Target.attachedToTarget' && data.params.targetInfo.type === 'worker') {
      workerSessionId = data.params.sessionId;
      console.log('[ATTACHED WORKER SESSION]:', workerSessionId);
      // Enable Runtime & Console on the worker session!
      await send('Runtime.enable', {}, workerSessionId);
      await send('Console.enable', {}, workerSessionId);
      await send('Network.enable', {}, workerSessionId);
      console.log('[WORKER SESSION CHANNELS ENABLED]');
    }
    if (data.sessionId === workerSessionId) {
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[WORKER CONSOLE]:', data.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
      } else if (data.method === 'Runtime.exceptionThrown') {
        console.error('[WORKER EXCEPTION]:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      } else if (data.method === 'Network.requestWillBeSent') {
        console.log('[WORKER REQUEST]:', data.params.request.url);
      } else if (data.method === 'Network.responseReceived') {
        console.log('[WORKER RESPONSE]:', data.params.response.status, data.params.response.url);
      } else if (data.method === 'Network.loadingFailed') {
        console.warn('[WORKER NET FAIL]:', data.params.errorText);
      }
    }
  };

  await new Promise(r => setTimeout(r, 8000));

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
