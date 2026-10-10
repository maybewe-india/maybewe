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
      const doc = iframe.contentDocument || win.document;
      
      const c = doc.querySelector('canvas') || doc.createElement('canvas');
      let gl1 = null, gl2 = null, gl1Err = null, gl2Err = null;
      try {
        gl1 = c.getContext('webgl');
      } catch (e) {
        gl1Err = e.message;
      }
      try {
        gl2 = c.getContext('webgl2');
      } catch (e) {
        gl2Err = e.message;
      }

      // Also test on host document
      const hostC = document.createElement('canvas');
      let hostGl1 = null, hostGl2 = null;
      try { hostGl1 = !!hostC.getContext('webgl'); } catch (e) {}
      try { hostGl2 = !!hostC.getContext('webgl2'); } catch (e) {}

      return {
        iframeGL1: !!gl1,
        iframeGL1Err: gl1Err,
        iframeGL2: !!gl2,
        iframeGL2Err: gl2Err,
        hostGL1: hostGl1,
        hostGL2: hostGl2,
      };
    })()`,
    returnByValue: true
  });

  console.log('GL test:', JSON.stringify(res.result?.value, null, 2));
  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
