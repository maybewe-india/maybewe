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

  const logs = [];
  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');

    const frameHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          window.addEventListener('message', (e) => {
            console.log('IFRAME_RECEIVED:', e.data);
            window.parent.postMessage('ECHO_' + e.data, '*');
          });
          window.parent.postMessage('IFRAME_READY', '*');
        </script>
      </body>
      </html>
    `;

    const hostHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <iframe id="f" src="data:text/html;charset=utf-8,${encodeURIComponent(frameHtml)}"></iframe>
        <script>
          window.__parentLogs = [];
          window.addEventListener('message', (e) => {
            window.__parentLogs.push(e.data);
            if (e.data === 'IFRAME_READY') {
              document.getElementById('f').contentWindow.postMessage('HELLO_FROM_PARENT', '*');
            }
          });
        </script>
      </body>
      </html>
    `;
    await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(hostHtml) });
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]:', data.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
    }
  };

  await new Promise(r => setTimeout(r, 4000));

  const check = await send('Runtime.evaluate', {
    expression: 'window.__parentLogs',
    returnByValue: true
  });
  console.log('Parent received logs:', JSON.stringify(check.result?.value));

  await send('Page.close');
  ws.close();
  process.exit(0);
}

test();
