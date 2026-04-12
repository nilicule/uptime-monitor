// src/page.js
export function getPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status page</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Color tokens (dark default) ── */
    :root {
      --bg:        #0f172a;
      --surface:   #1e293b;
      --border:    #1e293b;
      --text:      #f1f5f9;
      --muted:     #64748b;
      --muted2:    #475569;
      --muted3:    #334155;
      --ok:        #22c55e;
      --ok-bar:    #16a34a;
      --ok-glow:   rgba(34,197,94,.2);
      --ok-glow2:  rgba(34,197,94,.05);
      --down:      #ef4444;
      --down-bar:  #dc2626;
      --down-glow: rgba(239,68,68,.2);
      --partial:   #f59e0b;
      --tooltip-bg: #0f172a;
    }

    html.light {
      --bg:        #f8fafc;
      --surface:   #ffffff;
      --border:    #e2e8f0;
      --text:      #0f172a;
      --muted:     #64748b;
      --muted2:    #94a3b8;
      --muted3:    #cbd5e1;
      --ok:        #16a34a;
      --ok-bar:    #16a34a;
      --ok-glow:   rgba(22,163,74,.2);
      --ok-glow2:  rgba(22,163,74,.05);
      --down:      #dc2626;
      --down-bar:  #dc2626;
      --down-glow: rgba(220,38,38,.2);
      --partial:   #d97706;
      --tooltip-bg: #1e293b;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    header {
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
    }
    .header-inner {
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header h1 { font-size: 20px; font-weight: 700; }
    #meta { color: var(--muted); font-size: 13px; text-align: right; line-height: 1.6; }

    /* ── Theme toggle ── */
    #theme-toggle {
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--muted);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 6px 8px;
      margin-left: 16px;
      flex-shrink: 0;
      transition: color .15s, border-color .15s;
    }
    #theme-toggle:hover { color: var(--text); border-color: var(--muted2); }

    /* ── Main content ── */
    main { flex: 1; max-width: 860px; width: 100%; margin: 32px auto; padding: 0 24px; }

    /* ── Banner ── */
    #banner {
      background: var(--surface);
      border-radius: 10px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }
    .dot {
      width: 16px; height: 16px; border-radius: 50%;
      flex-shrink: 0;
    }
    .dot.green { background: var(--ok); box-shadow: 0 0 0 4px var(--ok-glow); animation: pulse 2s infinite; }
    .dot.red   { background: var(--down); box-shadow: 0 0 0 4px var(--down-glow); }
    .dot.grey  { background: var(--muted2); }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px var(--ok-glow); }
      50%       { box-shadow: 0 0 0 8px var(--ok-glow2); }
    }
    #banner-text { font-size: 18px; font-weight: 600; }
    #banner-text span { color: var(--ok); }
    #banner-text span.down { color: var(--down); }

    /* ── Services section ── */
    h2.section-title { font-size: 16px; font-weight: 600; color: var(--muted2); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px; }

    /* ── Monitor card ── */
    .monitor {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 20px;
      margin-bottom: 12px;
    }
    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .monitor-name { font-size: 14px; font-weight: 600; }
    .monitor-uptime { color: var(--muted); font-weight: 400; margin-left: 8px; }
    .monitor-status { font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .monitor-status .indicator { width: 8px; height: 8px; border-radius: 50%; }
    .monitor-status.ok   .indicator { background: var(--ok); }
    .monitor-status.down .indicator { background: var(--down); }
    .monitor-status.unknown .indicator { background: var(--muted2); }

    /* ── Timeline bars ── */
    .bars-wrap { width: 100%; overflow: hidden; }
    .bars {
      display: flex;
      gap: 1px;
      height: 28px;
      align-items: stretch;
    }
    .bar {
      flex: 1;
      border-radius: 1px;
      min-width: 0;
    }
    .bar.ok      { background: var(--ok-bar); }
    .bar.partial { background: var(--partial); }
    .bar.down    { background: var(--down-bar); }
    .bar.nodata  { background: var(--muted3); }
    .bars-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      color: var(--muted2);
      font-size: 10px;
    }

    /* ── Bar tooltip ── */
    #bar-tooltip {
      position: fixed;
      background: var(--tooltip-bg);
      border: 1px solid var(--muted3);
      border-radius: 8px;
      padding: 8px 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity .1s;
      z-index: 100;
      text-align: center;
      white-space: nowrap;
    }
    #bar-tooltip.visible { opacity: 1; }
    #bar-tooltip .tip-date { color: var(--muted); font-size: 11px; margin-bottom: 2px; }
    #bar-tooltip .tip-value { color: var(--text); font-size: 15px; font-weight: 600; }
    #bar-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--tooltip-bg);
    }

    /* ── Error / loading ── */
    #loading { color: var(--muted); text-align: center; padding: 48px 0; font-size: 15px; }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 24px;
      color: var(--muted2);
      font-size: 12px;
      border-top: 1px solid var(--border);
    }
    footer a { color: var(--muted2); text-decoration: none; }
    footer a:hover { color: var(--muted2); }
    footer:hover .heart { color: var(--down); }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <h1>Status page</h1>
      <div style="display:flex;align-items:center;gap:8px">
        <div id="meta">
          <div id="last-updated">Loading…</div>
          <div id="next-update"></div>
        </div>
        <button id="theme-toggle" aria-label="Toggle theme" title="Toggle light/dark mode">🌙</button>
      </div>
    </div>
  </header>

  <main>
    <div id="banner" style="display:none">
      <div class="dot grey" id="banner-dot"></div>
      <div id="banner-text"></div>
    </div>

    <div id="loading">Loading status…</div>
    <div id="monitors" style="display:none">
      <h2 class="section-title">Services</h2>
      <div id="monitor-list"></div>
    </div>
  </main>

  <div id="bar-tooltip">
    <div class="tip-date" id="tip-date"></div>
    <div class="tip-value" id="tip-value"></div>
  </div>

  <footer>
    built with <span class="heart">♥</span> · <a href="https://github.com/nilicule/uptime-monitor" target="_blank" rel="noopener">source on GitHub</a>
  </footer>

  <script>
    const REFRESH_MS = 5 * 60 * 1000;

    let nextRefreshAt = null;

    // ── Theme toggle ──────────────────────────────────────────────────────
    const THEME_KEY = 'uptime-theme';
    const toggleBtn = document.getElementById('theme-toggle');

    function applyTheme(theme) {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        toggleBtn.textContent = '☀️';
        toggleBtn.title = 'Switch to dark mode';
      } else {
        document.documentElement.classList.remove('light');
        toggleBtn.textContent = '🌙';
        toggleBtn.title = 'Switch to light mode';
      }
    }

    // Initialise from stored preference, fall back to OS preference
    (function initTheme() {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) {
        applyTheme(stored);
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
      }
    })();

    toggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.classList.contains('light');
      const next = isLight ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });

    // ── HTML escaping helper ──────────────────────────────────────────────
    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ── Build 90 daily bars from hourly bars array ────────────────────────
    // Groups hourly buckets by UTC day. Always returns exactly 90 entries
    // (oldest → newest), with null for days that have no data yet.
    function buildDailySlots(barsArray) {
      // Aggregate hourly bars into daily buckets keyed by "YYYY-MM-DD"
      const byDay = {};
      for (const b of barsArray) {
        const day = b.hour.slice(0, 10); // "YYYY-MM-DD"
        if (!byDay[day]) byDay[day] = { ok: 0, total: 0 };
        byDay[day].ok += b.ok;
        byDay[day].total += b.total;
      }

      // Generate the last 90 calendar days (UTC), oldest first
      const now = Date.now();
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);

      const slots = [];
      for (let i = 89; i >= 0; i--) {
        const dayTime = new Date(todayStart.getTime() - i * 24 * 3600 * 1000);
        const key = dayTime.toISOString().slice(0, 10);
        slots.push(byDay[key] || null);
      }
      return slots; // 90 entries, oldest → newest
    }

    // ── Bar class from aggregated day data ────────────────────────────────
    function barClass(slot) {
      if (!slot || slot.total === 0) return 'nodata';
      if (slot.ok === slot.total) return 'ok';
      if (slot.ok === 0) return 'down';
      return 'partial';
    }

    // ── Render ────────────────────────────────────────────────────────────
    function render(snapshot) {
      const allOk = snapshot.monitors.every(m => m.latest && m.latest.ok);
      const anyDown = snapshot.monitors.some(m => m.latest && !m.latest.ok);
      const anyData = snapshot.monitors.some(m => m.latest);

      // Banner
      const banner = document.getElementById('banner');
      const dot = document.getElementById('banner-dot');
      const bannerText = document.getElementById('banner-text');
      banner.style.display = 'flex';
      dot.className = 'dot ' + (allOk ? 'green' : anyDown ? 'red' : 'grey');
      if (!anyData) {
        bannerText.innerHTML = 'No data yet';
      } else if (allOk) {
        bannerText.innerHTML = 'All systems <span>Operational</span>';
      } else {
        const downCount = snapshot.monitors.filter(m => m.latest && !m.latest.ok).length;
        bannerText.innerHTML = \`<span class="down">\${downCount} service\${downCount !== 1 ? 's' : ''} down</span>\`;
      }

      // Monitor list
      const list = document.getElementById('monitor-list');
      list.innerHTML = '';
      for (const monitor of snapshot.monitors) {
        const slots = buildDailySlots(monitor.bars);
        const uptime = monitor.uptime90d != null ? monitor.uptime90d.toFixed(2) + '%' : '—';
        const isOk = monitor.latest?.ok;
        const statusClass = monitor.latest == null ? 'unknown' : isOk ? 'ok' : 'down';
        const statusLabel = monitor.latest == null ? 'No data' : isOk ? 'Operational' : 'Down';

        const card = document.createElement('div');
        card.className = 'monitor';
        card.innerHTML = \`
          <div class="monitor-header">
            <div class="monitor-name">
              \${escHtml(monitor.name)}
              <span class="monitor-uptime">· \${escHtml(uptime)}</span>
            </div>
            <div class="monitor-status \${escHtml(statusClass)}">
              <div class="indicator"></div>
              \${escHtml(statusLabel)}
            </div>
          </div>
          <div class="bars-wrap">
            <div class="bars" id="bars-\${escHtml(monitor.id)}"></div>
            <div class="bars-labels">
              <span>90 days ago</span>
              <span>now</span>
            </div>
          </div>
        \`;
        list.appendChild(card);

        const barsEl = card.querySelector('.bars');
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        slots.forEach((slot, i) => {
          const bar = document.createElement('div');
          bar.className = 'bar ' + barClass(slot);

          const dayOffset = 89 - i; // 0 = today, 89 = 89 days ago
          const dayDate = new Date(today.getTime() - dayOffset * 24 * 3600 * 1000);
          const dateStr = dayDate.toISOString().slice(0, 10);
          const valueStr = !slot || slot.total === 0
            ? 'No data'
            : (slot.ok / slot.total * 100).toFixed(2) + '%';

          bar.addEventListener('mouseenter', (e) => {
            document.getElementById('tip-date').textContent = dateStr;
            document.getElementById('tip-value').textContent = valueStr;
            positionTooltip(e);
            document.getElementById('bar-tooltip').classList.add('visible');
          });
          bar.addEventListener('mousemove', positionTooltip);
          bar.addEventListener('mouseleave', () => {
            document.getElementById('bar-tooltip').classList.remove('visible');
          });

          barsEl.appendChild(bar);
        });
      }

      document.getElementById('loading').style.display = 'none';
      document.getElementById('monitors').style.display = 'block';

      // Meta
      const genAt = new Date(snapshot.generatedAt * 1000);
      document.getElementById('last-updated').textContent =
        'Last updated ' + genAt.toLocaleTimeString();
      nextRefreshAt = Date.now() + REFRESH_MS;

      // Favicon
      const allDown = snapshot.monitors.every(m => m.latest && !m.latest.ok);
      const faviconColor = allOk ? '#22c55e' : allDown ? '#ef4444' : '#f59e0b';
      setFavicon(faviconColor);
    }

    // ── Favicon ───────────────────────────────────────────────────────────
    function setFavicon(color) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = canvas.toDataURL();
    }

    // ── Tooltip positioning ───────────────────────────────────────────────
    function positionTooltip(e) {
      const tt = document.getElementById('bar-tooltip');
      const rect = tt.getBoundingClientRect();
      const x = Math.min(e.clientX - rect.width / 2, window.innerWidth - rect.width - 8);
      const y = e.clientY - rect.height - 14;
      tt.style.left = Math.max(8, x) + 'px';
      tt.style.top = y + 'px';
    }

    // ── Countdown tick ────────────────────────────────────────────────────
    function tick() {
      if (!nextRefreshAt) return;
      const remaining = Math.max(0, nextRefreshAt - Date.now());
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      document.getElementById('next-update').textContent =
        'Next update in ' + (m > 0 ? m + 'm ' : '') + s + 's';
    }

    // ── Fetch & refresh ───────────────────────────────────────────────────
    async function refresh() {
      try {
        const res = await fetch('/api/snapshot');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const snapshot = await res.json();
        render(snapshot);
      } catch (err) {
        document.getElementById('loading').textContent =
          'Unable to load status data. Retrying in 5 minutes.';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('monitors').style.display = 'none';
        document.getElementById('banner').style.display = 'none';
        nextRefreshAt = Date.now() + REFRESH_MS;
        console.error('Snapshot fetch failed:', err);
      }
    }

    // ── Boot ──────────────────────────────────────────────────────────────
    refresh();
    setInterval(refresh, REFRESH_MS);
    setInterval(tick, 1000);
  </script>
</body>
</html>`;
}
