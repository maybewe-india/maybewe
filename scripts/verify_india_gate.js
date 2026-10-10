const http = require('http');
const fs = require('fs');

async function testIndiaGate() {
  console.log('[INDIA-GATE-TEST] Starting India Gate verification...');
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
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
    }
  };

  await new Promise(r => setTimeout(r, 6000));

  // Search "India Gate"
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'India Gate');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 3000));

  // Extract all rendered img elements
  const imgElements = await send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        rendered: img.naturalWidth > 0
      }));
      return imgs;
    })()`,
    returnByValue: true
  });

  console.log('\n=== RENDERED DOM IMG ELEMENTS FOR INDIA GATE ===');
  console.log(JSON.stringify(imgElements.result?.value, null, 2));

  // Take screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/search_india_gate_render.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved search screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

testIndiaGate().catch(e => {
  console.error('[INDIA GATE ERROR]:', e);
  process.exit(1);
});
