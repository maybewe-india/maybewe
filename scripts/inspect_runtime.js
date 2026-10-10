const http = require('http');
const fs = require('fs');

async function main() {
  console.log('[CDP] Creating new browser target for http://localhost:8081/maps ...');
  
  // 1. Create target
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:8081/maps', { method: 'PUT' });
  const target = await newTargetRes.json();
  console.log('[CDP] Target created:', target.id, target.webSocketDebuggerUrl);

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const consoleLogs = [];
  const networkFailures = [];
  const networkRequests = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onopen = async () => {
    console.log('[CDP] WebSocket connected to page');
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Console.enable');
    console.log('[CDP] Subscribed to Runtime, Page, Network, Console');
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
      consoleLogs.push({ type: data.params.type, text });
      console.log(`[BROWSER CONSOLE ${data.params.type.toUpperCase()}]:`, text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
      console.error('[BROWSER UNCAUGHT EXCEPTION]:', desc);
      consoleLogs.push({ type: 'error', text: desc });
    } else if (data.method === 'Network.requestWillBeSent') {
      networkRequests.set(data.params.requestId, data.params.request.url);
    } else if (data.method === 'Network.responseReceived') {
      const status = data.params.response.status;
      const url = data.params.response.url;
      if (status >= 400) {
        console.warn(`[BROWSER HTTP ${status}]:`, url);
        networkFailures.push({ status, url });
      }
    } else if (data.method === 'Network.loadingFailed') {
      const url = networkRequests.get(data.params.requestId);
      console.warn(`[BROWSER NETWORK FAILED (${data.params.errorText})]:`, url);
      networkFailures.push({ error: data.params.errorText, url });
    }
  };

  // Wait 8 seconds for React / Metro bundle hydration and map iframe load
  await new Promise(r => setTimeout(r, 8000));

  console.log('[CDP] Evaluating live DOM state...');
  
  // Evaluate DOM state on the host page
  const domEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const iframeInfo = iframes.map(f => {
        const rect = f.getBoundingClientRect();
        let internalMap = null;
        let internalCanvas = null;
        try {
          const doc = f.contentDocument || f.contentWindow?.document;
          if (doc) {
            const mapEl = doc.getElementById('map');
            const mapRect = mapEl ? mapEl.getBoundingClientRect() : null;
            const canvasEl = doc.querySelector('canvas');
            const canvasRect = canvasEl ? canvasEl.getBoundingClientRect() : null;
            internalMap = mapRect ? { w: mapRect.width, h: mapRect.height } : null;
            internalCanvas = canvasRect ? { w: canvasRect.width, h: canvasRect.height } : null;
          }
        } catch (e) {
          internalMap = { error: e.message };
        }
        return {
          title: f.title,
          src: f.src,
          hasSrcDoc: !!f.srcdoc,
          width: rect.width,
          height: rect.height,
          internalMap,
          internalCanvas
        };
      });

      const rootRect = document.getElementById('root')?.getBoundingClientRect();
      const images = Array.from(document.querySelectorAll('img')).map(i => ({
        src: i.src,
        alt: i.alt,
        width: i.width,
        height: i.height,
        naturalWidth: i.naturalWidth,
        naturalHeight: i.naturalHeight
      }));

      const errorToast = document.querySelector('.ACiIqa_toast, #error-toast, [data-expo-css-hmr]')?.innerText || null;

      return {
        url: window.location.href,
        title: document.title,
        rootDimensions: rootRect ? { w: rootRect.width, h: rootRect.height } : null,
        iframesCount: iframes.length,
        iframeInfo,
        imagesCount: images.length,
        images: images.slice(0, 10),
        errorToast
      };
    })()`,
    returnByValue: true
  });

  console.log('[CDP] DOM State Result:', JSON.stringify(domEval.result?.value, null, 2));

  // Take full screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/live_maps_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('[CDP] Screenshot saved to', screenshotPath);

  // Close target and exit
  await send('Page.close');
  ws.close();
  process.exit(0);
}

main().catch(err => {
  console.error('[CDP Error]:', err);
  process.exit(1);
});
