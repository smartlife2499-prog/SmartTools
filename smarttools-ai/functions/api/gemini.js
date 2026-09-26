/**
 * Cloudflare Pages Function – /api/gemini
 * Proxies requests to Google Gemini so the API key stays secret.
 *
 * Set the secret in Cloudflare Dashboard:
 *   Settings → Environment variables → Add
 *   Name: GEMINI_API_KEY
 *   Value: your key from aistudio.google.com/apikey
 *   (Encrypt / Secret)
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS for same-origin is fine; allow simple preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server misconfigured: GEMINI_API_KEY not set' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { prompt, system } = body;
  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'Missing "prompt" string' }, 400);
  }

  // Soft length guard (free tier)
  if (prompt.length > 60000) {
    return json({ error: 'Prompt too long' }, 400);
  }

  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };
  if (system && typeof system === 'string') {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || res.statusText || 'Gemini error';
      const status = res.status === 429 ? 429 : 502;
      return json({ error: msg }, status);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return json({ error: 'Empty response from model' }, 502);
    }

    return json({ text: text.trim() });
  } catch (err) {
    return json({ error: 'Upstream request failed: ' + (err.message || 'unknown') }, 502);
  }
}

// Also handle GET for a simple health check
export async function onRequestGet() {
  return json({ ok: true, service: 'SmartTools Gemini proxy' });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
