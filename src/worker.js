import { checkHttp, checkTcp } from "./checks.js";
import { getPage } from "./page.js";
import { sendNotification } from "./notify.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseConfig(env) {
  const raw = env.MONITORS_CONFIG;
  if (!raw) {
    console.error("MONITORS_CONFIG secret is not set");
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("MONITORS_CONFIG is not valid JSON:", err.message);
    return null;
  }
}

/** Format a Unix timestamp (seconds) into "YYYY-MM-DD-HH" for the hourly bucket key. */
function hourKey(ts) {
  const d = new Date(ts * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

/** List all KV keys with a given prefix, following cursor pagination. */
async function listAllKeys(kv, prefix) {
  const keys = [];
  let cursor = undefined;
  do {
    const result = await kv.list({ prefix, cursor, limit: 1000 });
    keys.push(...result.keys);
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  return keys;
}

// ─── Sync config:monitors ────────────────────────────────────────────────────

// Always sync on every scheduled run. The configSynced flag only guards the
// fetch handler (one sync per isolate lifetime is enough for HTTP requests),
// but the scheduled handler always calls syncConfigMirror directly.
let configSynced = false;

async function syncConfigMirror(env, monitors) {
  try {
    const stored = await env.UPTIME_KV.get("config:monitors");
    const current = JSON.stringify(monitors);
    if (stored !== current) {
      await env.UPTIME_KV.put("config:monitors", current);
      console.log("config:monitors synced to KV");
    }
  } catch (err) {
    console.error("Failed to sync config:monitors:", err.message);
  }
}

async function syncConfigMirrorOnce(env, monitors) {
  if (configSynced) return;
  configSynced = true;
  await syncConfigMirror(env, monitors);
}

// ─── Check runner ────────────────────────────────────────────────────────────

async function runCheck(monitor) {
  try {
    if (monitor.type === "http") return await checkHttp(monitor);
    if (monitor.type === "tcp") return await checkTcp(monitor);
    throw new Error(`Unknown monitor type: ${monitor.type}`);
  } catch (err) {
    return {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type || "unknown",
      ts: Math.floor(Date.now() / 1000),
      ok: false,
      ms: 0,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: err.message,
      colo: null,
    };
  }
}

// ─── KV writers ──────────────────────────────────────────────────────────────

const TTL_1H = 60 * 60;
const TTL_90D = 90 * 24 * 60 * 60;

/** Read maintenance:{id} and return the state object if active and not expired, else null.
 *  Deletes the KV key if the maintenance window has expired. */
async function getMaintenanceState(kv, id) {
  const data = await kv.get(`maintenance:${id}`, "json");
  if (!data || !data.active) return null;
  const now = Math.floor(Date.now() / 1000);
  if (data.expiresAt !== null && now > data.expiresAt) {
    await kv.delete(`maintenance:${id}`);
    return null;
  }
  return data;
}

/**
 * Append an event to events:{id}, pruning entries older than 90 days.
 * If existingEvents is provided it is used directly (avoids a second KV read
 * when the caller already fetched the array).
 */
async function appendEvent(kv, id, event, existingEvents) {
  const cutoff90d = Math.floor(Date.now() / 1000) - TTL_90D;
  const existing = existingEvents ?? (await kv.get(`events:${id}`, "json")) ?? [];
  const pruned = existing.filter((e) => e.ts >= cutoff90d);
  pruned.push(event);
  await kv.put(`events:${id}`, JSON.stringify(pruned), { expirationTtl: TTL_90D });
}

async function writeResult(kv, result, maintenance) {
  // Tag the result with current maintenance state
  result = { ...result, maintenance: !!maintenance };
  const value = JSON.stringify(result);

  // latest:{id} — 1h TTL
  await kv.put(`latest:${result.id}`, value, { expirationTtl: TTL_1H });

  // summary:{id}:{YYYY-MM-DD-HH} — read-modify-write, 90d TTL
  const hk = `summary:${result.id}:${hourKey(result.ts)}`;
  const existing = await kv.get(hk, "json");
  const bucket = existing || {
    checks: 0, ok: 0, maintenance: 0, maintenanceOk: 0,
    excluded: 0, excludedOk: 0,
    avgMs: 0, minMs: Infinity, maxMs: 0,
  };

  const prevTotal = bucket.avgMs * bucket.checks;
  bucket.checks += 1;
  if (result.ok) bucket.ok += 1;
  if (result.maintenance) {
    bucket.maintenance = (bucket.maintenance || 0) + 1;
    if (result.ok) bucket.maintenanceOk = (bucket.maintenanceOk || 0) + 1;
  }
  if (result.excluded) {
    bucket.excluded = (bucket.excluded || 0) + 1;
    if (result.ok) bucket.excludedOk = (bucket.excludedOk || 0) + 1;
  }
  bucket.avgMs = Math.round((prevTotal + result.ms) / bucket.checks);
  bucket.minMs = Math.min(bucket.minMs === Infinity ? result.ms : bucket.minMs, result.ms);
  bucket.maxMs = Math.max(bucket.maxMs, result.ms);

  await kv.put(hk, JSON.stringify(bucket), { expirationTtl: TTL_90D });
}

/**
 * Compare previous and current check state, write events on transitions,
 * and fire notifications for down/up transitions.
 * maintenance_start is written by the CLI; the worker only writes maintenance_end.
 */
async function detectAndWriteEvents(kv, env, result, prevResult) {
  const events = [];
  const now = result.ts;

  // maintenance_end: maintenance was on last check, now it's off
  if (prevResult?.maintenance && !result.maintenance) {
    events.push({ type: "maintenance_end", ts: now });
  }

  // up/down transitions (always tracked regardless of maintenance state)
  if (prevResult !== null && prevResult !== undefined) {
    if (prevResult.ok && !result.ok) {
      events.push({
        type: "down",
        ts: now,
        error: result.error || (result.statusCode ? `HTTP ${result.statusCode}` : null),
      });
    } else if (!prevResult.ok && result.ok) {
      events.push({ type: "up", ts: now });
    }
  }

  if (!events.length) return;

  // Read events array once — reused for notification duration calc and appendEvent.
  const monitor = { id: result.id, name: result.name };
  const existingEvents = (await kv.get(`events:${result.id}`, "json")) || [];

  // Sequential: appendEvent does read-modify-write on the same key; must not run in parallel.
  // After the first append, pass the updated array forward so subsequent appends don't re-read.
  let current = existingEvents;
  for (const event of events) {
    if (event.type === "down" || event.type === "up") {
      await sendNotification(kv, env, monitor, event, existingEvents);
    }
    await appendEvent(kv, result.id, event, current);
    // Rebuild current to reflect the appended event for the next iteration.
    const cutoff90d = Math.floor(Date.now() / 1000) - TTL_90D;
    current = [...current.filter((e) => e.ts >= cutoff90d), event];
  }
}

/**
 * Run a single monitor check: read previous state + maintenance state,
 * execute check, write result and events.
 */
async function runMonitor(kv, env, monitor) {
  const [prevResult, maintenance] = await Promise.all([
    kv.get(`latest:${monitor.id}`, "json"),
    getMaintenanceState(kv, monitor.id),
  ]);

  const result = await runCheck(monitor);
  result.excluded = result.statusCode === 521;
  await writeResult(kv, result, maintenance);
  await detectAndWriteEvents(kv, env, result, prevResult);
  return result;
}

// ─── Dashboard snapshot builder ───────────────────────────────────────────────

async function buildSnapshot(kv, monitors) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff90d = now - 90 * 24 * 3600;
  const cutoff30d = now - 30 * 24 * 3600;
  const cutoff7d  = now - 7  * 24 * 3600;
  const cutoff24h = now - 24 * 3600;

  function hourKeyToTs(hk) {
    const [yyyy, mm, dd, hh] = hk.split("-");
    return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh)) / 1000;
  }

  const monitorSnapshots = await Promise.all(
    monitors.map(async (monitor) => {
      const [latestRaw, summaryKeys, maintenanceState] = await Promise.all([
        kv.get(`latest:${monitor.id}`, "json"),
        listAllKeys(kv, `summary:${monitor.id}:`),
        getMaintenanceState(kv, monitor.id),
      ]);

      const bars = [];
      let checks90 = 0, ok90 = 0;
      let checks30 = 0, ok30 = 0;
      let checks7  = 0, ok7  = 0, totalMs7  = 0;
      let checks24 = 0, ok24 = 0;

      const buckets = await Promise.all(
        summaryKeys.map(async (key) => {
          const hourSuffix = key.name.slice(`summary:${monitor.id}:`.length);
          const ts = hourKeyToTs(hourSuffix);
          const data = await kv.get(key.name, "json");
          return { ts, data };
        })
      );

      for (const { ts, data } of buckets) {
        if (!data || ts < cutoff90d) continue;

        const m              = data.maintenance   || 0;
        const mOk            = data.maintenanceOk || 0;
        const excl           = data.excluded      || 0;
        const exclOk         = data.excludedOk    || 0;
        const effectiveTotal = Math.max(0, data.checks - m - excl);
        const effectiveOk    = Math.max(0, data.ok - mOk - exclOk);

        bars.push({
          hour:        new Date(ts * 1000).toISOString(),
          ok:          data.ok,
          total:       data.checks,
          maintenance: m,
          excluded:    excl,
          avgMs:       data.avgMs,
        });

        checks90 += effectiveTotal; ok90 += effectiveOk;
        if (ts >= cutoff30d) { checks30 += effectiveTotal; ok30 += effectiveOk; }
        if (ts >= cutoff7d)  { checks7  += effectiveTotal; ok7  += effectiveOk; totalMs7 += data.avgMs * effectiveTotal; }
        if (ts >= cutoff24h) { checks24 += effectiveTotal; ok24 += effectiveOk; }
      }

      bars.sort((a, b) => a.hour.localeCompare(b.hour));

      const pct = (ok, total) =>
        total === 0 ? null : Math.round((ok / total) * 10000) / 100;

      return {
        id:         monitor.id,
        name:       monitor.name,
        latest:     latestRaw || null,
        maintenance: maintenanceState
          ? { active: true, message: maintenanceState.message || null, startedAt: maintenanceState.startedAt, expiresAt: maintenanceState.expiresAt }
          : null,
        uptime24h:  pct(ok24, checks24),
        uptime7d:   pct(ok7,  checks7),
        uptime30d:  pct(ok30, checks30),
        uptime90d:  pct(ok90, checks90),
        avgMs7d:    checks7 === 0 ? null : Math.round(totalMs7 / checks7),
        bars,
      };
    })
  );

  return { generatedAt: now, monitors: monitorSnapshots };
}

