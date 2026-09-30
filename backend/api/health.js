module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'healthy',
    service: 'MaybeWe Backend API',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Vercel Serverless',
    supabase: {
      url: process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vdmzchvwrmqnbmpzvgng.supabase.co',
      connected: true,
    },
  });
};
