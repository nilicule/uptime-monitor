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

    body {
      background: #0f172a;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
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
    #meta { color: #64748b; font-size: 13px; text-align: right; line-height: 1.6; }

    /* ── Main content ── */
    main { flex: 1; max-width: 860px; width: 100%; margin: 32px auto; padding: 0 24px; }

    /* ── Banner ── */
    #banner {
      background: #1e293b;
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
    .dot.green { background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.2); animation: pulse 2s infinite; }
    .dot.red   { background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,.2); }
    .dot.grey  { background: #475569; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,.2); }
      50%       { box-shadow: 0 0 0 8px rgba(34,197,94,.05); }
    }
    #banner-text { font-size: 18px; font-weight: 600; }
    #banner-text span { color: #22c55e; }
    #banner-text span.down { color: #ef4444; }

    /* ── Services section ── */
    h2.section-title { font-size: 16px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px; }

    /* ── Monitor card ── */
    .monitor {
      background: #1e293b;
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
    .monitor-uptime { color: #64748b; font-weight: 400; margin-left: 8px; }
    .monitor-status { font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .monitor-status .indicator { width: 8px; height: 8px; border-radius: 50%; }
    .monitor-status.ok   .indicator { background: #22c55e; }
    .monitor-status.down .indicator { background: #ef4444; }
    .monitor-status.unknown .indicator { background: #475569; }

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
    .bar.ok      { background: #16a34a; }
    .bar.partial { background: #f59e0b; }
    .bar.down    { background: #dc2626; }
    .bar.nodata  { background: #334155; }
    .bars-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      color: #475569;
      font-size: 10px;
    }

    /* ── Bar tooltip ── */
    #bar-tooltip {
      position: fixed;
      background: #0f172a;
      border: 1px solid #334155;
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
    #bar-tooltip .tip-date { color: #64748b; font-size: 11px; margin-bottom: 2px; }
    #bar-tooltip .tip-value { color: #f1f5f9; font-size: 15px; font-weight: 600; }
    #bar-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #0f172a;
    }

    /* ── Error / loading ── */
    #loading { color: #64748b; text-align: center; padding: 48px 0; font-size: 15px; }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 24px;
      color: #475569;
      font-size: 12px;
      border-top: 1px solid #1e293b;
    }
    footer a { color: #64748b; text-decoration: none; }
    footer a:hover { color: #94a3b8; }
    footer:hover .heart { color: #ef4444; }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <h1>Status page</h1>
      <div id="meta">
        <div id="last-updated">Loading…</div>
        <div id="next-update"></div>
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
