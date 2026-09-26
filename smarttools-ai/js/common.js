// SmartTools AI - Common utilities, localStorage & Gemini proxy helper

const STORAGE_PREFIX = 'smarttools_';
const DAILY_LIMIT = 50;

// ─── Theme ───────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(STORAGE_PREFIX + 'theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_PREFIX + 'theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─── Gemini via Cloudflare Pages Function (key stays on server) ──────────────
/**
 * Call the /api/gemini proxy.
 * @param {string} userPrompt
 * @param {string} [systemInstruction]
 * @returns {Promise<string>} generated text
 */
async function callGemini(userPrompt, systemInstruction = '') {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: userPrompt,
      system: systemInstruction || undefined
    })
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from AI service');
  }

  if (!res.ok) {
    const msg = data?.error || res.statusText || 'AI service error';
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (res.status === 500 && /GEMINI_API_KEY/i.test(msg)) throw new Error('SERVER_NO_KEY');
    throw new Error(msg);
  }

  if (!data.text) throw new Error('Empty response from model');
  return data.text.trim();
}

// ─── Daily usage tracking (client-side soft limit) ───────────────────────────
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(toolId) {
  const key = STORAGE_PREFIX + 'usage_' + toolId + '_' + getTodayKey();
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementUsage(toolId) {
  const key = STORAGE_PREFIX + 'usage_' + toolId + '_' + getTodayKey();
  const current = getUsage(toolId);
  localStorage.setItem(key, String(current + 1));
  return current + 1;
}

function canUse(toolId) {
  return getUsage(toolId) < DAILY_LIMIT;
}

function showUsageNotice(toolId, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const used = getUsage(toolId);
  el.innerHTML = `
    <div class="usage-notice">
      📊 Today's free uses: <strong>${used}/${DAILY_LIMIT}</strong>
      ${used >= DAILY_LIMIT ? ' — Limit reached. Resets at midnight.' : ''}
      · <span style="color:var(--success)">AI ready</span>
    </div>
  `;
}

// ─── History helpers ─────────────────────────────────────────────────────────
function getHistory(toolId, max = 20) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'history_' + toolId);
    return raw ? JSON.parse(raw).slice(0, max) : [];
  } catch {
    return [];
  }
}

function addToHistory(toolId, item) {
  const history = getHistory(toolId);
  history.unshift({
    ...item,
    id: Date.now(),
    ts: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_PREFIX + 'history_' + toolId, JSON.stringify(history.slice(0, 50)));
}

function clearHistory(toolId) {
  localStorage.removeItem(STORAGE_PREFIX + 'history_' + toolId);
}

function renderHistory(toolId, containerId, renderFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = getHistory(toolId);
  if (items.length === 0) {
    container.innerHTML = '<p class="text-muted text-sm">No history yet. Your work stays private in this browser.</p>';
    return;
  }
  container.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <strong>Recent (local only)</strong>
      <button class="btn btn-secondary" style="padding:0.3rem 0.7rem;font-size:0.8rem" onclick="SmartTools.clearHistory('${toolId}'); SmartTools.renderHistory('${toolId}','${containerId}')">Clear</button>
    </div>
    <ul class="history-list">
      ${items.map(item => `
        <li class="history-item">
          <div>${renderFn ? renderFn(item) : (item.preview || item.text || JSON.stringify(item).slice(0,80))}</div>
          <button onclick="SmartTools.removeHistoryItem('${toolId}', ${item.id}, '${containerId}')" title="Remove">✕</button>
        </li>
      `).join('')}
    </ul>
  `;
}

function removeHistoryItem(toolId, id, containerId) {
  let history = getHistory(toolId, 100);
  history = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_PREFIX + 'history_' + toolId, JSON.stringify(history));
  document.dispatchEvent(new CustomEvent('history-updated', { detail: { toolId } }));
}

// ─── Utils ───────────────────────────────────────────────────────────────────
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

function setLoading(btn, loading, label = 'Working…') {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + label;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
  }
}

// Friendly error messages for the proxy
function friendlyAIError(err) {
  const msg = err.message || String(err);
  if (msg === 'RATE_LIMIT') return 'AI is busy right now (rate limit). Please wait a minute and try again.';
  if (msg === 'SERVER_NO_KEY') return 'AI is not configured yet. The site owner needs to add the Gemini key in Cloudflare.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Could not reach the AI service. If you are testing locally, deploy to Cloudflare Pages so /api/gemini works.';
  }
  return msg;
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});

// Expose globally
window.SmartTools = {
  getUsage, incrementUsage, canUse, showUsageNotice,
  getHistory, addToHistory, clearHistory, renderHistory, removeHistoryItem,
  copyText, downloadBlob, downloadText, toggleTheme,
  callGemini, setLoading, friendlyAIError
};