// ─── Scheduled handler ────────────────────────────────────────────────────────

async function handleScheduled(env) {
  const monitors = parseConfig(env);
  if (!monitors) return;

  await syncConfigMirror(env, monitors);

  // Run all monitors (each reads its own prev state + maintenance state)
  const results = await Promise.all(monitors.map((m) => runMonitor(env.UPTIME_KV, env, m)));

  // Rebuild and store the dashboard snapshot
  const snapshot = await buildSnapshot(env.UPTIME_KV, monitors);
  await env.UPTIME_KV.put("dashboard:snapshot", JSON.stringify(snapshot));

  console.log(`Check round complete. ${results.length} monitors checked.`);
}

// ─── Edge cache helper ────────────────────────────────────────────────────────

// Cloudflare Workers are treated as dynamic origins — Cache-Control headers
// alone do not activate the CDN cache. Using caches.default opts in explicitly.
// Only 2xx responses are stored; errors/404s are served fresh every time.
async function cachedFetch(request, ctx, handler) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await handler();
  if (response.ok) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

// ─── Fetch handler ─────────────────────────────────────────────────────────

async function handleFetch(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/healthz") {
    return new Response("OK", {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (pathname === "/api/snapshot") {
    return cachedFetch(request, ctx, async () => {
      const snapshot = await env.UPTIME_KV.get("dashboard:snapshot");
      if (!snapshot) {
        return new Response(JSON.stringify({ error: "No snapshot yet" }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      return new Response(snapshot, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    });
  }

  const monitorMatch = pathname.match(/^\/api\/monitor\/([^/]+)$/);
  if (monitorMatch) {
    return cachedFetch(request, ctx, async () => {
      const id = monitorMatch[1];
      const events = (await env.UPTIME_KV.get(`events:${id}`, "json")) || [];
      return new Response(JSON.stringify(events), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    });
  }

  if (pathname === "/") {
    return new Response(getPage(), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    // Sync config mirror on cold start (only runs once per isolate lifetime)
    const monitors = parseConfig(env);
    if (monitors) await syncConfigMirrorOnce(env, monitors);

    return handleFetch(request, env, ctx);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};
