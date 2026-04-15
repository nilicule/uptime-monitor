import { connect } from "cloudflare:sockets";

// Returns TTFB (responseStart - requestStart) from the most recent resource
// timing entry, which strips DNS/TCP/TLS overhead for a ping-like latency value.
// Returns null if the timing data isn't available, signalling the caller to fall back.
function getTtfb() {
  const entries = performance.getEntriesByType("resource");
  const entry = entries[entries.length - 1];
  if (entry && entry.requestStart > 0 && entry.responseStart > 0) {
    return Math.round(entry.responseStart - entry.requestStart);
  }
  return null;
}

const RETRY_DELAYS = [300, 900];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attemptHttp(monitor, start) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(monitor.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "UptimeMonitor/1.0" },
      cf: { cacheTtlByStatus: { "100-599": -1 } },
    });
    await response.body?.cancel();

    const ms = getTtfb() ?? (Date.now() - start);
    const ok = true; // any response means the port is up

    return {
      id: monitor.id,
      name: monitor.name,
      type: "http",
      ts: Math.floor(start / 1000),
      ok,
      ms,
      statusCode: response.status,
      statusText: response.statusText,
      redirected: response.redirected,
      finalUrl: response.url,
      error: null,
      colo: null, // cf.colo is only available on inbound requests, not outbound fetch responses
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      id: monitor.id,
      name: monitor.name,
      type: "http",
      ts: Math.floor(start / 1000),
      ok: false,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: err.message,
      colo: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform an HTTP GET check against a monitor, with up to 3 attempts.
 * @param {{ id: string, name: string, url: string }} monitor
 * @returns {Promise<object>} result
 */
export async function checkHttp(monitor) {
  const start = Date.now();
  let result;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    result = await attemptHttp(monitor, start);
    if (result.ok) return result;
    if (i < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[i]);
  }
  return result;
}

async function attemptTcp(monitor, start) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("TCP connect timeout after 5s")), 5_000)
  );

  const connectPromise = (async () => {
    const socket = connect({ hostname: monitor.host, port: monitor.port });
    await socket.opened;
    const ms = Date.now() - start;
    try { socket.close(); } catch { /* ignore close errors */ }
    return ms;
  })();

  try {
    const ms = await Promise.race([connectPromise, timeoutPromise]);

    return {
      id: monitor.id,
      name: monitor.name,
      type: "tcp",
      ts: Math.floor(start / 1000),
      ok: true,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: null,
      colo: null,
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      id: monitor.id,
      name: monitor.name,
      type: "tcp",
      ts: Math.floor(start / 1000),
      ok: false,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: err.message,
      colo: null,
    };
  }
}

/**
 * Perform a TCP connect check against a monitor, with up to 3 attempts.
 * @param {{ id: string, name: string, host: string, port: number }} monitor
 * @returns {Promise<object>} result
 */
export async function checkTcp(monitor) {
  const start = Date.now();
  let result;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    result = await attemptTcp(monitor, start);
    if (result.ok) return result;
    if (i < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[i]);
  }
  return result;
}
