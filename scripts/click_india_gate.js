const http = require('http');
const fs = require('fs');

async function testClickIndiaGate() {
  console.log('[INDIA-GATE-CLICK] Clicking India Gate in autocomplete dropdown...');
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

  // Type "Gate" to show dropdown
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, 'Gate');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`
  });

  await new Promise(r => setTimeout(r, 2000));

  // Find the India Gate item in the dropdown and click it!
  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find all clickable elements with "India Gate"
      const allDivs = Array.from(document.querySelectorAll('div, span'));
      const indiaGateEl = allDivs.find(el => el.textContent.trim() === 'India Gate');
      if (indiaGateEl) {
        indiaGateEl.click();
        return 'Clicked India Gate element';
      }
      return 'India Gate element not found';
    })()`,
    returnByValue: true
  });

  console.log('Click result:', clickRes.result?.value);
  await new Promise(r => setTimeout(r, 3000));

  // Extract all img elements now
  const imgElements = await send('Runtime.evaluate', {
    expression: `(() => {
      const cardTitle = document.querySelector('[style*="font-size: 18"], [style*="fontSize: 18"]')?.textContent;
      const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        rendered: img.naturalWidth > 0
      }));
      return { cardTitle, imgs };
    })()`,
    returnByValue: true
  });

  console.log('Result after selecting India Gate:', JSON.stringify(imgElements.result?.value, null, 2));

  // Screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(screenshot.data, 'base64');
  const screenshotPath = '/Users/saivinay/.gemini/antigravity-ide/brain/72bbc2d1-c12c-4eb3-8325-a03f06a1c7b1/selected_india_gate.png';
  fs.writeFileSync(screenshotPath, buffer);
  console.log('Saved screenshot to:', screenshotPath);

  await send('Page.close');
  ws.close();
  process.exit(0);
}

testClickIndiaGate().catch(e => {
  console.error('[CLICK ERROR]:', e);
  process.exit(1);
});
