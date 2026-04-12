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
      padding: 16px 32px;
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
  </style>
</head>
<body>
  <header>
    <h1>Status page</h1>
    <div id="meta">
      <div id="last-updated">Loading…</div>
      <div id="next-update"></div>
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

  <footer>
    <a href="https://github.com/nilicule/uptime-monitor" target="_blank" rel="noopener">View source on GitHub</a>
  </footer>

  <script>
    const REFRESH_MS = 5 * 60 * 1000;
    const HOURS_90 = 90 * 24;

    let nextRefreshAt = null;

    // ── HTML escaping helper ──────────────────────────────────────────────
    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ── Build the full 90-day hour slot list ──────────────────────────────
    function buildSlots(barsArray) {
      // Index bars by their hour string for O(1) lookup
      const byHour = {};
      for (const b of barsArray) byHour[b.hour] = b;

      const now = Date.now();
      // Start of the current hour
      const currentHour = new Date(now);
      currentHour.setUTCMinutes(0, 0, 0);

      const slots = [];
      for (let i = HOURS_90 - 1; i >= 0; i--) {
        const slotTime = new Date(currentHour.getTime() - i * 3600 * 1000);
        const key = slotTime.toISOString();
        slots.push(byHour[key] || null);
      }
      return slots; // oldest → newest
    }

    // ── Bar class from slot data ──────────────────────────────────────────
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
        const slots = buildSlots(monitor.bars);
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
        for (const slot of slots) {
          const bar = document.createElement('div');
          bar.className = 'bar ' + barClass(slot);
          barsEl.appendChild(bar);
        }
      }

      document.getElementById('loading').style.display = 'none';
      document.getElementById('monitors').style.display = 'block';

      // Meta
      const genAt = new Date(snapshot.generatedAt * 1000);
      document.getElementById('last-updated').textContent =
        'Last updated ' + genAt.toLocaleTimeString();
      nextRefreshAt = Date.now() + REFRESH_MS;
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
