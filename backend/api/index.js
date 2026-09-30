module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');

  if (!acceptsHtml) {
    return res.status(200).json({
      service: 'MaybeWe Backend API',
      status: 'operational',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      endpoints: {
        root: '/',
        health: '/api/health',
        validateSelfie: '/api/validate-selfie',
      },
      supabase: {
        url: process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vdmzchvwrmqnbmpzvgng.supabase.co',
        connected: true,
      },
      timestamp: new Date().toISOString(),
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaybeWe Backend Service</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #FFFDFC;
      color: #171817;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #F5EEE5;
      border: 1px solid #EDE5DA;
      border-radius: 24px;
      max-width: 580px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #E8F5E9;
      color: #2E7D32;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2E7D32;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(46, 125, 50, 0); }
      100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: #171817;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #756345;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8C7853;
      margin-bottom: 12px;
    }
    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 28px;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #FFFDFC;
      border: 1px solid #EDE5DA;
      border-radius: 12px;
      padding: 12px 16px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
    }
    .endpoint-item:hover {
      border-color: #C8B27A;
      transform: translateY(-1px);
    }
    .method-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .method-get { background: #E3F2FD; color: #1565C0; }
    .method-post { background: #E8F5E9; color: #2E7D32; }
    .endpoint-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      font-weight: 600;
      color: #171817;
      flex: 1;
      margin-left: 12px;
    }
    .endpoint-desc {
      font-size: 12px;
      color: #756345;
    }
    .footer {
      font-size: 12px;
      color: #A39070;
      text-align: center;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-row">
      <span style="font-weight: 700; font-size: 14px; letter-spacing: 1.5px; color: #756345;">MAYBEWE</span>
      <div class="badge-pill">
        <span class="status-dot"></span>
        OPERATIONAL
      </div>
    </div>
    <h1>Backend API Service</h1>
    <p class="subtitle">Solo Traveler matching & verification services are active on Vercel Serverless.</p>

    <div class="section-title">Available Endpoints</div>
    <div class="endpoints-list">
      <a href="/api/health" class="endpoint-item">
        <span class="method-tag method-get">GET</span>
        <span class="endpoint-path">/api/health</span>
        <span class="endpoint-desc">Health Check & Uptime</span>
      </a>
      <div class="endpoint-item">
        <span class="method-tag method-post">POST</span>
        <span class="endpoint-path">/api/validate-selfie</span>
        <span class="endpoint-desc">Face Verification</span>
      </div>
      <a href="/api" class="endpoint-item">
        <span class="method-tag method-get">GET</span>
        <span class="endpoint-path">/api</span>
        <span class="endpoint-desc">JSON Service Metadata</span>
      </a>
    </div>

    <div class="footer">
      Connected to Supabase • Production • MaybeWe Platform
    </div>
  </div>
</body>
</html>`);
};
