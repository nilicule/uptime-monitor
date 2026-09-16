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

// Retries are spread across ~10s (four attempts total) so a brief hiccup on the
// Cloudflare-egress → origin path — which surfaces as "The operation was aborted"
// or a 52x — has to persist across the whole window to be recorded as down. Tight
// back-to-back retries all land inside the same blip and produce false positives.
const RETRY_DELAYS = [1000, 3000, 6000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cloudflare 52x codes (521 "web server is down", 522/524 timeouts, etc.) on an
// outbound fetch are synthesized by Cloudflare's egress when it can't complete the
// connection to the origin — not a real response from the server. They're often
// transient, so they're retried (and fall back to TCP) rather than recorded as-is.
const isTransientStatus = (code) => typeof code === "number" && code >= 520 && code <= 530;

async function attemptHttp(monitor, start) {
  // start is the round timestamp (used for ts); attemptStart measures this attempt's
  // latency so retry wait time between attempts doesn't inflate the reported ms.
  const attemptStart = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(monitor.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "UptimeMonitor/1.0" },
      cf: { cacheTtlByStatus: { "100-599": -1 } },
    });
    await response.body?.cancel();

    const ms = getTtfb() ?? (Date.now() - attemptStart);
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
    const ms = Date.now() - attemptStart;
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

// The first attempts go over HTTP; the rest fall back to a raw TCP connect on the
// URL's port. A failed fetch can't tell "Workers' fetch path couldn't reach the
// origin" apart from "nothing is listening" — a TCP connect can: if the port
// answers, the service is treated as up.
const HTTP_ATTEMPTS = 2;

/** Derive the TCP port for a URL: explicit port, else the scheme's default. */
function urlPort(url) {
  if (url.port) return Number(url.port);
  return url.protocol === "http:" ? 80 : 443;
}

/**
 * Perform an HTTP GET check against a monitor, with up to 4 attempts spread over ~10s:
 * two HTTP attempts, then two TCP connect attempts on the URL's port as a fallback.
 * @param {{ id: string, name: string, url: string }} monitor
 * @returns {Promise<object>} result
 */
export async function checkHttp(monitor) {
  const start = Date.now();
  const url = new URL(monitor.url);
  const port = urlPort(url);
  const tcpTarget = { id: monitor.id, name: monitor.name, host: url.hostname, port };

  let httpResult;
  let tcpResult;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    if (i < HTTP_ATTEMPTS) {
      httpResult = await attemptHttp(monitor, start);
      // A 52x is `ok: true` but transient — retry it instead of recording immediately.
      if (httpResult.ok && !isTransientStatus(httpResult.statusCode)) return httpResult;
    } else {
      tcpResult = await attemptTcp(tcpTarget, start);
      if (tcpResult.ok) {
        // The port answered, so the service is up — keep the HTTP outcome for context.
        return {
          ...httpResult,
          ok: true,
          ms: tcpResult.ms,
          error: null,
          fallback: { type: "tcp", port },
        };
      }
    }
    if (i < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[i]);
  }

  // Neither HTTP nor TCP got through — record as down with both reasons.
  const httpError = httpResult.error ?? `HTTP ${httpResult.statusCode}`;
  return {
    ...httpResult,
    ok: false,
    error: `${httpError} · TCP ${port}: ${tcpResult.error}`,
    fallback: { type: "tcp", port },
  };
}

async function attemptTcp(monitor, start) {
  // start is the round timestamp (used for ts); attemptStart measures this attempt's
  // connect latency so retry wait time between attempts doesn't inflate the reported ms.
  const attemptStart = Date.now();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("TCP connect timeout after 5s")), 5_000)
  );

  const connectPromise = (async () => {
    const socket = connect({ hostname: monitor.host, port: monitor.port });
    await socket.opened;
    const ms = Date.now() - attemptStart;
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
    const ms = Date.now() - attemptStart;
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
 * Perform a TCP connect check against a monitor, with up to 4 attempts spread over ~10s.
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
