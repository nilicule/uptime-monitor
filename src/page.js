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
      --maintenance:      #3b82f6;
      --maintenance-bar:  #2563eb;
      --maintenance-glow: rgba(59,130,246,.2);
      --maintenance-glow2:rgba(59,130,246,.05);
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
      --maintenance:      #2563eb;
      --maintenance-bar:  #2563eb;
      --maintenance-glow: rgba(37,99,235,.2);
      --maintenance-glow2:rgba(37,99,235,.05);
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
    #back-link {
      display: none;
      font-size: 12px;
      color: var(--muted);
      text-decoration: none;
      margin-top: 3px;
    }
    #back-link:hover { color: var(--text); }
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
    .dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
    .dot.green { background: var(--ok); box-shadow: 0 0 0 4px var(--ok-glow); animation: pulse 2s infinite; }
    .dot.red   { background: var(--down); box-shadow: 0 0 0 4px var(--down-glow); }
    .dot.grey  { background: var(--muted2); }
    .dot.blue  { background: var(--maintenance); box-shadow: 0 0 0 4px var(--maintenance-glow); animation: pulse-maint 2s infinite; }
    @keyframes pulse-maint {
      0%, 100% { box-shadow: 0 0 0 4px var(--maintenance-glow); }
      50%       { box-shadow: 0 0 0 8px var(--maintenance-glow2); }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px var(--ok-glow); }
      50%       { box-shadow: 0 0 0 8px var(--ok-glow2); }
    }
    #banner-text { font-size: 18px; font-weight: 600; }
    #banner-text span { color: var(--ok); }
    #banner-text span.down { color: var(--down); }

    /* ── Section titles ── */
    h2.section-title {
      font-size: 15px; font-weight: 600; color: var(--muted2);
      text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px;
    }
    h2.section-title .note {
      font-weight: 400; text-transform: none; letter-spacing: 0;
      color: var(--muted); font-size: 13px; margin-left: 6px;
    }

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
    .monitor-name a { color: inherit; text-decoration: none; }
    .monitor-name a:hover { text-decoration: underline; }
    .monitor-uptime { color: var(--muted); font-weight: 400; margin-left: 8px; }
    .maintenance-badge {
      display: inline-block;
      background: var(--maintenance-bar);
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
      vertical-align: middle;
    }
    .monitor-status { font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .monitor-status .indicator { width: 8px; height: 8px; border-radius: 50%; }
    .monitor-status.ok      .indicator { background: var(--ok); }
    .monitor-status.down    .indicator { background: var(--down); }
    .monitor-status.unknown     .indicator { background: var(--muted2); }
    .monitor-status.maintenance .indicator { background: var(--maintenance); }

    /* ── Timeline bars ── */
    .bars-wrap { width: 100%; overflow: hidden; }
    .bars { display: flex; gap: 1px; height: 28px; align-items: stretch; }
    .bar { flex: 1; border-radius: 1px; min-width: 0; }
    .bar.ok      { background: var(--ok-bar); }
    .bar.partial { background: var(--partial); }
    .bar.down    { background: var(--down-bar); }
    .bar.nodata       { background: var(--muted3); }
    .bar.maintenance  { background: var(--maintenance-bar); }
    .bars-labels {
      display: flex; justify-content: space-between;
      margin-top: 4px; color: var(--muted2); font-size: 10px;
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
    #bar-tooltip .tip-date  { color: var(--muted); font-size: 11px; margin-bottom: 2px; }
    #bar-tooltip .tip-value { color: var(--text); font-size: 15px; font-weight: 600; }
    #bar-tooltip::after {
      content: '';
      position: absolute;
      top: 100%; left: 50%; transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--tooltip-bg);
    }

    /* ── Loading / error ── */
    #loading { color: var(--muted); text-align: center; padding: 48px 0; font-size: 15px; }

    /* ── Detail page ─────────────────────────────────────── */
    .detail-banner {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }
    .detail-banner .dot { width: 22px; height: 22px; }
    .detail-banner-text h2 { font-size: 22px; font-weight: 700; }
    .detail-banner-text h2 .ok-label   { color: var(--ok); }
    .detail-banner-text h2 .down-label        { color: var(--down); }
    .detail-banner-text h2 .maintenance-label { color: var(--maintenance); }
    .detail-banner-text p { color: var(--muted); font-size: 13px; margin-top: 4px; }

    .detail-section { margin-bottom: 32px; }

    /* bars in detail view are taller */
    .detail-section .bars { height: 36px; }

    .detail-bars-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .detail-bars-pct { font-size: 13px; color: var(--muted); margin-bottom: 10px; }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (max-width: 580px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .stat-value { font-size: 20px; font-weight: 700; }
    .stat-label { color: var(--muted); font-size: 12px; margin-top: 4px; }

    .chart-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .chart-box svg { display: block; width: 100%; height: 80px; overflow: visible; }
    .chart-stats { display: flex; justify-content: space-around; margin-top: 16px; text-align: center; }
    .chart-stat-value { font-size: 18px; font-weight: 700; }
    .chart-stat-label { color: var(--muted); font-size: 12px; margin-top: 2px; }

    .events-list { display: flex; flex-direction: column; gap: 8px; }
    .event-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
    }
    .event-row { display: flex; align-items: center; gap: 10px; }
    .event-icon {
      width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
    }
    .event-icon.up   { background: var(--ok);   color: #fff; }
    .event-icon.down        { background: var(--down);        color: #fff; }
    .event-icon.maintenance { background: var(--maintenance); color: #fff; }
    .event-title { font-size: 14px; font-weight: 600; }
    .event-time { color: var(--muted); font-size: 12px; margin-top: 5px; padding-left: 30px; }
    .event-error {
      color: var(--muted); font-size: 12px;
      margin-top: 6px; padding-top: 6px; padding-left: 30px;
      border-top: 1px solid var(--border);
    }

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
      <div>
        <h1>Status page</h1>
        <a id="back-link" href="#">← Back to list</a>
      </div>
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

    <div id="detail" style="display:none"></div>
  </main>

  <div id="bar-tooltip">
    <div class="tip-date"  id="tip-date"></div>
    <div class="tip-value" id="tip-value"></div>
  </div>

  <footer>
    built with <span class="heart">♥</span> · <a href="https://github.com/nilicule/uptime-monitor" target="_blank" rel="noopener">source on GitHub</a>
  </footer>

  <script>
    const REFRESH_MS = 5 * 60 * 1000;
    let nextRefreshAt = null;
    let lastSnapshot   = null;

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

    (function initTheme() {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) {
        applyTheme(stored);
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
      }
    })();

    toggleBtn.addEventListener('click', () => {
      const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });

    // ── Back link ─────────────────────────────────────────────────────────
    document.getElementById('back-link').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '';
    });

    // ── HTML escaping helper ──────────────────────────────────────────────
    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ── Build 90 daily slots from hourly bars ─────────────────────────────
    function buildDailySlots(barsArray) {
      const byDay = {};
      for (const b of barsArray) {
        const day = b.hour.slice(0, 10);
        if (!byDay[day]) byDay[day] = { ok: 0, total: 0, maintenance: 0 };
        byDay[day].ok          += b.ok;
        byDay[day].total       += b.total;
        byDay[day].maintenance += (b.maintenance || 0);
      }
      const now = Date.now();
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const slots = [];
      for (let i = 89; i >= 0; i--) {
        const d   = new Date(todayStart.getTime() - i * 86400_000);
        const key = d.toISOString().slice(0, 10);
        slots.push(byDay[key] || null);
      }
      return slots;
    }

    function barClass(slot) {
      if (!slot || slot.total === 0)  return 'nodata';
      if (slot.maintenance > 0)       return 'maintenance';
      if (slot.ok === slot.total)     return 'ok';
      if (slot.ok === 0)              return 'down';
      return 'partial';
    }

    // ── Render bars into an element and wire up tooltips ──────────────────
    function renderBars(containerEl, slots) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      slots.forEach((slot, i) => {
        const bar = document.createElement('div');
        bar.className = 'bar ' + barClass(slot);

        const dayOffset = 89 - i;
        const dayDate   = new Date(today.getTime() - dayOffset * 86400_000);
        const dateStr   = dayDate.toISOString().slice(0, 10);
        const valueStr  = !slot || slot.total === 0
          ? 'No data'
          : slot.maintenance > 0
            ? 'Maintenance'
            : (slot.ok / slot.total * 100).toFixed(2) + '%';

        bar.addEventListener('mouseenter', (e) => {
          document.getElementById('tip-date').textContent  = dateStr;
          document.getElementById('tip-value').textContent = valueStr;
          positionTooltip(e);
          document.getElementById('bar-tooltip').classList.add('visible');
        });
        bar.addEventListener('mousemove', positionTooltip);
        bar.addEventListener('mouseleave', () => {
          document.getElementById('bar-tooltip').classList.remove('visible');
        });
        containerEl.appendChild(bar);
      });
    }

    // ── Compute 24 h uptime from hourly bars ──────────────────────────────
    function uptime24h(barsArray) {
      const cutoff = Date.now() / 1000 - 86400;
      let ok = 0, total = 0;
      for (const b of barsArray) {
        if (new Date(b.hour).getTime() / 1000 >= cutoff) {
          ok    += b.ok;
          total += b.total;
        }
      }
      return total === 0 ? null : Math.round(ok / total * 10000) / 100;
    }

    // ── Response-time SVG chart ───────────────────────────────────────────
    function buildResponseChart(results) {
      const pts = results.filter(r => r.ms != null).sort((a, b) => a.ts - b.ts);
      if (!pts.length) return { html: '<p style="color:var(--muted);padding:4px 0">No data</p>', pts: [] };

      const ms    = pts.map(r => r.ms);
      const maxMs = Math.max(...ms);
      const minMs = Math.min(...ms);
      const avgMs = Math.round(ms.reduce((s, v) => s + v, 0) / ms.length);

      const W = 500, H = 80, PAD = 4;
      const xOf = i => pts.length < 2 ? W / 2 : (i / (pts.length - 1)) * W;
      const yOf = v => PAD + (1 - (maxMs > 0 ? v / maxMs : 0)) * (H - PAD * 2);

      const linePoints = pts.map((r, i) => \`\${xOf(i).toFixed(1)},\${yOf(r.ms).toFixed(1)}\`).join(' ');
      const fillPoints = \`0,\${H} \${linePoints} \${W},\${H}\`;

      const html = \`<div class="chart-box">
        <svg viewBox="0 0 \${W} \${H}" preserveAspectRatio="none" style="cursor:crosshair">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stop-color="var(--ok-bar)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--ok-bar)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon  points="\${fillPoints}" fill="url(#cg)"/>
          <polyline points="\${linePoints}" fill="none" stroke="var(--ok-bar)"
                    stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
          <circle class="chart-hover-dot" r="4" fill="var(--ok-bar)"
                  stroke="var(--bg)" stroke-width="2" style="opacity:0"/>
          <rect class="chart-overlay" x="0" y="0" width="\${W}" height="\${H}" fill="transparent"/>
        </svg>
        <div class="chart-stats">
          <div><div class="chart-stat-value">\${avgMs}ms</div><div class="chart-stat-label">Avg response time</div></div>
          <div><div class="chart-stat-value">\${maxMs}ms</div><div class="chart-stat-label">Max response time</div></div>
          <div><div class="chart-stat-value">\${minMs}ms</div><div class="chart-stat-label">Min response time</div></div>
        </div>
      </div>\`;

      return { html, pts };
    }

    function attachChartTooltip(svgEl, pts) {
      if (!svgEl || pts.length < 2) return;

      const W = 500, H = 80, PAD = 4;
      const maxMs = Math.max(...pts.map(p => p.ms));
      const xOf   = i => (i / (pts.length - 1)) * W;
      const yOf   = v => PAD + (1 - (maxMs > 0 ? v / maxMs : 0)) * (H - PAD * 2);

      const dot     = svgEl.querySelector('.chart-hover-dot');
      const overlay = svgEl.querySelector('.chart-overlay');
      const tooltip = document.getElementById('bar-tooltip');

      overlay.addEventListener('mousemove', (e) => {
        const rect  = svgEl.getBoundingClientRect();
        const svgX  = (e.clientX - rect.left) / rect.width * W;

        let nearestIdx = 0, nearestDist = Infinity;
        pts.forEach((_, i) => {
          const d = Math.abs(xOf(i) - svgX);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        });

        const p = pts[nearestIdx];
        dot.setAttribute('cx', xOf(nearestIdx).toFixed(1));
        dot.setAttribute('cy', yOf(p.ms).toFixed(1));
        dot.style.opacity = '1';

        document.getElementById('tip-date').textContent  = new Date(p.ts * 1000).toLocaleString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        document.getElementById('tip-value').textContent = p.ms + 'ms';
        positionTooltip(e);
        tooltip.classList.add('visible');
      });

      overlay.addEventListener('mouseleave', () => {
        dot.style.opacity = '0';
        tooltip.classList.remove('visible');
      });
    }

    // ── Recent events ─────────────────────────────────────────────────────
    function fmtDuration(secs) {
      if (secs < 60)   return Math.round(secs) + 's';
      if (secs < 3600) return Math.round(secs / 60) + 'm';
      return (secs / 3600).toFixed(1) + 'h';
    }

    function fmtTime(ts) {
      return new Date(ts * 1000).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }

    function buildRecentEvents(results) {
      if (!results.length) return '<p style="color:var(--muted)">No data for the last 24 hours.</p>';

      const sorted = [...results].sort((a, b) => a.ts - b.ts);
      const events = [];
      let downSince = null;
      let downError = null;

      for (let i = 0; i < sorted.length; i++) {
        const r    = sorted[i];
        const prev = sorted[i - 1];

        if (!prev) {
          if (!r.ok) {
            downSince = r.ts;
            downError = r.error || (r.statusCode ? 'HTTP ' + r.statusCode : null);
          }
          continue;
        }

        if (prev.ok && !r.ok) {
          downSince = r.ts;
          downError = r.error || (r.statusCode ? 'HTTP ' + r.statusCode : null);
        } else if (!prev.ok && r.ok) {
          const dur = downSince != null ? r.ts - downSince : null;
          events.push({ type: 'down', ts: downSince ?? r.ts, dur, error: downError });
          events.push({ type: 'up',   ts: r.ts });
          downSince = null;
          downError = null;
        }
      }

      if (downSince != null) {
        const dur = Math.floor(Date.now() / 1000) - downSince;
        events.push({ type: 'down', ts: downSince, dur, error: downError, ongoing: true });
      }

      if (!events.length) return '<p style="color:var(--muted)">No incidents in the last 24 hours.</p>';

      return '<div class="events-list">' + events.reverse().map(ev => {
        if (ev.type === 'up') {
          return \`<div class="event-item">
            <div class="event-row"><span class="event-icon up">↑</span><span class="event-title">Running again</span></div>
            <div class="event-time">\${escHtml(fmtTime(ev.ts))}</div>
          </div>\`;
        }
        const durStr   = ev.dur > 60 ? ' · ' + fmtDuration(ev.dur) : '';
        const label    = ev.ongoing ? 'Currently down' : 'Down';
        const errorRow = ev.error ? \`<div class="event-error">\${escHtml(ev.error)}</div>\` : '';
        return \`<div class="event-item">
          <div class="event-row"><span class="event-icon down">↓</span><span class="event-title">\${label}\${escHtml(durStr)}</span></div>
          <div class="event-time">\${escHtml(fmtTime(ev.ts))}</div>
          \${errorRow}
        </div>\`;
      }).join('') + '</div>';
    }

    // ── Render list view ──────────────────────────────────────────────────
    function renderList(snapshot) {
      const allOk   = snapshot.monitors.every(m => m.latest && (m.latest.ok || m.maintenance?.active));
      const anyDown = snapshot.monitors.some(m => m.latest && !m.latest.ok && !m.maintenance?.active);
      const anyData = snapshot.monitors.some(m => m.latest);

      const dot        = document.getElementById('banner-dot');
      const bannerText = document.getElementById('banner-text');
      document.getElementById('banner').style.display = 'flex';
      dot.className = 'dot ' + (allOk ? 'green' : anyDown ? 'red' : 'grey');

      if (!anyData) {
        bannerText.innerHTML = 'No data yet';
      } else if (allOk) {
        bannerText.innerHTML = 'All systems <span>Operational</span>';
      } else {
        const n = snapshot.monitors.filter(m => m.latest && !m.latest.ok && !m.maintenance?.active).length;
        bannerText.innerHTML = \`<span class="down">\${n} service\${n !== 1 ? 's' : ''} down</span>\`;
      }

      const list = document.getElementById('monitor-list');
      list.innerHTML = '';

      for (const monitor of snapshot.monitors) {
        const slots       = buildDailySlots(monitor.bars);
        const uptime      = monitor.uptime90d != null ? monitor.uptime90d.toFixed(2) + '%' : '—';
        const isMaint     = !!monitor.maintenance?.active;
        const isOk        = monitor.latest?.ok;
        const statusClass = monitor.latest == null ? 'unknown' : isMaint ? 'maintenance' : isOk ? 'ok' : 'down';
        const statusLabel = monitor.latest == null ? 'No data' : isMaint ? 'Maintenance' : isOk ? 'Operational' : 'Down';
        const maintBadge  = isMaint ? '<span class="maintenance-badge">Maintenance</span>' : '';

        const card = document.createElement('div');
        card.className = 'monitor';
        card.innerHTML = \`
          <div class="monitor-header">
            <div class="monitor-name">
              <a href="#monitor/\${escHtml(monitor.id)}">\${escHtml(monitor.name)}</a>\${maintBadge}
              <span class="monitor-uptime">· \${escHtml(uptime)}</span>
            </div>
            <div class="monitor-status \${escHtml(statusClass)}">
              <div class="indicator"></div>
              \${escHtml(statusLabel)}
            </div>
          </div>
          <div class="bars-wrap">
            <div class="bars" id="bars-\${escHtml(monitor.id)}"></div>
            <div class="bars-labels"><span>90 days ago</span><span>now</span></div>
          </div>
        \`;
        list.appendChild(card);
        renderBars(card.querySelector('.bars'), slots);
      }

      document.getElementById('loading').style.display   = 'none';
      document.getElementById('monitors').style.display  = 'block';
    }

    // ── Render detail view ────────────────────────────────────────────────
    async function renderDetail(monitorId) {
      const monitor = lastSnapshot.monitors.find(m => m.id === monitorId);
      if (!monitor) { window.location.hash = ''; return; }

      const isOk        = monitor.latest?.ok;
      const dotClass    = monitor.latest == null ? 'grey' : isOk ? 'green' : 'red';
      const statusLabel = monitor.latest == null ? 'unknown' : isOk ? 'operational' : 'down';
      const labelClass  = isOk ? 'ok-label' : 'down-label';
      const slots       = buildDailySlots(monitor.bars);
      const u24         = uptime24h(monitor.bars);
      const fmtPct      = v => v != null ? v.toFixed(3) + '%' : '—';

      const detailEl = document.getElementById('detail');
      detailEl.innerHTML = \`
        <div class="detail-banner">
          <div class="dot \${escHtml(dotClass)}"></div>
          <div class="detail-banner-text">
            <h2>\${escHtml(monitor.name)} is <span class="\${labelClass}">\${statusLabel}</span></h2>
            <p>Checked every 5 minutes</p>
          </div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Uptime <span class="note">Last 90 days</span></h2>
          <div class="detail-bars-box">
            <div class="detail-bars-pct">\${escHtml(fmtPct(monitor.uptime90d))}</div>
            <div class="bars" id="detail-bars"></div>
            <div class="bars-labels" style="margin-top:6px"><span>90 days ago</span><span>now</span></div>
          </div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Overall Uptime</h2>
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value">\${escHtml(fmtPct(u24))}</div><div class="stat-label">Last 24 hours</div></div>
            <div class="stat-card"><div class="stat-value">\${escHtml(fmtPct(monitor.uptime7d))}</div><div class="stat-label">Last 7 days</div></div>
            <div class="stat-card"><div class="stat-value">\${escHtml(fmtPct(monitor.uptime30d))}</div><div class="stat-label">Last 30 days</div></div>
            <div class="stat-card"><div class="stat-value">\${escHtml(fmtPct(monitor.uptime90d))}</div><div class="stat-label">Last 90 days</div></div>
          </div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Response Time <span class="note">Last 24 hours</span></h2>
          <div id="detail-chart"></div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Recent events <span class="note">Last 24 hours</span></h2>
          <div id="detail-events"><p style="color:var(--muted)">Loading…</p></div>
        </div>
      \`;

      renderBars(document.getElementById('detail-bars'), slots);

      // Build response time chart from snapshot's hourly bars — no extra KV reads
      const cutoff24h  = Date.now() / 1000 - 86400;
      const chartPts   = monitor.bars
        .filter(b => b.total > 0 && new Date(b.hour).getTime() / 1000 >= cutoff24h)
        .map(b => ({ ts: new Date(b.hour).getTime() / 1000, ms: b.avgMs }));
      const chart = buildResponseChart(chartPts);
      document.getElementById('detail-chart').innerHTML = chart.html;
      attachChartTooltip(document.getElementById('detail-chart').querySelector('svg'), chart.pts);

      // Fetch raw results only for recent events
      try {
        const res = await fetch(\`/api/monitor/\${encodeURIComponent(monitorId)}\`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const results = await res.json();
        document.getElementById('detail-events').innerHTML = buildRecentEvents(results);
      } catch (err) {
        document.getElementById('detail-events').innerHTML = '<p style="color:var(--muted)">Failed to load events.</p>';
      }
    }

    // ── Router ────────────────────────────────────────────────────────────
    function navigate() {
      if (!lastSnapshot) return;

      const hash     = window.location.hash;
      const backLink = document.getElementById('back-link');

      if (hash.startsWith('#monitor/')) {
        const id = decodeURIComponent(hash.slice('#monitor/'.length));
        document.getElementById('banner').style.display   = 'none';
        document.getElementById('monitors').style.display = 'none';
        document.getElementById('loading').style.display  = 'none';
        document.getElementById('detail').style.display   = 'block';
        backLink.style.display = 'block';
        renderDetail(id);
      } else {
        document.getElementById('detail').style.display = 'none';
        backLink.style.display = 'none';
        renderList(lastSnapshot);
      }
    }

    window.addEventListener('hashchange', navigate);

    // ── Main render (called on every snapshot refresh) ────────────────────
    function render(snapshot) {
      lastSnapshot = snapshot;
      document.getElementById('loading').style.display = 'none';

      const genAt = new Date(snapshot.generatedAt * 1000);
      document.getElementById('last-updated').textContent = 'Last updated ' + genAt.toLocaleTimeString();
      nextRefreshAt = Date.now() + REFRESH_MS;

      const allOk   = snapshot.monitors.every(m => m.latest && (m.latest.ok || m.maintenance?.active));
      const allDown = snapshot.monitors.every(m => m.latest && !m.latest.ok && !m.maintenance?.active);
      setFavicon(allOk ? '#22c55e' : allDown ? '#ef4444' : '#f59e0b');

      navigate();
    }

    // ── Favicon ───────────────────────────────────────────────────────────
    function setFavicon(color) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = canvas.toDataURL();
    }

    // ── Tooltip positioning ───────────────────────────────────────────────
    function positionTooltip(e) {
      const tt   = document.getElementById('bar-tooltip');
      const rect = tt.getBoundingClientRect();
      tt.style.left = Math.max(8, Math.min(e.clientX - rect.width / 2, window.innerWidth - rect.width - 8)) + 'px';
      tt.style.top  = (e.clientY - rect.height - 14) + 'px';
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
        render(await res.json());
      } catch (err) {
        document.getElementById('loading').textContent = 'Unable to load status data. Retrying in 5 minutes.';
        document.getElementById('loading').style.display  = 'block';
        document.getElementById('monitors').style.display = 'none';
        document.getElementById('banner').style.display   = 'none';
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
